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
        username: 'webrtc@live.com'
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
    this.connectionAttempts = {};
    this.debug = true;
    this.isNegotiating = false;
    this.isInitiator = false;
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

  // Obtener stream local (cámara y micrófono) - VERSION SIMPLIFICADA
  async getLocalStream(videoEnabled = true, audioEnabled = true, constraints = null) {
    try {
      // Verificar soporte de WebRTC
      const support = this.checkBrowserSupport();
      if (!support.supported) {
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
        // Simplificar constraints para mejor compatibilidad
        mediaConstraints = {
          audio: audioEnabled,
          video: videoEnabled ? {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 20, max: 30 }
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

  // Configurar eventos de señalización - VERSION SIMPLIFICADA
  setupSignaling() {
    // Manejo de ofertas
    socketService.on('offer', async (data) => {
      try {
        this.log('Oferta recibida de:', data.from);
        await this.handleIncomingOffer(data.offer, data.from);
      } catch (error) {
        this.logError('Error al manejar oferta:', error);
      }
    });

    // Manejo de respuestas
    socketService.on('answer', (data) => {
      const fromUserId = data.from || data.userId || this.remoteUserId;
      
      if (!fromUserId) {
        this.logError('No se puede procesar respuesta: remitente desconocido');
        return;
      }
      
      this.log(`Respuesta recibida de: ${fromUserId}`);
      
      if (this.peers[fromUserId]) {
        this.peers[fromUserId].signal(data.answer);
      } else if (this.peerConnection) {
        const remoteDesc = new rtcAdapter.RTCSessionDescription(data.answer);
        this.peerConnection.setRemoteDescription(remoteDesc)
          .catch(error => this.logError('Error al establecer descripción remota:', error));
      } else {
        this.log('ADVERTENCIA: No hay peer para esta respuesta');
      }
    });
    
    // Manejo de candidatos ICE
    socketService.on('ice-candidate', (data) => {
      const fromUserId = data.from || data.userId || this.remoteUserId;
      
      if (!fromUserId) {
        this.logError('No se puede procesar candidato ICE: remitente desconocido');
        return;
      }
      
      this.log(`Candidato ICE recibido de: ${fromUserId}`);
      
      if (this.peers[fromUserId]) {
        this.peers[fromUserId].signal(data.candidate);
      } else if (this.peerConnection) {
        if (data.candidate && typeof data.candidate === 'object') {
          const iceCandidate = new rtcAdapter.RTCIceCandidate(data.candidate);
          this.peerConnection.addIceCandidate(iceCandidate)
            .then(() => this.log('Candidato ICE añadido correctamente'))
            .catch(error => this.logError('Error al añadir candidato ICE:', error));
        }
      } else {
        this.log('ADVERTENCIA: No hay peer para este candidato ICE');
      }
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

    socketService.on('camera-switching', (data) => {
      const fromUserId = data.from || this.remoteUserId;
      this.log(`Usuario ${fromUserId} está cambiando de cámara`);
      
      // Notificar al usuario que habrá una interrupción temporal
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange('camera-switching');
      }
    });
    
    socketService.on('camera-switched', (data) => {
      const fromUserId = data.from || this.remoteUserId;
      this.log(`Usuario ${fromUserId} cambió de cámara, esperando nueva oferta`);
      
      // Notificar al usuario que se completó el cambio
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange('camera-switched');
      }
    });
  }

  // Inicializar WebRTC con diferentes implementaciones según el entorno - SIMPLIFICADO
  async init() {
    try {
      // Verificar soporte de WebRTC
      const support = this.checkBrowserSupport();
      if (!support.supported) {
        throw new Error(support.reason);
      }
      
      // Forzar limpieza de conexiones anteriores
      this.closeAllConnections();
      
      // Siempre usar implementación nativa para simplificar
      this.log('Usando implementación nativa para WebRTC');
      
      // Configurar señalización
      this.setupSignaling();
      
      return true;
    } catch (error) {
      this.logError('Error al inicializar WebRTC:', error);
      throw error;
    }
  }

  // Configurar listeners para eventos de la conexión nativa - SIMPLIFICADO
  setupPeerConnectionListeners() {
    if (!this.peerConnection) return;
    
    // Evento cuando se genera un candidato ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.log('Candidato ICE generado:', event.candidate.type);
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
        this.callbacks.onConnectionStateChange(this.remoteUserId, state);
      }
      
      if (state === 'disconnected' || state === 'failed') {
        // En vez de intentar recuperar, mejor reiniciar completamente
        setTimeout(() => {
          if (this.remoteUserId) {
            this.restartConnection(this.remoteUserId);
          }
        }, 5000);
      }
    };
    
    // Evento cuando cambia el estado de la conexión de señalización
    this.peerConnection.onsignalingstatechange = () => {
      this.log('Signaling State cambió a:', this.peerConnection.signalingState);
      
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
        // Reiniciar la conexión
        if (this.remoteUserId) {
          this.restartConnection(this.remoteUserId);
        }
      }
    };
    
    // Evento cuando se recibe un track del otro usuario - SIMPLIFICADO
    this.peerConnection.ontrack = (event) => {
      if (!event.streams || event.streams.length === 0) {
        this.logError('Evento ontrack sin streams');
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
        
        // Si es un track de video, intentar recuperarlo
        if (event.track.kind === 'video') {
          // Programar intento de recuperación
          setTimeout(() => {
            if (event.track.muted) {
              this.handleMutedVideoTrack(this.remoteUserId);
            }
          }, 3000);
        }
      };
      
      event.track.onunmute = () => {
        this.log(`Track ${event.track.kind} ha sido reactivado`);
      };
    };
    
    // Manejar errores de negociación - SIMPLIFICADO
    this.peerConnection.onnegotiationneeded = () => {
      this.log('Negociación necesaria');
      
      // Evitar negociaciones múltiples simultáneas
      if (this.isNegotiating) {
        this.log('Ya hay una negociación en curso, ignorando');
        return;
      }
      
      this.isNegotiating = true;
      
      // Solo crear oferta si somos el iniciador
      if (this.isInitiator) {
        this.createOffer()
          .then(offer => {
            socketService.sendOffer(offer, this.remoteUserId);
          })
          .catch(error => {
            this.logError('Error durante la negociación:', error);
          })
          .finally(() => {
            setTimeout(() => {
              this.isNegotiating = false;
            }, 1000);
          });
      } else {
        this.isNegotiating = false;
      }
    };
  }

  // Añade este método a tu clase WebRTCService en webrtc.service.js

    // Método para manejar tracks de video silenciados
    async handleMutedVideoTrack(userId) {
      this.log(`Intentando recuperar video silenciado para ${userId}`);
      
      // Verificar que la conexión es con el usuario correcto
      if (this.remoteUserId !== userId || !this.peerConnection) {
        this.log(`No hay conexión con ${userId} para recuperar`);
        return;
      }
      
      try {
        // Crear una nueva oferta para renegociar la conexión
        const offer = await this.peerConnection.createOffer({
          iceRestart: true,
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        // Establecer descripción local
        await this.peerConnection.setLocalDescription(offer);
        
        // Enviar oferta al otro usuario
        socketService.sendOffer(offer, userId);
        
        this.log(`Oferta de renegociación enviada a ${userId}`);
        
        // Programar verificación para ver si mejoró
        setTimeout(() => {
          if (this.remoteStreams[userId]) {
            const videoTracks = this.remoteStreams[userId].getVideoTracks();
            if (videoTracks.length > 0 && videoTracks[0].muted) {
              this.log(`Video sigue silenciado, reiniciando conexión completa`);
              this.restartConnection(userId);
            }
          }
        }, 5000);
      } catch (error) {
        this.logError(`Error al recuperar track de video: ${error.message}`);
      }
    }

// También añade este método para reiniciar la conexión completamente
async restartConnection(userId) {
  this.log(`Reiniciando conexión completa con ${userId}`);
  
  // Cerrar conexión actual
  this.closeConnection(userId);
  
  // Esperar un momento antes de reconectar
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Iniciar nueva conexión
    await this.initConnection(userId, true);
    
    // Crear y enviar nueva oferta
    const offer = await this.createOffer();
    socketService.sendOffer(offer, userId);
    
    // Notificar al otro usuario
    socketService.callUser(userId);
    
    this.log(`Conexión reiniciada con ${userId}`);
  } catch (error) {
    this.logError(`Error al reiniciar conexión: ${error.message}`);
  }
}

    // Método para reiniciar conexión completa
    async restartConnection(userId) {
      this.log(`Reiniciando conexión completa con ${userId}`);
      
      if (this._restartingConnection) return;
      this._restartingConnection = true;
      
      try {
        // Cerrar la conexión actual correctamente
        this.closeConnection(userId);
        
        // Esperar un momento antes de empezar la nueva conexión
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Asegurar que aún tenemos un stream local válido
        if (!this.localStream || this.localStream.getTracks().length === 0) {
          this.log('Stream local no válido, obteniendo uno nuevo');
          try {
            this.localStream = await this.getLocalStream();
          } catch (error) {
            this.logError('No se pudo obtener nuevo stream local:', error);
          }
        }
        
        // Crear nueva conexión como iniciador
        await this.initConnection(userId, true);
        
        // Crear oferta y establecer descripción local
        const offer = await this.createOffer();
        
        // Enviar oferta al otro usuario
        socketService.sendOffer(offer, userId);
        
        // Notificar al otro usuario
        socketService.callUser(userId);
        
        this.log(`Nueva conexión iniciada con ${userId}`);
      } catch (error) {
        this.logError(`Error al reiniciar conexión con ${userId}:`, error);
      } finally {
        // Permitir nuevos intentos después de un tiempo
        setTimeout(() => {
          this._restartingConnection = false;
        }, 5000);
      }
    }

  // Crear una conexión con otro usuario - SIMPLIFICADO
  async initConnection(targetUserId, isInitiator = true) {
    this.log(`Iniciando conexión ${isInitiator ? 'como iniciador' : 'como receptor'}`, {
      targetUserId,
      currentRoomId: socketService.roomId
    });    
    // Cerrar conexión anterior si existe
    if (this.peerConnection) {
      this.log('Cerrando conexión anterior');
      this.peerConnection.close();
      this.peerConnection = null;
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
    
    // Crear conexión nativa
    return this.initConnectionNative(targetUserId, isInitiator);
  }

  // Implementación nativa para WebRTC - SIMPLIFICADO
  async initConnectionNative(targetUserId, isInitiator) {
    // Crear nueva conexión con configuración optimizada
    const rtcConfig = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan'
    };
    
    this.log('Creando RTCPeerConnection con configuración:', rtcConfig);
    this.peerConnection = new rtcAdapter.RTCPeerConnection(rtcConfig);
    
    // Configurar listeners
    this.setupPeerConnectionListeners();
    
    // Agregar tracks al peer connection
    if (this.localStream) {
      this.log('Agregando tracks del stream local a la conexión');
      this.localStream.getTracks().forEach(track => {
        this.log(`Agregando track ${track.kind} con ID ${track.id}`);
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
    
    // Si somos el iniciador, crear oferta
    if (isInitiator) {
      try {
        this.log('Creando oferta SDP como iniciador');
        const offer = await this.createOffer();
        this.log('Oferta creada, enviando a', targetUserId);
        socketService.sendOffer(offer, targetUserId);
      } catch (error) {
        this.logError('Error al crear oferta:', error);
        throw error;
      }
    }
    
    return this.peerConnection;
  }

  // Crear una oferta SDP - SIMPLIFICADO
  async createOffer() {
    if (!this.peerConnection) {
      throw new Error('La conexión WebRTC no está inicializada');
    }
    
    try {
      // Marcar estado de negociación
      this.isNegotiating = true;
      
      // Crear oferta simple
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      // Optimizar SDP para mejor compatibilidad
      const modifiedOffer = this.optimizeSdpForMobile(offer);
      
      // Establecer descripción local
      await this.peerConnection.setLocalDescription(modifiedOffer);
      
      this.log('Descripción local establecida correctamente');
      return modifiedOffer;
    } catch (error) {
      this.logError('Error al crear oferta:', error);
      throw error;
    } finally {
      // Permitir negociación nuevamente después de un tiempo
      setTimeout(() => {
        this.isNegotiating = false;
      }, 1000);
    }
  }

  // Optimizar SDP para mejor compatibilidad entre móvil y web
  optimizeSdpForMobile(offer) {
    if (!offer || !offer.sdp) return offer;
    
    let sdp = offer.sdp;
    
    try {
      // 1. Reducir bitrate para mejor compatibilidad
      const videoSection = sdp.match(/m=video.*\r\n(?:.+\r\n)*/g);
      if (videoSection && videoSection[0]) {
        const section = videoSection[0];
        
        // Establecer un bitrate fijo de 800kbps para mejor estabilidad
        if (!section.includes('b=AS:')) {
          const newBitrate = 'b=AS:800\r\n';
          sdp = sdp.replace(section, section + newBitrate);
          this.log('Añadida limitación de bitrate para video');
        } else {
          // Reemplazar bitrate existente
          sdp = sdp.replace(/b=AS:\d+\r\n/g, 'b=AS:800\r\n');
        }
      }
      
      // 2. Asegurar que VP8 es el códec prioritario
      sdp = this.prioritizeVp8Codec(sdp);
      
      // 3. Aplicar restricciones al stream local
      if (this.localStream && this.localStream.getVideoTracks().length > 0) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          try {
            videoTrack.applyConstraints({
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 20, max: 30 }
            });
            this.log('Restricciones aplicadas al track de video');
          } catch (e) {
            this.log('No se pudieron aplicar restricciones:', e);
          }
        }
      }
      
      return new rtcAdapter.RTCSessionDescription({
        type: offer.type,
        sdp: sdp
      });
    } catch (error) {
      this.logError('Error al modificar SDP:', error);
      return offer;
    }
  }


  prioritizeVp8Codec(sdp) {
    const lines = sdp.split('\r\n');
    const mLineIndex = lines.findIndex(line => line.startsWith('m=video'));
    
    if (mLineIndex !== -1) {
      // Buscar línea m=video y sus payloads
      const mLine = lines[mLineIndex];
      const parts = mLine.split(' ');
      const payloads = parts.slice(3);
      
      // Buscar payload de VP8
      let vp8PayloadType = null;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('VP8/90000')) {
          vp8PayloadType = lines[i].split(' ')[0].split(':')[1];
          break;
        }
      }
      
      // Si encontramos VP8, ponerlo primero
      if (vp8PayloadType) {
        const newPayloads = [vp8PayloadType];
        payloads.forEach(payload => {
          if (payload !== vp8PayloadType) {
            newPayloads.push(payload);
          }
        });
        
        lines[mLineIndex] = `${parts[0]} ${parts[1]} ${parts[2]} ${newPayloads.join(' ')}`;
        this.log('Reordenados códecs de video para priorizar VP8');
      }
      
      return lines.join('\r\n');
    }
    
    return sdp;
  }

  // Manejar una oferta recibida - SIMPLIFICADO
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
      
      // Si no hay conexión, crear una nueva
      if (!this.peerConnection) {
        await this.initConnection(fromUserId, false);
      }
      
      // Crear y establecer la descripción remota
      const remoteDesc = new rtcAdapter.RTCSessionDescription(offer);
      this.log('Estableciendo descripción remota (oferta)');
      await this.peerConnection.setRemoteDescription(remoteDesc);
      this.log('Descripción remota establecida correctamente');
      
      // Crear respuesta
      this.log('Creando respuesta');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Enviar respuesta
      this.log('Enviando respuesta a', fromUserId);
      socketService.sendAnswer(answer, fromUserId);
    } catch (error) {
      this.logError('Error al manejar oferta entrante:', error);
      throw error;
    }
  }

  // Cerrar conexión con un usuario específico
  closeConnection(userId) {
    this.log('Cerrando conexión con:', userId);
    
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
      this.log(`Liberando stream remoto de ${userId}`);
      stream.getTracks().forEach(track => {
        this.log(`Deteniendo track ${track.kind} de usuario ${userId}`);
        track.stop();
      });
      delete this.remoteStreams[userId];
      
      if (this.callbacks.onRemoteStreamClosed) {
        this.callbacks.onRemoteStreamClosed(userId);
      }
    }
  }

  // Cerrar todas las conexiones
  closeAllConnections() {
    this.log('Cerrando todas las conexiones');
    
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
          },
          audio: true
        };
        
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        // Reemplazar track en el stream local
        this.localStream.removeTrack(currentTrack);
        this.localStream.addTrack(newVideoTrack);
        
        // Reemplazar track en conexiones existentes
        if (this.peerConnection) {
          const senders = this.peerConnection.getSenders();
          const videoSender = senders.find(sender => 
            sender.track && sender.track.kind === 'video'
          );
          
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          }
        }
        
        this.log('Cámara cambiada manualmente');
      }
      
      return true;
    } catch (error) {
      this.logError('Error al cambiar cámara:', error);
      throw error;
    }
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