// src/services/webrtc.service.js
import socketService from './socket.service';
import rtcAdapter from './webrtc.adapter';

// Intentar usar simple-peer en entorno web
let Peer;
if (!rtcAdapter.isReactNative) {
  try {
    Peer = require('simple-peer');
  } catch (error) {
    console.warn('simple-peer no está disponible, usando implementación nativa');
  }
}

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.peerConnection = null;
    this.peers = {};
    this.remoteStreams = {};
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { 
        urls: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com',
        credentialType: 'password'
      },
      {
        urls: 'turn:turn.anyfirewall.com:443?transport=tcp', // Forzar TCP
        credential: 'webrtc',
        username: 'webrtc',
        credentialType: 'password'
      }
    ];
    
    this.callbacks = {
      onRemoteStream: null,
      onRemoteStreamClosed: null,
      onConnectionStateChange: null,
      onError: null
    };
    
    this.userId = null;
    this.remoteUserId = null;
    this.connectionAttempts = {}; // Registro de intentos de conexión
    this.debug = true; // Habilitar logging detallado
    this.isNegotiating = false; // Flag para evitar negociaciones simultáneas
    this.isInitiator = false; // Flag para indicar si somos iniciadores
  }

  // Función de log mejorada
  log(message, ...args) {
    if (this.debug) {
      console.log(`[WebRTC] ${message}`, ...args);
    }
  }

  // Función de log de error mejorada
  logError(message, error) {
    console.error(`[WebRTC ERROR] ${message}`, error);
  }

  // Verificar soporte de WebRTC
  checkBrowserSupport() {
    const support = rtcAdapter.checkWebRTCSupport();
    
    this.log('Diagnóstico WebRTC:');
    this.log('- Soportado:', support.supported);
    this.log('- RTCPeerConnection disponible:', support.rtcPeerConnection);
    this.log('- mediaDevices disponible:', support.mediaDevices);
    this.log('- Contexto seguro:', support.secureContext);
    
    if (!support.supported) {
      const reason = !support.secureContext 
        ? 'La API WebRTC requiere un contexto seguro (HTTPS o localhost).'
        : !support.rtcPeerConnection
          ? 'Tu dispositivo no soporta RTCPeerConnection.'
          : 'Tu dispositivo no soporta mediaDevices.';
      
      return {
        supported: false,
        reason,
        recommendation: 'Intenta con un navegador más reciente como Chrome, Firefox, o Edge.'
      };
    }
    
    return {
      supported: true,
      reason: 'Tu dispositivo soporta todas las APIs necesarias para WebRTC.'
    };
  }

  // Registrar callbacks
  registerCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.log('Callbacks registrados:', Object.keys(callbacks));
  }

  // Obtener stream local (cámara y micrófono) - MEJORADO
  async getLocalStream(videoEnabled = true, audioEnabled = true, constraints = null) {
    try {
      // Verificar soporte de WebRTC
      const support = this.checkBrowserSupport();
      if (!support.supported) {
        this.logError('Problema con WebRTC:', support.reason);
        throw new Error(`${support.reason} ${support.recommendation || ''}`);
      }
      
      this.log('Solicitando acceso a cámara y micrófono...');
      
      // Detener stream anterior si existe
      if (this.localStream) {
        this.log('Deteniendo stream local anterior');
        this.stopLocalStream();
      }
      
      // Usar constraints proporcionados o crear unos predeterminados
      let mediaConstraints = constraints;
      if (!mediaConstraints) {
        mediaConstraints = {
          audio: audioEnabled ? { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : false,
          video: videoEnabled ? {
            facingMode: 'user',
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            frameRate: { ideal: 24, min: 15 }
          } : false
        };
      }
      
      this.log('Solicitando medios con restricciones:', mediaConstraints);
      
      try {
        // Solicitar acceso a dispositivos multimedia
        this.localStream = await rtcAdapter.getUserMedia(mediaConstraints);
        
        const videoTracks = this.localStream.getVideoTracks();
        const audioTracks = this.localStream.getAudioTracks();
        
        this.log(`Stream local obtenido - Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);
        
        if (videoTracks.length > 0) {
          this.log('Ajustes de video:', videoTracks[0].getSettings());
        }
        
        if (audioTracks.length > 0) {
          this.log('Ajustes de audio:', audioTracks[0].getSettings());
        }
        
        // Verificar que los tracks estén en estado válido
        if (videoEnabled && videoTracks.length === 0) {
          this.log('ADVERTENCIA: No se obtuvo track de video a pesar de solicitarlo');
        }
        
        if (audioEnabled && audioTracks.length === 0) {
          this.log('ADVERTENCIA: No se obtuvo track de audio a pesar de solicitarlo');
        }
        
        return this.localStream;
      } catch (err) {
        // Si falla con video, intentar solo con audio
        if (videoEnabled) {
          this.log('Error al acceder a la cámara, intentando solo con audio:', err);
          return this.getLocalStream(false, audioEnabled);
        }
        throw err;
      }
    } catch (error) {
      this.logError('Error accediendo a dispositivos multimedia:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('media', error);
      }
      throw error;
    }
  }

  // Detener stream local
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.log(`Deteniendo track: ${track.kind}`);
        track.stop();
      });
      this.localStream = null;
      this.log('Stream local detenido');
    }
  }

  // Configurar eventos de señalización - MEJORADO
  setupSignaling() {
    // Manejo de ofertas
    socketService.on('offer', async (data) => {
      try {
        this.log('Oferta recibida de:', data.from);
        await this.handleIncomingOffer(data.offer, data.from);
      } catch (error) {
        this.logError('Error al manejar oferta:', error);
        if (this.callbacks.onError) {
          this.callbacks.onError('signaling', error);
        }
      }
    });

    // Manejo de respuestas
    socketService.on('answer', (data) => {
      const fromUserId = data.from || data.userId || 'unknown';
      
      if (fromUserId === 'unknown') {
        this.log('Respuesta recibida de usuario desconocido, intentando usar remoteUserId');
        // Intento de recuperación usando el ID de usuario remoto actual
        if (this.remoteUserId) {
          this.handleIncomingAnswer(data.answer, this.remoteUserId);
        } else {
          this.logError('No se puede procesar respuesta: remitente desconocido');
        }
        return;
      }
      
      this.log(`Respuesta recibida de: ${fromUserId}`);
      this.handleIncomingAnswer(data.answer, fromUserId);
    });
    
    // Manejo de candidatos ICE
    socketService.on('ice-candidate', (data) => {
      const fromUserId = data.from || data.userId || 'unknown';
      
      if (fromUserId === 'unknown') {
        this.log('Candidato ICE recibido de usuario desconocido, intentando usar remoteUserId');
        // Intento de recuperación usando el ID de usuario remoto actual
        if (this.remoteUserId) {
          this.handleIceCandidate(data.candidate, this.remoteUserId);
        } else {
          this.logError('No se puede procesar candidato ICE: remitente desconocido');
        }
        return;
      }
      
      this.log(`Candidato ICE recibido de: ${fromUserId}`);
      this.handleIceCandidate(data.candidate, fromUserId);
    });

    // Manejo de usuario que deja la sala
    socketService.on('user-left', (data) => {
      this.log('Usuario ha dejado la sala:', data.userId);
      this.closeConnection(data.userId);
    });

    // Manejo de fin de llamada
    socketService.on('call-ended', (data) => {
      this.log('Llamada finalizada por:', data.from);
      this.closeConnection(data.from);
    });
  }

  // Método unificado para manejar respuestas
  handleIncomingAnswer(answer, fromUserId) {
    if (this.peers[fromUserId]) {
      this.log('Procesando respuesta mediante simple-peer para:', fromUserId);
      this.peers[fromUserId].signal(answer);
    } else if (this.peerConnection && this.remoteUserId === fromUserId) {
      // Implementación para versión móvil
      this.log('Procesando respuesta mediante RTCPeerConnection para:', fromUserId);
      try {
        const remoteDesc = new rtcAdapter.RTCSessionDescription(answer);
        this.peerConnection.setRemoteDescription(remoteDesc)
          .then(() => this.log('Descripción remota establecida correctamente'))
          .catch(error => this.logError('Error al establecer descripción remota:', error));
      } catch (error) {
        this.logError('Error al procesar respuesta:', error);
      }
    } else {
      this.log('ADVERTENCIA: No hay peer para esta respuesta:', fromUserId);
    }
  }

  // Método unificado para manejar candidatos ICE
  handleIceCandidate(candidate, fromUserId) {
    if (this.peers[fromUserId]) {
      this.log('Procesando candidato ICE mediante simple-peer para:', fromUserId);
      this.peers[fromUserId].signal(candidate);
    } else if (this.peerConnection && this.remoteUserId === fromUserId) {
      // Implementación para versión móvil
      this.log('Procesando candidato ICE mediante RTCPeerConnection para:', fromUserId);
      try {
        if (candidate && typeof candidate === 'object') {
          const iceCandidate = new rtcAdapter.RTCIceCandidate(candidate);
          this.peerConnection.addIceCandidate(iceCandidate)
            .then(() => this.log('Candidato ICE añadido correctamente'))
            .catch(error => this.logError('Error al añadir candidato ICE:', error));
        } else {
          this.log('Candidato ICE no válido:', candidate);
        }
      } catch (error) {
        this.logError('Error al procesar candidato ICE:', error);
      }
    } else {
      this.log('ADVERTENCIA: No hay peer para este candidato ICE:', fromUserId);
    }
  }

  // Inicializar WebRTC con diferentes implementaciones según el entorno
  async init() {
    try {
      // Verificar soporte de WebRTC
      const support = this.checkBrowserSupport();
      if (!support.supported) {
        throw new Error(support.reason);
      }
      
      // Forzar limpieza de conexiones anteriores
      this.closeAllConnections();
      
      // Si estamos en entorno web y tenemos simple-peer disponible
      if (!rtcAdapter.isReactNative && Peer) {
        this.log('Usando simple-peer para WebRTC');
        // No crear peerConnection, se crearán al iniciar conexiones
      } else {
        // Enfoque nativo para React Native o web sin simple-peer
        this.log('Usando implementación nativa para WebRTC');
        
        // Crear una nueva conexión RTCPeerConnection
        if (this.peerConnection) {
          this.log('Cerrando conexión anterior');
          this.peerConnection.close();
          this.peerConnection = null;
        }
      }
      
      // Configurar señalización
      this.setupSignaling();
      
      return true;
    } catch (error) {
      this.logError('Error al inicializar WebRTC:', error);
      throw error;
    }
  }

  // Configurar listeners para eventos de la conexión nativa - MEJORADO
  setupPeerConnectionListeners() {
    if (!this.peerConnection) return;
    
    // Evento cuando se genera un candidato ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.log('Candidato ICE generado:', event.candidate.type);
        // Enviar el candidato ICE al otro usuario a través del socket
        socketService.sendIceCandidate(
          event.candidate.toJSON(),
          this.remoteUserId
        );
      } else {
        this.log('Recolección de candidatos ICE completada');
      }
    };
    
    // Evento cuando cambia el estado de la conexión ICE
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      this.log('ICE Connection State cambió a:', state);
      
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(
          this.remoteUserId, 
          state
        );
      }
      
      // Lógica mejorada para manejar reconexiones
      if (state === 'disconnected') {
        this.log('Conexión en estado disconnected, esperando posible reconexión');
        // Programar un timeout para verificar si se recupera
        setTimeout(() => {
          if (this.peerConnection && this.peerConnection.iceConnectionState === 'disconnected') {
            this.log('La conexión sigue en disconnected, intentando recuperar');
            // Intentar reiniciar los candidatos ICE
            if (this.peerConnection.restartIce) {
              this.peerConnection.restartIce();
            }
          }
        }, 5000);
      } else if (state === 'failed') {
        this.log('Conexión ICE fallida, cerrando conexión');
        // Notificar que la conexión ha fallado
        if (this.callbacks.onConnectionStateChange) {
          this.callbacks.onConnectionStateChange(this.remoteUserId, 'failed');
        }
      }
    };
    
    // Evento cuando cambia el estado de la conexión de señalización
    this.peerConnection.onsignalingstatechange = () => {
      this.log('Signaling State cambió a:', this.peerConnection.signalingState);
      
      // Si la señalización se cierra, liberar recursos
      if (this.peerConnection.signalingState === 'closed') {
        this.log('Signaling State closed, liberando recursos');
      }
      
      // Actualizar estado de negociación
      if (this.peerConnection.signalingState === 'stable') {
        this.log('Signaling State stable, permitiendo nuevas negociaciones');
        setTimeout(() => {
          this.isNegotiating = false;
        }, 1000);
      }
    };
    
    // Evento cuando cambia el estado de la conexión
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this.log('Connection State cambió a:', state);
      
      if (state === 'connected') {
        this.log('Conexión establecida correctamente');
      } else if (state === 'failed') {
        this.logError('La conexión ha fallado permanentemente');
        // Cerrar y recrear la conexión
        if (this.remoteUserId) {
          this.closeConnection(this.remoteUserId);
        }
      }
    };
    
    // Evento cuando se recibe un track del otro usuario - MEJORADO
    this.peerConnection.ontrack = (event) => {
      if (!event.streams || event.streams.length === 0) {
        this.logError('Evento ontrack sin streams');
        
        // Crear un stream manualmente si no viene ninguno
        const syntheticStream = new MediaStream();
        syntheticStream.addTrack(event.track);
        
        this.log('Creado stream sintético con track:', event.track.kind);
        
        // Usar este stream sintético
        this.remoteStreams[this.remoteUserId] = syntheticStream;
        
        if (this.callbacks.onRemoteStream) {
          this.callbacks.onRemoteStream(this.remoteUserId, syntheticStream);
        }
        
        return;
      }
      
      const remoteStream = event.streams[0];
      this.log('Recibido track remoto:', event.track.kind, 'ID:', event.track.id);
      this.log('Stream remoto:', remoteStream.id, 'Tracks:', remoteStream.getTracks().length);
      
      // Verificar si el stream ya tiene datos
      const hasAudio = remoteStream.getAudioTracks().length > 0;
      const hasVideo = remoteStream.getVideoTracks().length > 0;
      this.log(`Stream tiene audio: ${hasAudio}, video: ${hasVideo}`);
      
      // Guardar el stream remoto
      this.remoteStreams[this.remoteUserId] = remoteStream;
      
      // Notificar que se ha recibido el stream remoto
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(this.remoteUserId, remoteStream);
      }
      
      // Configurar listeners para el track
      event.track.onended = () => {
        this.log(`Track ${event.track.kind} ha terminado`);
      };
      
      event.track.onmute = () => {
        this.log(`Track ${event.track.kind} ha sido silenciado`);
      };
      
      event.track.onunmute = () => {
        this.log(`Track ${event.track.kind} ha sido reactivado`);
      };
    };
    
    // Manejar errores de negociación - MEJORADO PARA EVITAR PROBLEMAS DE M-LINES
    this.peerConnection.onnegotiationneeded = async () => {
      this.log('Negociación necesaria');
      
      // Evitar negociaciones múltiples simultáneas
      if (this.isNegotiating) {
        this.log('Ya hay una negociación en curso, ignorando');
        return;
      }
      
      this.isNegotiating = true;
      
      // Solo crear oferta si somos el iniciador
      if (this.isInitiator) {
        try {
          this.log('Creando oferta como iniciador');
          
          // En vez de negociar, recrear la conexión para evitar problemas de m-lines
          // Implementación alternativa al error de orden de m-lines
          if (this.connectionAttempts[this.remoteUserId] > 1) {
            this.log('Detectado reintento de conexión, recreando PeerConnection');
            
            // Guardar ID remoto
            const currentRemoteId = this.remoteUserId;
            
            // Cerrar sin limpiar ID
            if (this.peerConnection) {
              this.peerConnection.close();
            }
            
            // Crear nueva instancia
            this.peerConnection = new rtcAdapter.RTCPeerConnection({
              iceServers: this.iceServers,
              iceCandidatePoolSize: 10,
              bundlePolicy: 'max-bundle',
              rtcpMuxPolicy: 'require',
              sdpSemantics: 'unified-plan'
            });
            
            // Configurar de nuevo
            this.setupPeerConnectionListeners();
            this.remoteUserId = currentRemoteId;
            
            // Agregar tracks del stream local
            if (this.localStream) {
              this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
              });
            }
          }
          
          // Crear oferta simplificada para evitar problemas
          const offer = await this.createOffer();
          
          this.log('Enviando oferta a:', this.remoteUserId);
          socketService.sendOffer(offer, this.remoteUserId);
        } catch (error) {
          this.logError('Error durante la negociación:', error);
          this.isNegotiating = false;
        }
      } else {
        this.isNegotiating = false;
      }
    };
  }

  // Crear una conexión con otro usuario
  async initConnection(targetUserId, isInitiator = true) {
    this.log(`Iniciando conexión ${isInitiator ? 'como iniciador' : 'como receptor'} con ${targetUserId}`);
    
    // Registrar intento de conexión
    this.connectionAttempts[targetUserId] = (this.connectionAttempts[targetUserId] || 0) + 1;
    const attemptCount = this.connectionAttempts[targetUserId];
    this.log(`Intento #${attemptCount} de conexión con ${targetUserId}`);
    
    // Cerrar conexión anterior si existe
    if (this.peers[targetUserId] || (this.peerConnection && this.remoteUserId === targetUserId)) {
      this.log('Cerrando conexión anterior con mismo usuario');
      this.closeConnection(targetUserId);
    }
    
    // Asegurarse de tener un stream local
    if (!this.localStream) {
      this.log('No hay stream local, solicitando...');
      try {
        await this.getLocalStream();
      } catch (error) {
        this.logError('No se pudo obtener stream local:', error);
        throw error;
      }
    }
    
    // Establecer IDs y estado
    this.remoteUserId = targetUserId;
    this.isInitiator = isInitiator;
    this.isNegotiating = false;
    
    // Si usamos simple-peer (entorno web)
    if (!rtcAdapter.isReactNative && Peer) {
      return this.initConnectionWithSimplePeer(targetUserId, isInitiator);
    } else {
      // Usamos la implementación nativa
      return this.initConnectionNative(targetUserId, isInitiator);
    }
  }

  // Implementación con simple-peer para web
  async initConnectionWithSimplePeer(targetUserId, isInitiator) {
    // Cerrar conexión anterior si existe
    if (this.peers[targetUserId]) {
      this.log('Cerrando conexión existente con:', targetUserId);
      this.peers[targetUserId].destroy();
      delete this.peers[targetUserId];
    }

    this.log('Creando nueva conexión peer con simple-peer...');
    
    // Verificar que el stream local tenga tracks
    const videoTracks = this.localStream.getVideoTracks();
    const audioTracks = this.localStream.getAudioTracks();
    this.log(`Stream local para conexión - Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);
    
    // Crear nueva conexión peer con configuración estándar
    const peerOptions = {
      initiator: isInitiator,
      trickle: true,
      stream: this.localStream,
      config: {
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10,
        sdpSemantics: 'unified-plan'
      },
      sdpTransform: (sdp) => {
        // Se puede implementar transformación de SDP si es necesario
        return sdp;
      }
    };
    
    this.log('Opciones de peer:', peerOptions);
    const peer = new Peer(peerOptions);

    // Manejar eventos de señalización
    peer.on('signal', data => {
      this.log('Señal generada:', data.type || 'ICE candidate');
      if (data.type === 'offer') {
        this.log('Enviando oferta a', targetUserId);
        socketService.sendOffer(data, targetUserId);
      } else if (data.type === 'answer') {
        this.log('Enviando respuesta a', targetUserId);
        socketService.sendAnswer(data, targetUserId);
      } else {
        this.log('Enviando candidato ICE a', targetUserId);
        socketService.sendIceCandidate(data, targetUserId);
      }
    });

    // Manejar stream remoto
    peer.on('stream', stream => {
      this.log('Stream remoto recibido de:', targetUserId);
      
      // Verificar tracks
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      this.log(`Stream remoto - Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);
      
      // Verificar si hay cambios en el stream
      const existingStream = this.remoteStreams[targetUserId];
      if (existingStream) {
        this.log('Reemplazando stream existente');
      }
      
      // Guardar stream
      this.remoteStreams[targetUserId] = stream;
      
      // Notificar
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(targetUserId, stream);
      }
    });

    // Manejar estado de conexión
    peer.on('connect', () => {
      this.log('Conexión P2P establecida con:', targetUserId);
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(targetUserId, 'connected');
      }
    });

    // Manejar cierre de conexión
    peer.on('close', () => {
      this.log('Conexión P2P cerrada con:', targetUserId);
      this.closeConnection(targetUserId);
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(targetUserId, 'closed');
      }
    });

    // Manejar errores
    peer.on('error', err => {
      this.logError('Error de conexión peer con', targetUserId, ':', err);
      if (this.callbacks.onError) {
        this.callbacks.onError('peer', err, targetUserId);
      }
      
      // Intentar reconexión automática solo para ciertos errores
      if (err.message && (
        err.message.includes('ICE failed') || 
        err.message.includes('timeout')
      )) {
        this.log('Error potencialmente recuperable, intentando reconexión...');
        this.reconnect(targetUserId);
      } else {
        this.closeConnection(targetUserId);
      }
    });

    this.peers[targetUserId] = peer;
    return peer;
  }

  // Implementación nativa para React Native o web sin simple-peer - OPTIMIZADA PARA COMPATIBILIDAD
  async initConnectionNative(targetUserId, isInitiator) {
    // Cerrar conexión anterior si existe
    if (this.peerConnection) {
      this.log('Cerrando conexión anterior');
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Crear nueva conexión con configuración optimizada
    this.peerConnection = new rtcAdapter.RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan'
    });
    
    // Configurar listeners
    this.setupPeerConnectionListeners();
    
    // Agregar tracks al peer connection
    if (this.localStream) {
      this.log('Agregando tracks del stream local a la conexión');
      this.localStream.getTracks().forEach(track => {
        this.log(`Agregando track ${track.kind} con ID ${track.id}`);
        this.peerConnection.addTrack(track, this.localStream);
      });
    } else {
      this.logError('No hay stream local para agregar a la conexión');
    }
    
    // Si somos el iniciador, crear oferta
    if (isInitiator) {
      try {
        this.log('Creando oferta SDP');
        const offer = await this.createOfferSafe();
        this.log('Oferta creada, enviando a', targetUserId);
        socketService.sendOffer(offer, targetUserId);
      } catch (error) {
        this.logError('Error al crear oferta:', error);
        throw error;
      }
    }
    
    return this.peerConnection;
  }

  // Función de creación de oferta segura - NUEVA Y OPTIMIZADA PARA PROBLEMAS DE M-LINES
  async createOfferSafe() {
    try {
      if (!this.peerConnection) {
        throw new Error('La conexión WebRTC no está inicializada');
      }
      
      // Marcar estado de negociación
      this.isNegotiating = true;
      
      // Intentar con opciones simples primero
      try {
        // Crear oferta simple sin opciones especiales
        const offer = await this.peerConnection.createOffer();
        
        // Establecer descripción local
        await this.peerConnection.setLocalDescription(offer);
        this.log('Descripción local establecida correctamente');
        
        return offer;
      } catch (error) {
        this.logError('Error al crear o establecer oferta:', error);
        
        // Segundo intento: crear oferta con opciones específicas
        if (error.name === 'InvalidAccessError' && error.message.includes('m-lines')) {
          this.log('Detectado error de m-lines, intentando método alternativo');
          
          // Recrear la conexión para evitar problemas de orden
          const currentRemoteId = this.remoteUserId;
          const isInit = this.isInitiator;
          
          this.peerConnection.close();
          
          // Crear nueva conexión con configuración básica
          this.peerConnection = new rtcAdapter.RTCPeerConnection({
            iceServers: this.iceServers
          });
          
          // Configurar nuevamente
          this.setupPeerConnectionListeners();
          this.remoteUserId = currentRemoteId;
          this.isInitiator = isInit;
          
          // Agregar tracks nuevamente
          if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
              this.peerConnection.addTrack(track, this.localStream);
            });
          }
          
          // Crear oferta sin opciones específicas
          const simpleOffer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(simpleOffer);
          
          return simpleOffer;
        }
        
        // Si no es un error de m-lines, propagar el error
        throw error;
      } finally {
        // Permitir negociación nuevamente después de un tiempo
        setTimeout(() => {
          this.isNegotiating = false;
        }, 1000);
      }
    } catch (error) {
      this.logError('Error fatal al crear oferta:', error);
      this.isNegotiating = false;
      throw error;
    }
  }

  // Crear una oferta SDP
  async createOffer() {
    return this.createOfferSafe();
  }
  
  // Crear una respuesta SDP
  async createAnswer() {
    try {
      if (!this.peerConnection) {
        throw new Error('La conexión WebRTC no está inicializada');
      }
      
      // Crear respuesta
      const answer = await this.peerConnection.createAnswer();
      
      this.log('Respuesta SDP creada');
      
      // Establecer como descripción local
      await this.peerConnection.setLocalDescription(answer);
      this.log('Descripción local (respuesta) establecida correctamente');
      
      return answer;
    } catch (error) {
      this.logError('Error al crear respuesta:', error);
      throw error;
    }
  }

  // Manejar una oferta recibida
  async handleIncomingOffer(offer, fromUserId) {
    this.log('Manejando oferta entrante de:', fromUserId);
    
    // Actualizar remoteUserId
    this.remoteUserId = fromUserId;
    
    try {
      // Asegurarse de tener un stream local
      if (!this.localStream) {
        this.log('No hay stream local, solicitando para poder responder');
        await this.getLocalStream();
      }
      
      // Si usamos simple-peer (entorno web)
      if (!rtcAdapter.isReactNative && Peer) {
        this.log('Manejando oferta con simple-peer');
        const peer = await this.initConnection(fromUserId, false);
        this.log('Señalizando oferta recibida al peer');
        peer.signal(offer);
      } else {
        // Implementación nativa
        this.log('Manejando oferta con RTCPeerConnection nativo');
        if (!this.peerConnection) {
          await this.initConnection(fromUserId, false);
        }
        
        // Verificar que la oferta es válida
        if (!offer || !offer.type || offer.type !== 'offer') {
          throw new Error('Oferta recibida no válida');
        }
        
        // Crear y establecer la descripción remota
        const remoteDesc = new rtcAdapter.RTCSessionDescription(offer);
        this.log('Estableciendo descripción remota (oferta)');
        await this.peerConnection.setRemoteDescription(remoteDesc);
        this.log('Descripción remota establecida correctamente');
        
        // Crear y enviar respuesta
        this.log('Creando respuesta');
        const answer = await this.createAnswer();
        this.log('Enviando respuesta a', fromUserId);
        socketService.sendAnswer(answer, fromUserId);
      }
    } catch (error) {
      this.logError('Error al manejar oferta entrante:', error);
      throw error;
    }
  }

  // Método para intentar reconexión
  async reconnect(userId) {
    this.log(`Intentando reconexión con ${userId}`);
    
    const maxAttempts = 3;
    const currentAttempts = this.connectionAttempts[userId] || 0;
    
    if (currentAttempts >= maxAttempts) {
      this.log(`Máximo de intentos (${maxAttempts}) alcanzado para ${userId}, no se intentará reconectar`);
      return false;
    }
    
    // Esperar un tiempo antes de reconectar (tiempo exponencial)
    const delay = Math.min(1000 * Math.pow(2, currentAttempts - 1), 10000);
    this.log(`Esperando ${delay}ms antes de reconectar...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Iniciar nueva conexión
    try {
      await this.initConnection(userId, true);
      return true;
    } catch (error) {
      this.logError('Error durante la reconexión:', error);
      return false;
    }
  }

  // Cerrar conexión con un usuario específico
  closeConnection(userId) {
    this.log('Cerrando conexión con:', userId);
    
    // Cerrar conexión simple-peer si existe
    if (this.peers[userId]) {
      this.log('Destruyendo peer simple-peer');
      this.peers[userId].destroy();
      delete this.peers[userId];
    }
    
    // Cerrar conexión nativa si corresponde
    if (this.peerConnection && this.remoteUserId === userId) {
      this.log('Cerrando RTCPeerConnection');
      this.peerConnection.close();
      this.peerConnection = null;
      this.remoteUserId = null;
    }

    // Limpiar stream remoto
    if (this.remoteStreams[userId]) {
      const stream = this.remoteStreams[userId];
      this.log(`Deteniendo ${stream.getTracks().length} tracks del stream remoto`);
      stream.getTracks().forEach(track => track.stop());
      delete this.remoteStreams[userId];
      
      if (this.callbacks.onRemoteStreamClosed) {
        this.callbacks.onRemoteStreamClosed(userId);
      }
    }
  }

  // Cerrar todas las conexiones
  closeAllConnections() {
    this.log('Cerrando todas las conexiones');
    
    // Cerrar todas las conexiones simple-peer
    Object.keys(this.peers).forEach(userId => {
      this.closeConnection(userId);
    });
    
    // Cerrar conexión nativa si existe
    if (this.peerConnection) {
      this.log('Cerrando RTCPeerConnection principal');
      this.peerConnection.close();
      this.peerConnection = null;
      this.remoteUserId = null;
    }
    
    // Detener stream local
    this.stopLocalStream();
    
    // Limpiar todos los streams remotos
    Object.keys(this.remoteStreams).forEach(userId => {
      this.log(`Liberando stream remoto de ${userId}`);
      const stream = this.remoteStreams[userId];
      stream.getTracks().forEach(track => {
        this.log(`Deteniendo track ${track.kind} de usuario ${userId}`);
        track.stop();
      });
    });
    this.remoteStreams = {};
    this.connectionAttempts = {}; // Reiniciar intentos de conexión
  }

  // Alternar audio
  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      
      if (audioTracks.length === 0) {
        this.log('No hay tracks de audio para modificar');
        return false;
      }
      
      audioTracks.forEach(track => {
        track.enabled = enabled;
        this.log(`Micrófono ${enabled ? 'activado' : 'desactivado'} (track ID: ${track.id})`);
      });
      
      return true;
    }
    
    this.log('No hay stream local para modificar audio');
    return false;
  }

  // Alternar video
  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      
      if (videoTracks.length === 0) {
        this.log('No hay tracks de video para modificar');
        return false;
      }
      
      videoTracks.forEach(track => {
        track.enabled = enabled;
        this.log(`Cámara ${enabled ? 'activada' : 'desactivada'} (track ID: ${track.id})`);
      });
      
      return true;
    }
    
    this.log('No hay stream local para modificar video');
    return false;
  }

  // Cambiar entre cámara frontal y trasera
  async switchCamera() {
    try {
      if (!this.localStream) {
        throw new Error('No hay stream de video activo');
      }
      
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No hay tracks de video activos');
      }
      
      this.log('Intentando cambiar de cámara...');
      
      // Llamar al método específico de cada plataforma
      if (rtcAdapter.switchCamera) {
        await rtcAdapter.switchCamera(this.localStream);
        this.log('Cámara cambiada exitosamente');
      } else {
        // Alternativa en navegadores: detener y recrear stream con facingMode opuesto
        const currentTrack = videoTracks[0];
        const currentSettings = currentTrack.getSettings();
        const isFrontCamera = !currentSettings.facingMode || currentSettings.facingMode === 'user';
        
        // Detener track actual
        currentTrack.stop();
        
        // Solicitar nuevo stream con la cámara opuesta
        const constraints = {
          video: {
            facingMode: isFrontCamera ? 'environment' : 'user'
          }
        };
        
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        // Reemplazar track en el stream local
        this.localStream.removeTrack(currentTrack);
        this.localStream.addTrack(newVideoTrack);
        
        // Reemplazar track en todas las conexiones peer
        if (this.peerConnection) {
          const senders = this.peerConnection.getSenders();
          const videoSender = senders.find(sender => 
            sender.track && sender.track.kind === 'video'
          );
          
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          }
        }
        
        // Reemplazar en simple-peer connections
        Object.values(this.peers).forEach(peer => {
          if (peer.replaceTrack) {
            peer.replaceTrack(currentTrack, newVideoTrack, this.localStream);
          }
        });
        
        this.log('Cámara cambiada manualmente');
      }
      
      return true;
    } catch (error) {
      this.logError('Error al cambiar cámara:', error);
      throw error;
    }
  }

  // Alternar altavoz (implementación específica para cada plataforma)
  toggleSpeaker(speakerOn) {
    try {
      this.log(`Intentando cambiar altavoz a: ${speakerOn ? 'altavoz' : 'auricular'}`);
      
      // En React Native, esta función es específica de la plataforma
      if (rtcAdapter.isReactNative) {
        this.log('Usando método específico de React Native');
        const audioTrack = this.localStream && this.localStream.getAudioTracks()[0];
        
        if (audioTrack && audioTrack._setSpeakerphoneOn) {
          audioTrack._setSpeakerphoneOn(speakerOn);
          this.log('Altavoz cambiado correctamente');
          return true;
        } else {
          this.log('No se puede cambiar el altavoz: método no disponible');
        }
      } else {
        // En web, usar la API de AudioContext si está disponible
        this.log('Intentando cambiar altavoz en web');
        
        if ('setSinkId' in HTMLMediaElement.prototype) {
          this.log('setSinkId disponible, se requiere acción del usuario para seleccionar dispositivo');
          // Esto requiere una UI para que el usuario seleccione
          return true;
        } else {
          this.log('Cambio de altavoz no soportado en este navegador');
        }
      }
      
      return false;
    } catch (error) {
      this.logError('Error al cambiar altavoz:', error);
      return false;
    }
  }

  // Obtener el estado de conexión para un usuario
  getConnectionState(userId) {
    // Verificar conexión simple-peer
    if (this.peers && this.peers[userId]) {
      const peer = this.peers[userId];
      if (peer._connected) return 'connected';
      if (peer.destroyed) return 'closed';
      return 'connecting';
    }
    
    // Verificar conexión nativa
    if (this.peerConnection && this.remoteUserId === userId) {
      if (this.peerConnection.iceConnectionState) {
        return this.peerConnection.iceConnectionState;
      }
      if (this.peerConnection.connectionState) {
        return this.peerConnection.connectionState;
      }
    }
    
    // Si hay stream
    return this.remoteStreams[userId] ? 'connected' : 'disconnected';
  }

  // Establecer callbacks para eventos remotos
  onRemoteStream(callback) {
    this.callbacks.onRemoteStream = callback;
    
    // Si ya tenemos streams remotos, llamar al callback inmediatamente
    Object.entries(this.remoteStreams).forEach(([userId, stream]) => {
      this.log(`Notificando stream existente para ${userId}`);
      callback(userId, stream);
    });
  }

  // Establecer ID de usuario
  setUserId(userId) {
    this.userId = userId;
    this.log(`ID de usuario establecido: ${userId}`);
  }

  // Obtener todos los streams remotos
  getRemoteStreams() {
    return this.remoteStreams;
  }

  // Limpiar recursos
  cleanup() {
    this.log('Limpiando todos los recursos WebRTC');
    this.closeAllConnections();
    this.userId = null;
    this.remoteUserId = null;
    this.callbacks = {
      onRemoteStream: null,
      onRemoteStreamClosed: null,
      onConnectionStateChange: null,
      onError: null
    };
    this.log('Limpieza completada');
  }
}

export default new WebRTCService();