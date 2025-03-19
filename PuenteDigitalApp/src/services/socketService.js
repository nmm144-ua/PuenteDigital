// src/services/socketService.js
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import WebRTCService from './WebRTCService';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoom = null;
    this.eventListeners = {};
    
    // Server URL - cambiar a la URL real de tu servidor
    this.serverUrl = 'http://192.168.1.99:3001';
  }
  
  // Conectar al servidor de señalización
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
        // Evento de conexión exitosa
        this.socket.on('connect', () => {
          console.log('Conectado al servidor de señalización:', this.socket.id);
          this.isConnected = true;
          resolve(true);
        });
        
        // Evento de error de conexión
        this.socket.on('connect_error', (error) => {
          console.error('Error de conexión con el servidor:', error);
          reject(error);
        });
        
        // Establecer tiempo límite para la conexión
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Tiempo de conexión agotado'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Error al conectar con el servidor:', error);
      throw error;
    }
  }
  
  // Configurar listeners básicos
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
        // Aquí podrías reimplementar la lógica de unirse a la sala
      }
    });
  }
  
  // Desconectar del servidor
  disconnect() {
    console.log('Desconectando socket...');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoom = null;
      this.eventListeners = {};
      console.log('Socket desconectado correctamente');
    }
  }
  
  // Unirse a una sala
  joinRoom(roomId, userId, userName) {
    if (!this.socket || !this.isConnected) {
      throw new Error('No hay conexión con el servidor');
    }
    
    console.log(`Uniendo al usuario ${userName} (${userId}) a la sala ${roomId}`);
    this.socket.emit('join-room', { roomId, userId, userName });
    this.currentRoom = roomId;
    
    // Registrar listeners para eventos de sala
    this.setupRoomListeners();
  }
  
  // Configurar listeners específicos de sala
  setupRoomListeners() {
    // Eliminar listeners anteriores para evitar duplicados
    this.off('user-joined');
    this.off('room-users');
    this.off('offer');
    this.off('answer');
    this.off('ice-candidate');
    this.off('call-requested');
    this.off('call-ended');
    
    // Configurar evento para usuarios que se unen
    this.on('user-joined', (participant) => {
      console.log('Usuario unido a la sala:', participant);
    });
    
    // Configurar evento para recibir lista de usuarios en la sala
    this.on('room-users', (users) => {
      console.log('Usuarios en la sala:', users);
    });
    
    // Configurar manejo de ofertas
    this.on('offer', async (data) => {
      console.log('Oferta recibida de:', data.from);
      try {
        // Procesar la oferta y generar respuesta
        const answer = await WebRTCService.handleIncomingOffer(data.offer, data.from);
        
        // Enviar respuesta
        this.sendAnswer(answer, data.from, data.to);
      } catch (error) {
        console.error('Error al manejar oferta:', error);
      }
    });
    
    // Configurar manejo de respuestas
    this.on('answer', (data) => {
      console.log('Respuesta recibida de:', data.from);
      WebRTCService.handleAnswer(data.answer)
        .catch(error => console.error('Error al manejar respuesta:', error));
    });
    
    // Configurar manejo de candidatos ICE
    this.on('ice-candidate', (data) => {
      console.log('Candidato ICE recibido de:', data.from);
      WebRTCService.addIceCandidate(data.candidate)
        .catch(error => console.error('Error al agregar candidato ICE:', error));
    });
  }
  
  // Abandonar la sala actual
  leaveRoom(roomId) {
    if (this.socket && this.isConnected && roomId) {
      console.log(`Abandonando sala: ${roomId}`);
      // Usar un evento personalizado en lugar de 'disconnect' (que es reservado)
      this.socket.emit('leave-room', { roomId });
      this.currentRoom = null;
      
      // Limpiar listeners específicos de sala
      this.off('user-joined');
      this.off('room-users');
      
      console.log('Sala abandonada correctamente');
    }
  }
  
  // Enviar oferta WebRTC
  sendOffer(offer, toUserId, fromUserId) {
    if (!this.socket || !this.isConnected) {
      throw new Error('No hay conexión con el servidor');
    }
    
    console.log(`Enviando oferta a ${toUserId} desde ${fromUserId || 'unknown'}`);
    this.socket.emit('offer', {
      offer: offer,
      to: toUserId,
      from: fromUserId || 'unknown'
    });
  }
  
  // Enviar respuesta WebRTC
  sendAnswer(answer, toUserId, fromUserId) {
    if (!this.socket || !this.isConnected) {
      throw new Error('No hay conexión con el servidor');
    }
    
    console.log(`Enviando respuesta a ${toUserId} desde ${fromUserId || 'unknown'}`);
    this.socket.emit('answer', {
      answer: answer,
      to: toUserId,
      from: fromUserId || 'unknown'
    });
  }
  
  // Enviar candidato ICE
  sendIceCandidate(candidate, toUserId, fromUserId) {
    if (!this.socket || !this.isConnected) {
      console.warn('No se puede enviar candidato ICE: no hay conexión');
      return;
    }
    
    if (!toUserId) {
      console.warn('No se puede enviar candidato ICE: falta ID de destino');
      return;
    }
    
    this.socket.emit('ice-candidate', {
      candidate: candidate,
      to: toUserId,
      from: fromUserId || 'unknown'
    });
  }
  
  // Iniciar llamada a otro usuario
  callUser(roomId, toUserId, fromUserId, fromName) {
    if (!this.socket || !this.isConnected) {
      throw new Error('No hay conexión con el servidor');
    }
    
    console.log(`Solicitando llamada a ${toUserId} desde ${fromUserId || 'unknown'}`);
    this.socket.emit('call-user', {
      roomId: roomId,
      to: toUserId,
      from: fromUserId || 'unknown',
      fromName: fromName || 'Usuario'
    });
  }
  
  // Responder a una solicitud de llamada
  respondToCall(toUserId, fromUserId, accepted) {
    if (!this.socket || !this.isConnected) {
      throw new Error('No hay conexión con el servidor');
    }
    
    console.log(`Respondiendo a llamada: ${accepted ? 'aceptada' : 'rechazada'}`);
    this.socket.emit('call-response', {
      to: toUserId,
      from: fromUserId || 'unknown',
      accepted: accepted
    });
  }
  
  // Finalizar llamada
  endCall(roomId, toUserId) {
    if (!this.socket || !this.isConnected) {
      console.warn('No se puede finalizar llamada: no hay conexión');
      return;
    }
    
    console.log(`Finalizando llamada con ${toUserId || 'todos los usuarios'}`);
    if (toUserId) {
      // Finalizar con un usuario específico
      this.socket.emit('end-call', {
        roomId: roomId,
        to: toUserId,
        from: 'anonymous'
      });
    } else {
      // Finalizar con todos en la sala
      this.socket.emit('end-call', {
        roomId: roomId,
        from: 'anonymous'
      });
    }
  }
  
  // Enviar mensaje de chat
  sendMessage(roomId, message, senderName) {
    if (!this.socket || !this.isConnected) {
      throw new Error('No hay conexión con el servidor');
    }
    
    console.log(`Enviando mensaje en sala ${roomId}`);
    this.socket.emit('send-message', {
      roomId: roomId,
      message: message,
      sender: senderName || 'Usuario'
    });
  }
  
  // Métodos para gestionar event listeners
  
  // Registrar un event listener
  on(event, callback) {
    if (!this.socket) {
      console.warn(`No se puede registrar listener para '${event}': no hay socket`);
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
  
  // Eliminar un event listener
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
  
  // Métodos de conveniencia para escuchar eventos específicos
  
  // Escuchar ofertas WebRTC entrantes
  onOffer(callback) {
    this.on('offer', callback);
  }
  
  // Escuchar respuestas WebRTC entrantes
  onAnswer(callback) {
    this.on('answer', callback);
  }
  
  // Escuchar candidatos ICE entrantes
  onIceCandidate(callback) {
    this.on('ice-candidate', callback);
  }
  
  // Escuchar solicitudes de llamada entrantes
  onCallRequested(callback) {
    this.on('call-requested', callback);
  }
  
  // Escuchar respuestas a solicitudes de llamada
  onCallResponse(callback) {
    this.on('call-response', callback);
  }
  
  // Escuchar finalización de llamada
  onCallEnded(callback) {
    this.on('call-ended', callback);
  }
  
  // Escuchar mensajes de chat entrantes
  onNewMessage(callback) {
    this.on('new-message', callback);
  }
  
  // Escuchar cuando otro usuario abandona la sala
  onUserLeft(callback) {
    this.on('user-left', callback);
  }
  
  // Cambiar la URL del servidor
  async setServerUrl(url) {
    if (!url) return;
    
    console.log(`Cambiando URL del servidor a: ${url}`);
    await AsyncStorage.setItem('signaling_server_url', url);
    this.serverUrl = url;
    
    // Si ya hay una conexión, reconectar
    if (this.isConnected) {
      console.log('Reconectando con nueva URL...');
      this.disconnect();
      await this.connect();
    }
  }
}

export default new SocketService();