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
    
    // Configurar escuchas de socket
    setupSocketListeners() {
      // Cuando un usuario se une a la sala
      socketService.on('user-joined', (participant) => {
        this.addParticipant(participant);
      });
      
      // Cuando un usuario deja la sala
      socketService.on('user-left', ({ userId }) => {
        this.removeParticipant(userId);
      });
      
      // Cuando recibimos la lista de usuarios en la sala
      socketService.on('room-users', (users) => {
        this.participants = users;
      });
      
      // Cuando recibimos un mensaje de chat
      socketService.on('new-message', (messageData) => {
        this.messages.push(messageData);
      });
      
      // Cuando se solicita iniciar una llamada
      socketService.on('call-requested', ({ from, fromName }) => {
        // Podrías mostrar una notificación aquí
        // Por ahora, aceptamos automáticamente
        this.acceptCall(from);
      });
      
      // WebRTC ya configurado en webrtcService
    },
    
    // Unirse a una sala
    async joinRoom(roomId, userName) {
      try {
        this.loading = true;
        this.error = null;
        this.userName = userName;
        
        // Obtener información de la sala
        this.roomInfo = await roomService.getRoomInfo(roomId);
        this.roomId = roomId;
        
        // Unirse a la sala vía Socket.io
        socketService.joinRoom(roomId, this.userId, userName);
        
        return true;
      } catch (error) {
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
        this.error = 'Error al crear sala: ' + error.message;
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    // Iniciar llamada con otro participante
    async callUser(targetUserId) {
      try {
        // Iniciar conexión WebRTC
        await webrtcService.initConnection(targetUserId, true);
        
        // Notificar al otro usuario
        socketService.callUser(targetUserId);
        
        this.isInCall = true;
        return true;
      } catch (error) {
        this.error = 'Error al iniciar llamada: ' + error.message;
        return false;
      }
    },
    
    // Aceptar llamada entrante
    async acceptCall(fromUserId) {
      try {
        // La conexión ya debería estar iniciada por handleIncomingOffer
        this.isInCall = true;
        return true;
      } catch (error) {
        this.error = 'Error al aceptar llamada: ' + error.message;
        return false;
      }
    },
    
    // Finalizar llamada
    endCall() {
      webrtcService.closeAllConnections();
      socketService.endCall();
      this.isInCall = false;
      this.remoteStreams = {};
    },
    
    // Iniciar flujos de medios locales
    async startLocalStream() {
      try {
        this.localStream = await webrtcService.getLocalStream();
        return this.localStream;
      } catch (error) {
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
      this.remoteStreams = {
        ...this.remoteStreams,
        [userId]: stream
      };
    },
    
    // Manejar cierre de stream remoto
    handleRemoteStreamClosed(userId) {
      const newStreams = { ...this.remoteStreams };
      delete newStreams[userId];
      this.remoteStreams = newStreams;
    },
    
    // Agregar participante a la lista
    addParticipant(participant) {
      const exists = this.participants.some(p => p.userId === participant.userId);
      if (!exists) {
        this.participants.push(participant);
      }
    },
    
    // Eliminar participante de la lista
    removeParticipant(userId) {
      this.participants = this.participants.filter(p => p.userId !== userId);
    },
    
    // Limpiar estado al salir
    cleanup() {
      this.endCall();
      socketService.disconnect();
      this.roomId = null;
      this.roomInfo = null;
      this.participants = [];
      this.messages = [];
      this.isInCall = false;
    }
  }
});