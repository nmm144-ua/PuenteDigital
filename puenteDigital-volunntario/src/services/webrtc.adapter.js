// src/services/webrtc.adapter.js
// Este archivo detecta el entorno (web o móvil) y proporciona una interfaz unificada

// Detectar si estamos en React Native
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

let rtcPeerConnection, mediaDevices, RTCSessionDescription, RTCIceCandidate;

// Importar los módulos adecuados según el entorno
if (isReactNative) {
  // Entorno React Native: usar react-native-webrtc
  try {
    const WebRTC = require('react-native-webrtc');
    rtcPeerConnection = WebRTC.RTCPeerConnection;
    mediaDevices = WebRTC.mediaDevices;
    RTCSessionDescription = WebRTC.RTCSessionDescription;
    RTCIceCandidate = WebRTC.RTCIceCandidate;
  } catch (error) {
    console.error('Error importando react-native-webrtc:', error);
    throw new Error('WebRTC no está disponible en este entorno móvil');
  }
} else {
  // Entorno web: usar API nativa del navegador
  if (typeof window !== 'undefined') {
    rtcPeerConnection = window.RTCPeerConnection || 
                        window.webkitRTCPeerConnection || 
                        window.mozRTCPeerConnection;
    
    mediaDevices = navigator.mediaDevices;
    
    RTCSessionDescription = window.RTCSessionDescription || 
                           window.webkitRTCSessionDescription || 
                           window.mozRTCSessionDescription;
    
    RTCIceCandidate = window.RTCIceCandidate || 
                     window.webkitRTCIceCandidate || 
                     window.mozRTCIceCandidate;
  }
}

// Verificar que tenemos todas las interfaces necesarias
if (!rtcPeerConnection || !mediaDevices || !RTCSessionDescription || !RTCIceCandidate) {
  console.error('WebRTC no está completamente soportado en este entorno');
}

// Función para verificar el soporte de WebRTC en el entorno actual
const checkWebRTCSupport = () => {
  const hasRTCPeerConnection = !!rtcPeerConnection;
  const hasMediaDevices = !!(mediaDevices && mediaDevices.getUserMedia);
  
  // En entorno web, verificar también si estamos en un contexto seguro
  const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : true;
  
  return {
    supported: hasRTCPeerConnection && hasMediaDevices && isSecureContext,
    rtcPeerConnection: hasRTCPeerConnection,
    mediaDevices: hasMediaDevices,
    secureContext: isSecureContext
  };
};

// Función para obtener un stream multimedia
const getUserMedia = async (constraints) => {
  if (!mediaDevices || !mediaDevices.getUserMedia) {
    throw new Error('getUserMedia no está disponible en este entorno');
  }
  
  try {
    return await mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error('Error accediendo a dispositivos multimedia:', error);
    throw error;
  }
};

// Función para cambiar entre cámaras (si está disponible)
const switchCamera = async (stream) => {
  if (!stream) {
    throw new Error('No hay stream de video activo');
  }
  
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error('No hay track de video');
  }
  
  if (isReactNative && videoTrack._switchCamera) {
    // Método específico de react-native-webrtc
    await videoTrack._switchCamera();
  } else if (!isReactNative) {
    // En entorno web, necesitaríamos reabrir la cámara con facingMode opuesto
    // Esta es una implementación muy básica, podría no funcionar en todos los navegadores
    const currentSettings = videoTrack.getSettings();
    const newFacingMode = currentSettings.facingMode === 'user' ? 'environment' : 'user';
    
    // Detener el track actual
    videoTrack.stop();
    
    // Solicitar un nuevo stream con la otra cámara
    const newStream = await mediaDevices.getUserMedia({
      video: { facingMode: newFacingMode },
      audio: stream.getAudioTracks().length > 0
    });
    
    // Reemplazar los tracks en el stream original
    stream.getVideoTracks().forEach(track => stream.removeTrack(track));
    newStream.getVideoTracks().forEach(track => stream.addTrack(track));
  } else {
    throw new Error('Cambio de cámara no soportado en este entorno');
  }
  
  return stream;
};

// Exportar una interfaz unificada
export default {
  RTCPeerConnection: rtcPeerConnection,
  mediaDevices,
  RTCSessionDescription,
  RTCIceCandidate,
  getUserMedia,
  switchCamera,
  checkWebRTCSupport,
  isReactNative
};