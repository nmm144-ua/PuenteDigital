// src/services/WebRTCService.js - Versión corregida para resolver problemas de señalización
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';
import { Platform } from 'react-native';
import SocketService from './socketService';

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onRemoteStreamCallback = null;
    this.userId = null;
    this.remoteUserId = null;
    this.pendingIceCandidates = [];
    this.isInitializing = false;
    this.isProcessingOffer = false;
    this.isProcessingAnswer = false;
    this.remoteStream = {};

    this.callbacks = {
      onRemoteStream: null,
      onRemoteStreamClosed: null,
      onConnectionStateChange: null,
      onError: null
    };
    
    // Configuración de servidores ICE (STUN/TURN)
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Servidores TURN alternativos
      {
        urls: 'turn:turn.bistri.com:80',
        credential: 'homeo',
        username: 'homeo'
      },
      {
        urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
        credential: 'webrtc',
        username: 'webrtc'
      }
    ];
    this.verifyICEServers();
  }

  async verifyICEServers() {
    try {
      // Crear una conexión temporal solo para probar
      const pc = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceTransportPolicy: 'all'
      });
      
      let candidateFound = false;
      
      pc.onicecandidate = event => {
        if (event.candidate) {
          if (event.candidate.candidate.indexOf('typ relay') > -1) {
            console.log('TURN server funciona correctamente');
            candidateFound = true;
          }
        }
      };
      
      // Crear oferta para activar generación de candidatos
      await pc.createOffer();
      
      // Esperar un tiempo para verificar los resultados
      setTimeout(() => {
        if (!candidateFound) {
          console.warn('No se detectaron candidatos TURN. Los servidores podrían no estar disponibles.');
        }
        pc.close();
      }, 5000);
    } catch (error) {
      console.error('Error al verificar servidores ICE:', error);
    }
  }
  
  // Método principal para inicializar WebRTC
  async init() {
    // Si ya hay una inicialización en progreso, esperarla en lugar de iniciar otra
    if (this._initializingPromise) {
      console.log('Inicialización en progreso, esperando...');
      return this._initializingPromise;
    }
    
    // Crear promesa de inicialización
    this._initializingPromise = (async () => {
      try {
        console.log('Inicializando WebRTC...');
        
        // Cerrar conexión anterior si existe
        if (this.peerConnection) {
          console.log('Cerrando conexión anterior antes de inicializar...');
          try {
            // Limpiar eventos primero
            this.peerConnection.onicecandidate = null;
            this.peerConnection.oniceconnectionstatechange = null;
            this.peerConnection.onsignalingstatechange = null;
            this.peerConnection.ontrack = null;
            
            // Luego cerrar
            this.peerConnection.close();
          } catch (e) {
            console.warn('Error al cerrar conexión anterior:', e);
          }
          this.peerConnection = null;
          
          // Esperar un momento para asegurar la liberación de recursos
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Crear nueva conexión con configuración más robusta
        this.peerConnection = new RTCPeerConnection({
          iceServers: this.iceServers,
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          sdpSemantics: 'unified-plan'
        });
        
        if (!this.peerConnection) {
          throw new Error('No se pudo crear RTCPeerConnection');
        }
        
        // Configurar eventos DESPUÉS de crear la conexión
        this.setupPeerConnectionListeners();
        
        console.log('WebRTC inicializado correctamente');
        return true;
      } catch (error) {
        console.error('Error al inicializar WebRTC:', error);
        throw error;
      } finally {
        // Solo liberar la promesa de inicialización después de completar
        const result = this._initializingPromise;
        // Esperar un breve momento antes de limpiar la promesa
        setTimeout(() => {
          if (this._initializingPromise === result) {
            this._initializingPromise = null;
          }
        }, 100);
      }
    })();
    
    return this._initializingPromise;
  }
  
  // Configurar los listeners para eventos de la conexión
  setupPeerConnectionListeners() {
    if (!this.peerConnection) return;
    
    // Inicializar remoteStreams si no existe
    if (!this.remoteStreams) {
      this.remoteStreams = {};
    }
    
    // Evento cuando se genera un candidato ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Enviar el candidato ICE al otro usuario a través del socket
        if (this.remoteUserId) {
          SocketService.sendIceCandidate(
            event.candidate.toJSON(),
            this.remoteUserId,
            this.userId
          );
        } else {
          console.warn('No hay remoteUserId para enviar candidato ICE');
          // Guardar candidato para enviar más tarde
          this.pendingIceCandidates.push(event.candidate.toJSON());
        }
      } else {
        console.log('Recolección de candidatos ICE completada');
      }
    };
    
    // Evento cuando cambia el estado de la conexión ICE
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      console.log('***** ICE CONNECTION STATE CHANGE *****:', state);
      
      if (state === 'connected' || state === 'completed') {
        console.log('Conexión ICE establecida');
      } else if (state === 'failed') {
        console.error('Conexión ICE fallida - posible problema de NAT/firewall');
      }
    };
    
    // Evento cuando cambia el estado de la conexión de señalización
    this.peerConnection.onsignalingstatechange = () => {
      // IMPORTANTE: Verificar que peerConnection sigue existiendo
      if (!this.peerConnection) return;
      
      const state = this.peerConnection.signalingState;
      console.log('Signaling State:', state);
    };
    
    // Evento de conexión (solo disponible en algunas implementaciones)
    if (typeof this.peerConnection.onconnectionstatechange !== 'undefined') {
      this.peerConnection.onconnectionstatechange = () => {
        // IMPORTANTE: Verificar que peerConnection sigue existiendo
        if (!this.peerConnection) return;
        
        console.log('Connection State:', this.peerConnection.connectionState);
      };
    }
    
    // Evento cuando se recibe un track del otro usuario

    this.peerConnection.ontrack = (event) => {
      console.log('***** TRACK REMOTO RECIBIDO *****');
      
      if (!event.streams || event.streams.length === 0) {
        console.warn('No hay streams en el evento ontrack');
        return;
      }
      
      const remoteStream = event.streams[0];
      console.log('Stream recibido:', remoteStream);
      console.log('Stream ID:', remoteStream.id);
      console.log('Audio tracks:', remoteStream.getAudioTracks().length);
      console.log('Video tracks:', remoteStream.getVideoTracks().length);
      
      // Verificar que tengamos el userId remoto
      if (!this.remoteUserId) {
        console.warn('remoteUserId no establecido, no se puede guardar stream remoto');
        return;
      }
      
      // ✅ ARREGLO PRINCIPAL: Verificar si ya procesamos este stream
      if (!this.remoteStreams) {
        this.remoteStreams = {};
      }
      
      const existingStream = this.remoteStreams[this.remoteUserId];
      
      // Solo procesar si es un stream completamente nuevo
      if (existingStream && existingStream.id === remoteStream.id) {
        console.log('Stream ya procesado anteriormente, verificando tracks...');
        
        // Solo notificar si hay cambios significativos en tracks
        const existingAudio = existingStream.getAudioTracks().length;
        const existingVideo = existingStream.getVideoTracks().length;
        const newAudio = remoteStream.getAudioTracks().length;
        const newVideo = remoteStream.getVideoTracks().length;
        
        if (existingAudio !== newAudio || existingVideo !== newVideo) {
          console.log('Cambio en número de tracks detectado, actualizando...');
          
          // Actualizar la referencia (el stream se actualiza automáticamente)
          this.remoteStreams[this.remoteUserId] = remoteStream;
          
          // Notificar solo si es un cambio significativo
          if (this.callbacks && typeof this.callbacks.onRemoteStream === 'function') {
            this.callbacks.onRemoteStream(this.remoteUserId, remoteStream);
          }
        } else {
          console.log('Sin cambios significativos, ignorando evento ontrack duplicado');
          return; // ⭐ SALIR TEMPRANO - Esto evita el procesamiento duplicado
        }
      } else {
        // Es un stream completamente nuevo
        console.log('Guardando nuevo stream remoto');
        this.remoteStreams[this.remoteUserId] = remoteStream;
        
        // Asegurarnos de que los tracks estén habilitados
        remoteStream.getTracks().forEach(track => {
          if (!track.enabled) {
            console.log(`Habilitando track de ${track.kind} que estaba deshabilitado`);
            track.enabled = true;
          }
        });
        
        // Verificar contenido del stream
        const hasAudio = remoteStream.getAudioTracks().length > 0;
        const hasVideo = remoteStream.getVideoTracks().length > 0;
        console.log(`Stream tiene audio: ${hasAudio}, video: ${hasVideo}`);
        
        // Notificar inmediatamente para el nuevo stream
        if (this.callbacks && typeof this.callbacks.onRemoteStream === 'function') {
          console.log('Llamando callback onRemoteStream con:', this.remoteUserId);
          try {
            this.callbacks.onRemoteStream(this.remoteUserId, remoteStream);
          } catch (error) {
            console.error('Error en callback onRemoteStream:', error);
          }
        }
      }
    };
  }

  getAnyRemoteStream() {
    // Si no hay streams remotos, devolver null
    if (!this.remoteStreams || Object.keys(this.remoteStreams).length === 0) {
      console.log('No hay streams remotos disponibles');
      return null;
    }
    
    // Obtener el primer stream disponible
    const firstKey = Object.keys(this.remoteStreams)[0];
    console.log(`Obteniendo stream remoto con clave: ${firstKey}`);
    return this.remoteStreams[firstKey];
  }
  
  logWebRTCState() {
    console.log('======== DIAGNÓSTICO WEBRTC ========');
    console.log('Estado de conexión:', this.peerConnection?.connectionState);
    console.log('Estado de conexión ICE:', this.peerConnection?.iceConnectionState);
    console.log('Estado de señalización:', this.peerConnection?.signalingState);
    
    // Estado del stream local
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      const videoTracks = this.localStream.getVideoTracks();
      console.log('Stream local - Audio tracks:', audioTracks.length, 'Video tracks:', videoTracks.length);
      
      // Estado de cada track
      audioTracks.forEach((track, i) => {
        console.log(`Audio Track ${i}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
      });
      
      videoTracks.forEach((track, i) => {
        console.log(`Video Track ${i}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
      });
    } else {
      console.log('No hay stream local');
    }
    
    // Verificar streams remotos
    console.log('Streams remotos:', Object.keys(this.remoteStreams));
    
    if (this.remoteUserId) {
      console.log('RemoteUserId configurado:', this.remoteUserId);
    } else {
      console.log('RemoteUserId NO configurado');
    }
    
    // Verificar estado de transceivers (si están disponibles)
    if (this.peerConnection?.getTransceivers) {
      const transceivers = this.peerConnection.getTransceivers();
      console.log('Transceivers:', transceivers.length);
      transceivers.forEach((transceiver, i) => {
        console.log(`Transceiver ${i}:`, {
          currentDirection: transceiver.currentDirection,
          direction: transceiver.direction,
          stopped: transceiver.stopped
        });
      });
    }
    
    console.log('=============================');
  }

  // Obtener el stream local (cámara y micrófono)
  async getLocalStream() {
    try {
      const constraints = {
        audio: true,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };
      
      console.log('Solicitando acceso a medios con constraints:', JSON.stringify(constraints));
      const stream = await mediaDevices.getUserMedia(constraints);
      
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      console.log(`Stream local obtenido - Audio tracks: ${audioTracks.length}, Video tracks: ${videoTracks.length}`);
      
      return stream;
    } catch (error) {
      console.error('Error al obtener stream local:', error);
      
      // Intentar obtener solo audio si el video falla
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.log('Intentando obtener solo audio...');
        try {
          const audioOnlyStream = await mediaDevices.getUserMedia({ audio: true, video: false });
          return audioOnlyStream;
        } catch (audioError) {
          console.error('Error obteniendo audio:', audioError);
          throw audioError;
        }
      }
      
      throw error;
    }
  }

  // Manejar una oferta recibida
  async handleIncomingOffer(offer, fromUserId) {
    console.log('***** PROCESANDO OFERTA EN WEBRTC *****');
    console.log('De usuario:', fromUserId);
    
    // Establecer remoteUserId
    this.remoteUserId = fromUserId;
    
    try {
      // Si hay una conexión existente, cerrarla
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
        
        // Esperar un breve momento para asegurar la limpieza
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Crear una nueva conexión
      console.log('Inicializando nueva conexión para responder a oferta');
      await this.init();
      
      // VERIFICACIÓN CRÍTICA: Esperar explícitamente por la inicialización
      let attempts = 0;
      while (!this.peerConnection && attempts < 5) {
        console.log(`Esperando a que peerConnection esté disponible... Intento ${attempts+1}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      // Verificar que peerConnection se haya inicializado correctamente
      if (!this.peerConnection) {
        throw new Error('peerConnection no inicializado correctamente');
      }
      
      console.log('Estado inicial de señalización:', this.peerConnection.signalingState);
      
      // Obtener el stream local si no existe
      if (!this.localStream) {
        console.log('Obteniendo stream local para la respuesta...');
        this.localStream = await this.getLocalStream();
        
        // Añadir tracks al peer connection
        this.localStream.getTracks().forEach(track => {
          console.log(`Añadiendo track local ${track.kind} a la conexión`);
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      // Establecer descripción remota (la oferta)
      console.log('Estableciendo descripción remota (oferta)');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log('Creando respuesta SDP');
      const answer = await this.peerConnection.createAnswer();
      
      console.log('Estableciendo descripción local (respuesta)');
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('Enviando respuesta a:', fromUserId);
      SocketService.sendAnswer(answer, fromUserId, this.userId);
      
      return true;
    } catch (error) {
      console.error('***** ERROR AL PROCESAR OFERTA *****');
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      
      return false;
    }
  }
  
  // Manejar una respuesta recibida
  async handleAnswer(answer) {
    try {
      if (!this.peerConnection) {
        console.warn('No hay peer connection para manejar la respuesta');
        return false;
      }
      
      // IMPORTANTE: Verificar el estado de señalización
      console.log(`Estado actual al recibir respuesta: ${this.peerConnection.signalingState}`);
      
      // Si ya estamos en estado 'stable', significa que ya procesamos esta respuesta
      if (this.peerConnection.signalingState === 'stable') {
        console.log('Estado ya es stable, probablemente ya procesamos esta respuesta');
        return true;
      }
      
      // Verificar que estamos en el estado correcto para recibir una respuesta
      if (this.peerConnection.signalingState !== 'have-local-offer') {
        console.warn(`Estado de señalización incorrecto al recibir respuesta: ${this.peerConnection.signalingState}`);
        // Si no estamos en el estado correcto, no procesamos la respuesta
        return false;
      }
      
      console.log('Estableciendo descripción remota (respuesta)...');
      
      // Crear y establecer la descripción remota
      const remoteDesc = new RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(remoteDesc);
      
      console.log(`Estado después de establecer respuesta: ${this.peerConnection.signalingState}`);
      
      // Procesar candidatos ICE pendientes
      this.processPendingIceCandidates();
      
      console.log('Respuesta establecida correctamente');
      return true;
    } catch (error) {
      console.error('Error al manejar respuesta:', error);
      return false;
    }
  }

  // Agregar en WebRTCService.js
  diagnosticStreamRemote(userId) {
    if (!this.remoteStreams || !this.remoteStreams[userId]) {
      console.log(`No hay stream remoto para el usuario ${userId}`);
      return null;
    }
    
    const stream = this.remoteStreams[userId];
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    console.log(`=== DIAGNÓSTICO DE STREAM REMOTO (${userId}) ===`);
    console.log(`Stream ID: ${stream.id}`);
    console.log(`Tracks de audio: ${audioTracks.length}`);
    console.log(`Tracks de video: ${videoTracks.length}`);
    
    // Diagnosticar tracks de audio
    audioTracks.forEach((track, i) => {
      console.log(`Audio Track ${i}:`);
      console.log(`- ID: ${track.id}`);
      console.log(`- Enabled: ${track.enabled}`);
      console.log(`- Muted: ${track.muted}`);
      console.log(`- ReadyState: ${track.readyState}`);
      
      // IMPORTANTE: Habilitar el track si está deshabilitado
      if (!track.enabled) {
        console.log('Habilitando track de audio deshabilitado');
        track.enabled = true;
      }
    });
    
    // Diagnosticar tracks de video
    videoTracks.forEach((track, i) => {
      console.log(`Video Track ${i}:`);
      console.log(`- ID: ${track.id}`);
      console.log(`- Enabled: ${track.enabled}`);
      console.log(`- Muted: ${track.muted}`);
      console.log(`- ReadyState: ${track.readyState}`);
      
      // IMPORTANTE: Habilitar el track si está deshabilitado
      if (!track.enabled) {
        console.log('Habilitando track de video deshabilitado');
        track.enabled = true;
      }
      
      // Intentar obtener configuraciones
      if (track.getSettings) {
        const settings = track.getSettings();
        console.log(`- Width: ${settings.width || 'N/A'}`);
        console.log(`- Height: ${settings.height || 'N/A'}`);
        console.log(`- FrameRate: ${settings.frameRate || 'N/A'}`);
      }
    });
    
    return {
      hasAudio: audioTracks.length > 0,
      hasVideo: videoTracks.length > 0,
      audioEnabled: audioTracks.length > 0 ? audioTracks[0].enabled : false,
      videoEnabled: videoTracks.length > 0 ? videoTracks[0].enabled : false,
      audioMuted: audioTracks.length > 0 ? audioTracks[0].muted : true,
      videoMuted: videoTracks.length > 0 ? videoTracks[0].muted : true
    };
  }
  
  // Agregar un candidato ICE recibido (VERSIÓN MEJORADA)
  async addIceCandidate(candidate) {
    try {
      if (!candidate) {
        console.warn('Candidato ICE nulo o inválido');
        return false;
      }
      
      // Si no hay peer connection, guardar para después
      if (!this.peerConnection) {
        console.log('No hay peerConnection, guardando candidato ICE para después');
        this.pendingIceCandidates.push(candidate);
        return false;
      }
      
      // Si no hay descripción remota o local, guardar para después
      // En WebRTC moderno, se pueden añadir candidatos aunque solo una de las descripciones esté establecida
      if (!this.peerConnection.remoteDescription && !this.peerConnection.localDescription) {
        console.log('Descripciones no establecidas, guardando candidato ICE para después');
        this.pendingIceCandidates.push(candidate);
        return false;
      }
      
      // Añadir candidato ICE
      const iceCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(iceCandidate);
      console.log('Candidato ICE agregado correctamente');
      
      return true;
    } catch (error) {
      console.error('Error al agregar candidato ICE:', error);
      
      // Guardar candidato para intentar más tarde
      this.pendingIceCandidates.push(candidate);
      
      // Programar un reintento
      setTimeout(() => this.processPendingIceCandidates(), 1000);
      return false;
    }
  }

  // Agregar estos métodos a tu clase WebRTCService
  setUserId(userId) {
    console.log('Estableciendo ID de usuario:', userId);
    this.userId = userId;
  }

  setRemoteUserId(remoteUserId) {
    console.log('Estableciendo ID de usuario remoto:', remoteUserId);
    this.remoteUserId = remoteUserId;
  }

  // Agregar en WebRTCService.js
  ensureTracksEnabled(userId) {
    if (!this.remoteStreams || !this.remoteStreams[userId]) {
      return false;
    }
  
    const stream = this.remoteStreams[userId];
    let modified = false;
  
    // Asegurar que los tracks estén habilitados y no muted
    stream.getTracks().forEach(track => {
      // Forzar habilitación del track
      if (!track.enabled) {
        console.log('Habilitando track de', track.kind);
        track.enabled = true;
        modified = true;
      }
  
      // Forzar unmute usando tanto la propiedad interna como el setter
      if (track._muted === true || track.muted === true) {
        console.log('Forzando unmute en track', track.kind);
        try {
          track._muted = false;
          if (typeof track.muted === 'boolean') {
            track.muted = false;
          }
          modified = true;
        } catch (e) {
          console.warn('No se pudo modificar muted en track:', e);
        }
      }
    });
  
    if (modified) {
      console.log('Notificando cambios en tracks modificados');
      if (this.callbacks?.onRemoteStream) {
        this.callbacks.onRemoteStream(userId, stream);
      }
    }
  
    return modified;
  }
  
  
  // Método para registrar callbacks
  registerCallbacks(callbacks) {
    console.log('Registrando callbacks para eventos WebRTC');
    this.callbacks = {
      ...this.callbacks,
      ...callbacks
    };
    console.log('Callbacks registrados:', Object.keys(this.callbacks).join(', '));
  }

  // Procesar candidatos ICE pendientes
  async processPendingIceCandidates() {
    if (!this.peerConnection) {
      console.log('No hay peer connection para procesar candidatos ICE');
      return;
    }
    
    if (!this.pendingIceCandidates.length) {
      console.log('No hay candidatos ICE pendientes para procesar');
      return;
    }
    
    // Verificar que al menos una descripción está establecida
    // No es necesario tener ambas descripciones como se pensaba antes
    if (!this.peerConnection.remoteDescription && !this.peerConnection.localDescription) {
      console.log('No se pueden procesar candidatos ICE: no hay descripción remota ni local');
      return;
    }
    
    console.log(`Procesando ${this.pendingIceCandidates.length} candidatos ICE pendientes`);
    
    // Hacer una copia de los candidatos pendientes y vaciar la lista original
    const candidates = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];
    
    // Procesar cada candidato de forma secuencial (uno tras otro)
    for (const candidate of candidates) {
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        
        // Usar await para asegurar procesamiento secuencial
        await this.peerConnection.addIceCandidate(iceCandidate);
        console.log('Candidato ICE agregado correctamente');
      } catch (error) {
        console.warn('Error al añadir candidato ICE, guardando para reintentar:', error);
        // Volver a agregar a la lista de pendientes para intentar más tarde
        this.pendingIceCandidates.push(candidate);
      }
    }
    
    // Si hubo errores y aún quedan candidatos pendientes, programar un reintento
    if (this.pendingIceCandidates.length > 0) {
      console.log(`Quedan ${this.pendingIceCandidates.length} candidatos por procesar, programando reintento`);
      setTimeout(() => this.processPendingIceCandidates(), 2000);
    }
  }
  
  // Crear una oferta SDP
  async createOffer() {
    try {
      if (!this.peerConnection) {
        await this.init();
      }
      
      console.log('Creando oferta...');
      
      // Opciones mejoradas para oferta
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: true,
        iceRestart: false
      };
      
      // Crear oferta
      const offer = await this.peerConnection.createOffer(offerOptions);
      
      // Establecer como descripción local
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('Oferta creada y establecida correctamente');
      return offer;
    } catch (error) {
      console.error('Error al crear oferta:', error);
      throw error;
    }
  }
  
  getRemoteStreams() {
    return this.remoteStreams || {};
  }

  // Cambiar entre cámara frontal y trasera
  async switchCamera() {
    if (!this.localStream) {
      throw new Error('No hay stream de video activo');
    }
    
    // Buscar el track de video
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error('No hay track de video');
    }
    
    // Llamar al método implementado en la biblioteca WebRTC nativa
    try {
      await videoTrack._switchCamera();
      console.log('Cámara cambiada exitosamente');
      return true;
    } catch (error) {
      console.error('Error al cambiar de cámara:', error);
      throw error;
    }
  }
  
  // Alternar el altavoz
  toggleSpeaker(speakerOn) {
    try {
      console.log(`Alternando altavoz: ${speakerOn ? 'ON' : 'OFF'}`);
      
      // Solución alternativa para Android
      if (Platform.OS === 'android') {
        const AudioManager = require('react-native').NativeModules.AudioManager;
        if (AudioManager) {
          AudioManager.setSpeakerphoneOn(speakerOn);
          return;
        }
      }
      
      // Implementación estándar
      if (this.peerConnection) {
        this.peerConnection.audioOutput = speakerOn ? 'speaker' : 'earpiece';
      }
    } catch (error) {
      console.error('Error al cambiar altavoz:', error);
    }
  }
  
  // Establecer ID de usuario y ID remoto
  setUserIds(userId, remoteUserId) {
    console.log(`Estableciendo IDs: userId=${userId}, remoteUserId=${remoteUserId}`);
    this.userId = userId;
    this.remoteUserId = remoteUserId;
  }
  
  // Registrar callback para cuando se recibe un stream remoto
  onRemoteStream(callback) {
    this.onRemoteStreamCallback = callback;
    
    // Si ya tenemos un stream remoto, llamar al callback inmediatamente
    if (this.remoteStream && callback) {
      callback(this.remoteStream);
    }
  }
  
  getDebugInfo() {
    return {
      initialized: !!this.peerConnection,
      remoteUserId: this.remoteUserId,
      localStreamActive: !!this.localStream,
      signalingState: this.peerConnection?.signalingState,
      iceConnectionState: this.peerConnection?.iceConnectionState,
      iceGatheringState: this.peerConnection?.iceGatheringState
    };
  }

  // Limpiar recursos al finalizar
  cleanup() {
    console.log('Limpiando recursos WebRTC...');
    
    // IMPORTANTE: Eliminar listeners primero para evitar callbacks en objetos nulos
    if (this.peerConnection) {
      try {
        // Eliminar eventos para evitar errores cuando se destruye la conexión
        this.peerConnection.onicecandidate = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onsignalingstatechange = null;
        this.peerConnection.ontrack = null;
        
        if (typeof this.peerConnection.onconnectionstatechange !== 'undefined') {
          this.peerConnection.onconnectionstatechange = null;
        }
      } catch (e) {
        console.warn('Error al limpiar eventos:', e);
      }
    }
    
    // Detener y liberar streams locales
    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach(track => {
          track.stop();
          console.log(`Track local ${track.kind} detenido`);
        });
      } catch (e) {
        console.warn('Error al detener tracks locales:', e);
      }
      this.localStream = null;
    }
    
    // Limpiar todos los streams remotos (importante para evitar fugas de memoria)
    if (this.remoteStreams) {
      try {
        Object.values(this.remoteStreams).forEach(stream => {
          if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => {
              track.stop();
            });
          }
        });
      } catch (e) {
        console.warn('Error al detener tracks remotos:', e);
      }
      // Restablecer a un objeto vacío en lugar de null para evitar errores
      this.remoteStreams = {};
    }
    
    // Cerrar y liberar conexión
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {
        console.warn('Error al cerrar peer connection:', e);
      }
      this.peerConnection = null;
    }
    
    // Restablecer callbacks
    this.callbacks = {
      onRemoteStream: null,
      onRemoteStreamClosed: null,
      onConnectionStateChange: null,
      onError: null
    };
    
    // Limpiar candidatos pendientes
    this.pendingIceCandidates = [];
    
    // Limpiar callback
    this.onRemoteStreamCallback = null;
    
    // Restablecer banderas
    this.isProcessingOffer = false;
    this.isProcessingAnswer = false;
    
    // Restablecer _initializingPromise para evitar bloqueos en futuras inicializaciones
    this._initializingPromise = null;
    
    console.log('Recursos WebRTC liberados correctamente');
  }

  // Añadir a WebRTCService.js
  async testLoopback() {
    try {
      console.log('Iniciando prueba de loopback...');
      
      // Obtener stream local si no existe
      if (!this.localStream) {
        this.localStream = await this.getLocalStream();
      }
      
      // Crear dos conexiones peer para simular una llamada loopback
      const pc1 = new RTCPeerConnection({
        iceServers: this.iceServers,
        sdpSemantics: 'unified-plan'
      });
      
      const pc2 = new RTCPeerConnection({
        iceServers: this.iceServers,
        sdpSemantics: 'unified-plan'
      });
      
      // Variable para almacenar el resultado
      let loopbackSuccess = false;
      
      // Configurar evento ontrack para pc2
      pc2.ontrack = (event) => {
        console.log('Loopback: Track recibido en pc2');
        if (event.streams && event.streams[0]) {
          loopbackSuccess = true;
          console.log('Loopback: Stream recibido correctamente');
        }
      };
      
      // Añadir tracks de localStream a pc1
      this.localStream.getTracks().forEach(track => {
        pc1.addTrack(track, this.localStream);
      });
      
      // Conectar los candidatos ICE entre ambos peers
      pc1.onicecandidate = e => {
        if (e.candidate) pc2.addIceCandidate(e.candidate);
      };
      
      pc2.onicecandidate = e => {
        if (e.candidate) pc1.addIceCandidate(e.candidate);
      };
      
      // Crear oferta desde pc1
      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      
      // Establecer oferta como descripción remota en pc2
      await pc2.setRemoteDescription(pc1.localDescription);
      
      // Crear respuesta desde pc2
      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      
      // Establecer respuesta como descripción remota en pc1
      await pc1.setRemoteDescription(pc2.localDescription);
      
      // Esperar y verificar resultado
      return new Promise(resolve => {
        setTimeout(() => {
          // Limpiar recursos
          pc1.close();
          pc2.close();
          
          // Devolver resultado
          resolve({
            success: loopbackSuccess,
            message: loopbackSuccess 
              ? 'Test de loopback exitoso: La captura y transmisión de medios funciona correctamente'
              : 'Test de loopback fallido: Hay un problema con la transmisión de medios'
          });
        }, 5000); // Esperar 5 segundos para que se establezca la conexión
      });
    } catch (error) {
      console.error('Error en prueba de loopback:', error);
      return {
        success: false,
        message: `Error en prueba de loopback: ${error.message}`,
        error
      };
    }
  }
}

const webRTCServiceInstance = new WebRTCService();
export default webRTCServiceInstance;