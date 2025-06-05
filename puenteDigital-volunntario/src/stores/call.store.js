// src/stores/call.store.js
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import socketService from '../services/socket.service';
import webrtcService from '../services/webrtc.service';
import { solicitudesAsistenciaService } from '../services/solicitudAsistenciaService';
import notificationService from '../services/notificacion.service';

export const useCallStore = defineStore('call', {
  state: () => ({
    // Usuario
    userId: null,
    userName: '',
    
    // Rol del usuario (asistente o usuario)
    userRole: 'usuario',
    
    // Sala
    roomId: null,
    roomInfo: null,
    participants: [],
    
    // Estado de la llamada
    isInCall: false,
    localStream: null,
    remoteStreams: {},
    audioEnabled: true,
    videoEnabled: true,
    
    // Mensajes
    messages: [],
    
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
      
      // Configurar WebRTC
      webrtcService.registerCallbacks({
        onRemoteStream: this.handleRemoteStream.bind(this),
        onRemoteStreamClosed: this.handleRemoteStreamClosed.bind(this),
        onConnectionStateChange: this.handleConnectionStateChange.bind(this),
        onError: this.handleError.bind(this)
      });
      
      // Configurar escuchas de socket
      this.setupSocketListeners();
      
      // Inicializar WebRTC
      webrtcService.init().catch(error => {
        console.error('Error al inicializar WebRTC:', error);
        this.error = `Error al inicializar WebRTC: ${error.message}`;
      });
      
      // Establecer ID de usuario en WebRTC
      webrtcService.setUserId(this.userId);
    },
    
    // Establecer rol de usuario
    setUserRole(role) {
      this.userRole = role;
    },
    
    // Establecer solicitud actual
    setCurrentRequest(request) {
      this.currentRequest = request;
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
      });
      
      // Cuando se solicita iniciar una llamada
      socketService.on('call-requested', ({ from, fromName }) => {
        console.log('Solicitud de llamada recibida de:', fromName);
        notificationService.incomingCall(fromName);
        // Si somos usuario normal, aceptar automáticamente si ya nos unimos a la sala
        if (this.userRole === 'usuario') {
          this.acceptCall(from);
        } else {
          // Si somos asistente, aceptar también
          this.acceptCall(from);
        }
      });
    },


    // Añade este método a tu call.store.js

    /**
     * Método para reconectar con un usuario específico
     * @param {string} userId - ID del usuario con el que reconectar
     * @returns {Promise<boolean>} - True si la reconexión fue exitosa
     */
    async reconnectWithUser(userId) {
      console.log(`Iniciando reconexión con ${userId}`);
      
      // Si no hay conexión con este usuario, no hacer nada
      if (!this.remoteStreams[userId]) {
        console.warn(`No hay stream remoto para ${userId}, no se puede reconectar`);
        return false;
      }
      
      try {
        // 1. Guardar referencia al estado actual
        const currentState = {
          stream: this.remoteStreams[userId],
          connection: this.webRTCService.getConnection(userId)
        };
        
        // 2. Cerrar la conexión existente
        console.log(`Cerrando conexión existente con ${userId}`);
        await this.webRTCService.closeConnection(userId);
        
        // 3. Actualizar estado interno
        this.connectionStates[userId] = 'reconnecting';
        delete this.remoteStreams[userId];
        
        // 4. Esperar un momento para que la conexión se cierre completamente
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 5. Iniciar una nueva llamada
        console.log(`Iniciando nueva conexión con ${userId}`);
        await this.callUser(userId);
        
        // 6. Verificar si la reconexión fue exitosa
        const reconnected = !!this.remoteStreams[userId];
        
        console.log(`Reconexión con ${userId} ${reconnected ? 'exitosa' : 'fallida'}`);
        return reconnected;
        
      } catch (error) {
        console.error(`Error al reconectar con ${userId}:`, error);
        this.connectionStates[userId] = 'failed';
        return false;
      }
    },
    
    // Unirse a una sala
    async joinRoom(roomId, userName, role = 'usuario') {
      try {
        this.loading = true;
        this.error = null;
        this.userName = userName;
        this.userRole = role;
        
        console.log(`Uniéndose a sala ${roomId} como ${userName} (${role})`);
        
        // Obtener información de la solicitud
        if (role === 'usuario') {
          try {
            const solicitudes = await solicitudesAsistenciaService.getSolicitudesByUsuario();
            const solicitud = solicitudes.find(s => s.room_id === roomId);
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
        
        return true;
      } catch (error) {
        console.error('Error al unirse a la sala:', error);
        this.error = 'Error al unirse a la sala: ' + error.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // Iniciar llamada con otro participante
    async callUser(targetUserId) {
      try {
        console.log(`Llamando a usuario ${targetUserId}...`);
        
        // Iniciar stream local si no existe
        if (!this.localStream) {
          await this.startLocalStream();
        }
        
        // Iniciar conexión WebRTC
        await webrtcService.initConnection(targetUserId, true);
        
        // Notificar al otro usuario
        socketService.callUser(targetUserId);
        
        this.isInCall = true;
        return true;
      } catch (error) {
        console.error('Error al iniciar llamada:', error);
        this.error = 'Error al iniciar llamada: ' + error.message;
        return false;
      }
    },
    
    // Aceptar llamada entrante
    async acceptCall(fromUserId) {
      try {
        console.log(`Aceptando llamada de ${fromUserId}`);
        
        // Iniciar stream local si no existe
        if (!this.localStream) {
          await this.startLocalStream();
        }
        
        this.isInCall = true;
        return true;
      } catch (error) {
        console.error('Error al aceptar llamada:', error);
        this.error = 'Error al aceptar llamada: ' + error.message;
        return false;
      }
    },
    
    // Finalizar llamada
    endCall() {
      console.log('Finalizando llamada...');
      webrtcService.closeAllConnections();
      socketService.endCall();
      this.isInCall = false;
      this.remoteStreams = {};
    },
    
    // Iniciar flujos de medios locales
    async startLocalStream() {
      try {
        console.log('Solicitando acceso a cámara y micrófono...');
        this.localStream = await webrtcService.getLocalStream();
        return this.localStream;
      } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        this.error = 'Error al acceder a la cámara: ' + error.message;
        return null;
      }
    },
    
    // Alternar micrófono
    toggleAudio() {
      this.audioEnabled = !this.audioEnabled;
      webrtcService.toggleAudio(this.audioEnabled);
      console.log(`Micrófono ${this.audioEnabled ? 'activado' : 'desactivado'}`);
    },
    
    // Alternar cámara
    toggleVideo() {
      this.videoEnabled = !this.videoEnabled;
      webrtcService.toggleVideo(this.videoEnabled);
    },
    
    // Enviar mensaje de chat
    sendMessage(message) {
      const messageData = {
        message,
        sender: this.userName,
        timestamp: new Date().toISOString(),
        isLocal: true // Para identificar mensajes propios en la UI
      };
      
      this.messages.push(messageData);
      socketService.sendMessage(message);
    },
    
    // Manejar stream remoto recibido
    handleRemoteStream(userId, stream) {
      console.log(`Stream remoto recibido de ${userId}`);
      console.log(`Actualizando remoteStreams con stream para ${userId}:`, stream.id);
      
      // ✅ SIEMPRE actualizar el stream (sin verificación de duplicados)
      this.remoteStreams[userId] = stream;
      
      // ✅ FORZAR reactividad para que Vue detecte el cambio
      this.remoteStreams = { ...this.remoteStreams };
      
      console.log('Stream remoto actualizado en store');
    },
    
    // Manejar cierre de stream remoto
    handleRemoteStreamClosed(userId) {
      console.log(`Stream remoto cerrado para ${userId}`);
      const newStreams = { ...this.remoteStreams };
      delete newStreams[userId];
      this.remoteStreams = newStreams;
    },
    
    // Manejar cambio de estado de conexión
    handleConnectionStateChange(userId, state) {
      console.log(`Estado de conexión para ${userId}: ${state}`);
      
      // Si la conexión se cierra inesperadamente, actualizar UI
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.handleRemoteStreamClosed(userId);
      }
    },
    
    // Manejar errores de WebRTC
    handleError(type, error, userId) {
      console.error(`Error de ${type}:`, error);
      this.error = `Error de ${type}: ${error.message}`;
      
      // Si el error es fatal, cerrar la conexión
      if (type === 'peer' || type === 'media') {
        if (userId) {
          this.handleRemoteStreamClosed(userId);
        }
      }
    },
    
    // Agregar participante a la lista
    addParticipant(participant) {
      const exists = this.participants.some(p => p.userId === participant.userId);
      if (!exists) {
        this.participants.push(participant);
        console.log('Participante añadido:', participant.userName);
        
        // Si somos asistente y ya estamos en llamada, llamar al nuevo usuario
        if (this.userRole === 'asistente' && this.isInCall && participant.userRole !== 'asistente') {
          console.log('Llamando automáticamente a nuevo usuario:', participant.userName);
          this.callUser(participant.userId);
        }
      }
    },
    
    // Eliminar participante de la lista
    removeParticipant(userId) {
      this.participants = this.participants.filter(p => p.userId !== userId);
      console.log('Participante eliminado:', userId);
      
      // Cerrar conexión con este usuario si existe
      if (this.remoteStreams[userId]) {
        webrtcService.closeConnection(userId);
      }
    },
    
    // Limpiar estado al salir
    cleanup() {
      console.log('Limpiando estado de la videollamada...');
      
      // Cerrar conexiones WebRTC
      webrtcService.cleanup();
      
      // Desconectar socket
      //socketService.leaveRoom();
      socketService.disconnect();
      
      // Restablecer estado
      this.roomId = null;
      this.roomInfo = null;
      this.participants = [];
      this.messages = [];
      this.isInCall = false;
      this.localStream = null;
      this.remoteStreams = {};
      this.currentRequest = null;
      this.error = null;
    }
  }
});