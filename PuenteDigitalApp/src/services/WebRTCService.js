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
    
    // Configuración de servidores ICE (STUN/TURN)
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Servidor TURN público de Google
      {
        urls: 'turn:numb.viagenie.ca',
        username: 'webrtc@live.com',
        credential: 'muazkh'
      },
      // Servidores TURN alternativos
      {
        urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
        username: 'webrtc',
        credential: 'webrtc'
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
    // Prevenir inicializaciones simultáneas
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
          this.peerConnection.close();
          this.peerConnection = null;
        }
        
        // Crear nueva conexión
        this.peerConnection = new RTCPeerConnection({
          iceServers: this.iceServers,
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          sdpSemantics: 'unified-plan'
        });
        
        // Configurar eventos
        this.setupPeerConnectionListeners();
        
        // Agregar tracks si hay stream local
        if (this.localStream) {
          console.log('Agregando tracks al peerConnection');
          this.localStream.getTracks().forEach(track => {
            const sender = this.peerConnection.addTrack(track, this.localStream);
            console.log(`Track ${track.kind} añadido con éxito, ID: ${track.id}, sender: `, sender);
          });
        } else {
          // Obtener stream local si no existe
          try {
            this.localStream = await this.getLocalStream();
            // Agregar tracks después de obtener stream local
            console.log('Agregando tracks al peerConnection');
            this.localStream.getTracks().forEach(track => {
              const sender = this.peerConnection.addTrack(track, this.localStream);
              console.log(`Track ${track.kind} añadido con éxito, ID: ${track.id}, sender: `, sender);
            });
          } catch (mediaError) {
            console.warn('No se pudo obtener stream local:', mediaError);
          }
        }
        
        console.log('WebRTC inicializado correctamente');
        return true;
      } catch (error) {
        console.error('Error al inicializar WebRTC:', error);
        throw error;
      } finally {
        // Limpia la promesa de inicialización
        this._initializingPromise = null;
      }
    })();
    
    return this._initializingPromise;
  }
  
  // Configurar los listeners para eventos de la conexión
  setupPeerConnectionListeners() {
    if (!this.peerConnection) {
      console.warn('setupPeerConnectionListeners: No hay peer connection');
      return;
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
      } else if (state === 'disconnected') {
        console.error('Conexión ICE desconectada');
      }
    };
    
    // Evento cuando cambia el estado de la conexión de señalización
    this.peerConnection.onsignalingstatechange = () => {
      // IMPORTANTE: Verificar que peerConnection sigue existiendo
      if (!this.peerConnection) return;
      
      const state = this.peerConnection.signalingState;
      console.log('Signaling State:', state);
      
      if (state === 'stable') {
        // Procesar candidatos ICE pendientes cuando estamos en estado estable
        this.processPendingIceCandidates();
      }
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
      
      // Verificar que el stream tenga tracks activos antes de utilizarlo
      const hasActiveTracks = remoteStream.getTracks().some(track => track.readyState === 'live');
      
      if (!hasActiveTracks) {
        console.warn('Stream remoto recibido pero no tiene tracks activos');
      }
      
      // Guardar referencia al stream para cada usuario
      this.remoteStreams[this.remoteUserId] = remoteStream;
      
      // Notificar a través del callback
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(this.remoteUserId, remoteStream);
      }
    };
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
      // Cerrar cualquier conexión existente
      if (this.peerConnection) {
        console.log('Cerrando conexión existente antes de procesar oferta');
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // Inicializar nueva conexión
      console.log('Inicializando nueva conexión para responder a oferta');
      await this.init();
      
      // Verificar estado inicial
      console.log('Estado inicial de señalización:', this.peerConnection.signalingState);
      
      // Establecer descripción remota primero (la oferta)
      console.log('Estableciendo descripción remota (oferta)');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Verificar estado después de establecer oferta
      console.log('Estado después de establecer oferta remota:', this.peerConnection.signalingState);
      
      // Crear respuesta inmediatamente después de establecer la descripción remota
      console.log('Creando respuesta SDP');
      const answer = await this.peerConnection.createAnswer();
      
      // Establecer descripción local (la respuesta) inmediatamente
      console.log('Estableciendo descripción local (respuesta)');
      await this.peerConnection.setLocalDescription(answer);
      
      // Verificar estado final
      console.log('Estado final después de establecer respuesta:', this.peerConnection.signalingState);
      
      // Enviar respuesta
      console.log('Enviando respuesta a:', fromUserId);
      const enviado = SocketService.sendAnswer(answer, fromUserId);
      console.log('Respuesta enviada con éxito:', enviado);
      
      return true;
    } catch (error) {
      console.error('***** ERROR AL PROCESAR OFERTA *****');
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      
      // Limpiar recursos en caso de error
      try {
        if (this.peerConnection) {
          console.log('Limpiando conexión después de error');
          this.peerConnection.close();
          this.peerConnection = null;
        }
      } catch (cleanupError) {
        console.warn('Error durante la limpieza:', cleanupError);
      }
      
      throw error;
    }
  }
  
  // Manejar una respuesta recibida
  async handleAnswer(answer) {
    try {
      if (!this.peerConnection) {
        console.warn('No hay peer connection para manejar la respuesta');
        return false;
      }
      
      // Verificar que estamos en el estado correcto para recibir una respuesta
      if (this.peerConnection.signalingState !== 'have-local-offer') {
        console.warn(`Estado de señalización inesperado al recibir respuesta: ${this.peerConnection.signalingState}`);
        return false;
      }
      
      console.log('Estableciendo descripción remota (respuesta)...');
      
      // Crear y establecer la descripción remota
      const remoteDesc = new RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(remoteDesc);
      
      // Procesar candidatos ICE pendientes
      this.processPendingIceCandidates();
      
      console.log('Respuesta establecida correctamente');
      return true;
    } catch (error) {
      console.error('Error al manejar respuesta:', error);
      return false;
    }
  }
  
  // Agregar un candidato ICE recibido (VERSIÓN MEJORADA)
  async addIceCandidate(candidate) {
    try {
      if (!candidate) {
        console.warn('Candidato ICE nulo o inválido');
        return false;
      }
      
      // Si no hay peer connection o no tiene descripción remota, guardar para después
      if (!this.peerConnection || !this.peerConnection.remoteDescription) {
        console.log('Descripción remota no establecida, guardando candidato ICE para después');
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
      return false;
    }
  }
  
  // Procesar candidatos ICE pendientes
  processPendingIceCandidates() {
    if (!this.peerConnection) {
      console.log('No hay peer connection para procesar candidatos ICE');
      return;
    }
    
    if (!this.pendingIceCandidates.length) {
      console.log('No hay candidatos ICE pendientes para procesar');
      return;
    }
    
    // CAMBIO CLAVE: Verificar que las descripciones local Y remota están establecidas
    if (!this.peerConnection.remoteDescription || !this.peerConnection.localDescription) {
      console.log('No se pueden procesar candidatos ICE: faltan descripciones local o remota');
      return;
    }
    
    console.log(`Procesando ${this.pendingIceCandidates.length} candidatos ICE pendientes`);
    
    // Hacer una copia de los candidatos pendientes y vaciar la lista original
    const candidates = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];
    
    // Procesar cada candidato con manejo de errores mejorado
    candidates.forEach(candidate => {
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        
        // Usar Promise para manejar errores
        this.peerConnection.addIceCandidate(iceCandidate)
          .then(() => {
            console.log('Candidato ICE agregado correctamente');
          })
          .catch(error => {
            console.warn('Error al agregar candidato ICE, guardando para reintentar:', error);
            // Volver a agregar a la lista de pendientes para intentar más tarde
            this.pendingIceCandidates.push(candidate);
          });
      } catch (error) {
        console.warn('Error al crear candidato ICE:', error);
      }
    });
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
      if (!this.localStream) return;
      
      console.log(`Alternando altavoz: ${speakerOn ? 'ON' : 'OFF'}`);
      
      // En React Native WebRTC, esto es más complejo y podría requerir
      // implementaciones específicas para cada plataforma
      if (Platform.OS === 'ios') {
        // En iOS, RTCPeerConnection tiene esta funcionalidad
        if (this.peerConnection) {
          this.peerConnection.audioOutput = speakerOn ? 'speaker' : 'earpiece';
          console.log('Altavoz cambiado en iOS');
        }
      } else if (Platform.OS === 'android') {
        // En Android, necesitas usar código nativo (NativeModules)
        if (this.localStream && this.localStream.getAudioTracks().length > 0) {
          const audioTrack = this.localStream.getAudioTracks()[0];
          if (audioTrack && audioTrack._setSpeakerphoneOn) {
            audioTrack._setSpeakerphoneOn(speakerOn);
            console.log('Altavoz cambiado en Android');
          } else {
            console.warn('Método _setSpeakerphoneOn no disponible');
          }
        }
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
    
    // Detener y liberar streams
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
    
    if (this.remoteStream) {
      try {
        this.remoteStream.getTracks().forEach(track => {
          track.stop();
          console.log(`Track remoto ${track.kind} detenido`);
        });
      } catch (e) {
        console.warn('Error al detener tracks remotos:', e);
      }
      this.remoteStream = null;
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
    
    // Limpiar candidatos pendientes
    this.pendingIceCandidates = [];
    
    // Limpiar callback
    this.onRemoteStreamCallback = null;
    
    // Restablecer banderas
    this.isProcessingOffer = false;
    this.isProcessingAnswer = false;
    
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

export default new WebRTCService();