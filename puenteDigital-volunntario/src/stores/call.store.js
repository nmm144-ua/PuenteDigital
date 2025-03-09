// src/stores/call.store.js
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import socketService from '../services/socket.service';
import webrtcService from '../services/webrtc.service';
import roomService from '../services/room.service';

export const useCallStore = defineStore('call', {
  state: () => ({
    // Usuario
    userId: null,
    userName: '',
    
    // Rol del usuario (asistente o usuario)
    userRole: 'asistente',
    
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
      
      // Configurar escuchas de socket
      this.setupSocketListeners();
      
      // Configurar callbacks de WebRTC
      webrtcService.registerCallbacks({
        onRemoteStream: this.handleRemoteStream.bind(this),
        onRemoteStreamClosed: this.handleRemoteStreamClosed.bind(this)
      });
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
        // Si somos usuario normal, mostrar confirmación
        if (this.userRole === 'usuario') {
          if (confirm(`${fromName} quiere iniciar una videollamada contigo. ¿Aceptas?`)) {
            this.acceptCall(from);
          }
        } else {
          // Si somos asistente, aceptar automáticamente
          this.acceptCall(from);
        }
      });
    },
    
    // Unirse a una sala
    async joinRoom(roomId, userName, role = 'asistente') {
      try {
        this.loading = true;
        this.error = null;
        this.userName = userName;
        this.userRole = role;
        
        console.log(`Uniéndose a sala ${roomId} como ${userName} (${role})`);
        
        // Obtener información de la sala
        try {
          this.roomInfo = await roomService.getRoomInfo(roomId);
        } catch (error) {
          console.warn('No se pudo obtener información de la sala:', error);
          // Continuar de todos modos, la sala podría existir pero el endpoint falla
        }
        
        this.roomId = roomId;
        
        // Unirse a la sala vía Socket.io
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
    
    // Crear una nueva sala
    async createRoom(hostName) {
      try {
        this.loading = true;
        this.error = null;
        this.userName = hostName;
        
        // Crear sala en el servidor
        const room = await roomService.createRoom(hostName);
        this.roomId = room.id;
        this.roomInfo = room;
        
        // Unirse a la sala creada
        socketService.joinRoom(room.id, this.userId, hostName);
        
        return room;
      } catch (error) {
        console.error('Error al crear sala:', error);
        this.error = 'Error al crear sala: ' + error.message;
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    // Iniciar llamada con otro participante
    async callUser(targetUserId) {
      try {
        console.log(`Llamando a usuario ${targetUserId}...`);
        
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
        
        // La conexión ya debería estar iniciada por handleIncomingOffer
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
        
        // Si somos asistente, podemos iniciar llamadas automáticamente
        if (this.userRole === 'asistente' && this.participants.length > 0) {
          // Buscar usuarios regulares (no asistentes)
          const regularUsers = this.participants.filter(p => p.userRole !== 'asistente');
          console.log('Usuarios regulares para llamar:', regularUsers);
          
          // Llamar automáticamente a usuarios regulares si hay
          if (regularUsers.length > 0) {
            console.log('Iniciando llamadas automáticamente con usuarios regulares...');
            for (const user of regularUsers) {
              await this.callUser(user.userId);
            }
          }
        }
        
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
      this.remoteStreams = {
        ...this.remoteStreams,
        [userId]: stream
      };
    },
    
    // Manejar cierre de stream remoto
    handleRemoteStreamClosed(userId) {
      console.log(`Stream remoto cerrado para ${userId}`);
      const newStreams = { ...this.remoteStreams };
      delete newStreams[userId];
      this.remoteStreams = newStreams;
    },
    
    // Agregar participante a la lista
    addParticipant(participant) {
      const exists = this.participants.some(p => p.userId === participant.userId);
      if (!exists) {
        this.participants.push(participant);
        console.log('Participante añadido:', participant.userName);
      }
    },
    
    // Eliminar participante de la lista
    removeParticipant(userId) {
      this.participants = this.participants.filter(p => p.userId !== userId);
      console.log('Participante eliminado:', userId);
    },
    
    // Limpiar estado al salir
    cleanup() {
      console.log('Limpiando estado de la videollamada...');
      this.endCall();
      socketService.disconnect();
      this.roomId = null;
      this.roomInfo = null;
      this.participants = [];
      this.messages = [];
      this.isInCall = false;
      this.currentRequest = null;
    }
  }
});