// src/services/ChatService.js - Implementación completa y corregida
import { supabase } from '../../supabase';
import socketService from './socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ChatService {
  constructor() {
    this.isConnected = false;
    this.currentRoom = null;
    this.messages = [];
    this.userId = null;        // ID de autenticación (auth.users)
    this.userDbId = null;      // ID en la tabla de usuario
    this.userName = null;
    this.userRole = 'usuario'; // Rol por defecto
    this.participants = [];
    this.callbacks = {
      onMessageReceived: null,
      onParticipantJoined: null,
      onParticipantLeft: null,
      onTypingStatus: null
    };
    
    // SISTEMA ANTI-DUPLICADOS MEJORADO
    this.processedMessageIds = new Set();                // IDs de mensajes procesados
    this.processedMessageKeys = new Set();               // Claves únicas de mensajes procesados
    this.pendingLocalMessages = new Map();               // Mensajes enviados localmente
    this.lastMessageCallback = Date.now();               // Timestamp del último callback
    this.disableCallbacks = false;                       // Flag para pausar callbacks
  }

  // Inicializar el servicio
  async init() {
    try {
      // Obtener información del usuario desde AsyncStorage
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (!userDataString) {
        console.error('No se encontró información de usuario en AsyncStorage');
        throw new Error('No se puede identificar al usuario');
      }
      
      const userData = JSON.parse(userDataString);
      
      if (!userData || !userData.id) {
        console.error('Datos de usuario inválidos:', userData);
        throw new Error('No se puede identificar al usuario');
      }
      
      this.userId = userData.id;           // ID de autenticación
      this.userDbId = userData.userDbId;   // ID en la tabla usuario
      this.userName = userData.nombre || 'Usuario';
      this.userRole = userData.userRole || 'usuario';
      this.isAsistente = userData.isAsistente || false;
      
      console.log('ChatService inicializado con:', {
        userId: this.userId,
        userDbId: this.userDbId,
        userRole: this.userRole,
        isAsistente: this.isAsistente
      });
      
      // Verificar si tenemos conexión al socket
      if (!socketService.isConnected) {
        try {
          await socketService.connect();
        } catch (error) {
          console.error('Error al conectar con el servidor de chat:', error);
          throw error;
        }
      }
      
      // Configurar listeners de eventos
      this.setupSocketListeners();
      
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Error al inicializar ChatService:', error);
      throw error;
    }
  }
  
  // Configurar listeners de eventos
  setupSocketListeners() {
    // Eliminar listeners previos para evitar duplicados
    socketService.off('new-message');
    socketService.off('user-joined');
    socketService.off('user-left');
    socketService.off('typing');
    
    // Escuchar mensajes entrantes
    socketService.on('new-message', (messageData) => {
      // MEJORA: Verificar si debemos procesar este mensaje
      if (this.disableCallbacks) {
        console.log('Callbacks deshabilitados temporalmente, ignorando mensaje');
        return;
      }
      
      console.log('Mensaje recibido desde socket:', messageData);
      
      // Generar una clave única para este mensaje
      const messageKey = `${messageData.timestamp}_${messageData.sender}_${messageData.message}`;
      
      // SISTEMA ANTI-DUPLICADOS MEJORADO: Verificar si ya procesamos este mensaje
      if (this.processedMessageKeys.has(messageKey)) {
        console.log('Mensaje duplicado por clave única, ignorando');
        return;
      }
      
      // VERIFICACIÓN DE MENSAJE PROPIO: Comprobar si lo enviamos nosotros
      const isOwnMessage = messageData.sender === this.userName;
      
      // Si es nuestro propio mensaje, verificar si coincide con uno pendiente
      if (isOwnMessage) {
        for (const [tempId, pendingMsg] of this.pendingLocalMessages.entries()) {
          // Comprobar si el contenido coincide
          if (pendingMsg.message === messageData.message) {
            // Verificar que las marcas de tiempo sean cercanas (menos de 10 segundos)
            const timeDiff = Math.abs(
              new Date(pendingMsg.timestamp).getTime() - 
              new Date(messageData.timestamp).getTime()
            );
            
            if (timeDiff < 10000) {
              console.log('Mensaje propio ya registrado, ignorando duplicado');
              // Registrar la clave para evitar futuros duplicados
              this.processedMessageKeys.add(messageKey);
              // Eliminar de pendientes
              this.pendingLocalMessages.delete(tempId);
              return;
            }
          }
        }
      }
      
      // Registrar que procesamos este mensaje
      this.processedMessageKeys.add(messageKey);
      
      // Añadir información de si es mensaje propio
      const enhancedMessage = {
        ...messageData,
        isLocal: isOwnMessage
      };
      
      // Añadir a la lista local
      this.messages.push(enhancedMessage);
      
      // Notificar a través del callback (si tenemos uno y no está deshabilitado)
      if (this.callbacks.onMessageReceived) {
        try {
          // Limitar frecuencia de callbacks (al menos 100ms entre cada uno)
          const now = Date.now();
          if (now - this.lastMessageCallback > 100) {
            this.lastMessageCallback = now;
            this.callbacks.onMessageReceived(enhancedMessage);
          } else {
            // Si los callbacks son muy frecuentes, añadir un pequeño retraso
            setTimeout(() => {
              if (this.callbacks.onMessageReceived) {
                this.callbacks.onMessageReceived(enhancedMessage);
              }
            }, 150);
          }
        } catch (callbackError) {
          console.error('Error en callback de mensaje:', callbackError);
        }
      }
    });
    
    // Escuchar usuarios que se unen a la sala
    socketService.on('user-joined', (participant) => {
      if (this.disableCallbacks) return;
      
      console.log('Usuario unido a la sala:', participant);
      
      // Evitar duplicados
      const exists = this.participants.some(p => p.userId === participant.userId);
      if (!exists) {
        this.participants.push(participant);
      }
      
      // Notificar a través del callback
      if (this.callbacks.onParticipantJoined) {
        this.callbacks.onParticipantJoined(participant);
      }
    });
    
    // Escuchar usuarios que dejan la sala
    socketService.on('user-left', (data) => {
      if (this.disableCallbacks) return;
      
      console.log('Usuario ha dejado la sala:', data.userId);
      
      // Eliminar de la lista de participantes
      this.participants = this.participants.filter(p => p.userId !== data.userId);
      
      // Notificar a través del callback
      if (this.callbacks.onParticipantLeft) {
        this.callbacks.onParticipantLeft(data.userId);
      }
    });
    
    // Escuchar cuando alguien está escribiendo
    socketService.on('typing', (data) => {
      if (this.disableCallbacks) return;
      
      // Notificar a través del callback
      if (this.callbacks.onTypingStatus) {
        this.callbacks.onTypingStatus(data.userId, data.isTyping);
      }
    });
  }
  
  // Limpiar mensajes temporales antiguos
  cleanTemporaryMessages() {
    const now = Date.now();
    const MAX_AGE = 30000; // 30 segundos (ampliado para mayor seguridad)
    
    // Limpiar mensajes pendientes antiguos
    for (const [key, message] of this.pendingLocalMessages.entries()) {
      if (now - new Date(message.timestamp).getTime() > MAX_AGE) {
        this.pendingLocalMessages.delete(key);
      }
    }
    
    // Limitar el tamaño de los sets de procesamiento para evitar crecimiento indefinido
    if (this.processedMessageKeys.size > 1000) {
      // Convertir a array, mantener solo los últimos 500
      const keysArray = Array.from(this.processedMessageKeys);
      this.processedMessageKeys = new Set(keysArray.slice(-500));
    }
    
    if (this.processedMessageIds.size > 1000) {
      const idsArray = Array.from(this.processedMessageIds);
      this.processedMessageIds = new Set(idsArray.slice(-500));
    }
  }
  
  // Unirse a una sala de chat
  async joinRoom(roomId) {
    if (!this.isConnected) {
      await this.init();
    }
    
    if (!roomId) {
      throw new Error('ID de sala no proporcionado');
    }
    
    console.log(`Uniéndose a sala de chat ${roomId} como ${this.userName} (${this.userId})`);
    
    // MEJORA: Deshabilitar callbacks temporalmente durante la unión
    this.disableCallbacks = true;
    
    // Unirse a la sala vía Socket.io
    socketService.joinRoom(roomId, this.userId, this.userName);
    this.currentRoom = roomId;
    
    // Limpiar listas de control de duplicados
    this.processedMessageIds.clear();
    this.processedMessageKeys.clear();
    this.pendingLocalMessages.clear();
    
    // Cargar mensajes históricos si es posible
    try {
      await this.loadHistoricalMessages(roomId);
    } catch (error) {
      console.warn('No se pudieron cargar mensajes históricos:', error);
    }
    
    // MEJORA: Volver a habilitar callbacks después de procesar los mensajes históricos
    setTimeout(() => {
      this.disableCallbacks = false;
    }, 500);
    
    return true;
  }
  
  // Cargar mensajes históricos
  async loadHistoricalMessages(roomId) {
    try {
      // Buscar solicitud asociada con esta sala
      const { data: solicitud, error: errorSolicitud } = await supabase
        .from('solicitudes_asistencia')
        .select('id')
        .eq('room_id', roomId)
        .single();
      
      if (errorSolicitud || !solicitud) {
        throw new Error('No se encontró solicitud para esta sala');
      }
      
      // Cargar mensajes de la solicitud
      const { data: mensajes, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('solicitud_id', solicitud.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      console.log('Estructura de mensajes cargados:', 
        mensajes && mensajes.length > 0 ? Object.keys(mensajes[0]) : []);
      
      // Limpiar lista de mensajes
      this.messages = [];
      
      // Formatear mensajes
      if (mensajes && mensajes.length) {
        // Registrar IDs para evitar duplicados
        mensajes.forEach(m => {
          this.processedMessageIds.add(m.id.toString());
          
          // También registrar claves combinadas
          const key = `${m.created_at}_${m.tipo === 'asistente' ? 'Asistente' : 'Usuario'}_${m.contenido}`;
          this.processedMessageKeys.add(key);
        });
        
        // Formatear y añadir mensajes a la lista
        this.messages = mensajes.map(m => {
          // Como no tenemos usuario_id o asistente_id en la tabla mensajes,
          // usamos el tipo para determinar el remitente
          const esDeAsistente = m.tipo === 'asistente';
          const esPropio = this.userRole === 'asistente' ? esDeAsistente : !esDeAsistente;
          
          return {
            id: m.id,
            message: m.contenido,
            sender: esDeAsistente ? 'Asistente' : 'Usuario',
            timestamp: m.created_at,
            isLocal: esPropio
          };
        });
      }
      
      return this.messages;
    } catch (error) {
      console.error('Error al cargar mensajes históricos:', error);
      return [];
    }
  }
  
  // Determinar si un mensaje es del usuario actual
  isMessageFromCurrentUser(message) {
    // Si el mensaje tiene campo isLocal, usarlo
    if (message.isLocal !== undefined) {
      return message.isLocal;
    }
    
    // Como no tenemos usuario_id o asistente_id en la tabla mensajes,
    // usamos el tipo para determinar el remitente
    const esDeAsistente = message.tipo === 'asistente';
    return this.userRole === 'asistente' ? esDeAsistente : !esDeAsistente;
  }
  
  // Enviar mensaje
  async sendMessage(content, solicitudId = null) {
    if (!content || !this.currentRoom) {
      throw new Error('Contenido o sala no especificados');
    }
    
    try {
      // Crear un identificador único para este mensaje
      const tempId = Date.now().toString();
      const timestamp = new Date().toISOString();
      
      // Crear mensaje para la UI
      const messageData = {
        id: tempId, // ID temporal
        message: content,
        sender: this.userName,
        timestamp: timestamp,
        isLocal: true // Este mensaje siempre es local
      };
      
      // Generar clave única para este mensaje
      const messageKey = `${timestamp}_${this.userName}_${content}`;
      
      // Registrar como procesado para evitar duplicados
      this.processedMessageKeys.add(messageKey);
      
      // Guardar mensaje pendiente para detectar duplicados
      this.pendingLocalMessages.set(tempId, messageData);
      
      // Añadir a la lista local
      this.messages.push(messageData);
      
      // Enviar vía socket
      const socketSuccess = socketService.sendMessage(this.currentRoom, content, this.userName);
      
      if (!socketSuccess) {
        console.warn('No se pudo enviar mensaje por socket, solo se guardará en BD');
      }
      
      // Guardar en la base de datos si tenemos ID de solicitud
      if (solicitudId) {
        // Crear objeto de mensaje para la BD
        const mensaje = {
          solicitud_id: solicitudId,
          contenido: content,
          tipo: this.isAsistente ? 'asistente' : 'usuario',
          leido: false
        };
        
        console.log('Enviando mensaje a BD:', mensaje);
        
        // Guardar en la base de datos
        const { data, error } = await supabase
          .from('mensajes')
          .insert([mensaje])
          .select();
        
        if (error) {
          console.error('Error al guardar mensaje en BD:', error);
          throw error;
        }
        
        // Actualizar el mensaje local con el ID permanente
        if (data && data[0]) {
          // Buscar el mensaje en la lista local
          const index = this.messages.findIndex(m => 
            m.id === tempId || 
            (m.message === content && m.isLocal)
          );
          
          if (index !== -1) {
            // Actualizar con el ID permanente
            this.messages[index].id = data[0].id;
            // Registrar en la lista de procesados
            this.processedMessageIds.add(data[0].id.toString());
          }
          
          // Eliminar de los pendientes pues ya se confirmó
          this.pendingLocalMessages.delete(tempId);
        }
      }
      
      // Notificar callback con el mensaje enviado (si existe y no está deshabilitado)
      if (this.callbacks.onMessageReceived && !this.disableCallbacks) {
        // Usar timeout para asegurar que el mensaje se procese después de cualquier lógica actual
        setTimeout(() => {
          if (this.callbacks.onMessageReceived) {
            try {
              this.callbacks.onMessageReceived(messageData);
            } catch (callbackError) {
              console.error('Error en callback de mensaje enviado:', callbackError);
            }
          }
        }, 50);
      }
      
      // Limpiar mensajes temporales antiguos
      this.cleanTemporaryMessages();
      
      return messageData;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }
  
  // Enviar estado de escritura
  sendTypingStatus(isTyping) {
    if (!this.currentRoom) return;
    
    try {
      socketService.emit('typing', {
        roomId: this.currentRoom,
        userId: this.userId,
        isTyping
      });
    } catch (error) {
      console.error('Error al enviar estado de escritura:', error);
    }
  }
  
  // Marcar mensajes como leídos
  async markMessagesAsRead(solicitudId) {
    if (!solicitudId) return;
    
    try {
      // Marcar como leídos los mensajes del otro rol
      const tipoABuscar = this.isAsistente ? 'usuario' : 'asistente';
      
      const { error } = await supabase
        .from('mensajes')
        .update({ 
          leido: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('solicitud_id', solicitudId)
        .eq('tipo', tipoABuscar)
        .eq('leido', false);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error al marcar mensajes como leídos:', error);
      return false;
    }
  }
  
  // Obtener mensajes no leídos
  async getUnreadMessages(solicitudId) {
    if (!solicitudId) return [];
    
    try {
      // Obtener mensajes no leídos basados en el tipo de usuario
      const tipoABuscar = this.isAsistente ? 'usuario' : 'asistente';
      
      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('solicitud_id', solicitudId)
        .eq('tipo', tipoABuscar)
        .eq('leido', false);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error al obtener mensajes no leídos:', error);
      return [];
    }
  }
  
  // Actualizar el estado de una solicitud
  async updateSolicitudStatus(solicitudId, estado) {
    if (!solicitudId || !estado) return false;
    
    try {
      const updateData = { estado };
      
      // Si es 'en_proceso', agregar timestamp de atención
      if (estado === 'en_proceso') {
        updateData.atendido_timestamp = new Date().toISOString();
      }
      
      // Si es 'finalizada', agregar timestamp de finalización
      if (estado === 'finalizada') {
        updateData.finalizado_timestamp = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('solicitudes_asistencia')
        .update(updateData)
        .eq('id', solicitudId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error al actualizar estado de solicitud:', error);
      return false;
    }
  }
  
  // Crear una nueva solicitud de asistencia de tipo chat
  async createChatRequest(descripcion) {
    try {
      // Ya debemos tener userDbId del init()
      if (!this.userDbId) {
        throw new Error('No se puede identificar al usuario');
      }
      
      // Generar ID de sala único si es necesario
      const roomId = this.generateRoomId();
      
      // Crear solicitud en la base de datos
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .insert([{
          usuario_id: this.userDbId,
          descripcion,
          room_id: roomId,
          estado: 'pendiente',
          tipo_asistencia: 'chat'
        }])
        .select();
      
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Error al crear solicitud de chat:', error);
      throw error;
    }
  }
  
  // Generar ID único para sala
  generateRoomId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Obtener solicitudes de chat del usuario actual
  async getUserChatRequests() {
    try {
      // Ya debemos tener userDbId del init()
      if (!this.userDbId) {
        throw new Error('No se puede identificar al usuario');
      }
      
      // Obtener solicitudes de tipo chat del usuario
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*, asistente:asistente_id(*)')
        .eq('usuario_id', this.userDbId)
        .eq('tipo_asistencia', 'chat')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error al obtener solicitudes de chat:', error);
      return [];
    }
  }
  
  // Registrar callbacks
  registerCallbacks(callbacks) {
    // Si se proporciona null explícitamente para un callback, eliminarlo
    Object.keys(callbacks).forEach(key => {
      if (callbacks[key] === null) {
        this.callbacks[key] = null;
      } else if (callbacks[key]) {
        this.callbacks[key] = callbacks[key];
      }
    });
  }
  
  // Salir de la sala
  leaveRoom() {
    // Primero deshabilitar callbacks para evitar eventos durante la limpieza
    this.disableCallbacks = true;
    
    if (this.currentRoom) {
      socketService.leaveRoom();
      this.currentRoom = null;
      this.messages = [];
      this.participants = [];
      this.processedMessageIds.clear();
      this.processedMessageKeys.clear();
      this.pendingLocalMessages.clear();
      console.log('Abandonada sala de chat');
    }
    
    // Limpiar callbacks
    this.callbacks = {
      onMessageReceived: null,
      onParticipantJoined: null,
      onParticipantLeft: null,
      onTypingStatus: null
    };
  }
  
  // Limpiar todo
  cleanup() {
    this.disableCallbacks = true;
    this.leaveRoom();
    this.isConnected = false;
    this.userId = null;
    this.userDbId = null;
    this.userName = null;
    this.callbacks = {
      onMessageReceived: null,
      onParticipantJoined: null,
      onParticipantLeft: null,
      onTypingStatus: null
    };
  }
}

export default new ChatService();