// src/services/socket.service.js
import { io } from 'socket.io-client';
import loggerService from './logger.service';

// Nombre del módulo para logging
const LOG_MODULE = 'SocketService';

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
    loggerService.debug(LOG_MODULE, 'Utilizando entorno React Native');
  } catch (error) {
    loggerService.warn(LOG_MODULE, 'Módulos de React Native no disponibles', error);
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
  loggerService.debug(LOG_MODULE, 'Utilizando entorno web');
}

// Función para obtener la URL del servidor
const getServerUrl = () => {
  // Para desarrollo local en web
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3001';
  }
  
  // Para React Native y entorno móvil
  return 'http://192.168.1.38:3001'; // URL del servidor
};

const SOCKET_SERVER = getServerUrl();
loggerService.info(LOG_MODULE, 'URL del servidor de señalización', { url: SOCKET_SERVER });

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
    this.serverUrl = SOCKET_SERVER;
    this.connectPromise = null;
    this.reconnectTimer = null;
    this.pendingOperations = [];
  }

  async connect() {
    // Si ya tenemos una conexión activa, devolver
    if (this.isConnected && this.socket) {
      loggerService.debug(LOG_MODULE, 'Conexión ya establecida, utilizando socket existente');
      return true;
    }
    
    // Si hay una conexión en progreso, esperar a que termine
    if (this.connectPromise) {
      loggerService.debug(LOG_MODULE, 'Conexión en progreso, esperando...');
      return this.connectPromise;
    }
    
    loggerService.info(LOG_MODULE, 'Iniciando conexión al servidor socket', { 
      serverUrl: this.serverUrl 
    });
    
    // Crear nueva promesa de conexión
    this.connectPromise = new Promise(async (resolve, reject) => {
      try {
        // Verificar si hay una URL personalizada guardada
        let serverUrl = this.serverUrl;
        
        const savedUrl = await AsyncStorage.getItem('signaling_server_url');
        if (savedUrl) {
          serverUrl = savedUrl;
          loggerService.debug(LOG_MODULE, 'Usando URL de servidor guardada', { url: savedUrl });
        }
        
        loggerService.info(LOG_MODULE, `Intentando conectar a: ${serverUrl}`);
        
        // Limpiar socket previo si existe
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
          this.socket = null;
        }
        
        // Crear nueva conexión Socket.io
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'], // Intentar websocket primero, luego polling
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000 // 10s timeout
        });

        // Configurar escuchas
        this.setupBaseListeners(resolve, reject);
        
        // Establecer un timeout para la conexión
        const connectTimeout = setTimeout(() => {
          if (!this.isConnected) {
            const error = new Error('Tiempo de conexión agotado');
            loggerService.error(LOG_MODULE, 'Timeout de conexión alcanzado', error);
            reject(error);
            
            // Limpiar la promesa de conexión
            this.connectPromise = null;
          }
        }, 10000);
        
        // Limpiar timeout si la conexión tiene éxito
        this.socket.on('connect', () => {
          clearTimeout(connectTimeout);
        });
      } catch (error) {
        loggerService.error(LOG_MODULE, 'Error al configurar socket', error);
        this.connectPromise = null;
        reject(error);
      }
    });
    
    try {
      const result = await this.connectPromise;
      this.connectPromise = null;
      return result;
    } catch (error) {
      this.connectPromise = null;
      throw error;
    }
  }

  setupBaseListeners(resolve, reject) {
    if (!this.socket) {
      loggerService.error(LOG_MODULE, 'No hay socket para configurar listeners');
      reject(new Error('No hay socket disponible'));
      return;
    }
    
    this.socket.on('connect', () => {
      loggerService.info(LOG_MODULE, 'Conectado al servidor de señalización', { 
        socketId: this.socket.id 
      });
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      // Procesar operaciones pendientes
      this.processPendingOperations();
      
      // Resolver la promesa de conexión
      resolve(true);
    });

    this.socket.on('connect_error', (error) => {
      this.connectionAttempts++;
      loggerService.error(LOG_MODULE, `Error de conexión (intento ${this.connectionAttempts}/${this.maxConnectionAttempts})`, error);
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        loggerService.error(LOG_MODULE, 'Alcanzado número máximo de intentos de conexión');
        reject(new Error('Tiempo de conexión agotado después de múltiples intentos'));
      }
    });

    this.socket.on('disconnect', (reason) => {
      loggerService.warn(LOG_MODULE, 'Desconectado del servidor de señalización', { reason });
      this.isConnected = false;
      
      // Programar reconexión manual si la reconexión automática de Socket.io no funciona
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      loggerService.info(LOG_MODULE, `Reconectado al servidor después de ${attemptNumber} intentos`);
      this.isConnected = true;
      
      // Volver a unirse a la sala si estábamos en una
      if (this.roomId && this.userId && this.userName) {
        loggerService.debug(LOG_MODULE, 'Volviendo a unirse a sala después de reconexión', {
          roomId: this.roomId,
          userName: this.userName
        });
        
        // Agregar a operaciones pendientes
        this.addPendingOperation(() => this.joinRoom(this.roomId, this.userId, this.userName));
        
        // Procesar operaciones pendientes
        this.processPendingOperations();
      }
    });
    
    // Configurar otros listeners base según sea necesario
  }
  
  // Programar una reconexión manual
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    const delay = Math.min(1000 * (this.connectionAttempts + 1), 10000); // Espera incremental, max 10s
    
    loggerService.info(LOG_MODULE, `Programando reconexión manual en ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      if (!this.isConnected) {
        loggerService.debug(LOG_MODULE, 'Intentando reconexión manual');
        try {
          await this.connect();
        } catch (error) {
          loggerService.error(LOG_MODULE, 'Error en reconexión manual', error);
          // Volver a programar
          this.connectionAttempts++;
          this.scheduleReconnect();
        }
      }
    }, delay);
  }
  
  // Agregar operación pendiente
  addPendingOperation(operation) {
    if (typeof operation === 'function') {
      this.pendingOperations.push(operation);
    }
  }
  
  // Procesar operaciones pendientes
  processPendingOperations() {
    if (!this.isConnected || this.pendingOperations.length === 0) return;
    
    loggerService.debug(LOG_MODULE, `Procesando ${this.pendingOperations.length} operaciones pendientes`);
    
    // Copiar las operaciones y limpiar la cola original
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];
    
    // Ejecutar cada operación
    operations.forEach(operation => {
      try {
        operation();
      } catch (error) {
        loggerService.error(LOG_MODULE, 'Error al procesar operación pendiente', error);
      }
    });
  }

  // Unirse a una sala de chat
  joinRoom(roomId, userId, userName) {
    if (!this.isConnected) {
      loggerService.warn(LOG_MODULE, 'Intentando unirse a sala sin conexión activa', {
        roomId,
        userName
      });
      
      // Agregar a operaciones pendientes
      this.addPendingOperation(() => this.joinRoom(roomId, userId, userName));
      
      // Intentar conectar
      this.connect().catch(error => {
        loggerService.error(LOG_MODULE, 'Error al conectar para unirse a sala', error);
      });
      
      return false;
    }
    
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    
    loggerService.info(LOG_MODULE, `Uniéndose a sala ${roomId}`, {
      userName,
      userId
    });
    
    this.socket.emit('join-room', { roomId, userId, userName });
    return true;
  }

  // Salir de una sala de chat
  leaveRoom() {
    if (!this.isConnected || !this.roomId) return false;
    
    loggerService.info(LOG_MODULE, `Dejando sala ${this.roomId}`);
    // Usar evento personalizado en lugar de 'disconnect' (que es reservado)
    this.socket.emit('leave-room', { roomId: this.roomId });
    this.roomId = null;
    return true;
  }

  // Enviar oferta de WebRTC
  sendOffer(offer, to) {
    if (!this.isConnected) {
      loggerService.warn(LOG_MODULE, 'Intentando enviar oferta sin conexión', { to });
      return false;
    }
    
    loggerService.debug(LOG_MODULE, `Enviando oferta a ${to}`);
    this.socket.emit('offer', { offer, to, from: this.userId });
    return true;
  }

  // Enviar respuesta de WebRTC
  sendAnswer(answer, to) {
    if (!this.isConnected) {
      loggerService.warn(LOG_MODULE, 'Intentando enviar respuesta sin conexión', { to });
      return false;
    }
    
    loggerService.debug(LOG_MODULE, `Enviando respuesta a ${to}`);
    this.socket.emit('answer', { answer, to, from: this.userId });
    return true;
  }

  // Enviar candidato ICE para WebRTC
  sendIceCandidate(candidate, to) {
    if (!this.isConnected) {
      loggerService.warn(LOG_MODULE, 'Intentando enviar ICE candidate sin conexión', { to });
      return false;
    }
    
    this.socket.emit('ice-candidate', { candidate, to, from: this.userId });
    return true;
  }

  // Llamar a un usuario
  callUser(to) {
    if (!this.isConnected || !this.roomId) {
      loggerService.warn(LOG_MODULE, 'Intentando llamar sin conexión', { to });
      return false;
    }
    
    loggerService.info(LOG_MODULE, `Solicitando llamada a ${to}`);
    this.socket.emit('call-user', {
      roomId: this.roomId,
      to,
      from: this.userId,
      fromName: this.userName
    });
    
    return true;
  }

  // Finalizar llamada
  endCall(to = null) {
    if (!this.isConnected || !this.roomId) {
      loggerService.warn(LOG_MODULE, 'Intentando finalizar llamada sin conexión');
      return false;
    }
    
    loggerService.info(LOG_MODULE, `Finalizando llamada con ${to || 'todos'}`);
    this.socket.emit('end-call', {
      roomId: this.roomId,
      to,
      from: this.userId
    });
    
    return true;
  }

  // Enviar mensaje de chat
  sendMessage(roomId, message, sender) {
    if (!this.isConnected) {
      loggerService.warn(LOG_MODULE, 'Intentando enviar mensaje sin conexión', {
        roomId,
        sender
      });
      
      // Agregar a operaciones pendientes
      this.addPendingOperation(() => this.sendMessage(roomId, message, sender));
      
      // Intentar conectar
      this.connect().catch(error => {
        loggerService.error(LOG_MODULE, 'Error al conectar para enviar mensaje', error);
      });
      
      return false;
    }
    
    loggerService.debug(LOG_MODULE, 'Enviando mensaje por socket', {
      roomId,
      sender,
      length: message?.length || 0
    });
    
    this.socket.emit('send-message', {
      roomId,
      message,
      sender
    });
    
    return true;
  }

  // Emitir un evento genérico
  emit(event, data) {
    if (!this.isConnected) {
      loggerService.warn(LOG_MODULE, `No se puede emitir ${event}: socket no conectado`);
      
      // Agregar a operaciones pendientes
      this.addPendingOperation(() => this.emit(event, data));
      
      return false;
    }

    loggerService.debug(LOG_MODULE, `Emitiendo evento: ${event}`);
    this.socket.emit(event, data);
    return true;
  }

  // Escuchar eventos
  on(event, callback) {
    if (!this.socket) {
      loggerService.debug(LOG_MODULE, `Configurando listener para ${event} (socket pendiente)`);
      
      this.connect().then(() => {
        this.socket.on(event, callback);
        loggerService.debug(LOG_MODULE, `Listener configurado para ${event} después de conexión`);
      }).catch(error => {
        loggerService.error(LOG_MODULE, `Error al configurar listener para ${event}`, error);
      });
    } else {
      loggerService.debug(LOG_MODULE, `Configurando listener para ${event}`);
      this.socket.on(event, callback);
    }
    
    // Guardar referencia al event listener para limpieza
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  // Dejar de escuchar eventos
  off(event, callback) {
    if (!this.socket) {
      loggerService.warn(LOG_MODULE, `Intentando quitar listener de ${event} sin socket`);
      return;
    }
    
    if (callback) {
      loggerService.debug(LOG_MODULE, `Quitando listener específico para ${event}`);
      this.socket.off(event, callback);
      
      // Actualizar lista de listeners
      if (this.eventListeners[event]) {
        const index = this.eventListeners[event].indexOf(callback);
        if (index !== -1) {
          this.eventListeners[event].splice(index, 1);
        }
      }
    } else {
      // Si no se proporciona callback, eliminar todos los listeners para ese evento
      loggerService.debug(LOG_MODULE, `Quitando todos los listeners para ${event}`);
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

  // Desconectar
  disconnect() {
    loggerService.info(LOG_MODULE, 'Desconectando socket');
    
    // Cancelar reconexión programada
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      // Primero salir de la sala si estamos en una
      if (this.roomId) {
        this.leaveRoom();
      }
      
      // Limpiar todos los listeners
      for (const event in this.eventListeners) {
        this.eventListeners[event].forEach(listener => {
          this.socket.off(event, listener);
        });
      }
      
      // Limpiar variables de estado
      this.eventListeners = {};
      
      // Desconectar socket
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.roomId = null;
      this.userId = null;
      this.userName = null;
      this.connectionAttempts = 0;
    }
  }

  // Método para cambiar URL del servidor (compatibilidad con versión móvil)
  async setServerUrl(url) {
    if (!url) return;
    
    loggerService.info(LOG_MODULE, 'Cambiando URL del servidor', { 
      oldUrl: this.serverUrl,
      newUrl: url
    });
    
    this.serverUrl = url;
    await AsyncStorage.setItem('signaling_server_url', url);
    
    // Si ya hay una conexión, reconectar
    if (this.isConnected) {
      this.disconnect();
      await this.connect();
    }
  }
  
  // Obtener información de estado
  getStatus() {
    return {
      isConnected: this.isConnected,
      roomId: this.roomId,
      userId: this.userId,
      userName: this.userName,
      pendingOperations: this.pendingOperations.length,
      connectionAttempts: this.connectionAttempts
    };
  }
}

// Crear una única instancia del servicio
const socketService = new SocketService();

export default socketService;