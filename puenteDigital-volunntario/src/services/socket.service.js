// src/services/socket.service.js
import { io } from 'socket.io-client';

// Detectar si estamos en React Native o en entorno web
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// Función para obtener la URL del servidor
const getServerUrl = () => {
  // Para desarrollo local en web
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3001';
  }
  
  // Para React Native y entorno móvil
  return 'http://192.168.1.99:3001'; // Asegúrate que esta IP sea la correcta
};

const SOCKET_SERVER = getServerUrl();

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.roomId = null;
    this.userId = null;
    this.userName = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.eventListeners = {};
    this.reconnectDelay = 3000;
    this.autoReconnect = true;
    this.pendingMessages = [];
    this.debug = true;
    
    // Conexión única
    this._connectPromise = null;
  }

  // Función para logs
  log(message, ...args) {
    if (this.debug) {
      console.log(`[Socket] ${message}`, ...args);
    }
  }

  // Función para logs de error
  logError(message, error) {
    console.error(`[Socket ERROR] ${message}`, error);
  }

  // Conectar al servidor de Socket.IO - SIMPLIFICADO
  async connect(serverUrl = null) {
    // Si ya tenemos una conexión activa y funcionando, usarla
    if (this.isConnected && this.socket && this.socket.connected) {
      this.log('Ya está conectado a Socket.IO, reutilizando conexión existente');
      return true;
    }
    
    // Si hay un intento de conexión en curso, esperar a que termine
    if (this._connectPromise) {
      this.log('Conexión en curso, esperando...');
      try {
        return await this._connectPromise;
      } catch (error) {
        this.logError('La conexión en curso falló:', error);
        // Continuar con un nuevo intento
      }
    }
    
    // Crear una promesa para este intento de conexión
    this._connectPromise = (async () => {
      try {
        // Cerrar conexión anterior si existe
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }
        
        const finalServerUrl = serverUrl || SOCKET_SERVER;
        this.log(`Conectando a servidor Socket.IO: ${finalServerUrl}`);
        
        // Crear nueva conexión con opciones mejoradas
        this.socket = io(finalServerUrl, {
          transports: ['websocket', 'polling'],
          reconnection: false, // Manejaremos la reconexión nosotros mismos
          timeout: 10000,
          forceNew: true, // Forzar una nueva conexión
          multiplex: false // Evitar multiplexación que causa conexiones duplicadas
        });

        // Configurar listeners de conexión
        this.setupConnectionListeners();

        // Esperar a que se establezca la conexión
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout al conectar con el servidor'));
          }, 10000);

          this.socket.once('connect', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.socket.once('connect_error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        this.log('Conexión Socket.IO establecida correctamente');
        this.isConnected = true;
        this.connectionAttempts = 0;
        
        // Enviar mensajes pendientes
        this.sendPendingMessages();

        return true;
      } catch (error) {
        this.logError('Error al conectar con Socket.IO:', error);
        throw error;
      } finally {
        // Limpiar la promesa de conexión
        this._connectPromise = null;
      }
    })();
    
    return this._connectPromise;
  }

  // Configurar listeners para eventos de conexión
  setupConnectionListeners() {
    if (!this.socket) return;

    // Cuando se conecta
    this.socket.on('connect', () => {
      this.log('Conexión Socket.IO establecida con ID:', this.socket.id);
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      // Volver a unirse a la sala si estábamos en una
      if (this.roomId && this.userId && this.userName) {
        this.joinRoom(this.roomId, this.userId, this.userName);
      }
      
      // Enviar mensajes pendientes al reconectar
      this.sendPendingMessages();
    });

    // Cuando se desconecta
    this.socket.on('disconnect', (reason) => {
      this.log('Desconectado de Socket.IO:', reason);
      this.isConnected = false;

      // Intentar reconexión manual si es necesario
      if (reason === 'io server disconnect' && this.autoReconnect) {
        this.reconnect();
      }
    });

    // Error de conexión
    this.socket.on('connect_error', (error) => {
      this.logError('Error de conexión Socket.IO:', error);
      this.connectionAttempts++;
    });
  }

  // Reconexión manual
  async reconnect() {
    if (this.isConnected || this.connectionAttempts > this.maxConnectionAttempts) {
      return;
    }

    this.log('Intentando reconexión manual...');
    
    try {
      await this.connect();
      return true;
    } catch (error) {
      this.logError('Error en reconexión manual:', error);
      
      // Programar próximo intento con retraso
      setTimeout(() => this.reconnect(), this.reconnectDelay);
      
      return false;
    }
  }

  // Enviar mensajes pendientes después de reconectar
  sendPendingMessages() {
    if (this.pendingMessages.length > 0) {
      this.log(`Enviando ${this.pendingMessages.length} mensajes pendientes`);
      
      this.pendingMessages.forEach(({ event, data }) => {
        this.emit(event, data);
      });
      
      this.pendingMessages = [];
    }
  }

  // Unirse a una sala
  joinRoom(roomId, userId, userName, metadata = {}) {
   
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;

    this.log(`Uniéndose a sala ${roomId} como ${userName} (${userId})`);
    this.socket.emit('join-room', { roomId, userId, userName, ...metadata });
  }

  // Dejar una sala
  leaveRoom() {
    if (!this.socket || !this.isConnected || !this.roomId) {
      return;
    }

    this.log('Dejando sala actual');
    this.socket.emit('leave-room', { roomId: this.roomId });
    this.roomId = null;
  }

  // Llamar a un usuario
  callUser(targetUserId) {
    if (!this.socket || !this.isConnected || !this.roomId) {
      this.log('No conectado al servidor, añadiendo a cola pendiente');
      this.pendingMessages.push({
        event: 'call-user',
        data: { 
          roomId: this.roomId,
          to: targetUserId,
          from: this.userId,
          fromName: this.userName
        }
      });
      return;
    }

    this.log(`Enviando solicitud de llamada a: ${targetUserId}`);
    this.socket.emit('call-user', {
      roomId: this.roomId,
      to: targetUserId,
      from: this.userId,
      fromName: this.userName
    });
  }

  // Terminar llamada
  endCall(targetUserId = null) {
    if (!this.socket || !this.isConnected || !this.roomId) {
      return;
    }

    this.log(`Finalizando llamada con ${targetUserId || 'todos'}`);
    this.socket.emit('end-call', {
      roomId: this.roomId,
      to: targetUserId,
      from: this.userId
    });
  }

  // Enviar oferta SDP
  sendOffer(offer, targetUserId) {
    if (!this.socket || !this.isConnected) {
      this.log('No conectado al servidor, añadiendo a cola pendiente');
      this.pendingMessages.push({
        event: 'offer',
        data: { 
          offer, 
          to: targetUserId, 
          from: this.userId 
        }
      });
      return;
    }

    this.log(`Enviando oferta SDP a: ${targetUserId}`);
    this.socket.emit('offer', { 
      offer, 
      to: targetUserId, 
      from: this.userId 
    });
  }

  // Enviar respuesta SDP
  sendAnswer(answer, targetUserId) {
    if (!this.socket || !this.isConnected) {
      this.log('No conectado al servidor, añadiendo a cola pendiente');
      this.pendingMessages.push({
        event: 'answer',
        data: { 
          answer, 
          to: targetUserId,
          from: this.userId 
        }
      });
      return;
    }

    this.log(`Enviando respuesta SDP a: ${targetUserId}`);
    this.socket.emit('answer', { 
      answer, 
      to: targetUserId,
      from: this.userId
    });
  }

  // Enviar candidato ICE
  sendIceCandidate(candidate, targetUserId) {
    if (!this.socket || !this.isConnected) {
      this.log('No conectado al servidor, añadiendo a cola pendiente');
      this.pendingMessages.push({
        event: 'ice-candidate',
        data: { 
          candidate, 
          to: targetUserId,
          from: this.userId 
        }
      });
      return;
    }

    this.log(`Enviando candidato ICE a: ${targetUserId}`);
    this.socket.emit('ice-candidate', { 
      candidate, 
      to: targetUserId,
      from: this.userId
    });
  }

  // Registrar evento para escuchar
  on(event, callback) {
    // No registrar el mismo callback múltiples veces
    if (this.eventListeners[event] && this.eventListeners[event].includes(callback)) {
      return;
    }

    // Registrar nuevo callback
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);

    // Asegurar conexión para registrar el listener
    if (!this.socket) {
      this.connect().then(() => {
        this.socket.on(event, callback);
      });
    } else {
      this.socket.on(event, callback);
    }
  }

  // Quitar listener de evento
  off(event, callback) {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event, callback);
      
      // Actualizar lista de callbacks
      if (this.eventListeners[event]) {
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
      }
    } else {
      // Si no se proporciona callback, eliminar todos los listeners para ese evento
      if (this.eventListeners[event]) {
        this.eventListeners[event].forEach(listener => {
          this.socket.off(event, listener);
        });
        this.eventListeners[event] = [];
      }
    }
  }

  // Emitir evento
  emit(event, data) {
    if (!this.socket || !this.isConnected) {
      this.log(`No conectado al servidor, añadiendo evento ${event} a cola pendiente`);
      this.pendingMessages.push({ event, data });
      return;
    }

    this.socket.emit(event, data);
  }

  // Verificar si está conectado
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  forwardCameraSwitching(event) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.on('camera-switching', (data) => {
      if (event) event(data);
    });
  }
  
  // Reenviar evento de finalización de cambio de cámara
  forwardCameraSwitched(event) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.on('camera-switched', (data) => {
      if (event) event(data);
    });
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      // Primero salir de la sala si estamos en una
      if (this.roomId) {
        this.leaveRoom();
      }
      
      this.log('Desconectando de Socket.IO');
      
      // Limpiar todos los event listeners
      Object.keys(this.eventListeners).forEach(event => {
        this.eventListeners[event].forEach(listener => {
          this.socket.off(event, listener);
        });
      });
      
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.roomId = null;
      this.userId = null;
      this.userName = null;
      this.eventListeners = {};
    }
  }

  // Aliases for compatibility
  onOffer(callback) { this.on('offer', callback); }
  onAnswer(callback) { this.on('answer', callback); }
  onIceCandidate(callback) { this.on('ice-candidate', callback); }
  onCallRequested(callback) { this.on('call-requested', callback); }
  onCallEnded(callback) { this.on('call-ended', callback); }
  onUserLeft(callback) { this.on('user-left', callback); }
}

export default new SocketService();