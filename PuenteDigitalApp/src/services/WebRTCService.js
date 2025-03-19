// src/services/WebRTCService.js
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream
} from 'react-native-webrtc';
import { Platform } from 'react-native';
import EventEmitter from './events';

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onRemoteStreamCallback = null;
    this.onIceCandidateCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.userId = null;
    this.remoteUserId = null;
    this.pendingIceCandidates = [];
    this.isInitializing = false;
    this.isCallInProgress = false;
    
    // Configuración de servidores ICE (STUN/TURN)
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];
  }
  
  // Inicializar el servicio WebRTC pero SIN establecer conexión
  // Solo prepara el objeto RTCPeerConnection
  async init() {
    if (this.isInitializing) {
      console.log('Ya hay una inicialización en curso, esperando...');
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.isInitializing) {
            clearInterval(checkInterval);
            resolve(!!this.peerConnection);
          }
        }, 100);
      });
    }
    
    this.isInitializing = true;
    
    try {
      // Limpiar conexión anterior si existe
      this.cleanup(false);
      
      console.log('Inicializando WebRTC (solo preparación, SIN conexión)...');
      
      // Crear una nueva conexión RTCPeerConnection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10,
      });
      
      // Configurar eventos de la conexión
      this.setupPeerConnectionListeners();
      
      // Obtener stream local si no existe
      if (!this.localStream) {
        try {
          const stream = await this.getLocalStream();
          this.localStream = stream;
        } catch (mediaError) {
          console.warn('No se pudo obtener stream local:', mediaError);
        }
      }
      
      // Agregar tracks al peer connection si tenemos stream local
      if (this.localStream && this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      console.log('WebRTC inicializado correctamente (en espera de oferta)');
      return true;
    } catch (error) {
      console.error('Error al inicializar WebRTC:', error);
      this.cleanup(false);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }
  
  setupPeerConnectionListeners() {
    if (!this.peerConnection) {
      console.warn('No hay peer connection para configurar listeners');
      return;
    }
    
    // Evento cuando se genera un candidato ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Candidato ICE generado:', event.candidate.type);
        // Si tenemos un callback externo, usarlo
        if (this.onIceCandidateCallback) {
          this.onIceCandidateCallback(event.candidate);
        } else {
          EventEmitter.emit('webrtc:iceCandidate', { candidate, userId: this.remoteUserId });
        }
      } else {
        console.log('Recolección de candidatos ICE completada');
      }
    };
    
    // Evento cuando cambia el estado de la conexión ICE
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.iceConnectionState : 'closed';
      console.log('ICE Connection State:', state);
      
      if (state === 'connected' || state === 'completed') {
        // Establecer la llamada como en progreso
        this.isCallInProgress = true;
        // Procesar candidatos ICE pendientes cuando la conexión está establecida
        this.processPendingIceCandidates();
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.isCallInProgress = false;
        if (this.onConnectionStateChangeCallback) {
          this.onConnectionStateChangeCallback(state);
        }
      }
    };
    
    // Evento cuando cambia el estado de la conexión de señalización
    this.peerConnection.onsignalingstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.signalingState : 'closed';
      console.log('Signaling State:', state);
      
      if (state === 'stable') {
        // Procesar candidatos ICE pendientes cuando la señalización está estable
        this.processPendingIceCandidates();
      }
    };
    
    // Evento cuando se recibe un track del otro usuario
    this.peerConnection.ontrack = (event) => {
      console.log('Stream remoto recibido:', event.streams[0]);
      
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      
      // Agregar el track recibido al stream remoto
      event.streams[0].getTracks().forEach(track => {
        if (!this.remoteStream.getTracks().some(t => t.id === track.id)) {
          this.remoteStream.addTrack(track);
        }
      });
      
      // Notificar que se ha recibido el stream remoto
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };
  }
  
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
      
      console.log(`Stream local obtenido: audio:${audioTracks.length > 0}, video:${videoTracks.length > 0}`);
      
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
  
  // IMPORTANTE: App móvil NO crea ofertas, solo responde a ofertas
  // Este método se elimina para evitar que la app móvil inicie conexiones
  // async createOffer() { ... }
  
  // Método principal para manejar una oferta entrante desde el asistente
  async handleIncomingOffer(offer, fromUserId) {
    console.log('Manejando oferta entrante de:', fromUserId);
    this.remoteUserId = fromUserId;
    
    try {
      // Asegurarse de que hay una conexión RTCPeerConnection inicializada
      if (!this.peerConnection) {
        await this.init();
      }
      
      console.log('Estableciendo descripción remota...');
      const remoteDesc = new RTCSessionDescription(offer);
      await this.peerConnection.setRemoteDescription(remoteDesc);
      
      console.log('Descripción remota establecida correctamente, creando respuesta...');
      
      // Crear respuesta
      console.log('Creando respuesta...');
      const answer = await this.peerConnection.createAnswer();
      
      console.log('Respuesta creada, estableciendo descripción local...');
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('Descripción local (respuesta) establecida correctamente');
      
      // Procesar candidatos ICE pendientes ahora que tenemos la descripción remota
      this.processPendingIceCandidates();
      
      return answer;
    } catch (error) {
      console.error('Error al manejar oferta entrante:', error);
      throw error;
    }
  }
  
  // Método para procesar una respuesta recibida (no se utiliza en la app móvil)
  async handleAnswer(answer) {
    // Este método no se usa en la app móvil ya que no somos iniciadores
    // Pero lo mantenemos para compatibilidad con la interfaz
    console.warn('handleAnswer: La app móvil no debería recibir respuestas (answer)');
    return false;
  }
  
  async addIceCandidate(candidate) {
    try {
      if (!candidate) {
        console.warn('Candidato ICE nulo o inválido');
        return false;
      }
      
      if (!this.peerConnection) {
        console.log('No hay peer connection para agregar candidato ICE, guardando para después');
        this.pendingIceCandidates.push(candidate);
        return false;
      }
      
      // Si no hay descripción remota, guardar para más tarde
      if (this.peerConnection.remoteDescription === null) {
        console.log('Descripción remota no establecida, guardando candidato ICE para después');
        this.pendingIceCandidates.push(candidate);
        return false;
      }
      
      // Crear y agregar el candidato ICE
      const iceCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(iceCandidate);
      
      return true;
    } catch (error) {
      console.error('Error al agregar candidato ICE:', error);
      this.pendingIceCandidates.push(candidate);
      return false;
    }
  }
  
  processPendingIceCandidates() {
    if (!this.peerConnection || !this.pendingIceCandidates.length) {
      return;
    }
    
    if (!this.peerConnection.remoteDescription) {
      console.log('No hay descripción remota aún, no se pueden procesar candidatos ICE');
      return;
    }
    
    console.log(`Procesando ${this.pendingIceCandidates.length} candidatos ICE pendientes`);
    
    const candidates = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];
    
    candidates.forEach(candidate => {
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        this.peerConnection.addIceCandidate(iceCandidate)
          .catch(error => {
            console.warn('Error al procesar candidato ICE pendiente:', error);
            this.pendingIceCandidates.push(candidate);
          });
      } catch (error) {
        console.warn('Error al crear candidato ICE:', error);
        this.pendingIceCandidates.push(candidate);
      }
    });
  }
  
  async switchCamera() {
    if (!this.localStream) {
      throw new Error('No hay stream de video activo');
    }
    
    try {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No hay track de video');
      }
      
      // Llamar al método implementado en la biblioteca WebRTC nativa
      await videoTrack._switchCamera();
      console.log('Cámara cambiada exitosamente');
      
      return true;
    } catch (error) {
      console.error('Error al cambiar de cámara:', error);
      throw error;
    }
  }
  
  toggleMute(mute = null) {
    if (!this.localStream) return false;
    
    const audioTracks = this.localStream.getAudioTracks();
    if (!audioTracks.length) return false;
    
    const enabled = mute !== null ? !mute : !audioTracks[0].enabled;
    
    audioTracks.forEach(track => {
      track.enabled = enabled;
    });
    
    return !enabled; // Retorna true si está muteado, false si no
  }
  
  toggleVideo(hide = null) {
    if (!this.localStream) return false;
    
    const videoTracks = this.localStream.getVideoTracks();
    if (!videoTracks.length) return false;
    
    const enabled = hide !== null ? !hide : !videoTracks[0].enabled;
    
    videoTracks.forEach(track => {
      track.enabled = enabled;
    });
    
    return !enabled; // Retorna true si está oculto, false si no
  }
  
  toggleSpeaker(speakerOn) {
    try {
      console.log(`Alternando altavoz: ${speakerOn ? 'ON' : 'OFF'}`);
      
      if (Platform.OS === 'ios') {
        // En iOS, RTCPeerConnection tiene esta funcionalidad
        if (this.peerConnection) {
          this.peerConnection.audioOutput = speakerOn ? 'speaker' : 'earpiece';
          console.log('Altavoz cambiado en iOS');
          return true;
        }
      } else if (Platform.OS === 'android') {
        // En Android, necesitamos acceder al track de audio
        if (this.localStream && this.localStream.getAudioTracks().length > 0) {
          const audioTrack = this.localStream.getAudioTracks()[0];
          if (audioTrack && audioTrack._setSpeakerphoneOn) {
            audioTrack._setSpeakerphoneOn(speakerOn);
            console.log('Altavoz cambiado en Android');
            return true;
          } else {
            console.warn('Método _setSpeakerphoneOn no disponible');
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error al cambiar altavoz:', error);
      return false;
    }
  }
  
  setUserIds(userId, remoteUserId) {
    console.log(`Estableciendo IDs: userId=${userId}, remoteUserId=${remoteUserId}`);
    this.userId = userId;
    this.remoteUserId = remoteUserId;
  }
  
  onRemoteStream(callback) {
    this.onRemoteStreamCallback = callback;
    
    // Si ya tenemos un stream remoto, llamar al callback inmediatamente
    if (this.remoteStream && callback) {
      callback(this.remoteStream);
    }
  }
  
  onIceCandidate(callback) {
    this.onIceCandidateCallback = callback;
  }
  
  onIceConnectionStateChange(callback) {
    this.onIceConnectionStateChangeCallback = callback;
  }
  
  isInCall() {
    return this.isCallInProgress;
  }
  
  cleanup(cleanStreams = true) {
    console.log('Limpiando recursos WebRTC...');
    
    // Detener y liberar streams si se solicita
    if (cleanStreams) {
      if (this.localStream) {
        try {
          this.localStream.getTracks().forEach(track => {
            track.stop();
            console.log(`Track ${track.kind} detenido`);
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
    }
    
    // Cerrar y liberar conexión
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {
        console.warn('Error al cerrar peer connection:', e);
      }
      this.peerConnection = null;
      console.log('Peer connection cerrada');
    }
    
    // Limpiar candidatos pendientes
    this.pendingIceCandidates = [];
    
    // Restablecer valores
    this.isCallInProgress = false;
    
    console.log('Recursos WebRTC liberados correctamente');
  }
}

export default new WebRTCService();