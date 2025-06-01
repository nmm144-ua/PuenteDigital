// src/services/socketService.js - Versión optimizada y corregida
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebRTCService from './WebRTCService'

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoom = null;
    this.eventListeners = {};
    this.userId = null;
    this.connectionAttempts = 0;
    
    // Server URL - cambiar a la URL real de tu servidor
    this.serverUrl = 'http://192.168.1.52:3001';
    
    // Evitar duplicación de listeners
    this.registeredEvents = new Set();
  }
  
  // Conectar al servidor de señalización
  async connect() {
    try {
      // Si ya estamos conectados y la conexión es válida, no hacer nada
      if (this.isConnected && this.socket && this.socket.connected) {
        console.log('Ya hay una conexión socket activa, reutilizando');
        return true;
      }
      
      // Si hay una conexión anterior, limpiarla primero
      if (this.socket) {
        console.log('Limpiando conexión de socket anterior');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }
      
      // Leer la URL del servidor de AsyncStorage si existe
      try {
        const serverUrl = await AsyncStorage.getItem('signaling_server_url');
        if (serverUrl) {
          this.serverUrl = serverUrl;
        }
      } catch (storageError) {
        console.warn('Error al leer URL del servidor desde AsyncStorage:', storageError);
      }
      
      console.log(`Conectando a servidor Socket.IO: ${this.serverUrl}`);
      
      // Opciones de conexión mejoradas para Socket.io
      const options = {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true // Forzar una nueva conexión para evitar problemas de estado
      };
      
      // Crear nueva conexión Socket.io
      this.socket = io(this.serverUrl, options);
      
      // Configurar listeners básicos
      this.setupBaseListeners();
      
      // Devolver una promesa que se resuelve cuando la conexión está establecida
      return new Promise((resolve, reject) => {
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.log('Tiempo de conexión agotado');
            reject(new Error('Tiempo de conexión agotado'));
          }
        }, 15000);
        
        // Evento de conexión exitosa
        this.socket.on('connect', () => {
          console.log('Socket conectado:', this.socket.id);
          this.isConnected = true;
          this.connectionAttempts = 0;
          clearTimeout(connectionTimeout);
          resolve(true);
          
          // Si estábamos en una sala antes, volver a unirse
          if (this.currentRoom && this.userId) {
            this.joinRoom(this.currentRoom, this.userId, 'Usuario');
          }
        });
        
        // Evento de error de conexión
        this.socket.on('connect_error', (error) => {
          this.connectionAttempts++;
          console.error('Error de conexión con el servidor:', error);
          
          if (this.connectionAttempts >= 5) {
            clearTimeout(connectionTimeout);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error al conectar con el servidor:', error);
      throw error;
    }
  }
  
  // Configurar listeners básicos
  setupBaseListeners() {
    if (!this.socket) return;
    
    // Asegurarnos de no registrar los eventos básicos más de una vez
    const baseEvents = ['connect', 'disconnect', 'error', 'reconnect', 
                        'reconnect_error', 'reconnect_failed'];
                        
    baseEvents.forEach(event => {
      // Remover listener previo si existe
      this.socket.off(event);
    });
    
    this.socket.on('connect', () => {
      console.log('Socket conectado:', this.socket.id);
      this.isConnected = true;
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason);
      this.isConnected = false;
      
      // Si no fue una desconexión intencional, intentar reconectar
      if (reason !== 'io client disconnect') {
        console.log('Desconexión inesperada, intentando reconectar...');
        this.attemptReconnect();
      }
    });
    
    this.socket.on('error', (error) => {
      console.error('Error de socket:', error);
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconectado después de ${attemptNumber} intentos`);
      this.isConnected = true;
    });
    
    this.socket.on('reconnect_error', (error) => {
      console.error('Error al intentar reconectar:', error);
    });
    
    this.socket.on('reconnect_failed', () => {
      console.error('Falló la reconexión después de todos los intentos');
      // Intentar una reconexión manual
      setTimeout(() => this.connect(), 5000);
    });

    this.socket.on('offer', async ({ offer, to, from }) => {
      console.log(`Oferta recibida de ${from} para ${to}`);
      
      const toSocketId = userSocketMap.get(to);
      if (toSocketId) {
        // Añadir información de restricciones de medios
        const mediaConstraints = {
          video: {
            width: { min: 320, ideal: 640, max: 1280 },
            height: { min: 240, ideal: 480, max: 720 },
            frameRate: { ideal: 24 }
          },
          audio: true
        };
        
        io.to(toSocketId).emit('offer', { 
          offer, 
          from,
          mediaConstraints // Incluir restricciones de medios
        });
      }
    });
  }
  
  // Método para intentar reconectar manualmente
  attemptReconnect() {
    if (!this.isConnected && !this.socket?.connected) {
      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          console.error('Error en reconexión manual:', error);
        }
      }, 3000);
    }
  }
  
  // Desconectar del servidor
  disconnect() {
    console.log('Desconectando socket...');
    console.trace("Traza de llamada a disconnect"); // Traza para encontrar el origen
    if (this.socket) {
      // Si estamos en una sala, salir primero
      if (this.currentRoom) {
        this.leaveRoom(this.currentRoom);
      }
      
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoom = null;
      this.eventListeners = {};
      this.registeredEvents.clear();
      console.log('Socket desconectado correctamente');
    }
  }
  
  // Unirse a una sala
  joinRoom(roomId, userId, userName) {
    // Guardar ID de usuario para manejo de reconexión
    this.userId = userId;
    
    if (!this.socket || !this.isConnected) {
      console.error('No hay conexión con el servidor al intentar unirse a la sala');
      // Intentar conectar primero y luego unirse
      return this.connect()
        .then(() => this._joinRoomInternal(roomId, userId, userName))
        .catch(error => {
          console.error('Error al reconectar para unirse a la sala:', error);
          throw error;
        });
    }
    
    return this._joinRoomInternal(roomId, userId, userName);
  }
  
  // Método interno para unirse a una sala (una vez conectado)
  _joinRoomInternal(roomId, userId, userName) {
    console.log(`Uniendo al usuario ${userName} (${userId}) a la sala ${roomId}`);
    
    // Guardar la sala actual para posibles reconexiones
    this.currentRoom = roomId;
    
    // Enviar evento de unión a sala
    this.socket.emit('join-room', { roomId, userId, userName });
    
    // Registrar listeners para eventos de sala
    this.setupRoomListeners();
    
    return true;
  }
  
  // Configurar listeners específicos de sala
  setupRoomListeners() {
    // Lista de eventos específicos de sala
    const roomEvents = [
      'user-joined', 'room-users', 'offer', 'answer', 
      'ice-candidate', 'call-requested', 'call-ended'
    ];
    
    // Limpiar listeners anteriores para estos eventos
    roomEvents.forEach(event => {
      // Verificar si ya tenemos handlers para este evento
      if (this.eventListeners[event]) {
        // Remover los handlers existentes
        this.eventListeners[event].forEach(handler => {
          if (this.socket) {
            this.socket.off(event, handler);
          }
        });
        // Limpiar la lista de handlers
        this.eventListeners[event] = [];
      }
    });
    
    // Configurar nuevos listeners
    this.on('user-joined', (participant) => {
      console.log('Usuario unido a la sala:', participant);
    });
    
    this.on('room-users', (users) => {
      console.log('Usuarios en la sala:', users);
    });

    // Configurar listener para ofertas entrantes
    this.on('offer', (data) => {
      console.log('***** OFERTA RECIBIDA VÍA SOCKET *****');
      console.log('De usuario:', data.from);
      console.log('Tipo de oferta:', typeof data.offer);
      
      console.log('WebRTCService disponible:', !!WebRTCService);
      console.log('handleIncomingOffer existe:', WebRTCService && typeof WebRTCService.handleIncomingOffer === 'function');
      
      // Intento directo
      if (WebRTCService && typeof WebRTCService.handleIncomingOffer === 'function') {
        try {
          console.log('Intentando llamar a handleIncomingOffer directamente');
          WebRTCService.handleIncomingOffer(data.offer, data.from)
            .then(result => console.log('Resultado de handleIncomingOffer:', result))
            .catch(error => console.error('Error en handleIncomingOffer:', error));
        } catch (error) {
          console.error('Error al llamar handleIncomingOffer:', error);
        }
      }
    });

     // Configurar listener para respuestas
    this.on('answer', (data) => {
      console.log('***** RESPUESTA RECIBIDA VÍA SOCKET *****');
      console.log('De usuario:', data.from);
    });
    
    // Configurar listener para candidatos ICE
    this.on('ice-candidate', (data) => {
      console.log('Candidato ICE recibido de:', data.from);
    });
    
    // Configurar listener para solicitudes de llamada
    this.on('call-requested', (data) => {
      console.log('Solicitud de llamada recibida de:', data.from);
    });
    
    // Configurar listener para finalización de llamada
    this.on('call-ended', (data) => {
      console.log('Llamada finalizada por:', data.from);
    });
    
    // Listeners básicos de sala
    this.on('user-joined', (participant) => {
      console.log('Usuario unido a la sala:', participant);
    });
  
    // Los demás listeners se configurarán a través del método 'on'
    // según sea necesario por otros servicios
  }
  
  // Abandonar la sala actual
  leaveRoom() {
    const roomId = this.currentRoom;
    
    if (this.socket && this.isConnected && roomId) {
      console.log(`Abandonando sala: ${roomId}`);
      console.trace("Traza de llamada a leaveRoom"); // Agregado para detectar el origen

      // Enviar evento para abandonar la sala
      this.socket.emit('leave-room', { roomId });
      this.currentRoom = null;
      
      // Limpiar listeners específicos de sala
      const roomEvents = [
        'user-joined', 'room-users', 'offer', 'answer', 
        'ice-candidate', 'call-requested', 'call-ended'
      ];
      
      roomEvents.forEach(event => {
        this.off(event);
      });
      
      console.log('Sala abandonada correctamente');
      return true;
    }
    
    return false;
  }
  
  // Enviar oferta WebRTC
  sendOffer(offer, toUserId, fromUserId) {
    if (!this.socket || !this.isConnected) {
      console.error('No hay conexión con el servidor al enviar oferta');
      return false;
    }
    
    if (!toUserId) {
      console.error('ID de destino no especificado al enviar oferta');
      return false;
    }
    
    // Usar fromUserId proporcionado o fallback a this.userId
    const senderId = fromUserId || this.userId || 'unknown';
    
    console.log(`Enviando oferta a ${toUserId} desde ${senderId}`);
    
    try {
      // Asegurar que la oferta es serializable
      const safeOffer = JSON.parse(JSON.stringify(offer));
      
      this.socket.emit('offer', {
        offer: safeOffer,
        to: toUserId,
        from: senderId
      });
      
      return true;
    } catch (error) {
      console.error('Error al enviar oferta:', error);
      return false;
    }
  }
  
  // Enviar respuesta WebRTC
  sendAnswer(answer, toUserId, fromUserId) {
    if (!this.socket || !this.isConnected) {
      console.error('No hay conexión con el servidor al enviar respuesta');
      return false;
    }
    
    if (!toUserId) {
      console.error('ID de destino no especificado al enviar respuesta');
      return false;
    }
    
    // Usar fromUserId proporcionado o fallback a this.userId
    const senderId = fromUserId || this.userId || 'unknown';
    
    console.log(`***** ENVIANDO RESPUESTA SDP *****`);
    console.log(`De: ${senderId} a: ${toUserId}`);
    console.log('Tipo de respuesta:', typeof answer);
    
    try {
      // Asegurar que la respuesta es serializable
      const safeAnswer = JSON.parse(JSON.stringify(answer));
      
      this.socket.emit('answer', {
        answer: safeAnswer,
        to: toUserId,
        from: senderId
      });
      
      return true;
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      return false;
    }
  }
  
  // Enviar candidato ICE
  sendIceCandidate(candidate, toUserId, fromUserId) {
    if (!this.socket || !this.isConnected) {
      console.warn('No se puede enviar candidato ICE: no hay conexión');
      return false;
    }
    
    if (!toUserId) {
      console.warn('No se puede enviar candidato ICE: falta ID de destino');
      return false;
    }
    
    // Usar fromUserId proporcionado o fallback a this.userId
    const senderId = fromUserId || this.userId || 'unknown';
    
    try {
      // Asegurar que el candidato es serializable
      const safeCandidate = JSON.parse(JSON.stringify(candidate));
      
      this.socket.emit('ice-candidate', {
        candidate: safeCandidate,
        to: toUserId,
        from: senderId
      });
      
      return true;
    } catch (error) {
      console.error('Error al enviar candidato ICE:', error);
      return false;
    }
  }
  
  // Enviar mensaje de chat
  sendMessage(roomId, message, senderName) {
    if (!this.socket || !this.isConnected) {
      console.error('No hay conexión con el servidor al enviar mensaje');
      return false;
    }
    
    console.log(`Enviando mensaje en sala ${roomId}`);
    
    try {
      // Crear una copia del mensaje para asegurar un solo timestamp
      const messageData = {
        roomId: roomId,
        message: message,
        sender: senderName || 'Usuario',
        timestamp: new Date().toISOString()
      };
      
      // Guardar el último mensaje enviado para detectar duplicados
      if (!this._lastSentMessages) {
        this._lastSentMessages = new Map();
      }
      
      // Generar una clave única para este mensaje
      const messageKey = `${messageData.message}_${messageData.sender}`;
      
      // Verificar si enviamos un mensaje igual recientemente
      const lastSent = this._lastSentMessages.get(messageKey);
      if (lastSent) {
        const timeDiff = Date.now() - lastSent.time;
        if (timeDiff < 2000) { // Si fue hace menos de 2 segundos
          console.log('Evitando envío duplicado:', messageData.message);
          return true; // Simulamos éxito pero no enviamos realmente
        }
      }
      
      // Guardar este mensaje para control de duplicados
      this._lastSentMessages.set(messageKey, {
        time: Date.now(),
        data: messageData
      });
      
      // Limitar tamaño de caché
      if (this._lastSentMessages.size > 50) {
        // Eliminar el más antiguo
        const oldestKey = Array.from(this._lastSentMessages.keys())[0];
        this._lastSentMessages.delete(oldestKey);
      }
      
      // Ahora sí, enviar el mensaje
      this.socket.emit('send-message', messageData);
      
      return true;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      return false;
    }
  }
  
  // Emitir un evento genérico
  emit(event, data) {
    if (!this.socket || !this.isConnected) {
      console.warn(`No se puede emitir ${event}: socket no conectado`);
      return false;
    }
    
    try {
      console.log(`Emitiendo evento: ${event}`);
      this.socket.emit(event, data);
      return true;
    } catch (error) {
      console.error(`Error al emitir evento ${event}:`, error);
      return false;
    }
  }
  
  // Registrar un event listener
  on(event, callback) {
    if (!this.socket) {
      console.warn(`No se puede registrar listener para '${event}': no hay socket`);
      // Intentar conectar y luego registrar
      this.connect().then(() => {
        this._registerListener(event, callback);
      }).catch(error => {
        console.error(`Error al conectar para registrar listener ${event}:`, error);
      });
      return;
    }
    
    this._registerListener(event, callback);
  }
  
  // Método interno para registrar un listener
  _registerListener(event, callback) {
    console.log(`Registrando listener para evento: ${event}`);
    
    // Crear un wrapper único para este callback
    const wrappedCallback = (...args) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error en listener de ${event}:`, error);
      }
    };
    
    // Registrar el callback en el socket
    this.socket.on(event, wrappedCallback);
    
    // Guardar referencia para poder eliminar después
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(wrappedCallback);
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
  
  onOffer(callback) {
    this.on('offer', async (data) => {
      console.log('***** OFERTA RECIBIDA EN onOffer *****');
      console.log('De usuario:', data.from);
      console.log('A usuario:', data.to);
      
      // Verificar datos de la oferta
      if (data.offer && typeof data.offer === 'object') {
        console.log('Oferta válida recibida');
        
        try {
          // Actualizar el ID remoto antes de procesar la oferta
          WebRTCService.setRemoteUserId(data.from);
          
          // Procesar la oferta
          const result = await WebRTCService.handleIncomingOffer(data.offer, data.from);
          console.log('Resultado de handleIncomingOffer:', result);
          
          // Si hubo un error, se puede intentar reiniciar
          if (!result) {
            console.log('Intento fallido, reiniciando WebRTC...');
            // Limpieza completa
            WebRTCService.cleanup();
            
            // Esperar un momento
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Volver a inicializar
            await WebRTCService.init();
            
            // Segundo intento
            const secondResult = await WebRTCService.handleIncomingOffer(data.offer, data.from);
            console.log('Resultado de segundo intento:', secondResult);
          }
        } catch (error) {
          console.error('Error al manejar oferta directamente:', error);
        }
      } else {
        console.error('Oferta inválida recibida:', data.offer);
      }
      
      // Llamar al callback original
      callback(data);
    });
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
  
  // Obtener estado actual
  getStatus() {
    return {
      connected: this.isConnected,
      roomId: this.currentRoom,
      userId: this.userId,
      socketId: this.socket?.id
    };
  }

  // Añadir después de getStatus()
  checkWebRTCState() {
    console.log('======== DIAGNÓSTICO DE SOCKET.IO ========');
    console.log('Socket conectado:', this.isConnected);
    console.log('ID de socket:', this.socket?.id);
    console.log('Sala actual:', this.currentRoom);
    console.log('Usuario ID:', this.userId);
    console.log('Eventos registrados:');
    
    for (const [event, handlers] of Object.entries(this.eventListeners)) {
      console.log(`- ${event}: ${handlers.length} listeners`);
    }
    
    // Verificar específicamente los listeners WebRTC
    const webrtcEvents = ['offer', 'answer', 'ice-candidate'];
    webrtcEvents.forEach(event => {
      const hasListeners = this.eventListeners[event]?.length > 0;
      console.log(`- ${event} está ${hasListeners ? 'REGISTRADO' : 'NO REGISTRADO'}`);
    });
    
    console.log('=========================================');
  }

  //PARTE DE VIDEOLLAMADAS

  //Finalizar llamada
  endCall(roomId, toUserId) {
    if (!this.socket || !this.isConnected) {
      console.error('No hay conexión con el servidor al finalizar llamada');
      return false;
    }
    
    console.log(`Enviando evento de finalización de llamada en sala ${roomId} a ${toUserId || 'todos'}`);
    
    try {
      // Cambiar a end-call para coincidir con el servidor
      this.socket.emit('end-call', {
        roomId: roomId,
        to: toUserId || null,
        from: this.userId || 'unknown'
      });
      
      return true;
    } catch (error) {
      console.error('Error al enviar evento de finalización de llamada:', error);
      return false;
    }
  }

}

// Exportar una instancia única
const socketServiceInstance = new SocketService();
export default socketServiceInstance;