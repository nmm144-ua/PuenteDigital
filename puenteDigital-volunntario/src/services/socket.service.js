// src/services/socket.service.js
import { io } from 'socket.io-client';

// Función para obtener la URL del servidor
const getServerUrl = () => {
  // Para desarrollo local
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // Para red local o producción, usa la misma dirección que el navegador pero con puerto diferente
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3001`;
};

const SOCKET_SERVER = getServerUrl();
console.log('Conectando a servidor de señalización:', SOCKET_SERVER);

class SocketService {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.userId = null;
    this.userName = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
  }

  connect() {
    if (this.socket) return this.socket;
    
    console.log(`Intentando conectar a: ${SOCKET_SERVER}`);
    
    this.socket = io(SOCKET_SERVER, {
      transports: ['websocket', 'polling'], // Intentar websocket primero, luego polling como fallback
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000 // 10s timeout
    });

    this.setupListeners();
    return this.socket;
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor de señalización con ID:', this.socket.id);
      this.connectionAttempts = 0;
    });

    this.socket.on('connect_error', (error) => {
      this.connectionAttempts++;
      console.error(`❌ Error de conexión (intento ${this.connectionAttempts}/${this.maxConnectionAttempts}):`, error.message);
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error('Alcanzado número máximo de intentos de conexión');
        // Aquí podrías mostrar un mensaje al usuario
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Desconectado del servidor de señalización:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado al servidor después de ${attemptNumber} intentos`);
    });
  }

  joinRoom(roomId, userId, userName) {
    if (!this.socket) this.connect();
    
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    
    console.log(`Uniéndose a sala ${roomId} como ${userName} (${userId})`);
    this.socket.emit('join-room', { roomId, userId, userName });
  }

  sendOffer(offer, to) {
    if (!this.socket) return;
    console.log(`Enviando oferta a ${to}`);
    this.socket.emit('offer', { offer, to, from: this.userId });
  }

  sendAnswer(answer, to) {
    if (!this.socket) return;
    console.log(`Enviando respuesta a ${to}`);
    this.socket.emit('answer', { answer, to, from: this.userId });
  }

  sendIceCandidate(candidate, to) {
    if (!this.socket) return;
    this.socket.emit('ice-candidate', { candidate, to, from: this.userId });
  }

  callUser(to) {
    if (!this.socket || !this.roomId) return;
    console.log(`Solicitando llamada a ${to}`);
    this.socket.emit('call-user', {
      roomId: this.roomId,
      to,
      from: this.userId,
      fromName: this.userName
    });
  }

  endCall(to = null) {
    if (!this.socket || !this.roomId) return;
    console.log(`Finalizando llamada con ${to || 'todos'}`);
    this.socket.emit('end-call', {
      roomId: this.roomId,
      to,
      from: this.userId
    });
  }

  sendMessage(message) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('send-message', {
      roomId: this.roomId,
      message,
      sender: this.userName
    });
  }

  on(event, callback) {
    if (!this.socket) this.connect();
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();