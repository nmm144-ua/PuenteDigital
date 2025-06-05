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
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      // Servidores TURN gratuitos (limitados)
      { 
        urls: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com'
      },
      {
        urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
        credential: 'webrtc',
        username: 'webrtc'
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
  }

  // Verificar soporte de WebRTC
  checkBrowserSupport() {
    const support = rtcAdapter.checkWebRTCSupport();
    
    console.log('Diagnóstico WebRTC:');
    console.log('- Soportado:', support.supported);
    console.log('- RTCPeerConnection disponible:', support.rtcPeerConnection);
    console.log('- mediaDevices disponible:', support.mediaDevices);
    console.log('- Contexto seguro:', support.secureContext);
    
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
  }

  // Obtener stream local (cámara y micrófono)
  async getLocalStream(videoEnabled = true, audioEnabled = true) {
    try {
      // Verificar soporte de WebRTC
      const support = this.checkBrowserSupport();
      if (!support.supported) {
        console.error('Problema con WebRTC:', support.reason);
        throw new Error(`${support.reason} ${support.recommendation || ''}`);
      }
      
      console.log('Solicitando acceso a cámara y micrófono...');
      
      // Configurar restricciones
      const constraints = {
        audio: audioEnabled,
        video: videoEnabled 
          ? {
              facingMode: 'user',
              width: { ideal: 640, min: 320 },
              height: { ideal: 480, min: 240 },
              frameRate: { ideal: 24, min: 15 }
            } 
          : false
      };
      
      console.log('Solicitando medios con restricciones:', constraints);
      
      try {
        this.localStream = await rtcAdapter.getUserMedia(constraints);
        
        const videoTracks = this.localStream.getVideoTracks();
        const audioTracks = this.localStream.getAudioTracks();
        
        console.log(`Stream local obtenido - Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);
        
        if (videoTracks.length > 0) {
          console.log('Ajustes de video:', videoTracks[0].getSettings());
        }
        
        return this.localStream;
      } catch (err) {
        // Si falla con video, intentar solo con audio
        if (videoEnabled) {
          console.warn('Error al acceder a la cámara, intentando solo con audio');
          return this.getLocalStream(false, audioEnabled);
        }
        throw err;
      }
    } catch (error) {
      console.error('Error accediendo a dispositivos multimedia:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('media', error);
      }
      throw error;
    }
  }

  // Detener stream local
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      console.log('Stream local detenido');
    }
  }

  // Configurar eventos de señalización
  setupSignaling() {
    // Manejo de ofertas
    socketService.on('offer', async (data) => {
      try {
        console.log('Oferta recibida de:', data.from);
        await this.handleIncomingOffer(data.offer, data.from);
      } catch (error) {
        console.error('Error al manejar oferta:', error);
        if (this.callbacks.onError) {
          this.callbacks.onError('signaling', error);
        }
      }
    });

    // Manejo de respuestas
    socketService.on('answer', (data) => {
      console.log('Respuesta recibida de:', data.from);
      if (this.peers[data.from]) {
        this.peers[data.from].signal(data.answer);
      } else if (this.peerConnection) {
        // Implementación para versión móvil
        try {
          const remoteDesc = new rtcAdapter.RTCSessionDescription(data.answer);
          this.peerConnection.setRemoteDescription(remoteDesc)
            .catch(error => console.error('Error al establecer descripción remota:', error));
        } catch (error) {
          console.error('Error al manejar respuesta:', error);
        }
      } else {
        console.warn('No hay peer para esta respuesta:', data.from);
      }
    });

    // Manejo de candidatos ICE
    socketService.on('ice-candidate', (data) => {
      if (this.peers[data.from]) {
        this.peers[data.from].signal(data.candidate);
      } else if (this.peerConnection) {
        // Implementación para versión móvil
        try {
          const candidate = new rtcAdapter.RTCIceCandidate(data.candidate);
          this.peerConnection.addIceCandidate(candidate)
            .catch(error => console.error('Error al añadir candidato ICE:', error));
        } catch (error) {
          console.error('Error al manejar candidato ICE:', error);
        }
      } else {
        console.warn('No hay peer para este candidato ICE:', data.from);
      }
    });

    // Manejo de usuario que deja la sala
    socketService.on('user-left', (data) => {
      console.log('Usuario ha dejado la sala:', data.userId);
      this.closeConnection(data.userId);
    });

    // Manejo de fin de llamada
    socketService.on('call-ended', (data) => {
      console.log('Llamada finalizada por:', data.from);
      this.closeConnection(data.from);
    });
  }

  // Inicializar WebRTC con diferentes implementaciones según el entorno
  async init() {
    try {
      // Verificar soporte de WebRTC
      const support = this.checkBrowserSupport();
      if (!support.supported) {
        throw new Error(support.reason);
      }
      
      // Si estamos en entorno web y tenemos simple-peer disponible
      if (!rtcAdapter.isReactNative && Peer) {
        console.log('Usando simple-peer para WebRTC');
        // No crear peerConnection, se crearán al iniciar conexiones
      } else {
        // Enfoque nativo para React Native o web sin simple-peer
        console.log('Usando implementación nativa para WebRTC');
        
        // Crear una nueva conexión RTCPeerConnection
        this.peerConnection = new rtcAdapter.RTCPeerConnection({
          iceServers: this.iceServers,
          iceCandidatePoolSize: 10
        });
        
        // Configurar eventos de la conexión
        this.setupPeerConnectionListeners();
      }
      
      // Configurar señalización
      this.setupSignaling();
      
      return true;
    } catch (error) {
      console.error('Error al inicializar WebRTC:', error);
      throw error;
    }
  }

  // Configurar listeners para eventos de la conexión nativa
  setupPeerConnectionListeners() {
    if (!this.peerConnection) return;
    
    // Evento cuando se genera un candidato ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Enviar el candidato ICE al otro usuario a través del socket
        socketService.sendIceCandidate(
          event.candidate.toJSON(),
          this.remoteUserId
        );
      }
    };
    
    // Evento cuando cambia el estado de la conexión ICE
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', this.peerConnection.iceConnectionState);
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(
          this.remoteUserId, 
          this.peerConnection.iceConnectionState
        );
      }
    };
    
    // Evento cuando cambia el estado de la conexión de señalización
    this.peerConnection.onsignalingstatechange = () => {
      console.log('Signaling State:', this.peerConnection.signalingState);
    };
    
    // ✅ EVENTO ONTRACK 
    this.peerConnection.ontrack = (event) => {
      console.log('===== TRACK REMOTO RECIBIDO =====');
      console.log('- event.streams:', event.streams?.length);
      
      if (!event.streams || event.streams.length === 0) {
        console.error('No hay streams en el evento ontrack');
        return;
      }
      
      const remoteStream = event.streams[0];
      console.log('- Stream ID:', remoteStream.id);
      console.log('- Audio tracks:', remoteStream.getAudioTracks().length);
      console.log('- Video tracks:', remoteStream.getVideoTracks().length);
      
      // ✅ SIMPLIFICADO: Verificar que el stream tenga tracks activos
      const hasActiveTracks = remoteStream.getTracks().some(track => track.readyState === 'live');
      
      if (!hasActiveTracks) {
        console.warn('Stream remoto recibido pero no tiene tracks activos');
        return;
      }
      
      // ✅ SIEMPRE actualizar el stream (eliminar lógica de duplicados problemática)
      console.log('Procesando stream remoto...');
      
      // Guardar referencia al stream
      this.remoteStreams[this.remoteUserId] = remoteStream;
      
      // ✅ SIEMPRE notificar (permitir que el componente decida si procesar o no)
      if (this.callbacks.onRemoteStream) {
        console.log('Notificando stream remoto a callback');
        this.callbacks.onRemoteStream(this.remoteUserId, remoteStream);
      }
    };
  }

  // Crear una conexión con otro usuario
  async initConnection(targetUserId, isInitiator = true) {
    console.log(`Iniciando conexión ${isInitiator ? 'como iniciador' : 'como receptor'} con ${targetUserId}`);
    
    // Asegurarse de tener un stream local
    if (!this.localStream) {
      console.log('No hay stream local, solicitando...');
      try {
        await this.getLocalStream();
      } catch (error) {
        console.error('No se pudo obtener stream local:', error);
        throw error;
      }
    }
    
    // Establecer IDs
    this.remoteUserId = targetUserId;
    
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
      console.log('Cerrando conexión existente con:', targetUserId);
      this.peers[targetUserId].destroy();
    }

    console.log('Creando nueva conexión peer con simple-peer...');
    
    // Crear nueva conexión peer
    const peerOptions = {
      initiator: isInitiator,
      trickle: true,
      stream: this.localStream,
      config: {
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10,
        sdpSemantics: 'unified-plan'
      },
      objectMode: true,
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      }
    };
    
    console.log('Opciones de peer:', peerOptions);
    const peer = new Peer(peerOptions);

    // Manejar eventos de señalización
    peer.on('signal', data => {
      console.log('Señal generada:', data.type);
      if (data.type === 'offer') {
        socketService.sendOffer(data, targetUserId);
      } else if (data.type === 'answer') {
        socketService.sendAnswer(data, targetUserId);
      } else {
        socketService.sendIceCandidate(data, targetUserId);
      }
    });

    // Manejar stream remoto
    peer.on('stream', stream => {
      console.log('Stream remoto recibido de:', targetUserId);
      this.remoteStreams[targetUserId] = stream;
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(targetUserId, stream);
      }
    });

    // Manejar estado de conexión
    peer.on('connect', () => {
      console.log('Conexión P2P establecida con:', targetUserId);
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(targetUserId, 'connected');
      }
    });

    // Manejar cierre de conexión
    peer.on('close', () => {
      console.log('Conexión P2P cerrada con:', targetUserId);
      this.closeConnection(targetUserId);
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(targetUserId, 'closed');
      }
    });

    // Manejar errores
    peer.on('error', err => {
      console.error('Error de conexión peer con', targetUserId, ':', err);
      if (this.callbacks.onError) {
        this.callbacks.onError('peer', err, targetUserId);
      }
      this.closeConnection(targetUserId);
    });

    this.peers[targetUserId] = peer;
    return peer;
  }

  // Implementación nativa para React Native o web sin simple-peer
  async initConnectionNative(targetUserId, isInitiator) {
    // Cerrar conexión anterior si existe
    if (this.peerConnection) {
      console.log('Cerrando conexión anterior');
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Crear nueva conexión
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      sdpSemantics: 'unified-plan' // Esto es crucial para compatibilidad
    });
    
    // Configurar listeners
    this.setupPeerConnectionListeners();
    
    // Agregar tracks al peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
    
    // Si somos el iniciador, crear oferta
    if (isInitiator) {
      try {
        const offer = await this.createOffer();
        socketService.sendOffer(offer, targetUserId);
      } catch (error) {
        console.error('Error al crear oferta:', error);
        throw error;
      }
    }
    
    return this.peerConnection;
  }

  // Crear una oferta SDP (para implementación nativa)
  async createOffer() {
    try {
      if (!this.peerConnection) {
        throw new Error('La conexión WebRTC no está inicializada');
      }
      
      // Crear oferta
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      // Establecer como descripción local
      await this.peerConnection.setLocalDescription(offer);
      
      return offer;
    } catch (error) {
      console.error('Error al crear oferta:', error);
      throw error;
    }
  }
  
  // Crear una respuesta SDP (para implementación nativa)
  async createAnswer() {
    try {
      if (!this.peerConnection) {
        throw new Error('La conexión WebRTC no está inicializada');
      }
      
      // Crear respuesta
      const answer = await this.peerConnection.createAnswer();
      
      // Establecer como descripción local
      await this.peerConnection.setLocalDescription(answer);
      
      return answer;
    } catch (error) {
      console.error('Error al crear respuesta:', error);
      throw error;
    }
  }

  // Manejar una oferta recibida
  async handleIncomingOffer(offer, fromUserId) {
    console.log('Manejando oferta entrante de:', fromUserId);
    
    // Actualizar remoteUserId
    this.remoteUserId = fromUserId;
    
    try {
      // Si usamos simple-peer (entorno web)
      if (!rtcAdapter.isReactNative && Peer) {
        const peer = await this.initConnection(fromUserId, false);
        console.log('Señalizando oferta recibida al peer');
        peer.signal(offer);
      } else {
        // Implementación nativa
        if (!this.peerConnection) {
          await this.initConnection(fromUserId, false);
        }
        
        // Crear y establecer la descripción remota
        const remoteDesc = new rtcAdapter.RTCSessionDescription(offer);
        await this.peerConnection.setRemoteDescription(remoteDesc);
        
        // Crear y enviar respuesta
        const answer = await this.createAnswer();
        socketService.sendAnswer(answer, fromUserId);
      }
    } catch (error) {
      console.error('Error al manejar oferta entrante:', error);
      throw error;
    }
  }

  // Manejar una respuesta recibida (para implementación nativa)
  async handleAnswer(answer) {
    try {
      if (!this.peerConnection) {
        throw new Error('La conexión WebRTC no está inicializada');
      }
      
      // Crear y establecer la descripción remota
      const remoteDesc = new rtcAdapter.RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(remoteDesc);
      
      return true;
    } catch (error) {
      console.error('Error al manejar respuesta:', error);
      throw error;
    }
  }

  // Agregar un candidato ICE recibido (para implementación nativa)
  async addIceCandidate(candidate) {
    try {
      if (!this.peerConnection) {
        throw new Error('La conexión WebRTC no está inicializada');
      }
      
      // Crear y agregar el candidato ICE
      const iceCandidate = new rtcAdapter.RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(iceCandidate);
      
      return true;
    } catch (error) {
      console.error('Error al agregar candidato ICE:', error);
      throw error;
    }
  }

  // Cerrar conexión con un usuario específico
  closeConnection(userId) {
    console.log('Cerrando conexión con:', userId);
    
    // Cerrar conexión simple-peer si existe
    if (this.peers[userId]) {
      this.peers[userId].destroy();
      delete this.peers[userId];
    }
    
    // Cerrar conexión nativa si corresponde
    if (this.peerConnection && this.remoteUserId === userId) {
      this.peerConnection.close();
      this.peerConnection = null;
      this.remoteUserId = null;
    }

    // Limpiar stream remoto
    if (this.remoteStreams[userId]) {
      const stream = this.remoteStreams[userId];
      stream.getTracks().forEach(track => track.stop());
      delete this.remoteStreams[userId];
      
      if (this.callbacks.onRemoteStreamClosed) {
        this.callbacks.onRemoteStreamClosed(userId);
      }
    }
  }

  // Cerrar todas las conexiones
  closeAllConnections() {
    console.log('Cerrando todas las conexiones');
    
    // Cerrar todas las conexiones simple-peer
    Object.keys(this.peers).forEach(userId => {
      this.closeConnection(userId);
    });
    
    // Cerrar conexión nativa si existe
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      this.remoteUserId = null;
    }
    
    // Detener stream local
    this.stopLocalStream();
    
    // Limpiar todos los streams remotos
    Object.keys(this.remoteStreams).forEach(userId => {
      const stream = this.remoteStreams[userId];
      stream.getTracks().forEach(track => track.stop());
    });
    this.remoteStreams = {};
  }

  // Alternar audio
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`Micrófono ${enabled ? 'activado' : 'desactivado'}`);
      });
    }
  }

  // Alternar video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`Cámara ${enabled ? 'activada' : 'desactivada'}`);
      });
    }
  }

  // Cambiar entre cámara frontal y trasera
  async switchCamera() {
    try {
      if (!this.localStream) {
        throw new Error('No hay stream de video activo');
      }
      
      await rtcAdapter.switchCamera(this.localStream);
      
      return true;
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
      throw error;
    }
  }

  // Alternar altavoz (implementación específica para cada plataforma)
  toggleSpeaker(speakerOn) {
    try {
      if (!this.localStream) return;
      
      // En React Native, esta función es específica de la plataforma
      if (rtcAdapter.isReactNative) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack && audioTrack._setSpeakerphoneOn) {
          audioTrack._setSpeakerphoneOn(speakerOn);
        }
      } else {
        // En web no hay un equivalente directo, pero podría implementarse
        // usando audioContext o APIs específicas del navegador
        console.log(`Cambio de altavoz no soportado en web: ${speakerOn ? 'on' : 'off'}`);
      }
    } catch (error) {
      console.error('Error al cambiar altavoz:', error);
    }
  }

  // Establecer callbacks para eventos remotos
  onRemoteStream(callback) {
    this.callbacks.onRemoteStream = callback;
    
    // Si ya tenemos streams remotos, llamar al callback inmediatamente
    Object.entries(this.remoteStreams).forEach(([userId, stream]) => {
      callback(userId, stream);
    });
  }

  // Establecer ID de usuario
  setUserId(userId) {
    this.userId = userId;
  }

  // Obtener todos los streams remotos
  getRemoteStreams() {
    return this.remoteStreams;
  }

  // Limpiar recursos
  cleanup() {
    this.closeAllConnections();
    this.userId = null;
    this.remoteUserId = null;
    this.callbacks = {
      onRemoteStream: null,
      onRemoteStreamClosed: null,
      onConnectionStateChange: null,
      onError: null
    };
  }
}

export default new WebRTCService();