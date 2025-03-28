// src/services/mensajesService.js
import { supabase } from '../../supabase';
import socketService from './socket.service';

export const mensajesService = {
  // Enviar un mensaje
  async enviarMensaje(mensaje) {
    try {
      // Asegurarse de que el mensaje tenga los campos requeridos
      if (!mensaje.contenido) {
        throw new Error('El contenido del mensaje es obligatorio');
      }
      
      // Establecer tipo por defecto si no se especifica
      if (!mensaje.tipo) {
        mensaje.tipo = 'asistente';
      }
      
      // Inicialmente no leído
      mensaje.leido = false;
      
      // Construir el objeto para insertar, usando solo campos que existen en la tabla
      const mensajeData = {
        solicitud_id: mensaje.solicitud_id,
        contenido: mensaje.contenido,
        tipo: mensaje.tipo, // Usar el tipo proporcionado
        leido: mensaje.leido
      };
      
      console.log('Insertando mensaje con datos:', mensajeData);
      
      // Guardar mensaje en base de datos
      const { data, error } = await supabase
        .from('mensajes')
        .insert([mensajeData])
        .select()
        .single();
      
      if (error) throw error;
            
      console.log('Mensaje guardado correctamente:', data);
      
      // Si tenemos socket.io conectado y roomId, también enviar por socket
      if (data.solicitud_id) {
        const solicitud = await this.getSolicitudForMensaje(data.solicitud_id);
        if (solicitud && solicitud.room_id) {
          // Obtener nombre del remitente según rol (asistente o usuario)
          let nombreRemitente = 'Usuario';
          let idRemitente = null;
          
          // Para identificar al remitente, necesitamos información adicional
          // ya que la tabla mensajes no contiene usuario_id ni asistente_id
          if (mensaje._esAsistente && mensaje._asistenteId) {
            // Si el mensaje es de un asistente
            const { data: asistente } = await supabase
              .from('asistentes')
              .select('id, nombre')
              .eq('id', mensaje._asistenteId)
              .single();
            
            if (asistente) {
              nombreRemitente = asistente.nombre;
              idRemitente = asistente.id;
            }
          } else if (mensaje._usuarioId) {
            // Si el mensaje es de un usuario
            const { data: usuario } = await supabase
              .from('usuario')
              .select('id, nombre')
              .eq('id', mensaje._usuarioId)
              .single();
            
            if (usuario) {
              nombreRemitente = usuario.nombre;
              idRemitente = usuario.id;
            }
          }
          
          // Emitir mensaje a través de socket
          try {
            await socketService.connect();
            socketService.joinRoom(
              solicitud.room_id, 
              idRemitente || 'unknown', 
              nombreRemitente
            );
            
            socketService.emit('send-message', {
              roomId: solicitud.room_id,
              message: mensaje.contenido,
              sender: nombreRemitente,
              timestamp: new Date().toISOString()
            });
          } catch (socketError) {
            console.error('Error al enviar mensaje por socket:', socketError);
            // Continuar con la operación incluso si falla el socket
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error en enviarMensaje:', error);
      throw error;
    }
  },
  
  // Obtener solicitud para un mensaje
  async getSolicitudForMensaje(solicitudId) {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*')
        .eq('id', solicitudId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en getSolicitudForMensaje:', error);
      return null;
    }
  },
  
  // Obtener mensajes por solicitud
  async getMensajesBySolicitud(solicitudId) {
    try {
      // Obtener los mensajes
      const { data: mensajes, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('solicitud_id', solicitudId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (!mensajes || mensajes.length === 0) {
        return [];
      }
      
      // También necesitamos obtener la información de la solicitud para determinar
      // quién envió cada mensaje (ya que no tenemos usuario_id o asistente_id en la tabla mensajes)
      const { data: solicitud, error: solicitudError } = await supabase
        .from('solicitudes_asistencia')
        .select(`
          *,
          usuario:usuario_id(*),
          asistente:asistente_id(*)
        `)
        .eq('id', solicitudId)
        .single();
      
      if (solicitudError) {
        console.error('Error al obtener información de solicitud:', solicitudError);
        // Devolver los mensajes sin información adicional
        return mensajes;
      }
      
      // Enriquecer los mensajes con información del remitente
      // Esto es una simulación basada en metadata que podríamos almacenar
      // Por ejemplo, podríamos almacenar el rol del remitente en el campo "tipo"
      // o usar alguna convención en el contenido
      const mensajesEnriquecidos = mensajes.map(m => {
        // Aquí normalmente determinaríamos el remitente basado en usuario_id o asistente_id
        // Como no tenemos esos campos, tendremos que hacer una suposición o usar metadatos
        // Esta es una implementación de ejemplo que deberías adaptar a tu lógica
        
        // Por ejemplo, si los mensajes de los asistentes tienen un formato especial
        // o si guardas metadatos en el campo "tipo"
        const esDeAsistente = m.tipo === 'asistente' || 
                              (solicitud.asistente && m.contenido.includes('[Asistente]'));
        
        return {
          ...m,
          remitente: esDeAsistente ? 
                    (solicitud.asistente ? solicitud.asistente.nombre : 'Asistente') : 
                    (solicitud.usuario ? solicitud.usuario.nombre : 'Usuario'),
          esDeAsistente: esDeAsistente
        };
      });
      
      return mensajesEnriquecidos;
    } catch (error) {
      console.error('Error al obtener mensajes por solicitud:', error);
      throw error;
    }
  },
  
  // Marcar mensajes como leídos
  async marcarComoLeidos(solicitudId) {
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .update({ 
          leido: true,
          updated_at: new Date().toISOString()
        })
        .eq('solicitud_id', solicitudId)
        .eq('leido', false);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al marcar mensajes como leídos:', error);
      throw error;
    }
  },
  
  // Suscribirse a nuevos mensajes en una solicitud específica
  suscribirseAMensajes(solicitudId, callback) {
    try {
      // Crear un canal específico para esta solicitud
      const channel = supabase
        .channel(`chat-${solicitudId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes',
            filter: `solicitud_id=eq.${solicitudId}`
          },
          (payload) => {
            // Llamar al callback con el nuevo mensaje
            if (callback && typeof callback === 'function') {
              callback(payload.new);
            }
          }
        )
        .subscribe();
      
      // Devolver una función para cancelar la suscripción
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error al suscribirse a mensajes:', error);
      // Devolver una función vacía en caso de error
      return () => {};
    }
  },
  
  // Enviar evento de "está escribiendo"
  async enviarEscribiendo(solicitudId, usuarioId, isEscribiendo = true) {
    try {
      // Obtener la sala de la solicitud
      const { data: solicitud, error: errorSolicitud } = await supabase
        .from('solicitudes_asistencia')
        .select('room_id')
        .eq('id', solicitudId)
        .single();
      
      if (errorSolicitud) throw errorSolicitud;
      
      // Si no hay room_id, no podemos enviar el evento
      if (!solicitud || !solicitud.room_id) return false;
      
      // Emitir evento a través de socket
      try {
        await socketService.connect();
        socketService.emit('typing', {
          roomId: solicitud.room_id,
          userId: usuarioId,
          isTyping: isEscribiendo
        });
        return true;
      } catch (socketError) {
        console.error('Error al enviar evento de escritura:', socketError);
        return false;
      }
    } catch (error) {
      console.error('Error en enviarEscribiendo:', error);
      return false;
    }
  },
  
  // Obtener chats atendidos por un asistente
  async getChatsAtendidosByAsistente(asistenteId) {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select(`
          *,
          usuario:usuario_id(*)
        `)
        .eq('asistente_id', asistenteId)
        .eq('tipo_asistencia', 'chat')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener chats atendidos por asistente:', error);
      throw error;
    }
  },
  
  async getMensajesNoLeidos(usuarioId) {
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select('id, solicitud_id, contenido, created_at, tipo, leido')
        .eq('leido', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener mensajes no leídos:', error);
      return [];
    }
  },
  
  // Eliminar todos los mensajes de una solicitud
  async eliminarMensajesPorSolicitud(solicitudId) {
    try {
      // Verificar que hay solicitudId válido
      if (!solicitudId) {
        throw new Error('ID de solicitud no válido');
      }

      console.log('Eliminando todos los mensajes para solicitud:', solicitudId);
      
      // Eliminar los mensajes de la base de datos
      const { data, error } = await supabase
        .from('mensajes')
        .delete()
        .eq('solicitud_id', solicitudId);
      
      if (error) throw error;
      
      console.log('Mensajes eliminados correctamente');
      return { success: true, message: 'Mensajes eliminados correctamente' };
    } catch (error) {
      console.error('Error al eliminar mensajes de la solicitud:', error);
      throw error;
    }
  }
};