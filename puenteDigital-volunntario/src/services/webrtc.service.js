// src/services/webrtc.service.js
import Peer from 'simple-peer';
import socketService from './socket.service';

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.peers = {};
    this.remoteStreams = {};
    this.callbacks = {
      onRemoteStream: null,
      onRemoteStreamClosed: null,
      onConnectionStateChange: null,
      onError: null
    };
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
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
  }

  registerCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Verificar soporte de WebRTC
  checkBrowserSupport() {
    const isSecureContext = window.isSecureContext;
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasRTCPeerConnection = !!window.RTCPeerConnection;
    
    console.log('Diagnóstico WebRTC:');
    console.log('- Contexto seguro:', isSecureContext);
    console.log('- navigator.mediaDevices disponible:', !!navigator.mediaDevices);
    console.log('- getUserMedia disponible:', hasMediaDevices);
    console.log('- RTCPeerConnection disponible:', hasRTCPeerConnection);
    
    if (!isSecureContext) {
      return {
        supported: false,
        reason: 'La API WebRTC requiere un contexto seguro (HTTPS o localhost).',
        recommendation: 'Accede a la aplicación a través de HTTPS o usando localhost.'
      };
    }
    
    if (!hasMediaDevices) {
      return {
        supported: false,
        reason: 'Tu navegador no soporta navigator.mediaDevices.',
        recommendation: 'Intenta con un navegador más reciente como Chrome, Firefox, o Edge.'
      };
    }
    
    if (!hasRTCPeerConnection) {
      return {
        supported: false,
        reason: 'Tu navegador no soporta RTCPeerConnection.',
        recommendation: 'Intenta con un navegador más reciente como Chrome, Firefox, o Edge.'
      };
    }
    
    return {
      supported: true,
      reason: 'Tu navegador soporta todas las APIs necesarias para WebRTC.'
    };
  }

  async getLocalStream(videoEnabled = true, audioEnabled = true) {
    try {
      // Verificar soporte de WebRTC
      const support = this.checkBrowserSupport();
      if (!support.supported) {
        console.error('Problema con WebRTC:', support.reason);
        throw new Error(`${support.reason} ${support.recommendation || ''}`);
      }
      
      console.log('Solicitando acceso a cámara y micrófono...');
      
      // Listar dispositivos si están disponibles
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        console.log(`Dispositivos disponibles - Video: ${videoDevices.length}, Audio: ${audioDevices.length}`);
      } catch (e) {
        console.warn('No se pudieron enumerar dispositivos:', e);
      }
      
      // Configurar restricciones
      const constraints = {
        audio: audioEnabled,
        video: videoEnabled ? {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          frameRate: { ideal: 24, min: 15 }
        } : false
      };
      
      console.log('Solicitando medios con restricciones:', constraints);
      
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
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

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      console.log('Stream local detenido');
    }
  }

  setupSignaling() {
    // Manejo de ofertas
    socketService.on('offer', async ({ offer, from }) => {
      try {
        console.log('Oferta recibida de:', from);
        await this.handleIncomingOffer(offer, from);
      } catch (error) {
        console.error('Error al manejar oferta:', error);
        if (this.callbacks.onError) {
          this.callbacks.onError('signaling', error);
        }
      }
    });

    // Manejo de respuestas
    socketService.on('answer', ({ answer, from }) => {
      console.log('Respuesta recibida de:', from);
      if (this.peers[from]) {
        this.peers[from].signal(answer);
      } else {
        console.warn('No hay peer para este usuario:', from);
      }
    });

    // Manejo de candidatos ICE
    socketService.on('ice-candidate', ({ candidate, from }) => {
      if (this.peers[from]) {
        this.peers[from].signal(candidate);
      } else {
        console.warn('No hay peer para este candidato ICE:', from);
      }
    });

    // Manejo de usuario que deja la sala
    socketService.on('user-left', ({ userId }) => {
      console.log('Usuario ha dejado la sala:', userId);
      this.closeConnection(userId);
    });

    // Manejo de fin de llamada
    socketService.on('call-ended', ({ from }) => {
      console.log('Llamada finalizada por:', from);
      this.closeConnection(from);
    });
  }

  async initConnection(targetUserId, isInitiator = true) {
    console.log(`Iniciando conexión ${isInitiator ? 'como iniciador' : 'como receptor'} con ${targetUserId}`);
    
    if (!this.localStream) {
      console.log('No hay stream local, solicitando...');
      try {
        await this.getLocalStream();
      } catch (error) {
        console.error('No se pudo obtener stream local:', error);
        throw error;
      }
    }

    // Cerrar conexión anterior si existe
    if (this.peers[targetUserId]) {
      console.log('Cerrando conexión existente con:', targetUserId);
      this.peers[targetUserId].destroy();
    }

    console.log('Creando nueva conexión peer...');
    
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
      // Para compatibilidad con navegadores y dispositivos móviles
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

  async handleIncomingOffer(offer, fromUserId) {
    console.log('Manejando oferta entrante de:', fromUserId);
    try {
      const peer = await this.initConnection(fromUserId, false);
      console.log('Señalizando oferta recibida al peer');
      peer.signal(offer);
    } catch (error) {
      console.error('Error al manejar oferta entrante:', error);
      throw error;
    }
  }

  closeConnection(userId) {
    console.log('Cerrando conexión con:', userId);
    if (this.peers[userId]) {
      this.peers[userId].destroy();
      delete this.peers[userId];
    }

    if (this.remoteStreams[userId]) {
      const stream = this.remoteStreams[userId];
      stream.getTracks().forEach(track => track.stop());
      delete this.remoteStreams[userId];
      
      if (this.callbacks.onRemoteStreamClosed) {
        this.callbacks.onRemoteStreamClosed(userId);
      }
    }
  }

  closeAllConnections() {
    console.log('Cerrando todas las conexiones');
    Object.keys(this.peers).forEach(userId => {
      this.closeConnection(userId);
    });
    this.stopLocalStream();
  }

  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`Micrófono ${enabled ? 'activado' : 'desactivado'}`);
      });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`Cámara ${enabled ? 'activada' : 'desactivada'}`);
      });
    }
  }

  getRemoteStreams() {
    return this.remoteStreams;
  }
}

export default new WebRTCService();