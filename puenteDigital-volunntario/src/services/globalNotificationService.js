// src/services/globalNotificationService.js
import { supabase } from '../../supabase';
import notificationService from './notificacion.service';
import { solicitudesAsistenciaService } from './solicitudAsistenciaService';

class GlobalNotificationService {
  constructor() {
    this.notificacionesProcesadas = new Set();
    this.mensajesProcesados = new Set();
    this.solicitudesChannel = null;
    this.mensajesChannel = null;
    this.isInitialized = false;
    console.log('GlobalNotificationService creado');
  }

  initialize() {
    if (this.isInitialized) {
      console.log('GlobalNotificationService ya está inicializado');
      return;
    }
    
    console.log('Inicializando servicio de notificaciones global');
    
    try {
      // Inicializar suscripción para solicitudes de asistencia
      this.initSolicitudesSubscription();
      
      // Inicializar suscripción para mensajes
      this.initMensajesSubscription();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error al inicializar GlobalNotificationService:', error);
    }
  }

  // Inicializar suscripción a solicitudes de asistencia
  initSolicitudesSubscription() {
    this.solicitudesChannel = supabase
      .channel('global_solicitudes_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'solicitudes_asistencia'
        },
        (payload) => {
          console.log('Evento INSERT de solicitud recibido:', payload);
          this.handleNewSolicitud(payload);
        }
      )
      .subscribe((status) => {
        console.log('Estado de suscripción de solicitudes:', status);
      });
    
    console.log('Canal de suscripción para solicitudes creado');
  }

  // Inicializar suscripción a mensajes
  initMensajesSubscription() {
    this.mensajesChannel = supabase
      .channel('global_mensajes_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes'
        },
        (payload) => {
          console.log('Evento INSERT de mensaje recibido:', payload);
          this.handleNewMensaje(payload);
        }
      )
      .subscribe((status) => {
        console.log('Estado de suscripción de mensajes:', status);
      });
    
    console.log('Canal de suscripción para mensajes creado');
  }

  // Manejar nueva solicitud de asistencia
  async handleNewSolicitud(payload) {
    try {
      // Verificar si hay un payload válido con new
      if (!payload || !payload.new) {
        console.log('Evento de solicitud recibido sin datos new:', payload);
        return;
      }
      
      console.log('Datos de la solicitud recibida:', {
        id: payload.new.id,
        estado: payload.new.estado,
        tipo_asistencia: payload.new.tipo_asistencia,
        descripcion: payload.new.descripcion
      });
      
      // Validar que es una solicitud pendiente
      const estado = payload.new.estado || 'pendiente'; 
      if (estado !== 'pendiente') {
        console.log('La solicitud no está pendiente, ignorando. Estado:', estado);
        return;
      }

      // Verificar si ya procesamos esta notificación (por ID)
      const notificationKey = `solicitud_${payload.new.id}`;
      if (this.notificacionesProcesadas.has(notificationKey)) {
        console.log('Notificación de solicitud ya procesada, ignorando:', notificationKey);
        return;
      }

      // Limpiar registros antiguos (mantener tamaño del Set controlado)
      this.limpiarRegistrosAntiguos(this.notificacionesProcesadas);
      this.notificacionesProcesadas.add(notificationKey);
      
      // Determinar el tipo de solicitud y personalizar el mensaje
      let tipoAsistencia = payload.new.tipo_asistencia || '';
      tipoAsistencia = tipoAsistencia.trim().toLowerCase();
      
      const tipoSolicitud = tipoAsistencia === 'video' ? 
        'asistencia por video' : 
        (tipoAsistencia === 'chat' ? 'asistencia por chat' : 'asistencia');
      
      console.log(`Mostrando notificación de ${tipoSolicitud}`);
      
      // Mostrar notificación usando el servicio de notificaciones
      notificationService.show(
        `Nueva solicitud de ${tipoSolicitud}`,
        notificationService.TYPES.INFO,
        {
          description: payload.new.descripcion || 'Un usuario necesita ayuda'
        }
      );
      
      console.log('Notificación de solicitud enviada');
    } catch (error) {
      console.error('Error al procesar notificación de solicitud:', error);
    }
  }

  // Manejar nuevo mensaje
  async handleNewMensaje(payload) {
    try {
      // Verificar si hay un payload válido con new
      if (!payload || !payload.new) {
        console.log('Evento de mensaje recibido sin datos new:', payload);
        return;
      }
      
      const mensaje = payload.new;
      console.log('Nuevo mensaje recibido:', mensaje);
      
      // Verificar si ya procesamos este mensaje (por ID)
      const mensajeKey = `mensaje_${mensaje.id}`;
      if (this.mensajesProcesados.has(mensajeKey)) {
        console.log('Mensaje ya procesado, ignorando:', mensajeKey);
        return;
      }
      
      // Verificar si el mensaje ya fue leído
      if (mensaje.leido === true) {
        console.log('Mensaje ya marcado como leído, ignorando');
        return;
      }
      
      // Limpiar registros antiguos
      this.limpiarRegistrosAntiguos(this.mensajesProcesados);
      this.mensajesProcesados.add(mensajeKey);
      
      // Obtener información de la solicitud asociada para saber de quién viene
      try {
        if (mensaje.solicitud_id) {
          const solicitud = await solicitudesAsistenciaService.getSolicitudById(mensaje.solicitud_id);
          
          if (solicitud && solicitud.usuario) {
            const nombreUsuario = solicitud.usuario.nombre || 'Usuario';
            
            // Determinar el tipo de mensaje
            const tipoMensaje = mensaje.tipo === 'texto' ? 
              'mensaje de texto' : 
              (mensaje.tipo === 'imagen' ? 'imagen' : 'mensaje');
            
            // Mostrar notificación con información del remitente
            notificationService.show(
              `Nuevo ${tipoMensaje} de ${nombreUsuario}`,
              notificationService.TYPES.INFO,
              {
                description: this.formatearContenidoMensaje(mensaje.contenido, mensaje.tipo)
              }
            );
            
            console.log('Notificación de mensaje enviada');
            return;
          }
        }
        
        // Si no se pudo obtener la solicitud o no tiene usuario, mostrar notificación genérica
        notificationService.show(
          'Nuevo mensaje recibido',
          notificationService.TYPES.INFO,
          {
            description: this.formatearContenidoMensaje(mensaje.contenido, mensaje.tipo)
          }
        );
        
      } catch (error) {
        console.error('Error al obtener detalles de la solicitud:', error);
        
        // Notificación de respaldo en caso de error
        notificationService.show(
          'Nuevo mensaje recibido',
          notificationService.TYPES.INFO,
          {
            description: this.formatearContenidoMensaje(mensaje.contenido, mensaje.tipo)
          }
        );
      }
    } catch (error) {
      console.error('Error al procesar notificación de mensaje:', error);
    }
  }
  
  // Método utilitario para formatear el contenido del mensaje según su tipo
  formatearContenidoMensaje(contenido, tipo) {
    if (!contenido) return 'Sin contenido';
    
    // Si es texto, truncar si es muy largo
    if (tipo === 'texto' || !tipo) {
      return contenido.length > 50 ? 
        contenido.substring(0, 47) + '...' : 
        contenido;
    }
    
    // Para otros tipos de mensaje
    if (tipo === 'imagen') return 'Ha enviado una imagen';
    if (tipo === 'archivo') return 'Ha enviado un archivo';
    if (tipo === 'audio') return 'Ha enviado un mensaje de voz';
    
    // Tipo desconocido
    return 'Ha enviado un mensaje';
  }
  
  // Método utilitario para limpiar registros antiguos
  limpiarRegistrosAntiguos(conjunto) {
    if (conjunto.size > 50) {
      const firstKey = conjunto.values().next().value;
      conjunto.delete(firstKey);
    }
  }

  cleanup() {
    console.log('Limpiando servicio de notificaciones global');
    
    if (this.solicitudesChannel) {
      supabase.removeChannel(this.solicitudesChannel);
      this.solicitudesChannel = null;
    }
    
    if (this.mensajesChannel) {
      supabase.removeChannel(this.mensajesChannel);
      this.mensajesChannel = null;
    }
    
    this.isInitialized = false;
    console.log('Servicio de notificaciones global desconectado');
  }
}

export default new GlobalNotificationService();