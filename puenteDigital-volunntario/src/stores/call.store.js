// src/stores/call.store.js
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import socketService from '../services/socket.service';
import webrtcService from '../services/webrtc.service';
import { solicitudesAsistenciaService } from '../services/solicitudAsistenciaService';

export const useCallStore = defineStore('call', {
  state: () => ({
    // Usuario
    userId: null,
    userName: '',
    
    // Rol del usuario (asistente o usuario)
    userRole: 'usuario',
    
    // Sala
    roomId: null,
    roomInfo: null,
    participants: [],
    
    // Estado de la llamada
    isInCall: false,
    solicitudAceptada: false, // NUEVO: Para saber si el asistente ya aceptó la solicitud
    localStream: null,
    remoteStreams: {},
    audioEnabled: true,
    videoEnabled: true,
    
    // Mensajes
    messages: [],
    
    // Solicitud actual que se está atendiendo
    currentRequest: null,
    
    // Estado de carga
    loading: false,
    error: null
  }),
  
  actions: {
    // Inicialización
    initialize() {
      // Generar ID único para este usuario si no existe
      if (!this.userId) {
        this.userId = uuidv4();
      }
      
      // Configurar WebRTC
      webrtcService.registerCallbacks({
        onRemoteStream: this.handleRemoteStream.bind(this),
        onRemoteStreamClosed: this.handleRemoteStreamClosed.bind(this),
        onConnectionStateChange: this.handleConnectionStateChange.bind(this),
        onError: this.handleError.bind(this)
      });
      
      // Configurar escuchas de socket
      this.setupSocketListeners();
      
      // Inicializar WebRTC
      webrtcService.init().catch(error => {
        console.error('Error al inicializar WebRTC:', error);
        this.error = `Error al inicializar WebRTC: ${error.message}`;
      });
      
      // Establecer ID de usuario en WebRTC
      webrtcService.setUserId(this.userId);
    },

    setSolicitudAceptada(value) {
      this.solicitudAceptada = value;
    },
    
    // Establecer rol de usuario
    setUserRole(role) {
      this.userRole = role;
    },
    
    // Establecer solicitud actual
    setCurrentRequest(request) {
      this.currentRequest = request;
    },


    resetSolicitudAceptada() {
      this.solicitudAceptada = false;
    },
    
    // Configurar escuchas de socket
    setupSocketListeners() {
      // Cuando un usuario se une a la sala
      socketService.on('user-joined', (participant) => {
        console.log('Usuario unido a la sala:', participant);
        this.addParticipant(participant);
      });
      
      // Cuando un usuario deja la sala
      socketService.on('user-left', ({ userId }) => {
        console.log('Usuario ha dejado la sala:', userId);
        this.removeParticipant(userId);
      });
      
      // Cuando recibimos la lista de usuarios en la sala
      socketService.on('room-users', (users) => {
        console.log('Lista de usuarios en la sala:', users);
        this.participants = users;
      });
      
      // Cuando recibimos un mensaje de chat
      socketService.on('new-message', (messageData) => {
        console.log('Mensaje recibido:', messageData);
        this.messages.push(messageData);
      });
      
      // MODIFICADO: Simplificado, ya no manejamos automáticamente
      // la aceptación de llamada para evitar conflictos de señalización
      socketService.on('call-requested', ({ from, fromName }) => {
        console.log('Solicitud de llamada recibida de:', fromName);
        // No hacemos nada automáticamente, dejamos que los componentes
        // manejen la respuesta según el flujo adecuado
      });

      socketService.on('room-accepted', (data) => {
        console.log('🔔 EVENTO room-accepted RECIBIDO:', data);
        
        // Verificar si el roomId coincide con el actual
        if (data.roomId === this.roomId) {
          console.log('✅ Sala aceptada coincide con sala actual');
          
          // Actualizar estado de solicitud aceptada
          this.solicitudAceptada = true;
        } else {
          console.warn('❌ roomId no coincide', {
            currentRoomId: this.roomId,
            receivedRoomId: data.roomId
          });
        }
      });
    },
    
    // Unirse a una sala
    async joinRoom(roomId, userName, role = 'asistente') {
      try {
        this.loading = true;
        this.error = null;
        this.userName = userName;
        this.userRole = role;
        
        console.log(`Uniéndose a sala ${roomId} como ${userName} (${role})`);
        
        // Obtener información de la solicitud
        if (role === 'usuario') {
          try {
            const solicitudes = await solicitudesAsistenciaService.getSolicitudesByUsuario();
            const solicitud = solicitudes.find(s => s.room_id === roomId);
            if (solicitud) {
              this.currentRequest = solicitud;
            }
          } catch (error) {
            console.warn('No se pudo obtener información de la solicitud:', error);
          }
        }
        
        this.roomId = roomId;
        
        // Unirse a la sala vía Socket.io
        await socketService.connect();
        socketService.joinRoom(roomId, this.userId, userName);
        
        return true;
      } catch (error) {
        console.error('Error al unirse a la sala:', error);
        this.error = 'Error al unirse a la sala: ' + error.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // NUEVO: Método para que el asistente acepte una solicitud
    async aceptarSolicitud() {
      try {
        console.log("🚀 MÉTODO ACEPTAR SOLICITUD INICIADO");
        console.log(`🔍 Detalles:
          - UserRole: ${this.userRole}
          - RoomId: ${this.roomId}
          - UserName: ${this.userName}
          - UserId: ${this.userId}`);
        
        // Verificar que somos asistente
        if (this.userRole !== 'asistente') {
          console.error('Solo el asistente puede aceptar solicitudes');
          this.error = 'Solo el asistente puede aceptar solicitudes';
          return false;
        }
        
        // Acceder directamente al socket
        if (!socketService.socket) {
          console.error('No hay conexión de socket');
          this.error = 'No hay conexión de socket';
          return false;
        }
        
        console.log(`Aceptando solicitud en sala ${this.roomId} como ${this.userName} (${this.userId})`);
        
        // EMITIR DIRECTAMENTE EL EVENTO - Esto es crucial
        socketService.socket.emit('accept-room', {
          roomId: this.roomId,
          asistenteId: this.userId,
          asistenteName: this.userName
        });
        
        console.log("*** EVENTO ACCEPT-ROOM EMITIDO DIRECTAMENTE ***");

        try {
          if (this.currentRequest && this.currentRequest.id) {
            await solicitudesAsistenciaService.updateSolicitud(
              this.currentRequest.id, 
              { 
                estado: 'en_proceso', 
                asistente_id: this.userId 
              }
            );
          }
        } catch (dbError) {
          console.warn('Error al actualizar solicitud en BD:', dbError);
          // No bloquear el flujo si falla la actualización
        }

        // Actualizar estado local
        this.solicitudAceptada = true;
        
        return true;
      } catch (error) {
        console.error('Error al aceptar solicitud:', error);
        this.error = `Error al aceptar solicitud: ${error.message}`;
        return false;
      }
    },
    
    // MODIFICADO: Método para iniciar la videollamada (solo asistente)
    async startCall() {
      try {
        console.log("*** MÉTODO START CALL INICIADO ***");
        this.loading = true;
        
        // Verificaciones de seguridad
        if (this.userRole !== 'asistente') {
          console.error('Solo el asistente puede iniciar llamadas');
          this.error = 'Solo el asistente puede iniciar llamadas';
          return false;
        }
        
        if (!this.solicitudAceptada) {
          console.error('Debes aceptar la solicitud antes de iniciar la videollamada');
          this.error = 'Debes aceptar la solicitud antes de iniciar la videollamada';
          return false;
        }
        
        // Iniciar stream local si no existe
        if (!this.localStream) {
          await this.startLocalStream();
        }
        
        // Filtrar solo usuarios normales (no asistentes)
        const usuariosParaLlamar = this.participants.filter(p => p.userRole !== 'asistente');
        
        console.log("Usuarios para llamar:", usuariosParaLlamar);
        
        if (usuariosParaLlamar.length === 0) {
          console.error('No hay usuarios para llamar en esta sala');
          this.error = 'No hay usuarios para llamar en esta sala';
          return false;
        }
        
        console.log(`*** INICIANDO VIDEOLLAMADA CON ${usuariosParaLlamar.length} USUARIOS ***`);
        
        // PASO 1: Notificar a usuarios que se inicia la llamada (USAR SOCKET DIRECTO)
        for (const usuario of usuariosParaLlamar) {
          console.log(`Enviando solicitud de llamada a ${usuario.userName} (${usuario.userId})`);
          
          // Emisión directa del evento call-requested
          socketService.socket.emit('call-user', {
            roomId: this.roomId,
            to: usuario.userId,
            from: this.userId,
            fromName: this.userName
          });
        }
        
        // Esperar un momento para que los clientes se preparen
        console.log("Esperando 2 segundos para que los clientes se preparen...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // PASO 2: Establecer conexiones WebRTC y enviar ofertas
        for (const usuario of usuariosParaLlamar) {
          try {
            console.log(`*** INICIANDO CONEXIÓN WEBRTC CON ${usuario.userName} (${usuario.userId}) ***`);
            
            // Crear conexión WebRTC
            await webrtcService.initConnection(usuario.userId, true);
            
            // Crear y enviar oferta
            const offer = await webrtcService.createOffer();
            console.log(`Enviando oferta WebRTC a ${usuario.userId}`);
            
            // Envío directo de la oferta
            socketService.socket.emit('offer', {
              offer,
              to: usuario.userId,
              from: this.userId
            });
          } catch (error) {
            console.error(`Error al conectar con usuario ${usuario.userId}:`, error);
          }
        }
        
        console.log("*** VIDEOLLAMADA INICIADA CORRECTAMENTE ***");
        this.isInCall = true;
        return true;
      } catch (error) {
        console.error('Error al iniciar videollamada:', error);
        this.error = `Error al iniciar videollamada: ${error.message}`;
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // Iniciar llamada con un participante específico
    async callUser(targetUserId) {
      try {
        console.log(`Llamando a usuario ${targetUserId}...`);
        
        // Iniciar stream local si no existe
        if (!this.localStream) {
          await this.startLocalStream();
        }
        
        // Iniciar conexión WebRTC
        await webrtcService.initConnection(targetUserId, true);
        
        return true;
      } catch (error) {
        console.error('Error al iniciar llamada:', error);
        this.error = 'Error al iniciar llamada: ' + error.message;
        throw error;
      }
    },
    
    // Aceptar llamada entrante (para usuarios)
    async acceptCall(fromUserId) {
      try {
        console.log(`Aceptando llamada de ${fromUserId}`);
        
        // Iniciar stream local si no existe
        if (!this.localStream) {
          await this.startLocalStream();
        }
        
        this.isInCall = true;
        return true;
      } catch (error) {
        console.error('Error al aceptar llamada:', error);
        this.error = 'Error al aceptar llamada: ' + error.message;
        return false;
      }
    },
    
    // Finalizar llamada
    endCall() {
      console.log('Finalizando llamada...');
      webrtcService.closeAllConnections();
      socketService.endCall();
      this.isInCall = false;
      this.remoteStreams = {};
    },
    
    // Iniciar flujos de medios locales
    async startLocalStream() {
      try {
        console.log('Solicitando acceso a cámara y micrófono...');
        this.localStream = await webrtcService.getLocalStream();
        return this.localStream;
      } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        this.error = 'Error al acceder a la cámara: ' + error.message;
        return null;
      }
    },
    
    // Alternar micrófono
    toggleAudio() {
      this.audioEnabled = !this.audioEnabled;
      webrtcService.toggleAudio(this.audioEnabled);
    },
    
    // Alternar cámara
    toggleVideo() {
      this.videoEnabled = !this.videoEnabled;
      webrtcService.toggleVideo(this.videoEnabled);
    },
    
    // Enviar mensaje de chat
    sendMessage(message) {
      const messageData = {
        message,
        sender: this.userName,
        timestamp: new Date().toISOString(),
        isLocal: true // Para identificar mensajes propios en la UI
      };
      
      this.messages.push(messageData);
      socketService.sendMessage(message);
    },
    
    // Manejar stream remoto recibido
    handleRemoteStream(userId, stream) {
      console.log(`Stream remoto recibido de ${userId}`);
      this.remoteStreams = {
        ...this.remoteStreams,
        [userId]: stream
      };
    },
    
    // Manejar cierre de stream remoto
    handleRemoteStreamClosed(userId) {
      console.log(`Stream remoto cerrado para ${userId}`);
      const newStreams = { ...this.remoteStreams };
      delete newStreams[userId];
      this.remoteStreams = newStreams;
    },
    
    // Manejar cambio de estado de conexión
    handleConnectionStateChange(userId, state) {
      console.log(`Estado de conexión para ${userId}: ${state}`);
      
      // Si la conexión se cierra inesperadamente, actualizar UI
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.handleRemoteStreamClosed(userId);
      }
    },
    
    // Manejar errores de WebRTC
    handleError(type, error, userId) {
      console.error(`Error de ${type}:`, error);
      this.error = `Error de ${type}: ${error.message}`;
      
      // Si el error es fatal, cerrar la conexión
      if (type === 'peer' || type === 'media') {
        if (userId) {
          this.handleRemoteStreamClosed(userId);
        }
      }
    },
    
    // Agregar participante a la lista
    addParticipant(participant) {
      const exists = this.participants.some(p => p.userId === participant.userId);
      if (!exists) {
        this.participants.push(participant);
        console.log('Participante añadido:', participant.userName);
        
        // MODIFICADO: Ya no llamamos automáticamente, esperamos acción del asistente
      }
    },
    
    // Eliminar participante de la lista
    removeParticipant(userId) {
      this.participants = this.participants.filter(p => p.userId !== userId);
      console.log('Participante eliminado:', userId);
      
      // Cerrar conexión con este usuario si existe
      if (this.remoteStreams[userId]) {
        webrtcService.closeConnection(userId);
      }
    },
    
    // Limpiar estado al salir
    cleanup() {
      console.log('Limpiando estado de la videollamada...');
      
      // Cerrar conexiones WebRTC
      webrtcService.cleanup();
      
      // Desconectar socket
      socketService.leaveRoom();
      socketService.disconnect();
      
      // Restablecer estado
      this.roomId = null;
      this.roomInfo = null;
      this.participants = [];
      this.messages = [];
      this.isInCall = false;
      this.solicitudAceptada = false;
      this.localStream = null;
      this.remoteStreams = {};
      this.currentRequest = null;
      this.error = null;
    }
  }
});