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
        mensaje.tipo = 'texto';
      }
      
      // Inicialmente no leído
      mensaje.leido = false;
      
      // Guardar mensaje en base de datos
      const { data, error } = await supabase
        .from('mensajes')
        .insert([mensaje])
        .select()
        .single();
      
      if (error) throw error;
      
      // Si tenemos socket.io conectado y roomId, también enviar por socket
      if (data.solicitud_id) {
        const solicitud = await this.getSolicitudForMensaje(data.solicitud_id);
        if (solicitud && solicitud.room_id) {
          // Obtener nombre del remitente
          let nombreRemitente = 'Usuario';
          if (mensaje.asistente_id) {
            const { data: asistente } = await supabase
              .from('asistentes')
              .select('nombre')
              .eq('id', mensaje.asistente_id)
              .single();
            
            if (asistente) nombreRemitente = asistente.nombre;
          } else if (mensaje.usuario_id) {
            const { data: usuario } = await supabase
              .from('usuario') // Corregido: 'usuario' en singular según tu esquema
              .select('nombre')
              .eq('id', mensaje.usuario_id)
              .single();
            
            if (usuario) nombreRemitente = usuario.nombre;
          }
          
          // Emitir mensaje a través de socket
          try {
            await socketService.connect();
            socketService.joinRoom(solicitud.room_id, 
              mensaje.usuario_id || mensaje.asistente_id, nombreRemitente);
            
            socketService.sendMessage({
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
      const { data, error } = await supabase
        .from('mensajes')
        .select('*, usuario:usuario_id(*), asistente:asistente_id(*)')
        .eq('solicitud_id', solicitudId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener mensajes por solicitud:', error);
      throw error;
    }
  },
  
  // Marcar mensajes como leídos
  async marcarComoLeidos(solicitudId, usuarioId = null) {
    try {
      let query = supabase
        .from('mensajes')
        .update({ leido: true, updated_at: new Date().toISOString() })
        .eq('solicitud_id', solicitudId);
      
      // Si se proporciona ID de usuario (el usuario está leyendo mensajes del asistente)
      if (usuarioId) {
        query = query.not('asistente_id', 'is', null); // Marcar como leídos los mensajes de asistentes
      } else {
        // El asistente está leyendo mensajes del usuario
        query = query.not('usuario_id', 'is', null); // Marcar como leídos los mensajes de usuarios
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al marcar mensajes como leídos:', error);
      throw error;
    }
  },
  
  // Obtener mensajes no leídos para un usuario
  async getMensajesNoLeidos(usuarioId) {
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select('*, solicitud:solicitud_id(*)')
        .eq('leido', false)
        .not('asistente_id', 'is', null) // Mensajes enviados por asistentes (no nulos)
        .in('solicitud_id', function(query) {
          query.select('id')
            .from('solicitudes_asistencia')
            .eq('usuario_id', usuarioId);
        });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener mensajes no leídos:', error);
      throw error;
    }
  },
  
  // Obtener mensajes no leídos para un asistente
  async getMensajesNoLeidosAsistente(asistenteId) {
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select('*, solicitud:solicitud_id(*)')
        .eq('leido', false)
        .not('usuario_id', 'is', null) // Mensajes enviados por usuarios (no nulos)
        .in('solicitud_id', function(query) {
          query.select('id')
            .from('solicitudes_asistencia')
            .eq('asistente_id', asistenteId);
        });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener mensajes no leídos para asistente:', error);
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
  }
};