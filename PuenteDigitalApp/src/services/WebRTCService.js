// src/services/WebRTCService.js
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream
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
    this.pendingIceCandidates = []; // Para almacenar candidatos ICE hasta que se establezca la descripción remota
    this.isInitializing = false;
    
    // Enriquecer el prototipo de MediaStream para mejor compatibilidad con la web
    if (MediaStream && MediaStream.prototype) {
      // Asegurar que getTracks siempre devuelve un array completo
      const originalGetTracks = MediaStream.prototype.getTracks;
      MediaStream.prototype.getTracks = function() {
        if (originalGetTracks) {
          const tracks = originalGetTracks.call(this);
          if (tracks && tracks.length > 0) return tracks;
        }
        
        // Fallback: combinar audio y video tracks
        const audioTracks = this.getAudioTracks ? this.getAudioTracks() : [];
        const videoTracks = this.getVideoTracks ? this.getVideoTracks() : [];
        return [...audioTracks, ...videoTracks];
      };
      
      // Definir propiedad active si no existe
      if (!Object.getOwnPropertyDescriptor(MediaStream.prototype, 'active')) {
        Object.defineProperty(MediaStream.prototype, 'active', {
          get: function() {
            const tracks = this.getTracks();
            return tracks.length > 0 && tracks.some(t => t.enabled);
          },
          configurable: true
        });
      }
    }


    // Configuración de servidores ICE (STUN/TURN)
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];
  }
  
  // Inicializar el servicio WebRTC
  // Modificación al método init en WebRTCService.js
  async init() {
    if (this.isInitializing) {
      console.log('Ya hay una inicialización en curso, esperando...');
      // Esperar a que finalice la inicialización en curso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar si la conexión se estableció correctamente
      if (!this.peerConnection) {
        console.log('La inicialización anterior falló, intentando de nuevo');
        this.isInitializing = false;
        return this.init();
      }
      
      return true;
    }
    
    this.isInitializing = true;
    
    try {
      // Si ya existe una conexión, primero la cerramos
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      console.log('Inicializando WebRTC...');
      
      // Crear una nueva conexión RTCPeerConnection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10,
      });
      
      const peerConnectionRef = this.peerConnection; // Guardar referencia local
      
      // Configurar eventos de la conexión
      this.setupPeerConnectionListeners();
      
      // Obtener stream local si no existe
      if (!this.localStream) {
        try {
          const stream = await this.getLocalStream();
          this.localStream = stream;
        } catch (mediaError) {
          console.warn('No se pudo obtener stream local:', mediaError);
          // Continuamos incluso sin stream local, para poder recibir streams remotos
        }
      }
      
      // Verificación adicional: asegurarse de que peerConnection sigue siendo válido
      if (this.peerConnection !== peerConnectionRef || !this.peerConnection) {
        throw new Error('La conexión RTCPeerConnection cambió durante la inicialización');
      }
      
      // Agregar tracks al peer connection
      if (this.localStream && this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      // Verificación final: asegurarse de que peerConnection sigue siendo válido
      if (this.peerConnection !== peerConnectionRef || !this.peerConnection) {
        throw new Error('La conexión RTCPeerConnection cambió después de agregar tracks');
      }
      
      // Procesar candidatos ICE pendientes si hay
      this.processPendingIceCandidates();
      
      console.log('WebRTC inicializado correctamente');
      return true;
    } catch (error) {
      console.error('Error al inicializar WebRTC:', error);
      // Limpiar en caso de error
      if (this.peerConnection) {
        try {
          this.peerConnection.close();
        } catch (e) {
          // Ignorar errores durante la limpieza
        }
        this.peerConnection = null;
      }
      throw error;
    } finally {
      this.isInitializing = false;
    }
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
        SocketService.sendIceCandidate(
          event.candidate.toJSON(),
          this.remoteUserId,
          this.userId
        );
      } else {
        console.log('Recolección de candidatos ICE completada');
      }
    };
    
    // Evento cuando cambia el estado de la conexión ICE
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.iceConnectionState : 'closed';
      console.log('ICE Connection State:', state);
      
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        console.log('Conexión ICE cerrada o fallida');
      }
    };
    
    // Evento cuando cambia el estado de la conexión de señalización
    this.peerConnection.onsignalingstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.signalingState : 'closed';
      console.log('Signaling State:', state);
    };
    
    // Evento cuando se recibe un track del otro usuario
    this.peerConnection.ontrack = (event) => {
      console.log('Stream remoto recibido:', event.streams[0]);
      
      // Crear stream remoto si no existe
      if (!this.remoteStream) {
        // Usar el stream original pero adaptarlo para la web
        const adaptedStream = this.adaptMediaStreamForWeb(event.streams[0]);
        this.remoteStream = adaptedStream;
        
        // Notificar que se ha recibido el stream remoto
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      } else {
        // Si ya existe el stream, solo agregar el nuevo track
        const trackExists = this.remoteStream.getTracks().find(
          t => t.kind === event.track.kind
        );
        
        if (!trackExists) {
          this.remoteStream.addTrack(event.track);
        }
      }
    };
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
      
      console.log(`Stream local obtenido: audio:${audioTracks.length > 0 && audioTracks[0].enabled}, video:${videoTracks.length > 0 && videoTracks[0].enabled}`);
      
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
  
  // Procesar candidatos ICE pendientes
  processPendingIceCandidates() {
    if (!this.peerConnection || !this.pendingIceCandidates.length) {
      return;
    }
    
    console.log(`Procesando ${this.pendingIceCandidates.length} candidatos ICE pendientes`);
    
    this.pendingIceCandidates.forEach(candidate => {
      try {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('Error al procesar candidato ICE pendiente:', error);
      }
    });
    
    this.pendingIceCandidates = [];
  }
  
  // Cambiar entre cámara frontal y trasera
  async switchCamera(stream) {
    if (!stream) {
      stream = this.localStream;
    }
    
    if (!stream) {
      throw new Error('No hay stream de video activo');
    }
    
    // Buscar el track de video
    const videoTrack = stream.getVideoTracks()[0];
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
  
  // Crear una oferta SDP
  async createOffer() {
    try {
      if (!this.peerConnection) {
        await this.init(); // Asegurarse de que hay una conexión
      }
      
      if (!this.peerConnection) {
        throw new Error('No se pudo inicializar la conexión WebRTC');
      }
      
      console.log('Creando oferta...');
      
      // Crear oferta
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      console.log('Oferta creada, estableciendo descripción local...');
      
      // Establecer como descripción local
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('Descripción local establecida correctamente');
      return offer;
    } catch (error) {
      console.error('Error al crear oferta:', error);
      throw error;
    }
  }
  
  // Manejar una oferta recibida
  async handleIncomingOffer(offer, fromUserId) {
    console.log('Manejando oferta entrante de:', fromUserId);
    this.remoteUserId = fromUserId;
    
    try {
      // 1. Guardar una copia de la oferta por si necesitamos reintentar
      const offerCopy = JSON.parse(JSON.stringify(offer));
      
      // 2. Reiniciar por completo el estado de WebRTC (primero guardar el stream local)
      const localStreamBackup = this.localStream;
      this.cleanup();
      this.localStream = localStreamBackup; // Restaurar el stream local para no tener que solicitarlo de nuevo
      
      // 3. Crear una nueva conexión limpia
      await this.init();
      
      // 4. Verificación CRÍTICA: asegurarnos de que la conexión existe
      if (!this.peerConnection) {
        throw new Error('No se pudo inicializar peer connection');
      }
      
      // 5. Establecer la oferta remota
      console.log('Estableciendo descripción remota...');
      const remoteDesc = new RTCSessionDescription(offerCopy); // Usar la copia
      await this.peerConnection.setRemoteDescription(remoteDesc);
      
      console.log('Descripción remota establecida correctamente, creando respuesta...');
      
      // 6. Verificación CRÍTICA antes de crear respuesta
      if (!this.peerConnection) {
        throw new Error('Peer connection se volvió nula después de setRemoteDescription');
      }
      
      // 7. Crear respuesta
      console.log('Creando respuesta...');
      const answer = await this.peerConnection.createAnswer();
      
      // 8. Verificación CRÍTICA antes de establecer descripción local
      if (!this.peerConnection) {
        throw new Error('Peer connection se volvió nula después de createAnswer');
      }
      
      console.log('Respuesta creada, estableciendo descripción local...');
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('Descripción local (respuesta) establecida correctamente');
      return answer;
    } catch (error) {
      console.error('Error al manejar oferta entrante:', error);
      
      // Limpiar en caso de error para evitar estados inconsistentes
      this.cleanup();
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
      
      // Verificar el estado de señalización
      if (this.peerConnection.signalingState === 'stable') {
        console.warn('Ya en estado stable, no se necesita establecer la respuesta');
        return true;
      }
      
      console.log('Manejando respuesta, estableciendo descripción remota...');
      
      // Crear y establecer la descripción remota
      const remoteDesc = new RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(remoteDesc);
      
      // Procesar candidatos ICE pendientes
      this.processPendingIceCandidates();
      
      console.log('Descripción remota (respuesta) establecida correctamente');
      return true;
    } catch (error) {
      console.error('Error al manejar respuesta:', error);
      return false;
    }
  }
  
  // Agregar un candidato ICE recibido
  async addIceCandidate(candidate) {
    try {
      if (!candidate) {
        console.warn('Candidato ICE nulo o inválido');
        return false;
      }
      
      if (!this.peerConnection) {
        console.warn('No hay peer connection para agregar candidato ICE, guardando para después');
        this.pendingIceCandidates.push(candidate);
        return false;
      }
      
      // Si no hay descripción remota, guardar para más tarde
      if (this.peerConnection.remoteDescription === null) {
        console.log('Descripción remota no establecida, guardando candidato ICE para después');
        this.pendingIceCandidates.push(candidate);
        return false;
      }
      
      console.log('Agregando candidato ICE...');
      
      // Crear y agregar el candidato ICE
      const iceCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(iceCandidate);
      
      console.log('Candidato ICE agregado correctamente');
      return true;
    } catch (error) {
      console.error('Error al agregar candidato ICE:', error);
      
      // Si ocurre un error, guardar el candidato para intentar más tarde
      this.pendingIceCandidates.push(candidate);
      return false;
    }
  }
  
  // Alternar el altavoz (implementación específica para cada plataforma)
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

// Adapta un MediaStream de react-native-webrtc para ser compatible con la web
    adaptMediaStreamForWeb(stream) {
      if (!stream) return null;
      
      // Crear una versión mejorada del objeto stream
      const enhancedStream = stream;
      
      // Asegurarse que getTracks combina audio y video correctamente
      const originalGetTracks = stream.getTracks;
      enhancedStream.getTracks = function() {
        // Si existe la implementación original, usarla
        if (originalGetTracks && typeof originalGetTracks === 'function') {
          return originalGetTracks.call(this);
        }
        
        // Combinar tracks de audio y video si no existe la implementación original
        const audioTracks = this.getAudioTracks ? this.getAudioTracks() : [];
        const videoTracks = this.getVideoTracks ? this.getVideoTracks() : [];
        return [...audioTracks, ...videoTracks];
      };
      
      // Asegurarse que todos los métodos básicos estén disponibles
      if (!enhancedStream.clone) {
        enhancedStream.clone = function() {
          return this;
        };
      }
      
      // Verificar y configurar la propiedad 'active'
      if (typeof enhancedStream.active === 'undefined') {
        Object.defineProperty(enhancedStream, 'active', {
          get: function() {
            const tracks = this.getTracks();
            return tracks.length > 0 && tracks.some(t => t.enabled);
          }
        });
      }
      
      return enhancedStream;
    }
  
  // Limpiar recursos al finalizar
  cleanup() {
    console.log('Limpiando recursos WebRTC...');
    
    // Detener y liberar streams
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
    
    // Limpiar callback
    this.onRemoteStreamCallback = null;
    console.log('Recursos WebRTC liberados correctamente');
  }
}

export default new WebRTCService();