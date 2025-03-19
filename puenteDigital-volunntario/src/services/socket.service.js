// src/services/socket.service.js
import { io } from 'socket.io-client';

// Detectar si estamos en React Native o en entorno web
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// Importación condicional para AsyncStorage y Platform
let AsyncStorage;
let Platform;

if (isReactNative) {
  // Solo importar módulos de React Native si estamos en ese entorno
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
    Platform = require('react-native').Platform;
  } catch (error) {
    console.warn('Módulos de React Native no disponibles');
    // Proporcionar objetos simulados
    AsyncStorage = {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve()
    };
    Platform = { OS: 'web' };
  }
} else {
  // En entorno web, usar localStorage con una interfaz similar a AsyncStorage
  AsyncStorage = {
    getItem: (key) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key, value) => {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
  };
  // Plataforma simulada para web
  Platform = { OS: 'web' };
}

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
console.log('Conectando a servidor de señalización:', SOCKET_SERVER);

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
  }

  async connect() {
    if (this.isConnected && this.socket) return true;
    
    try {
      // Verificar si hay una URL personalizada guardada
      let serverUrl = SOCKET_SERVER;
      
      const savedUrl = await AsyncStorage.getItem('signaling_server_url');
      if (savedUrl) {
        serverUrl = savedUrl;
      }
      
      console.log(`Intentando conectar a: ${serverUrl}`);
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'], // Intentar websocket primero, luego polling
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000 // 10s timeout
      });

      this.setupListeners();
      
      // Devolver una promesa que se resuelve cuando la conexión está establecida
      return new Promise((resolve, reject) => {
        // Evento de conexión exitosa
        this.socket.on('connect', () => {
          console.log('✅ Conectado al servidor de señalización con ID:', this.socket.id);
          this.isConnected = true;
          this.connectionAttempts = 0;
          resolve(true);
        });
        
        // Evento de error de conexión
        this.socket.on('connect_error', (error) => {
          this.connectionAttempts++;
          console.error(`❌ Error de conexión (intento ${this.connectionAttempts}/${this.maxConnectionAttempts}):`, error.message);
          
          if (this.connectionAttempts >= this.maxConnectionAttempts) {
            console.error('Alcanzado número máximo de intentos de conexión');
            reject(new Error('Tiempo de conexión agotado después de múltiples intentos'));
          }
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

  setupListeners() {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor de señalización con ID:', this.socket.id);
      this.isConnected = true;
      this.connectionAttempts = 0;
    });

    this.socket.on('connect_error', (error) => {
      this.connectionAttempts++;
      console.error(`❌ Error de conexión (intento ${this.connectionAttempts}/${this.maxConnectionAttempts}):`, error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Desconectado del servidor de señalización:', reason);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado al servidor después de ${attemptNumber} intentos`);
      this.isConnected = true;
      
      // Volver a unirse a la sala si estábamos en una
      if (this.roomId && this.userId && this.userName) {
        this.joinRoom(this.roomId, this.userId, this.userName);
      }
    });
  }

  joinRoom(roomId, userId, userName) {
    if (!this.socket || !this.isConnected) {
      throw new Error('No hay conexión con el servidor');
    }
    
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    
    console.log(`Uniéndose a sala ${roomId} como ${userName} (${userId})`);
    this.socket.emit('join-room', { roomId, userId, userName });
  }

  leaveRoom() {
    if (!this.socket || !this.isConnected || !this.roomId) return;
    
    console.log(`Dejando sala ${this.roomId}`);
    // Usar evento personalizado en lugar de 'disconnect' (que es reservado)
    this.socket.emit('leave-room', { roomId: this.roomId });
    this.roomId = null;
  }

  sendOffer(offer, to) {
    if (!this.socket || !this.isConnected) return;
    console.log(`Enviando oferta a ${to}`);
    this.socket.emit('offer', { offer, to, from: this.userId });
  }

  sendAnswer(answer, to) {
    if (!this.socket || !this.isConnected) return;
    console.log(`Enviando respuesta a ${to}`);
    this.socket.emit('answer', { answer, to, from: this.userId });
  }

  sendIceCandidate(candidate, to) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('ice-candidate', { candidate, to, from: this.userId });
  }

  callUser(to) {
    if (!this.socket || !this.isConnected || !this.roomId) return;
    console.log(`Solicitando llamada a ${to}`);
    this.socket.emit('call-user', {
      roomId: this.roomId,
      to,
      from: this.userId,
      fromName: this.userName
    });
  }

  endCall(to = null) {
    if (!this.socket || !this.isConnected || !this.roomId) return;
    console.log(`Finalizando llamada con ${to || 'todos'}`);
    this.socket.emit('end-call', {
      roomId: this.roomId,
      to,
      from: this.userId
    });
  }

  sendMessage(message) {
    if (!this.socket || !this.isConnected || !this.roomId) return;
    this.socket.emit('send-message', {
      roomId: this.roomId,
      message,
      sender: this.userName
    });
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect().then(() => {
        this.socket.on(event, callback);
      });
    } else {
      this.socket.on(event, callback);
    }
    
    // Guardar referencia al event listener para limpieza
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event, callback);
    } else {
      // Si no se proporciona callback, eliminar todos los listeners para ese evento
      const listeners = this.eventListeners[event] || [];
      listeners.forEach(listener => this.socket.off(event, listener));
      this.eventListeners[event] = [];
    }
  }

  // Alias para compatibilidad con versión móvil
  onOffer(callback) {
    this.on('offer', callback);
  }
  
  onAnswer(callback) {
    this.on('answer', callback);
  }
  
  onIceCandidate(callback) {
    this.on('ice-candidate', callback);
  }
  
  onCallRequested(callback) {
    this.on('call-requested', callback);
  }
  
  onCallResponse(callback) {
    this.on('call-response', callback);
  }
  
  onCallEnded(callback) {
    this.on('call-ended', callback);
  }
  
  onNewMessage(callback) {
    this.on('new-message', callback);
  }
  
  onUserLeft(callback) {
    this.on('user-left', callback);
  }

  disconnect() {
    if (this.socket) {
      // Primero salir de la sala si estamos en una
      if (this.roomId) {
        this.leaveRoom();
      }
      
      // Luego desconectar
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.roomId = null;
      this.userId = null;
      this.userName = null;
      
      // Limpiar todos los event listeners
      this.eventListeners = {};
    }
  }

  // Método para cambiar URL del servidor (compatibilidad con versión móvil)
  async setServerUrl(url) {
    if (!url) return;
    
    await AsyncStorage.setItem('signaling_server_url', url);
    
    // Si ya hay una conexión, reconectar
    if (this.isConnected) {
      this.disconnect();
      await this.connect();
    }
  }
}

export default new SocketService();