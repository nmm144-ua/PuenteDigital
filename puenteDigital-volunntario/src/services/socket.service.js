// src/services/socket.service.js
import { io } from 'socket.io-client';

// Usa la dirección IP de tu servidor en la red (reemplaza con tu IP)
const SOCKET_SERVER =  `http://${window.location.hostname}:3001`;


class SocketService {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.userId = null;
    this.userName = null;
  }

  connect() {
    if (this.socket) return;
    
    this.socket = io(SOCKET_SERVER, {
      transports: ['websocket'],
      reconnection: true
    });

    this.setupListeners();
    return this.socket;
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('Conectado al servidor de señalización');
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado del servidor de señalización');
    });
  }

  joinRoom(roomId, userId, userName) {
    if (!this.socket) this.connect();
    
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    
    this.socket.emit('join-room', { roomId, userId, userName });
  }

  sendOffer(offer, to) {
    if (!this.socket) return;
    this.socket.emit('offer', { offer, to, from: this.userId });
  }

  sendAnswer(answer, to) {
    if (!this.socket) return;
    this.socket.emit('answer', { answer, to, from: this.userId });
  }

  sendIceCandidate(candidate, to) {
    if (!this.socket) return;
    this.socket.emit('ice-candidate', { candidate, to, from: this.userId });
  }

  callUser(to) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('call-user', {
      roomId: this.roomId,
      to,
      from: this.userId,
      fromName: this.userName
    });
  }

  endCall(to = null) {
    if (!this.socket || !this.roomId) return;
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