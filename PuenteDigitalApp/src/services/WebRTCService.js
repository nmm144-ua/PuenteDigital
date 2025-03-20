// src/services/WebRTCService.js - Versión corregida para resolver problemas de señalización
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
    this.pendingIceCandidates = [];
    this.isInitializing = false;
    this.isProcessingOffer = false;
    this.isProcessingAnswer = false;
    
    // Configuración de servidores ICE (STUN/TURN)
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Servidores TURN gratuitos (limitados)
      { 
        urls: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com'
      }
    ];
  }
  
  // Método principal para inicializar WebRTC
  async init() {
    if (this.isInitializing) {
      console.log('Ya hay una inicialización en curso, esperando...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.peerConnection !== null;
    }
    
    this.isInitializing = true;
    
    try {
      // Cerrar conexión anterior si existe
      if (this.peerConnection) {
        console.log('Cerrando conexión anterior antes de inicializar...');
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      console.log('Inicializando WebRTC...');
      
      // Crear una nueva conexión RTCPeerConnection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10,
        sdpSemantics: Platform.OS === 'ios' ? 'unified-plan' : 'plan-b'
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
          // Continuamos incluso sin stream local, para poder recibir streams remotos
        }
      }
      
      // Agregar tracks al peer connection
      if (this.localStream && this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      console.log('WebRTC inicializado correctamente');
      this.isInitializing = false;
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
      
      this.isInitializing = false;
      throw error;
    }
  }
  
  // Configurar los listeners para eventos de la conexión
  // Versión mejorada de setupPeerConnectionListeners

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
    // IMPORTANTE: Verificar que peerConnection sigue existiendo
    if (!this.peerConnection) return;
    
    const state = this.peerConnection.iceConnectionState;
    console.log('ICE Connection State:', state);
    
    if (state === 'connected' || state === 'completed') {
      console.log('Conexión WebRTC establecida correctamente');
      
      // Una vez conectado, enviar cualquier candidato ICE pendiente
      if (this.remoteUserId && this.pendingIceCandidates.length > 0) {
        console.log(`Enviando ${this.pendingIceCandidates.length} candidatos ICE pendientes`);
        this.pendingIceCandidates.forEach(candidate => {
          SocketService.sendIceCandidate(candidate, this.remoteUserId, this.userId);
        });
        this.pendingIceCandidates = [];
      }
    } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
      console.log('Conexión ICE cerrada o fallida');
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
    console.log('Stream remoto recibido:', event.streams[0]);
    
    if (!event.streams || !event.streams[0]) {
      console.warn('Evento ontrack sin streams');
      return;
    }
    
    // Guardar el stream remoto
    this.remoteStream = event.streams[0];
    
    // Notificar que se ha recibido el stream remoto
    if (this.onRemoteStreamCallback) {
      this.onRemoteStreamCallback(this.remoteStream);
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

  // Manejar una oferta recibida (VERSIÓN MEJORADA)
  // Versión final del método handleIncomingOffer

async handleIncomingOffer(offer, fromUserId) {
  // Evitar procesamiento de múltiples ofertas simultáneas
  if (this.isProcessingOffer) {
    console.log('Ya hay una oferta en proceso, esperando finalización...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (this.isProcessingOffer) {
      console.log('La oferta anterior sigue en proceso, ignorando nueva oferta');
      return null;
    }
  }
  
  this.isProcessingOffer = true;
  console.log('Manejando oferta entrante de:', fromUserId);
  this.remoteUserId = fromUserId;
  
  try {
    // Guardar una copia segura de la oferta original
    const offerCopy = JSON.parse(JSON.stringify(offer));
    
    // IMPORTANTE: Limpiar por completo el estado anterior
    this.cleanup();
    
    // Crear una nueva instancia de RTCPeerConnection
    await this.init();
    
    // Verificar que la conexión se creó correctamente
    if (!this.peerConnection) {
      throw new Error('No se pudo crear la conexión WebRTC');
    }
    
    // IMPORTANTE: Esperar a que la conexión esté completamente inicializada
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verificar el estado de señalización antes de continuar
    console.log(`Estado de señalización antes de setRemoteDescription: ${this.peerConnection.signalingState}`);
    
    if (this.peerConnection.signalingState !== 'stable') {
      console.warn(`Estado de señalización inesperado: ${this.peerConnection.signalingState}, esperaba 'stable'`);
      // No lanzar error, seguir intentando
    }
    
    // Establecer la oferta remota
    console.log('Estableciendo descripción remota...');
    const remoteDesc = new RTCSessionDescription(offerCopy);
    await this.peerConnection.setRemoteDescription(remoteDesc);
    
    // Esperar a que el estado de señalización cambie
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verificar que estamos en el estado correcto ahora
    if (this.peerConnection.signalingState !== 'have-remote-offer') {
      console.error(`Estado de señalización después de setRemoteDescription: ${this.peerConnection.signalingState}, esperaba 'have-remote-offer'`);
      // No lanzar error, intentar continuar
    } else {
      console.log('Estado de señalización correcto: have-remote-offer');
    }
    
    // Crear respuesta
    console.log('Creando respuesta...');
    const answer = await this.peerConnection.createAnswer();
    
    // Establecer la descripción local
    console.log('Estableciendo descripción local (respuesta)...');
    await this.peerConnection.setLocalDescription(answer);
    
    console.log('Respuesta creada y establecida correctamente');
    
    // Procesar candidatos ICE pendientes ahora que tenemos configuración completa
    this.processPendingIceCandidates();
    
    // Ya no estamos procesando la oferta
    this.isProcessingOffer = false;
    return answer;
  } catch (error) {
    console.error('Error al manejar oferta entrante:', error);
    this.isProcessingOffer = false;
    
    // IMPORTANTE: Siempre limpiar en caso de error
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
  // Método mejorado processPendingIceCandidates

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
  
  // Limpiar recursos al finalizar
  // Versión mejorada del método cleanup

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
}

export default new WebRTCService();