// src/services/socketService.js - Versión optimizada
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
    this.userId = null;
    this.connectionAttempts = 0;
    
    // Server URL - cambiar a la URL real de tu servidor
    this.serverUrl = 'http://192.168.1.99:3001';
    
    // Registrar manejadores para eventos específicos
    this.specificEventHandlers = {};
  }
  
  // Conectar al servidor de señalización
  async connect() {
    try {
      // Si ya estamos conectados y la conexión es válida, no hacer nada
      if (this.isConnected && this.socket && this.socket.connected) {
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
      const serverUrl = await AsyncStorage.getItem('signaling_server_url');
      if (serverUrl) {
        this.serverUrl = serverUrl;
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
      // Ejecutar manejador específico si existe
      if (this.specificEventHandlers['user-joined']) {
        this.specificEventHandlers['user-joined'](participant);
      }
    });
    
    // Configurar evento para recibir lista de usuarios en la sala
    this.on('room-users', (users) => {
      console.log('Usuarios en la sala:', users);
      // Ejecutar manejador específico si existe
      if (this.specificEventHandlers['room-users']) {
        this.specificEventHandlers['room-users'](users);
      }
    });
    
    // Configurar manejo de ofertas
    this.on('offer', async (data) => {
      console.log('Oferta recibida de:', data.from);
      try {
        // Establecer remoteUserId en WebRTCService
        WebRTCService.setUserIds(this.userId, data.from);
        
        // Procesar la oferta y generar respuesta
        const answer = await WebRTCService.handleIncomingOffer(data.offer, data.from);
        
        // Enviar respuesta si se generó correctamente
        if (answer) {
          this.sendAnswer(answer, data.from, this.userId);
        } else {
          console.warn('No se pudo generar respuesta para la oferta');
        }
      } catch (error) {
        console.error('Error al manejar oferta:', error);
      }
    });
    
    // Configurar manejo de respuestas
    this.on('answer', (data) => {
      console.log('Respuesta recibida de:', data.from);
      
      // Establecer remoteUserId en WebRTCService si no está establecido
      if (!WebRTCService.remoteUserId) {
        WebRTCService.setUserIds(this.userId, data.from);
      }
      
      WebRTCService.handleAnswer(data.answer)
        .catch(error => console.error('Error al manejar respuesta:', error));
    });
    
    // Configurar manejo de candidatos ICE
    this.on('ice-candidate', (data) => {
      console.log('Candidato ICE recibido de:', data.from);
      
      // Establecer remoteUserId en WebRTCService si no está establecido
      if (!WebRTCService.remoteUserId) {
        WebRTCService.setUserIds(this.userId, data.from);
      }
      
      WebRTCService.addIceCandidate(data.candidate)
        .catch(error => console.error('Error al agregar candidato ICE:', error));
    });
    
    // Configurar manejo de solicitudes de llamada
    this.on('call-requested', (data) => {
      console.log('Solicitud de llamada recibida de:', data.from);
      // Ejecutar manejador específico si existe
      if (this.specificEventHandlers['call-requested']) {
        this.specificEventHandlers['call-requested'](data);
      }
    });
    
    // Configurar manejo de finalización de llamada
    this.on('call-ended', (data) => {
      console.log('Llamada finalizada por:', data.from);
      WebRTCService.cleanup();
      // Ejecutar manejador específico si existe
      if (this.specificEventHandlers['call-ended']) {
        this.specificEventHandlers['call-ended'](data);
      }
    });
  }
  
  // Abandonar la sala actual
  leaveRoom(roomId) {
    if (this.socket && this.isConnected && roomId) {
      console.log(`Abandonando sala: ${roomId}`);
      
      // Enviar evento para abandonar la sala
      this.socket.emit('leave-room', { roomId });
      this.currentRoom = null;
      
      // Limpiar listeners específicos de sala
      this.off('user-joined');
      this.off('room-users');
      this.off('offer');
      this.off('answer');
      this.off('ice-candidate');
      this.off('call-requested');
      this.off('call-ended');
      
      console.log('Sala abandonada correctamente');
    }
  }
  
  // Enviar oferta WebRTC
  sendOffer(offer, toUserId, fromUserId) {
    if (!this.socket || !this.isConnected) {
      console.error('No hay conexión con el servidor al enviar oferta');
      return Promise.reject(new Error('No hay conexión al servidor'));
    }
    
    if (!toUserId) {
      console.error('ID de destino no especificado al enviar oferta');
      return Promise.reject(new Error('ID de destino no especificado'));
    }
    
    // Usar fromUserId proporcionado o fallback a this.userId
    const senderId = fromUserId || this.userId || 'unknown';
    
    console.log(`Enviando oferta a ${toUserId} desde ${senderId}`);
    
    // Asegurar que la oferta es serializable y no contiene funciones circulares
    const safeOffer = this.sanitizeObject(offer);
    
    this.socket.emit('offer', {
      offer: safeOffer,
      to: toUserId,
      from: senderId
    });
    
    return Promise.resolve();
  }
  
  // Enviar respuesta WebRTC
  sendAnswer(answer, toUserId, fromUserId) {
    if (!this.socket || !this.isConnected) {
      console.error('No hay conexión con el servidor al enviar respuesta');
      return Promise.reject(new Error('No hay conexión al servidor'));
    }
    
    if (!toUserId) {
      console.error('ID de destino no especificado al enviar respuesta');
      return Promise.reject(new Error('ID de destino no especificado'));
    }
    
    // Usar fromUserId proporcionado o fallback a this.userId
    const senderId = fromUserId || this.userId || 'unknown';
    
    console.log(`Enviando respuesta a ${toUserId} desde ${senderId}`);
    
    // Asegurar que la respuesta es serializable y no contiene funciones circulares
    const safeAnswer = this.sanitizeObject(answer);
    
    this.socket.emit('answer', {
      answer: safeAnswer,
      to: toUserId,
      from: senderId
    });
    
    return Promise.resolve();
  }
  
  // Sanitizar objetos para asegurar que son serializables
  sanitizeObject(obj) {
    if (!obj) return obj;
    
    // Convertir a string y luego a objeto para eliminar propiedades circulares
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.warn('Error al sanitizar objeto:', error);
      // Si falla, intentar una copia más básica eliminando propiedades problemáticas
      const copyWithoutCircular = { ...obj };
      delete copyWithoutCircular.sdp;
      delete copyWithoutCircular.type;
      
      return {
        type: obj.type,
        sdp: obj.sdp
      };
    }
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
    
    // Usar fromUserId proporcionado o fallback a this.userId
    const senderId = fromUserId || this.userId || 'unknown';
    
    // Asegurar que el candidato es serializable
    const safeCandidate = this.sanitizeObject(candidate);
    
    // Verificar que el candidato tiene la propiedad necesaria
    if (!safeCandidate || !safeCandidate.candidate) {
      console.warn('Candidato ICE inválido, no se enviará:', safeCandidate);
      return;
    }
    
    this.socket.emit('ice-candidate', {
      candidate: safeCandidate,
      to: toUserId,
      from: senderId
    });
  }
  
  // Iniciar llamada a otro usuario
  callUser(roomId, toUserId, fromUserId, fromName) {
    if (!this.socket || !this.isConnected) {
      throw new Error('No hay conexión con el servidor');
    }
    
    // Usar fromUserId proporcionado o fallback a this.userId
    const senderId = fromUserId || this.userId || 'unknown';
    const senderName = fromName || 'Usuario';
    
    console.log(`Solicitando llamada a ${toUserId} desde ${senderId}`);
    this.socket.emit('call-user', {
      roomId: roomId,
      to: toUserId,
      from: senderId,
      fromName: senderName
    });
  }
  
  // Responder a una solicitud de llamada
  respondToCall(toUserId, fromUserId, accepted) {
    if (!this.socket || !this.isConnected) {
      throw new Error('No hay conexión con el servidor');
    }
    
    // Usar fromUserId proporcionado o fallback a this.userId
    const senderId = fromUserId || this.userId || 'unknown';
    
    console.log(`Respondiendo a llamada: ${accepted ? 'aceptada' : 'rechazada'}`);
    this.socket.emit('call-response', {
      to: toUserId,
      from: senderId,
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
    
    // Usar this.userId como remitente
    const fromUserId = this.userId || 'anonymous';
    
    if (toUserId) {
      // Finalizar con un usuario específico
      this.socket.emit('end-call', {
        roomId: roomId,
        to: toUserId,
        from: fromUserId
      });
    } else {
      // Finalizar con todos en la sala
      this.socket.emit('end-call', {
        roomId: roomId,
        from: fromUserId
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
  
  // Registrar un manejador específico para un evento
  setSpecificEventHandler(event, callback) {
    this.specificEventHandlers[event] = callback;
  }
  
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