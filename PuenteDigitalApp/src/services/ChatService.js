// src/services/ChatService.js
import { supabase } from '../../supabase';
import SocketService from './socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ChatService {
  constructor() {
    this.isConnected = false;
    this.currentRoom = null;
    this.messages = [];
    this.userId = null;
    this.userName = null;
    this.participants = [];
    this.callbacks = {
      onMessageReceived: null,
      onParticipantJoined: null,
      onParticipantLeft: null,
      onTypingStatus: null
    };
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
      
      this.userId = userData.id;
      this.userName = userData.nombre || 'Usuario';
      
      // Verificar si tenemos conexión al socket
      if (!SocketService.isConnected) {
        try {
          await SocketService.connect();
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
    SocketService.off('new-message');
    SocketService.off('user-joined');
    SocketService.off('user-left');
    SocketService.off('typing');
    
    // Escuchar mensajes entrantes
    SocketService.on('new-message', (messageData) => {
      console.log('Mensaje recibido:', messageData);
      this.messages.push(messageData);
      
      // Notificar a través del callback
      if (this.callbacks.onMessageReceived) {
        this.callbacks.onMessageReceived(messageData);
      }
    });
    
    // Escuchar usuarios que se unen a la sala
    SocketService.on('user-joined', (participant) => {
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
    SocketService.on('user-left', (data) => {
      console.log('Usuario ha dejado la sala:', data.userId);
      
      // Eliminar de la lista de participantes
      this.participants = this.participants.filter(p => p.userId !== data.userId);
      
      // Notificar a través del callback
      if (this.callbacks.onParticipantLeft) {
        this.callbacks.onParticipantLeft(data.userId);
      }
    });
    
    // Escuchar cuando alguien está escribiendo
    SocketService.on('typing', (data) => {
      // Notificar a través del callback
      if (this.callbacks.onTypingStatus) {
        this.callbacks.onTypingStatus(data.userId, data.isTyping);
      }
    });
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
    
    // Unirse a la sala vía Socket.io
    SocketService.joinRoom(roomId, this.userId, this.userName);
    this.currentRoom = roomId;
    
    // Cargar mensajes históricos si es posible
    try {
      await this.loadHistoricalMessages(roomId);
    } catch (error) {
      console.warn('No se pudieron cargar mensajes históricos:', error);
    }
    
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
        .select('*, usuario:usuario_id(*), asistente:asistente_id(*)')
        .eq('solicitud_id', solicitud.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Formatear mensajes
      if (mensajes && mensajes.length) {
        this.messages = mensajes.map(m => ({
          id: m.id,
          message: m.contenido,
          sender: m.usuario_id ? (m.usuario?.nombre || 'Usuario') : (m.asistente?.nombre || 'Asistente'),
          timestamp: m.created_at,
          isLocal: this.isMessageFromCurrentUser(m)
        }));
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
    
    // Verificar si el mensaje es del usuario actual
    return message.usuario_id === this.userId;
  }
  
  // Enviar un mensaje de chat
  async sendMessage(content, solicitudId = null) {
    if (!content || !this.currentRoom) {
      throw new Error('Contenido o sala no especificados');
    }
    
    try {
      // Crear mensaje para la UI
      const messageData = {
        message: content,
        sender: this.userName,
        timestamp: new Date().toISOString(),
        isLocal: true
      };
      
      // Añadir a la lista local
      this.messages.push(messageData);
      
      // Enviar vía socket
      SocketService.sendMessage(this.currentRoom, content, this.userName);
      
      // Guardar en la base de datos si tenemos ID de solicitud
      if (solicitudId) {
        // Crear objeto de mensaje para la BD
        const mensaje = {
          solicitud_id: solicitudId,
          contenido: content,
          tipo: 'texto',
          leido: false,
          usuario_id: this.userId // Como usuario siempre enviamos con usuario_id
        };
        
        // Guardar en la base de datos
        const { data, error } = await supabase
          .from('mensajes')
          .insert([mensaje])
          .select();
        
        if (error) throw error;
        
        // Añadir ID al mensaje local
        if (data && data[0]) {
          messageData.id = data[0].id;
        }
      }
      
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
      SocketService.emit('typing', {
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
      // Como usuario, marcamos como leídos los mensajes de asistentes
      const { error } = await supabase
        .from('mensajes')
        .update({ 
          leido: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('solicitud_id', solicitudId)
        .not('asistente_id', 'is', null);
      
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
      // Obtener mensajes no leídos de asistentes
      const { data, error } = await supabase
        .from('mensajes')
        .select('*, solicitud:solicitud_id(*)')
        .eq('solicitud_id', solicitudId)
        .eq('leido', false)
        .not('asistente_id', 'is', null);
      
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
      // Obtener información del usuario desde AsyncStorage
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (!userDataString) {
        throw new Error('No se puede identificar al usuario');
      }
      
      const userData = JSON.parse(userDataString);
      
      if (!userData || !userData.id) {
        throw new Error('No se puede identificar al usuario');
      }
      
      // Generar ID de sala único si es necesario
      const roomId = this.generateRoomId();
      
      // Crear solicitud en la base de datos
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .insert([{
          usuario_id: userData.id,
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
      // Obtener información del usuario desde AsyncStorage
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (!userDataString) {
        throw new Error('No se puede identificar al usuario');
      }
      
      const userData = JSON.parse(userDataString);
      
      if (!userData || !userData.id) {
        throw new Error('No se puede identificar al usuario');
      }
      
      // Obtener solicitudes de tipo chat del usuario
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*, asistente:asistente_id(*)')
        .eq('usuario_id', userData.id)
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
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  // Salir de la sala
  leaveRoom() {
    if (this.currentRoom) {
      SocketService.leaveRoom(this.currentRoom);
      this.currentRoom = null;
      this.messages = [];
      this.participants = [];
      console.log('Abandonada sala de chat');
    }
  }
  
  // Limpiar todo
  cleanup() {
    this.leaveRoom();
    this.isConnected = false;
    this.userId = null;
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