// src/services/socketService.js
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import WebRTCService from './WebRTCService';
import EventEmitter from './events';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoom = null;
    this.eventListeners = {};
    this.pendingListeners = {};
    
    // Estado para identificación
    this.userId = null;
    this.userName = null;
    
    // Estado para chat
    this.messageCallbacks = [];
    this.typingCallbacks = [];
    this.userInfoCallbacks = [];
    this.roomAcceptedCallbacks = [];
    this.callRequestedCallbacks = [];
    
    // Server URL - cambiar a la URL real de tu servidor
    this.serverUrl = 'http://192.168.1.99:3001';

    EventEmitter.on('webrtc:iceCandidate', (data) => {
      this.sendIceCandidate(data.candidate, data.userId);
    })
  }
  
  async connect() {
    try {
      // Si ya estamos conectados, no hacer nada
      if (this.isConnected && this.socket) {
        return true;
      }
      
      // Leer la URL del servidor de AsyncStorage si existe
      const serverUrl = await AsyncStorage.getItem('signaling_server_url');
      if (serverUrl) {
        this.serverUrl = serverUrl;
      }
      
      console.log(`Conectando a servidor Socket.IO: ${this.serverUrl}`);
      
      // Opciones de conexión para Socket.io
      const options = {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      };
      
      // Crear nueva conexión Socket.io
      this.socket = io(this.serverUrl, options);
      
      // Configurar listeners básicos
      this.setupBaseListeners();
      
      // Devolver una promesa que se resuelve cuando la conexión está establecida
      return new Promise((resolve, reject) => {
        // Establecer tiempo límite para la conexión
        const timeout = setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Tiempo de conexión agotado'));
          }
        }, 10000);
        
        // Evento de conexión exitosa
        this.socket.on('connect', () => {
          console.log('Conectado al servidor de señalización:', this.socket.id);
          this.isConnected = true;
          
          // Registrar listeners pendientes si hay
          this.registerPendingListeners();
          
          clearTimeout(timeout);
          resolve(true);
        });
        
        // Evento de error de conexión
        this.socket.on('connect_error', (error) => {
          console.error('Error de conexión con el servidor:', error);
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error al conectar con el servidor:', error);
      throw error;
    }
  }
  
  setupBaseListeners() {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('Socket conectado:', this.socket.id);
      this.isConnected = true;
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason);
      this.isConnected = false;
    });
    
    this.socket.on('error', (error) => {
      console.error('Error de socket:', error);
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconectado después de ${attemptNumber} intentos`);
      this.isConnected = true;
      
      // Si estábamos en una sala, volver a unirnos
      if (this.currentRoom) {
        console.log(`Volviendo a unirse a la sala ${this.currentRoom}`);
        this.joinRoom(this.currentRoom, this.userId, this.userName);
      }
    });
  }
  
  registerPendingListeners() {
    if (!this.pendingListeners || !this.socket) return;
    
    Object.keys(this.pendingListeners).forEach(event => {
      if (!this.pendingListeners[event] || this.pendingListeners[event].length === 0) return;
      
      this.pendingListeners[event].forEach(callback => {
        console.log(`Registrando listener pendiente para evento: ${event}`);
        this.socket.on(event, callback);
        
        if (!this.eventListeners[event]) {
          this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
      });
      
      this.pendingListeners[event] = [];
    });
  }
  
  disconnect() {
    console.log('Desconectando socket...');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoom = null;
      this.eventListeners = {};
      this.pendingListeners = {};
      
      console.log('Socket desconectado correctamente');
    }
  }
  
  async joinRoom(roomId, userId, userName, userRole = 'usuario') {
    if (!roomId || !userId) {
      console.error('joinRoom: Se requiere roomId y userId');
      return false;
    }
    
    try {
      // Si no hay socket o no está conectado, intentar conectar primero
      if (!this.socket || !this.isConnected) {
        console.log('No hay conexión de socket, intentando conectar...');
        await this.connect();
      }
      
      console.log(`Uniendo al usuario ${userName} (${userId}) a la sala ${roomId}`);
      
      // Guardar información importante
      this.currentRoom = roomId;
      this.userId = userId;
      this.userName = userName;
      
      // Emitir evento de unirse a sala
      this.socket.emit('join-room', { roomId, userId, userName, userRole });
      
      // Configurar listeners para WebRTC y eventos de sala
      this.setupRoomListeners();
      
      return true;
    } catch (error) {
      console.error('Error al unirse a la sala:', error);
      return false;
    }
  }
  
  setupRoomListeners() {
    // Eliminar listeners anteriores para evitar duplicados
    this.off('user-joined');
    this.off('room-users');
    this.off('offer');
    this.off('answer');
    this.off('ice-candidate');
    this.off('call-requested');
    this.off('call-ended');
    this.off('room-accepted');
    
    // Configurar evento para usuarios que se unen
    this.on('user-joined', (participant) => {
      console.log('Usuario unido a la sala:', participant);
    });
    
    // Configurar evento para recibir lista de usuarios en la sala
    this.on('room-users', (users) => {
      console.log('Usuarios en la sala:', users);
    });
    
    // Escuchar aceptación de sala (importante para el chat)
    this.on('room-accepted', (data) => {
      console.log('Sala aceptada por asistente:', data);
      // Notificar a los callbacks registrados
      this.roomAcceptedCallbacks.forEach(callback => callback(data));
    });
    
    // Configurar manejo de ofertas WebRTC 
    this.on('offer', async (data) => {
      console.log('Oferta recibida de:', data.from);
      try {
        // Establecer IDs para WebRTC
        WebRTCService.setUserIds(this.userId, data.from);
        
        // Procesar la oferta y generar respuesta
        const answer = await WebRTCService.handleIncomingOffer(data.offer, data.from);
        
        // Enviar respuesta
        this.sendAnswer(answer, data.from);
      } catch (error) {
        console.error('Error al manejar oferta:', error);
      }
    });
    
    // Configurar manejo de respuestas WebRTC (no usado en app móvil)
    this.on('answer', (data) => {
      console.log('Respuesta recibida de:', data.from);
      // App móvil no usa este evento ya que no inicia ofertas
    });
    
    // Configurar manejo de candidatos ICE
    this.on('ice-candidate', (data) => {
      console.log('Candidato ICE recibido de:', data.from);
      WebRTCService.addIceCandidate(data.candidate)
        .catch(error => console.error('Error al agregar candidato ICE:', error));
    });
    
    // Configurar manejo de finalización de llamada
    this.on('call-ended', (data) => {
      console.log('Llamada finalizada por:', data.from);
      // Liberar recursos WebRTC
      WebRTCService.cleanup();
    });
    
    // IMPORTANTE: Evento call-requested (cuando el asistente inicia la videollamada)
    this.on('call-requested', (data) => {
      console.log('Solicitud de llamada recibida de:', data.from);
      // Notificar a través de los callbacks registrados
      this.callRequestedCallbacks.forEach(callback => callback(data));
      
      // NO iniciamos aquí la videollamada, solo notificamos
      // El asistente enviará una oferta WebRTC cuando esté listo
    });
  }
  
  leaveRoom() {
    if (!this.socket || !this.isConnected || !this.currentRoom) {
      return false;
    }
    
    console.log(`Abandonando sala: ${this.currentRoom}`);
    
    // Emitir evento para abandonar la sala
    this.socket.emit('leave-room', { 
      roomId: this.currentRoom,
      userId: this.userId 
    });
    
    // Limpiar listeners específicos de sala
    this.off('user-joined');
    this.off('room-users');
    this.off('offer');
    this.off('answer');
    this.off('ice-candidate');
    this.off('call-requested');
    this.off('call-ended');
    this.off('room-accepted');
    this.off('chat-message');
    this.off('user-typing');
    this.off('user-info');
    
    // Limpiar información de la sala
    const roomId = this.currentRoom;
    this.currentRoom = null;
    
    console.log('Sala abandonada correctamente');
    return roomId;
  }
  
  // Método para enviar respuesta (SOLO esto inicia la app móvil cuando recibe una oferta)
  sendAnswer(answer, toUserId) {
    if (!this.socket || !this.isConnected) {
      console.error('No hay conexión con el servidor');
      return false;
    }
    
    if (!toUserId) {
      console.error('Se requiere ID de destino para enviar respuesta');
      return false;
    }
    
    console.log(`Enviando respuesta a ${toUserId} desde ${this.userId || 'unknown'}`);
    
    this.socket.emit('answer', {
      answer: answer,
      to: toUserId,
      from: this.userId || 'unknown'
    });
    
    return true;
  }
  
  // Enviar candidato ICE
  sendIceCandidate(candidate, toUserId) {
    if (!this.socket || !this.isConnected) {
      console.warn('No se puede enviar candidato ICE: no hay conexión');
      return false;
    }
    
    if (!toUserId) {
      console.warn('No se puede enviar candidato ICE: falta ID de destino');
      return false;
    }
    
    this.socket.emit('ice-candidate', {
      candidate: candidate,
      to: toUserId,
      from: this.userId || 'unknown'
    });
    
    return true;
  }
  
  // Finalizar llamada
  endCall(roomId, toUserId) {
    if (!this.socket || !this.isConnected) {
      console.warn('No se puede finalizar llamada: no hay conexión');
      return false;
    }
    
    roomId = roomId || this.currentRoom;
    
    if (!roomId) {
      console.warn('No se puede finalizar llamada: no hay sala activa');
      return false;
    }
    
    console.log(`Finalizando llamada en sala ${roomId} con ${toUserId || 'todos los usuarios'}`);
    
    this.socket.emit('end-call', {
      roomId: roomId,
      to: toUserId || undefined,
      from: this.userId || 'unknown'
    });
    
    return true;
  }
  
  // Enviar mensaje de chat
  sendMessage(content, toUserId) {
    if (!this.socket || !this.isConnected || !this.currentRoom) {
      console.error('No hay conexión con el servidor o no estás en una sala');
      return false;
    }
    
    const messageData = {
      roomId: this.currentRoom,
      message: content,
      to: toUserId,
      from: this.userId || 'unknown',
      fromName: this.userName || 'Usuario',
      timestamp: new Date().toISOString()
    };
    
    console.log(`Enviando mensaje en sala ${this.currentRoom}`);
    
    this.socket.emit('chat-message', messageData);
    
    return messageData;
  }
  
  // Notificar escritura
  sendTypingNotification(isTyping, toUserId) {
    if (!this.socket || !this.isConnected || !this.currentRoom) {
      return false;
    }
    
    const data = {
      roomId: this.currentRoom,
      userId: this.userId || 'unknown',
      userName: this.userName || 'Usuario',
      to: toUserId,
      isTyping
    };
    
    this.socket.emit('user-typing', data);
    
    return true;
  }
  
  // Callbacks para eventos importantes
  onRoomAccepted(callback) {
    if (typeof callback === 'function') {
      this.roomAcceptedCallbacks.push(callback);
    }
  }
  
  offRoomAccepted(callback) {
    this.roomAcceptedCallbacks = this.roomAcceptedCallbacks.filter(cb => cb !== callback);
  }
  
  onCallRequested(callback) {
    if (typeof callback === 'function') {
      this.callRequestedCallbacks.push(callback);
    }
  }
  
  offCallRequested(callback) {
    this.callRequestedCallbacks = this.callRequestedCallbacks.filter(cb => cb !== callback);
  }
  
  // Métodos para callbacks de mensajes y eventos
  onMessage(callback) {
    if (typeof callback === 'function') {
      this.messageCallbacks.push(callback);
    }
  }
  
  onTyping(callback) {
    if (typeof callback === 'function') {
      this.typingCallbacks.push(callback);
    }
  }
  
  onUserInfo(callback) {
    if (typeof callback === 'function') {
      this.userInfoCallbacks.push(callback);
    }
  }
  
  offMessage(callback) {
    this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
  }
  
  offTyping(callback) {
    this.typingCallbacks = this.typingCallbacks.filter(cb => cb !== callback);
  }
  
  offUserInfo(callback) {
    this.userInfoCallbacks = this.userInfoCallbacks.filter(cb => cb !== callback);
  }
  
  // Registrar evento para escuchar
  on(event, callback) {
    if (!callback || typeof callback !== 'function') {
      console.warn(`No se proporcionó un callback válido para el evento '${event}'`);
      return;
    }
    
    if (!this.socket) {
      console.warn(`No se puede registrar listener para '${event}': no hay socket`);
      
      // Guardar la solicitud para registrarla cuando el socket esté disponible
      if (!this.pendingListeners[event]) {
        this.pendingListeners[event] = [];
      }
      this.pendingListeners[event].push(callback);
      
      return;
    }
    
    console.log(`Registrando listener para evento: ${event}`);
    this.socket.on(event, callback);
    
    // Guardar referencia para poder eliminar después
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }
  
  // Eliminar listener de evento
  off(event, callback) {
    if (!this.socket) return;
    
    if (callback) {
      // Eliminar solo el callback específico
      this.socket.off(event, callback);
      
      // Actualizar la lista de listeners
      if (this.eventListeners[event]) {
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
      }
    } else {
      // Eliminar todos los listeners para este evento
      if (this.eventListeners[event]) {
        this.eventListeners[event].forEach(cb => {
          this.socket.off(event, cb);
        });
        this.eventListeners[event] = [];
      }
    }
  }
  
  // Método para limpiar todos los recursos
  cleanup() {
    // Abandonar la sala actual
    this.leaveRoom();
    
    // Limpiar callbacks
    this.messageCallbacks = [];
    this.typingCallbacks = [];
    this.userInfoCallbacks = [];
    this.roomAcceptedCallbacks = [];
    this.callRequestedCallbacks = [];
    
    // Eliminar todos los listeners
    if (this.socket) {
      Object.keys(this.eventListeners).forEach(event => {
        this.eventListeners[event].forEach(callback => {
          this.socket.off(event, callback);
        });
      });
    }
    
    this.eventListeners = {};
    this.pendingListeners = {};
    
    return true;
  }
  
  // Cambiar la URL del servidor
  async setServerUrl(url) {
    if (!url) return false;
    
    console.log(`Cambiando URL del servidor a: ${url}`);
    
    await AsyncStorage.setItem('signaling_server_url', url);
    this.serverUrl = url;
    
    // Si ya hay una conexión, reconectar
    if (this.isConnected) {
      console.log('Reconectando con nueva URL...');
      this.disconnect();
      await this.connect();
    }
    
    return true;
  }
}

const socketService = new SocketService();
export default socketService;