// src/stores/chat.store.js
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import socketService from '../services/socket.service';
import { solicitudesAsistenciaService } from '../services/solicitudAsistenciaService';
import { mensajesService } from '../services/mensajesService';
import { asistenteService } from '../services/asistenteService';
import loggerService from '../services/logger.service';
import notificationService from '../services/notificacion.service';

// Nombre del módulo para logging
const LOG_MODULE = 'ChatStore';

export const useChatStore = defineStore('chat', {
  state: () => ({
    // Usuario
    userId: null,      // ID del usuario actual (puede ser user_id de auth o id de asistente/usuario)
    userName: '',      // Nombre del usuario actual
    userDbId: null,    // ID en la tabla (usuario o asistentes)
    
    // Rol del usuario (asistente o usuario)
    userRole: 'usuario',
    
    // Sala
    roomId: null,
    currentSolicitudId: null,
    participants: [],
    
    // Estado del chat
    isInRoom: false,
    isTyping: false,
    
    // Mensajes
    messages: [],
    unreadMessages: [],
    
    // Solicitud actual que se está atendiendo
    currentRequest: null,
    
    // Estado de carga y errores
    loading: false,
    error: null,
    
    // Control de reconexión
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    
    // Socket conectado
    socketConnected: false
  }),
  
  actions: {
    // Inicialización
    initialize() {
      loggerService.info(LOG_MODULE, 'Inicializando Chat Store');
      
      // Generar ID único para este usuario si no existe
      if (!this.userId) {
        this.userId = uuidv4();
        loggerService.debug(LOG_MODULE, 'Generado nuevo ID de usuario', { userId: this.userId });
      }
      
      // Configurar escuchas de socket
      this.setupSocketListeners();
    },
    
    // Establecer rol de usuario
    setUserRole(role) {
      this.userRole = role;
      loggerService.debug(LOG_MODULE, `Rol de usuario establecido a: ${role}`);
    },
    
    // Establecer ID de usuario en la base de datos
    setUserDbId(id) {
      this.userDbId = id;
      loggerService.debug(LOG_MODULE, `ID de usuario en BD establecido a: ${id}`);
    },
    
    // Establecer solicitud actual
    setCurrentRequest(request) {
      loggerService.debug(LOG_MODULE, 'Estableciendo solicitud actual', { 
        id: request?.id, 
        estado: request?.estado 
      });
      
      this.currentRequest = request;
      
      if (request) {
        this.currentSolicitudId = request.id;
        this.roomId = request.room_id;
      }
    },
    
    // Establecer estado de escritura
    setTypingStatus(isTyping) {
      this.isTyping = isTyping;
      
      // Si estamos en una sala, emitir el evento
      if (this.isInRoom && this.roomId && this.currentSolicitudId) {
        try {
          mensajesService.enviarEscribiendo(
            this.currentSolicitudId,
            this.userId,
            isTyping
          );
        } catch (error) {
          loggerService.warn(LOG_MODULE, 'Error al enviar estado de escritura', error);
        }
      }
    },
    
    // Configurar escuchas de socket
    setupSocketListeners() {
      loggerService.debug(LOG_MODULE, 'Configurando escuchas de socket');
      
      // Cuando un usuario se une a la sala
      socketService.on('user-joined', (participant) => {
        loggerService.info(LOG_MODULE, 'Usuario unido a la sala', participant);
        this.addParticipant(participant);
      });
      
      // Cuando un usuario deja la sala
      socketService.on('user-left', ({ userId }) => {
        loggerService.info(LOG_MODULE, 'Usuario ha dejado la sala', { userId });
        this.removeParticipant(userId);
      });
      
      // Cuando recibimos la lista de usuarios en la sala
      socketService.on('room-users', (users) => {
        loggerService.debug(LOG_MODULE, 'Lista de usuarios en la sala', { count: users.length });
        this.participants = users;
      });
      
      // Cuando recibimos un mensaje de chat
      socketService.on('new-message', (messageData) => {
        loggerService.info(LOG_MODULE, 'Mensaje recibido', {
          sender: messageData.sender,
          length: messageData.message?.length || 0
        });
        
        // Verificar si el mensaje ya existe para evitar duplicados
        const isDuplicate = this.messages.some(m => 
          (m.id && m.id === messageData.id) || 
          (m.timestamp && m.timestamp === messageData.timestamp && 
           m.sender === messageData.sender && 
           m.message === messageData.message)
        );
        
        
        if (!isDuplicate) {
          if (messageData.sender !== this.userName) {
            notificationService.newMessage(
              messageData.message, 
              messageData.sender
            );
          }
          this.messages.push(messageData);
        } else {
          loggerService.debug(LOG_MODULE, 'Mensaje duplicado ignorado');
        }
      });
      
      // Estado de conexión del socket
      socketService.on('connect', () => {
        loggerService.info(LOG_MODULE, 'Socket conectado');
        this.socketConnected = true;
        this.reconnectAttempts = 0;
        
        // Si estábamos en una sala, volver a unirnos
        this.rejoinRoomIfNeeded();
      });
      
      socketService.on('disconnect', (reason) => {
        loggerService.warn(LOG_MODULE, 'Socket desconectado', { reason });
        this.socketConnected = false;
      });
      
      socketService.on('reconnect', (attemptNumber) => {
        loggerService.info(LOG_MODULE, 'Socket reconectado', { attemptNumber });
        this.socketConnected = true;
        this.rejoinRoomIfNeeded();
      });
      
      // Cuando alguien está escribiendo
      socketService.on('typing', (data) => {
        // Solo manejar si el evento no es del usuario actual
        if (data.userId !== this.userId) {
          loggerService.debug(LOG_MODULE, 'Usuario está escribiendo', data);
          // Aquí puedes actualizar un estado para mostrar un indicador de "escribiendo..."
        }
      });
    },
    
    // Volver a unirse a la sala si es necesario
    async rejoinRoomIfNeeded() {
      if (this.isInRoom && this.roomId && this.userName) {
        loggerService.info(LOG_MODULE, 'Volviendo a unirse a sala después de reconexión', {
          roomId: this.roomId
        });
        
        try {
          await socketService.joinRoom(this.roomId, this.userId, this.userName);
        } catch (error) {
          loggerService.error(LOG_MODULE, 'Error al volver a unirse a la sala', error);
        }
      }
    },
    
    // Unirse a una sala de chat
    async joinRoom(roomId, userName, role = 'usuario', solicitudId = null) {
      try {
        this.loading = true;
        this.error = null;
        this.userName = userName;
        this.userRole = role;
        this.currentSolicitudId = solicitudId;
        
        loggerService.info(LOG_MODULE, `Uniéndose a sala de chat`, {
          roomId,
          userName,
          role,
          solicitudId
        });
        
        // Obtener información de la solicitud si tenemos ID
        if (solicitudId) {
          try {
            const solicitud = await solicitudesAsistenciaService.getSolicitudById(solicitudId);
            if (solicitud) {
              this.currentRequest = solicitud;
              loggerService.debug(LOG_MODULE, 'Información de solicitud cargada', {
                estado: solicitud.estado,
                asistente_id: solicitud.asistente_id
              });
            }
          } catch (error) {
            loggerService.warn(LOG_MODULE, 'No se pudo obtener información de la solicitud', error);
          }
        }
        
        this.roomId = roomId;
        
        // Unirse a la sala vía Socket.io
        try {
          await socketService.connect();
          this.socketConnected = true;
          socketService.joinRoom(roomId, this.userId, userName);
          
          // Cargar mensajes históricos
          if (solicitudId) {
            await this.loadHistoricalMessages(solicitudId);
          }
          
          this.isInRoom = true;
          return true;
        } catch (error) {
          loggerService.error(LOG_MODULE, 'Error al conectar con el servidor de socket', error);
          this.error = 'Error de conexión con el servidor';
          return false;
        }
      } catch (error) {
        loggerService.error(LOG_MODULE, 'Error al unirse a la sala de chat', error);
        this.error = 'Error al unirse a la sala de chat: ' + error.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // Cargar mensajes históricos
    async loadHistoricalMessages(solicitudId) {
      loggerService.info(LOG_MODULE, 'Cargando mensajes históricos', { solicitudId });
      
      try {
        const messages = await mensajesService.getMensajesBySolicitud(solicitudId);
        loggerService.debug(LOG_MODULE, 'Mensajes históricos recuperados', { 
          count: messages?.length || 0 
        });
        
        if (messages && messages.length) {
          // Formatear mensajes para que coincidan con el formato esperado
          this.messages = messages.map(m => {
            let senderName = 'Desconocido';
            
            // Determinar nombre del remitente
            if (m.asistente_id && m.asistente) {
              senderName = m.asistente.nombre || 'Asistente';
            } else if (m.usuario_id && m.usuario) {
              senderName = m.usuario.nombre || 'Usuario';
            }
            
            return {
              id: m.id,
              message: m.contenido,
              sender: senderName,
              timestamp: m.created_at,
              isLocal: this.isMessageFromCurrentUser(m),
              leido: m.leido
            };
          });
        } else {
          // Inicializar con array vacío
          this.messages = [];
        }
        
        // Marcar mensajes como leídos si corresponde
        if (this.currentSolicitudId) {
          // Si somos usuario, marcar como leídos los mensajes del asistente
          // Si somos asistente, marcar como leídos los mensajes del usuario
          try {
            if (this.userRole === 'usuario') {
              await mensajesService.marcarComoLeidos(solicitudId, this.userDbId);
            } else {
              await mensajesService.marcarComoLeidos(solicitudId);
            }
            
            loggerService.debug(LOG_MODULE, 'Mensajes marcados como leídos');
          } catch (error) {
            loggerService.warn(LOG_MODULE, 'Error al marcar mensajes como leídos', error);
          }
        }
        
        return true;
      } catch (error) {
        loggerService.error(LOG_MODULE, 'Error al cargar mensajes históricos', error);
        return false;
      }
    },
    
    // Determinar si un mensaje es del usuario actual
    isMessageFromCurrentUser(message) {
      if (this.userRole === 'asistente') {
        return message.asistente_id && (message.asistente_id === this.userDbId);
      } else {
        return message.usuario_id && (message.usuario_id === this.userDbId);
      }
    },
    
    // Enviar mensaje de chat
    async sendMessage(content) {
      if (!content.trim() || !this.isInRoom) {
        loggerService.warn(LOG_MODULE, 'Intento de enviar mensaje vacío o fuera de sala');
        return false;
      }
      
      loggerService.info(LOG_MODULE, 'Enviando mensaje', { 
        length: content.length,
        roomId: this.roomId
      });
      
      try {
        // Crear objeto de mensaje para la UI
        const messageData = {
          message: content,
          sender: this.userName,
          timestamp: new Date().toISOString(),
          isLocal: true
        };
        
        // Añadir a la lista de mensajes locales
        this.messages.push(messageData);
        
        // Enviar a través de socket para usuarios en la sala
        if (socketService.isConnected) {
          loggerService.debug(LOG_MODULE, 'Enviando mensaje por socket');
          socketService.emit('send-message', {
            roomId: this.roomId,
            message: content,
            sender: this.userName,
            timestamp: new Date().toISOString()
          });
        } else {
          loggerService.warn(LOG_MODULE, 'Socket no conectado al enviar mensaje');
        }
        
        // Guardar en la base de datos
        if (this.currentSolicitudId) {
          const mensaje = {
            solicitud_id: this.currentSolicitudId,
            contenido: content,
            tipo: 'asistente', // Usar el tipo para identificar quién envió el mensaje
            leido: false,
            // Añadir información de metadatos para el servicio
            _esAsistente: this.userRole === 'asistente',
            _asistenteId: this.userRole === 'asistente' ? this.userDbId : null,
            _usuarioId: this.userRole !== 'asistente' ? this.userDbId : null
          };
          
          try {
            const mensajeGuardado = await mensajesService.enviarMensaje(mensaje);
            loggerService.debug(LOG_MODULE, 'Mensaje guardado en base de datos', { 
              id: mensajeGuardado?.id 
            });
          } catch (error) {
            loggerService.error(LOG_MODULE, 'Error al guardar mensaje en base de datos', error);
            // Continuamos aunque haya error al guardar
          }
        } else {
          loggerService.warn(LOG_MODULE, 'No hay ID de solicitud, mensaje no guardado en DB');
        }
        
        return true;
      } catch (error) {
        loggerService.error(LOG_MODULE, 'Error al enviar mensaje', error);
        this.error = 'Error al enviar mensaje: ' + error.message;
        return false;
      }
    },
    
    // Agregar participante a la lista
    addParticipant(participant) {
      const exists = this.participants.some(p => p.userId === participant.userId);
      if (!exists) {
        this.participants.push(participant);
        loggerService.debug(LOG_MODULE, 'Participante añadido al chat', {
          userName: participant.userName,
          userId: participant.userId
        });
      }
    },
    
    // Eliminar participante de la lista
    removeParticipant(userId) {
      const initialCount = this.participants.length;
      this.participants = this.participants.filter(p => p.userId !== userId);
      
      if (initialCount !== this.participants.length) {
        loggerService.debug(LOG_MODULE, 'Participante eliminado del chat', { userId });
      }
    },
    
    // Salir de la sala de chat
    leaveRoom() {
      if (!this.isInRoom) return;
      
      loggerService.info(LOG_MODULE, 'Abandonando sala de chat', { roomId: this.roomId });
      
      if (socketService.isConnected) {
        socketService.leaveRoom(this.roomId);
      }
      
      this.isInRoom = false;
      this.roomId = null;
      this.participants = [];
    },
    
    // Limpiar estado al salir
    cleanup() {
      loggerService.info(LOG_MODULE, 'Limpiando estado del chat');
      
      // Salir de la sala
      this.leaveRoom();
      
      // Desconectar socket
      if (socketService.isConnected) {
        socketService.disconnect();
      }
      
      // Restablecer estado
      this.isInRoom = false;
      this.roomId = null;
      this.currentSolicitudId = null;
      this.participants = [];
      this.messages = [];
      this.unreadMessages = [];
      this.currentRequest = null;
      this.isTyping = false;
      this.error = null;
      this.socketConnected = false;
    },
    
    // Cargar mensajes no leídos
    async loadUnreadMessages() {
      if (!this.userDbId) {
        loggerService.warn(LOG_MODULE, 'No hay ID de usuario para cargar mensajes no leídos');
        return [];
      }
      
      try {
        let messages = [];
        
        if (this.userRole === 'asistente') {
          messages = await mensajesService.getMensajesNoLeidos(this.userDbId);
        } else {
          messages = await mensajesService.getMensajesNoLeidos(this.userDbId);
        }
        
        this.unreadMessages = messages;
        loggerService.debug(LOG_MODULE, 'Mensajes no leídos cargados', { count: messages.length });
        
        return messages;
      } catch (error) {
        loggerService.error(LOG_MODULE, 'Error al cargar mensajes no leídos', error);
        return [];
      }
    },
    
    // Obtener total de mensajes no leídos
    getUnreadMessagesCount() {
      return this.unreadMessages?.length || 0;
    }
  }
});