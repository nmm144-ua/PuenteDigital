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
      onRemoteStreamClosed: null
    };
  }

  registerCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async getLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accediendo a cámara y micrófono:', error);
      throw error;
    }
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
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
      }
    });

    // Manejo de respuestas
    socketService.on('answer', ({ answer, from }) => {
      console.log('Respuesta recibida de:', from);
      if (this.peers[from]) {
        this.peers[from].signal(answer);
      }
    });

    // Manejo de candidatos ICE
    socketService.on('ice-candidate', ({ candidate, from }) => {
      if (this.peers[from]) {
        this.peers[from].signal(candidate);
      }
    });

    // Manejo de usuario que deja la sala
    socketService.on('user-left', ({ userId }) => {
      this.closeConnection(userId);
    });

    // Manejo de fin de llamada
    socketService.on('call-ended', ({ from }) => {
      this.closeConnection(from);
    });
  }

  async initConnection(targetUserId, isInitiator = true) {
    if (!this.localStream) {
      await this.getLocalStream();
    }

    // Cerrar conexión anterior si existe
    if (this.peers[targetUserId]) {
      this.peers[targetUserId].destroy();
    }

    // Crear nueva conexión peer
    const peer = new Peer({
      initiator: isInitiator,
      trickle: true,
      stream: this.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    // Manejar eventos de señalización
    peer.on('signal', data => {
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
      this.remoteStreams[targetUserId] = stream;
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(targetUserId, stream);
      }
    });

    // Manejar cierre de conexión
    peer.on('close', () => {
      this.closeConnection(targetUserId);
    });

    // Manejar errores
    peer.on('error', err => {
      console.error('Error de conexión peer:', err);
      this.closeConnection(targetUserId);
    });

    this.peers[targetUserId] = peer;
    return peer;
  }

  async handleIncomingOffer(offer, fromUserId) {
    const peer = await this.initConnection(fromUserId, false);
    peer.signal(offer);
  }

  closeConnection(userId) {
    if (this.peers[userId]) {
      this.peers[userId].destroy();
      delete this.peers[userId];
    }

    if (this.remoteStreams[userId]) {
      delete this.remoteStreams[userId];
      if (this.callbacks.onRemoteStreamClosed) {
        this.callbacks.onRemoteStreamClosed(userId);
      }
    }
  }

  closeAllConnections() {
    Object.keys(this.peers).forEach(userId => {
      this.closeConnection(userId);
    });
    this.stopLocalStream();
  }

  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  getRemoteStreams() {
    return this.remoteStreams;
  }
}

export default new WebRTCService();