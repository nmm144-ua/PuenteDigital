// src/services/MensajesService.js
import { supabase } from '../../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class MensajesService {
  constructor() {
    this.tableName = 'mensajes';
    this.userId = null;     // ID del usuario autenticado (auth.users)
    this.userDbId = null;   // ID en la tabla usuario o asistentes
    this.isAsistente = false; // Indica si el usuario es asistente
    this.asistenteId = null; // ID del asistente (si aplica)
  }

  // Inicializar el servicio con el ID del usuario actual
  async init(userId, isAsistente = false) {
    try {
      console.log('Inicializando MensajesService con userId:', userId, 'isAsistente:', isAsistente);
      
      if (userId) {
        this.userId = userId;
        this.isAsistente = isAsistente;
        
        // Buscar el ID correspondiente en la tabla usuario o asistentes
        if (isAsistente) {
          const { data: asistente, error: asistenteError } = await supabase
            .from('asistentes')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          if (asistenteError) {
            console.error('Error al buscar asistente:', asistenteError);
          }
          
          if (asistente) {
            this.userDbId = asistente.id;
            this.asistenteId = asistente.id;
            console.log('ID de asistente encontrado:', this.userDbId);
          } else {
            console.warn('No se encontró asistente para user_id:', userId);
          }
        } else {
          const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          if (usuarioError) {
            console.error('Error al buscar usuario:', usuarioError);
          }
          
          if (usuario) {
            this.userDbId = usuario.id;
            console.log('ID de usuario encontrado:', this.userDbId);
          } else {
            console.warn('No se encontró usuario para user_id:', userId);
          }
        }
        
        return true;
      }
      
      // Si no hay userId, intentar obtener información de usuario anónimo
      try {
        const userJson = await AsyncStorage.getItem('userData');
        if (userJson) {
          const user = JSON.parse(userJson);
          
          // Si tenemos userDbId en localStorage, usarlo
          if (user.userDbId) {
            this.userDbId = user.userDbId;
            this.isAsistente = false;
            console.log('Usando ID de usuario anónimo desde AsyncStorage:', this.userDbId);
            return true;
          }
          
          // Si tenemos id_dispositivo, intentar buscar o crear usuario anónimo
          if (user.id_dispositivo) {
            console.log('Buscando usuario para dispositivo:', user.id_dispositivo);
            
            // Buscar usuario para este dispositivo
            const { data: usuarioExistente, error: errorBusqueda } = await supabase
              .from('usuario')
              .select('id')
              .eq('id_dispositivo', user.id_dispositivo)
              .single();
            
            if (!errorBusqueda && usuarioExistente) {
              this.userDbId = usuarioExistente.id;
              console.log('Usuario encontrado para dispositivo:', this.userDbId);
              return true;
            }
            
            // Si no existe, crear nuevo usuario anónimo
            console.log('No se encontró usuario, creando uno nuevo');
            
            const { data: nuevoUsuario, error: errorCreacion } = await supabase
              .from('usuario')
              .insert([{
                nombre: 'Usuario',
                ip: null,
                id_dispositivo: user.id_dispositivo,
                fecha_registro: new Date().toISOString(),
                tipo_usuario: 'anonimo',
                ultimo_acceso: new Date().toISOString()
              }])
              .select();
            
            if (errorCreacion) {
              console.error('Error al crear usuario anónimo:', errorCreacion);
            } else if (nuevoUsuario && nuevoUsuario.length > 0) {
              this.userDbId = nuevoUsuario[0].id;
              console.log('Nuevo usuario anónimo creado:', this.userDbId);
              
              // Actualizar AsyncStorage
              user.userDbId = this.userDbId;
              await AsyncStorage.setItem('userData', JSON.stringify(user));
              
              return true;
            }
          }
        }
      } catch (storageError) {
        console.error('Error al leer AsyncStorage:', storageError);
      }
      
      // Si llegamos hasta aquí, no pudimos obtener o crear un usuario
      // Pero aún así, permitir que la app funcione en modo sólo lectura
      console.warn('No se pudo inicializar completamente el servicio de mensajes');
      return true; // Retornar true para que la app pueda continuar
    } catch (error) {
      console.error('Error al inicializar MensajesService:', error);
      return false;
    }
  }

  // Obtener mensajes de una conversación específica
  async getMensajes(solicitudId) {
    try {
      console.log('Obteniendo mensajes para solicitud:', solicitudId);
      
      // Verificar estructura de la tabla
      const { data: sampleData, error: sampleError } = await supabase
        .from(this.tableName)
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('Error al obtener muestra de mensajes:', sampleError);
      } else {
        console.log('Estructura de tabla mensajes:', sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : []);
      }
      
      // Consultar mensajes para esta solicitud
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('solicitud_id', solicitudId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error al obtener mensajes:', error);
        throw error;
      }
      
      console.log(`Se encontraron ${data?.length || 0} mensajes`);
      
      // Marcar mensajes como leídos
      await this.marcarTodosComoLeidos(solicitudId);
      
      // Procesar mensajes para añadir información del remitente
      // Nota: Como no tenemos usuario_id ni asistente_id en la tabla,
      // usamos el campo tipo para determinar el remitente
      const mensajesProcesados = data?.map(mensaje => {
        const esDeAsistente = mensaje.tipo === 'asistente';
        const esPropio = this.isAsistente ? esDeAsistente : !esDeAsistente;
        
        return {
          ...mensaje,
          nombreRemitente: esDeAsistente ? 'Asistente' : 'Usuario',
          isFromCurrentUser: esPropio
        };
      }) || [];
      
      return mensajesProcesados;
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      return [];
    }
  }

  // Enviar un nuevo mensaje
  async enviarMensaje(solicitudId, mensaje, asistenteId = null) {
    try {
      console.log('Enviando mensaje para solicitud:', solicitudId);
      
      // Verificar primero si la solicitud está finalizada
      try {
        const { data: solicitud, error: solicitudError } = await supabase
          .from('solicitudes_asistencia')
          .select('estado')
          .eq('id', solicitudId)
          .single();
        
        if (!solicitudError && solicitud && solicitud.estado === 'finalizada') {
          console.error('No se pueden enviar mensajes en una solicitud finalizada');
          throw new Error('Esta solicitud ha sido finalizada y no acepta nuevos mensajes');
        }
      } catch (verificacionError) {
        console.warn('Error al verificar estado de solicitud:', verificacionError);
        // Continuar aunque haya error en la verificación
      }
      
      // El userDbId es opcional, el usuario puede no estar inicializado
      // en la versión móvil, especialmente para usuarios anónimos
      
      // Si no tenemos userDbId pero tenemos una solicitud, podemos
      // obtener el usuario_id de la solicitud
      if (!this.userDbId && solicitudId) {
        try {
          const { data: solicitud, error } = await supabase
            .from('solicitudes_asistencia')
            .select('usuario_id')
            .eq('id', solicitudId)
            .single();
          
          if (!error && solicitud && solicitud.usuario_id) {
            console.log('Obtenido usuario_id de la solicitud:', solicitud.usuario_id);
            // Usar temporalmente el ID de usuario de la solicitud
            this.userDbId = solicitud.usuario_id;
          }
        } catch (solicitudError) {
          console.warn('Error al obtener información de solicitud:', solicitudError);
        }
      }
      
      const nuevoMensaje = {
        solicitud_id: solicitudId,
        contenido: mensaje,
        tipo: this.isAsistente ? 'asistente' : 'usuario',
        leido: false
      };
      
      console.log('Datos del mensaje a insertar:', nuevoMensaje);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert([nuevoMensaje])
        .select()
        .single();
      
      if (error) {
        console.error('Error al insertar mensaje:', error);
        throw error;
      }
      
      console.log('Mensaje guardado con éxito, ID:', data?.id);
      
      return data;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }

  // Marcar mensaje como leído
  async marcarComoLeido(mensajeId) {
    try {
      console.log('Marcando mensaje como leído:', mensajeId);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ 
          leido: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', mensajeId);
      
      if (error) {
        console.error('Error al marcar mensaje como leído:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error al marcar mensaje como leído:', error);
      return false;
    }
  }

  // Marcar todos los mensajes de una conversación como leídos
  async marcarTodosComoLeidos(solicitudId) {
    try {
      console.log('Marcando todos los mensajes como leídos para solicitud:', solicitudId);
      
      // Si soy asistente, quiero marcar como leídos los mensajes de tipo "usuario"
      // Si soy usuario, quiero marcar como leídos los mensajes de tipo "asistente"
      const tipoAMarcar = this.isAsistente ? 'usuario' : 'asistente';
      
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ 
          leido: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('solicitud_id', solicitudId)
        .eq('tipo', tipoAMarcar)
        .eq('leido', false);
      
      if (error) {
        console.error('Error al marcar todos los mensajes como leídos:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error al marcar todos los mensajes como leídos:', error);
      return false;
    }
  }

  // Suscribirse a nuevos mensajes (usando Supabase Realtime)
  suscribirseAMensajes(solicitudId, callback) {
    try {
      console.log('Suscribiéndose a mensajes para solicitud:', solicitudId);
      
      const subscription = supabase
        .channel(`mensajes-${solicitudId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: this.tableName,
          filter: `solicitud_id=eq.${solicitudId}`
        }, payload => {
          console.log('Nuevo mensaje recibido via Realtime:', payload.new);
          // Procesar el mensaje recibido
          this.procesarMensajeRecibido(payload.new, callback);
        })
        .subscribe();
      
      return subscription;
    } catch (error) {
      console.error('Error al suscribirse a mensajes:', error);
      return null;
    }
  }

  // Procesar un mensaje recibido para completar información faltante
  async procesarMensajeRecibido(mensaje, callback) {
    try {
      console.log('Procesando mensaje recibido:', mensaje);
      
      // Determinar si el mensaje es del usuario actual
      // Como no tenemos usuario_id o asistente_id, usamos el tipo
      const esDeAsistente = mensaje.tipo === 'asistente';
      const isFromCurrentUser = this.isAsistente ? esDeAsistente : !esDeAsistente;
      
      // Si no es nuestro mensaje, marcarlo como leído
      if (!isFromCurrentUser) {
        // Marcar como leído automáticamente si la app está abierta
        this.marcarComoLeido(mensaje.id);
      }
      
      // Determinar nombre del remitente
      const nombreRemitente = isFromCurrentUser ? 'Tú' : 
                             (esDeAsistente ? 'Asistente' : 'Usuario');
      
      // Añadir información procesada al mensaje
      const mensajeCompleto = {
        ...mensaje,
        nombreRemitente,
        isFromCurrentUser
      };
      
      // Ejecutar el callback con el mensaje completo
      callback(mensajeCompleto);
    } catch (error) {
      console.error('Error al procesar mensaje recibido:', error);
      // Devolver el mensaje original si hay error
      callback(mensaje);
    }
  }

  // Cancelar suscripción a mensajes
  cancelarSuscripcion(subscription) {
    if (subscription) {
      console.log('Cancelando suscripción a mensajes');
      supabase.removeChannel(subscription);
    }
  }

  // Obtener mensajes no leídos de una solicitud específica
  async getMensajesNoLeidos(solicitudId) {
    try {
      console.log('Obteniendo mensajes no leídos para solicitud:', solicitudId);
      
      // Si soy asistente, busco mensajes de tipo "usuario" no leídos
      // Si soy usuario, busco mensajes de tipo "asistente" no leídos
      const tipoABuscar = this.isAsistente ? 'usuario' : 'asistente';
      
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('solicitud_id', solicitudId)
        .eq('tipo', tipoABuscar)
        .eq('leido', false);
      
      if (error) {
        console.error('Error al obtener mensajes no leídos:', error);
        throw error;
      }
      
      console.log(`Se encontraron ${data?.length || 0} mensajes no leídos`);
      return data || [];
    } catch (error) {
      console.error('Error al obtener mensajes no leídos:', error);
      return [];
    }
  }

  // Obtener cantidad de mensajes no leídos en todas las solicitudes
  async getCantidadMensajesNoLeidos() {
    try {
      console.log('Obteniendo cantidad de mensajes no leídos');
      
      // Si soy asistente, busco mensajes de tipo "usuario" no leídos
      // Si soy usuario, busco mensajes de tipo "asistente" no leídos
      const tipoABuscar = this.isAsistente ? 'usuario' : 'asistente';
      
      // Primero obtener las solicitudes del usuario o asistente
      let solicitudes = [];
      
      if (this.isAsistente && this.asistenteId) {
        // Obtener solicitudes asignadas al asistente
        const { data: solicitudesAsistente, error: errorSolicitudes } = await supabase
          .from('solicitudes_asistencia')
          .select('id')
          .eq('asistente_id', this.asistenteId);
        
        if (errorSolicitudes) {
          console.error('Error al obtener solicitudes del asistente:', errorSolicitudes);
          return 0;
        }
        
        solicitudes = solicitudesAsistente || [];
      } else if (this.userDbId) {
        // Obtener solicitudes del usuario
        const { data: solicitudesUsuario, error: errorSolicitudes } = await supabase
          .from('solicitudes_asistencia')
          .select('id')
          .eq('usuario_id', this.userDbId);
        
        if (errorSolicitudes) {
          console.error('Error al obtener solicitudes del usuario:', errorSolicitudes);
          return 0;
        }
        
        solicitudes = solicitudesUsuario || [];
      } else {
        console.warn('No se puede obtener mensajes no leídos sin ID de usuario/asistente');
        return 0;
      }
      
      if (solicitudes.length === 0) {
        return 0;
      }
      
      // Obtener IDs de solicitudes
      const solicitudIds = solicitudes.map(s => s.id);
      
      // Contar mensajes no leídos
      const { count, error } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .in('solicitud_id', solicitudIds)
        .eq('tipo', tipoABuscar)
        .eq('leido', false);
      
      if (error) {
        console.error('Error al contar mensajes no leídos:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error al obtener cantidad de mensajes no leídos:', error);
      return 0;
    }
  }
  
  // Obtener todas las solicitudes con mensajes no leídos
  async getSolicitudesConMensajesNoLeidos() {
    try {
      console.log('Obteniendo solicitudes con mensajes no leídos');
      
      // Si soy asistente, busco mensajes de tipo "usuario" no leídos
      // Si soy usuario, busco mensajes de tipo "asistente" no leídos
      const tipoABuscar = this.isAsistente ? 'usuario' : 'asistente';
      
      let solicitudes = [];
      
      if (this.isAsistente && this.asistenteId) {
        // Para asistentes: obtener solicitudes asignadas
        const { data: solicitudesAsistente, error: errorSolicitudes } = await supabase
          .from('solicitudes_asistencia')
          .select('id')
          .eq('asistente_id', this.asistenteId);
        
        if (errorSolicitudes) {
          console.error('Error al obtener solicitudes del asistente:', errorSolicitudes);
          return [];
        }
        
        solicitudes = solicitudesAsistente || [];
      } else if (this.userDbId) {
        // Para usuarios: obtener solicitudes propias
        const { data: solicitudesUsuario, error: errorSolicitudes } = await supabase
          .from('solicitudes_asistencia')
          .select('id')
          .eq('usuario_id', this.userDbId);
        
        if (errorSolicitudes) {
          console.error('Error al obtener solicitudes del usuario:', errorSolicitudes);
          return [];
        }
        
        solicitudes = solicitudesUsuario || [];
      } else {
        console.warn('No se puede obtener solicitudes sin ID de usuario/asistente');
        return [];
      }
      
      if (solicitudes.length === 0) {
        return [];
      }
      
      // Obtener IDs de solicitudes
      const solicitudIds = solicitudes.map(s => s.id);
      
      // Consulta SQL nativa para agrupar por solicitud_id
      // No usamos group por simplicidad en la implementación móvil
      
      // Obtenemos todos los mensajes no leídos
      const { data, error } = await supabase
        .from(this.tableName)
        .select('solicitud_id')
        .in('solicitud_id', solicitudIds)
        .eq('tipo', tipoABuscar)
        .eq('leido', false);
      
      if (error) {
        console.error('Error al obtener solicitudes con mensajes no leídos:', error);
        return [];
      }
      
      // Agrupamos manualmente
      const resultado = [];
      const contadorPorSolicitud = {};
      
      // Contar mensajes por solicitud_id
      (data || []).forEach(mensaje => {
        const solicitudId = mensaje.solicitud_id;
        contadorPorSolicitud[solicitudId] = (contadorPorSolicitud[solicitudId] || 0) + 1;
      });
      
      // Convertir a formato array
      Object.keys(contadorPorSolicitud).forEach(solicitudId => {
        resultado.push({
          solicitud_id: solicitudId,
          count: contadorPorSolicitud[solicitudId]
        });
      });
      
      return resultado;
    } catch (error) {
      console.error('Error al obtener solicitudes con mensajes no leídos:', error);
      return [];
    }
  }
}

export default new MensajesService();