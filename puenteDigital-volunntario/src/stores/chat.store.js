// src/stores/chat.store.js
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import socketService from '../services/socket.service';
import { solicitudesAsistenciaService } from '../services/solicitudAsistenciaService';
import { mensajesService } from '../services/mensajesService';

export const useChatStore = defineStore('chat', {
  state: () => ({
    // Usuario
    userId: null,
    userName: '',
    
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
    
    // Estado de carga
    loading: false,
    error: null
  }),
  
  actions: {
    // Inicialización
    initialize() {
      // Generar ID único para este usuario si no existe
      if (!this.userId) {
        this.userId = uuidv4();
      }
      
      // Configurar escuchas de socket
      this.setupSocketListeners();
    },
    
    // Establecer rol de usuario
    setUserRole(role) {
      this.userRole = role;
    },
    
    // Establecer solicitud actual
    setCurrentRequest(request) {
      this.currentRequest = request;
      
      if (request) {
        this.currentSolicitudId = request.id;
        this.roomId = request.room_id;
      }
    },
    
    // Configurar escuchas de socket
    setupSocketListeners() {
      // Cuando un usuario se une a la sala
      socketService.on('user-joined', (participant) => {
        console.log('Usuario unido a la sala:', participant);
        this.addParticipant(participant);
      });
      
      // Cuando un usuario deja la sala
      socketService.on('user-left', ({ userId }) => {
        console.log('Usuario ha dejado la sala:', userId);
        this.removeParticipant(userId);
      });
      
      // Cuando recibimos la lista de usuarios en la sala
      socketService.on('room-users', (users) => {
        console.log('Lista de usuarios en la sala:', users);
        this.participants = users;
      });
      
      // Cuando recibimos un mensaje de chat
      socketService.on('new-message', (messageData) => {
        console.log('Mensaje recibido:', messageData);
        this.messages.push(messageData);
        
        // Marcar mensaje como no leído si no es propio
        if (messageData.sender !== this.userName) {
          this.unreadMessages.push(messageData);
        }
      });
      
      // Cuando un usuario está escribiendo
      socketService.on('typing', ({ userId, isTyping }) => {
        // Actualizar estado de escritura para ese usuario
        const userIndex = this.participants.findIndex(p => p.userId === userId);
        if (userIndex >= 0) {
          this.participants[userIndex].isTyping = isTyping;
        }
      });
    },
    
    // Unirse a una sala de chat
    async joinRoom(roomId, userName, role = 'usuario', solicitudId = null) {
      try {
        this.loading = true;
        this.error = null;
        this.userName = userName;
        this.userRole = role;
        this.currentSolicitudId = solicitudId;
        
        console.log(`Uniéndose a sala de chat ${roomId} como ${userName} (${role})`);
        
        // Obtener información de la solicitud si tenemos ID
        if (solicitudId) {
          try {
            const solicitud = await solicitudesAsistenciaService.getSolicitudById(solicitudId);
            if (solicitud) {
              this.currentRequest = solicitud;
            }
          } catch (error) {
            console.warn('No se pudo obtener información de la solicitud:', error);
          }
        }
        
        this.roomId = roomId;
        
        // Unirse a la sala vía Socket.io
        await socketService.connect();
        socketService.joinRoom(roomId, this.userId, userName);
        
        // Cargar mensajes históricos
        if (solicitudId) {
          await this.loadHistoricalMessages(solicitudId);
        }
        
        this.isInRoom = true;
        return true;
      } catch (error) {
        console.error('Error al unirse a la sala de chat:', error);
        this.error = 'Error al unirse a la sala de chat: ' + error.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // Cargar mensajes históricos
    async loadHistoricalMessages(solicitudId) {
      try {
        const messages = await mensajesService.getMensajesBySolicitud(solicitudId);
        if (messages && messages.length) {
          // Formatear mensajes para que coincidan con el formato esperado
          this.messages = messages.map(m => ({
            id: m.id,
            message: m.contenido,
            sender: m.usuario_id ? (m.usuario?.nombre || 'Usuario') : (m.asistente?.nombre || 'Asistente'),
            timestamp: m.created_at,
            isLocal: this.isMessageFromCurrentUser(m)
          }));
        }
        return true;
      } catch (error) {
        console.error('Error al cargar mensajes históricos:', error);
        return false;
      }
    },
    
    // Determinar si un mensaje es del usuario actual
    isMessageFromCurrentUser(message) {
      if (this.userRole === 'asistente') {
        return message.asistente_id !== null;
      } else {
        return message.usuario_id === this.userId;
      }
    },
    
    // Enviar mensaje de chat
    async sendMessage(content) {
      if (!content.trim() || !this.isInRoom) return false;
      
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
          socketService.sendMessage(this.roomId, content, this.userName);
        }
        
        // Guardar en la base de datos
        if (this.currentSolicitudId) {
          const mensaje = {
            solicitud_id: this.currentSolicitudId,
            contenido: content,
            tipo: 'texto',
            leido: false
          };
          
          // Añadir ID según el rol
          if (this.userRole === 'asistente') {
            mensaje.asistente_id = this.userId;
          } else {
            mensaje.usuario_id = this.userId;
          }
          
          try {
            await mensajesService.enviarMensaje(mensaje);
          } catch (error) {
            console.error('Error al guardar mensaje en base de datos:', error);
            // Continuamos aunque haya error al guardar
          }
        }
        
        return true;
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        this.error = 'Error al enviar mensaje: ' + error.message;
        return false;
      }
    },
    
    // Indicar que el usuario está escribiendo
    setTypingStatus(isTyping) {
      if (this.isTyping === isTyping) return;
      
      this.isTyping = isTyping;
      
      // Solo emitir evento si estamos conectados
      if (socketService.isConnected && this.roomId) {
        try {
          socketService.emit('typing', {
            roomId: this.roomId,
            userId: this.userId,
            isTyping
          });
        } catch (error) {
          console.warn('No se pudo enviar estado de escritura:', error);
        }
      }
    },
    
    // Marcar mensajes como leídos
    async markMessagesAsRead() {
      if (!this.currentSolicitudId) return;
      
      try {
        if (this.userRole === 'asistente') {
          // Si somos asistente, marcar los mensajes del usuario como leídos
          await mensajesService.marcarComoLeidos(this.currentSolicitudId, null);
        } else {
          // Si somos usuario, marcar los mensajes del asistente como leídos
          await mensajesService.marcarComoLeidos(this.currentSolicitudId, this.userId);
        }
        
        // Limpiar lista local de mensajes no leídos
        this.unreadMessages = [];
      } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
      }
    },
    
    // Agregar participante a la lista
    addParticipant(participant) {
      const exists = this.participants.some(p => p.userId === participant.userId);
      if (!exists) {
        this.participants.push(participant);
        console.log('Participante añadido al chat:', participant.userName);
      }
    },
    
    // Eliminar participante de la lista
    removeParticipant(userId) {
      this.participants = this.participants.filter(p => p.userId !== userId);
      console.log('Participante eliminado del chat:', userId);
    },
    
    // Salir de la sala de chat
    leaveRoom() {
      if (!this.isInRoom) return;
      
      if (socketService.isConnected) {
        socketService.leaveRoom(this.roomId);
      }
      
      this.isInRoom = false;
      this.roomId = null;
      this.participants = [];
      
      console.log('Abandonando sala de chat');
    },
    
    // Limpiar estado al salir
    cleanup() {
      console.log('Limpiando estado del chat...');
      
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
    }
  }
});