import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  Platform,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import SocketService from '../../services/socketService';
import WebRTCService from '../../services/WebRTCService';
import PermissionsService from '../../services/permissions.service';
import { RTCView } from 'react-native-webrtc';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const VideollamadaScreen = ({ route, navigation }) => {
  const { roomId, asistenteId, asistenteName } = route.params;
  const { user } = useAuth();
  
  // Estados para la videollamada
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callStatus, setCallStatus] = useState('waiting'); // 'waiting', 'connecting', 'connected', 'ended'
  const [callDuration, setCallDuration] = useState(0);
  
  const durationTimerRef = useRef(null);
  const initialized = useRef(false);
  
  // Formatear el tiempo de la llamada
  const formatCallDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hrs > 0 ? `${hrs}:` : ''}${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Función para finalizar la llamada
  const endCall = async () => {
    try {
      // Detener el temporizador de duración
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      
      // Notificar a través del socket que la llamada ha finalizado
      SocketService.endCall(roomId, asistenteId);
      
      // Limpiar recursos de WebRTC
      WebRTCService.cleanup();
      
      // Actualizar el estado
      setCallStatus('ended');
      setLocalStream(null);
      setRemoteStream(null);
      
      // Navegar de vuelta a la pantalla anterior
      navigation.goBack();
    } catch (error) {
      console.error('Error al finalizar la llamada:', error);
      navigation.goBack();
    }
  };
  
  // Función para alternar micrófono
  const toggleMute = () => {
    const newMuteState = WebRTCService.toggleMute(isMuted);
    setIsMuted(newMuteState);
  };
  
  // Función para alternar cámara
  const toggleCamera = () => {
    const newCameraState = WebRTCService.toggleVideo(isCameraOff);
    setIsCameraOff(newCameraState);
  };
  
  // Función para cambiar entre cámara frontal y trasera
  const switchCamera = async () => {
    try {
      await WebRTCService.switchCamera();
    } catch (error) {
      console.error('Error al cambiar de cámara:', error);
      Alert.alert('Error', 'No se pudo cambiar la cámara');
    }
  };
  
  // Función para alternar altavoz
  const toggleSpeaker = () => {
    const success = WebRTCService.toggleSpeaker(!isSpeakerOn);
    if (success) {
      setIsSpeakerOn(!isSpeakerOn);
    }
  };
  
  // Manejar evento de sala aceptada por el asistente
  const handleRoomAccepted = (data) => {
    console.log('Sala aceptada por asistente:', data);
    
    // Verificar que sea para esta sala
    if (data.roomId === roomId) {
      // El asistente ha aceptado la solicitud pero NO estamos en llamada todavía
      // Solo actualizamos el estado para mostrar que el asistente está disponible
      setCallStatus('accepted');
      
      // Actualizar información del asistente si está disponible
      const asistenteName = data.asistenteName || 'Asistente';
      const asistenteId = data.asistenteId;
      
      // Mostrar notificación al usuario
      Alert.alert(
        'Solicitud aceptada',
        `${asistenteName} ha aceptado tu solicitud y pronto iniciará la videollamada.`,
        [{ text: 'OK' }]
      );
    }
  };
  
  // Manejar evento de solicitud de llamada
  const handleCallRequested = (data) => {
    console.log('Solicitud de llamada recibida de:', data);
    
    // Actualizar el estado para mostrar que estamos conectando
    setCallStatus('connecting');
    
    // No hacemos nada más aquí, esperamos a que llegue la oferta WebRTC
    // La conexión se manejará automáticamente cuando llegue la oferta
  };
  
  // Manejar stream remoto recibido
  const handleRemoteStream = (stream) => {
    console.log('Stream remoto recibido');
    setRemoteStream(stream);
    setCallStatus('connected');
    
    // Iniciar temporizador de duración de llamada
    if (!durationTimerRef.current) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
  };
  
  // Inicializar el servicio WebRTC PASIVAMENTE
  const initializeWebRTC = async () => {
    if (initialized.current) return;
    
    try {
      // Verificar permisos de cámara y micrófono
      const hasPermissions = await PermissionsService.checkCallPermissions();
      if (!hasPermissions) {
        const granted = await PermissionsService.requestCallPermissions();
        if (!granted) {
          Alert.alert(
            'Permisos requeridos',
            'Para realizar videollamadas necesitas conceder permisos de cámara y micrófono.',
            [{ text: 'Entendido', onPress: () => navigation.goBack() }]
          );
          return;
        }
      }
      
      // Inicializar WebRTC (solo preparación, no inicia conexión)
      await WebRTCService.init();
      
      // Establecer callback para recibir stream remoto
      WebRTCService.onRemoteStream(handleRemoteStream);
      
      // Obtener stream local para la vista previa
      const stream = await WebRTCService.getLocalStream();
      setLocalStream(stream);
      
      // Definir que estamos inicializados
      initialized.current = true;
      
      console.log('WebRTC inicializado en modo pasivo - esperando oferta del asistente');
    } catch (error) {
      console.error('Error al inicializar WebRTC:', error);
      Alert.alert(
        'Error de preparación',
        'No se pudieron inicializar los componentes de videollamada. Por favor, intenta nuevamente.',
        [{ text: 'Volver', onPress: () => navigation.goBack() }]
      );
    }
  };
  
  // Configurar listeners de Socket.IO
  const setupSocketListeners = () => {
    // Registrar callback para sala aceptada
    SocketService.onRoomAccepted(handleRoomAccepted);
    
    // Registrar callback para solicitud de llamada
    SocketService.onCallRequested(handleCallRequested);
  };
  
  // Limpiar listeners de Socket.IO
  const cleanupSocketListeners = () => {
    SocketService.offRoomAccepted(handleRoomAccepted);
    SocketService.offCallRequested(handleCallRequested);
  };
  
  useEffect(() => {
    // Configurar listeners para eventos de Socket.IO
    setupSocketListeners();
    
    // Inicializar WebRTC
    initializeWebRTC();
    
    // Prevenir navegación hacia atrás sin finalizar la llamada
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        callStatus === 'connected' ? 'Finalizar videollamada' : 'Cancelar solicitud',
        callStatus === 'connected' 
          ? '¿Estás seguro que deseas finalizar la videollamada?' 
          : '¿Estás seguro que deseas cancelar tu solicitud de asistencia?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Sí', style: 'destructive', onPress: endCall }
        ]
      );
      return true;
    });
    
    return () => {
      // Limpiar al desmontar
      backHandler.remove();
      
      // Detener temporizador de duración
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      
      // Limpiar listeners de Socket.IO
      cleanupSocketListeners();
      
      // Limpiar recursos de WebRTC
      WebRTCService.cleanup();
    };
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Stream remoto (pantalla completa) - solo visible cuando estamos conectados */}
      {remoteStream && callStatus === 'connected' ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteStream}
          objectFit="cover"
          zOrder={0}
        />
      ) : (
        // Estado de espera o conexión
        <View style={styles.waitingContainer}>
          <View style={styles.statusCard}>
            <MaterialIcons 
              name={
                callStatus === 'waiting' ? 'hourglass-empty' : 
                callStatus === 'accepted' ? 'person' :
                callStatus === 'connecting' ? 'sync' : 'videocam-off'
              } 
              size={60} 
              color="#007BFF" 
            />
            <Text style={styles.statusTitle}>
              {callStatus === 'waiting' ? 'Esperando asistente...' : 
               callStatus === 'accepted' ? 'Solicitud aceptada' :
               callStatus === 'connecting' ? 'Iniciando videollamada...' : 
               'Llamada finalizada'}
            </Text>
            <Text style={styles.statusMessage}>
              {callStatus === 'waiting' ? 'Un asistente revisará tu solicitud pronto.' : 
               callStatus === 'accepted' ? `${asistenteName || 'El asistente'} iniciará la videollamada en breve.` :
               callStatus === 'connecting' ? 'Estableciendo conexión con el asistente...' : 
               'La videollamada ha finalizado.'}
            </Text>
            
            {/* Solo mostrar la vista previa si tenemos stream local */}
            {localStream && (
              <View style={styles.localPreviewContainer}>
                <Text style={styles.previewLabel}>Tu cámara:</Text>
                <RTCView
                  streamURL={localStream.toURL()}
                  style={styles.localPreview}
                  objectFit="cover"
                  mirror
                  zOrder={1}
                />
              </View>
            )}
          </View>
        </View>
      )}
      
      {/* Stream local (miniatura) - solo visible durante la llamada */}
      {remoteStream && callStatus === 'connected' && localStream && (
        <View style={styles.localStreamContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localStream}
            objectFit="cover"
            mirror
            zOrder={1}
          />
        </View>
      )}
      
      {/* Información de la llamada - solo visible durante la llamada */}
      {callStatus === 'connected' && (
        <View style={styles.callInfoContainer}>
          <Text style={styles.callInfoText}>
            {`Duración: ${formatCallDuration(callDuration)}`}
          </Text>
          <Text style={styles.participantName}>
            {asistenteName || 'Asistente'}
          </Text>
        </View>
      )}
      
      {/* Controles de la llamada - solo visibles durante la llamada */}
      {callStatus === 'connected' && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[
              styles.controlButton,
              isMuted && styles.controlButtonActive
            ]} 
            onPress={toggleMute}
          >
            <MaterialIcons 
              name={isMuted ? 'mic-off' : 'mic'} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.controlText}>
              {isMuted ? 'Activar' : 'Silenciar'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.controlButton,
              isCameraOff && styles.controlButtonActive
            ]} 
            onPress={toggleCamera}
          >
            <MaterialIcons 
              name={isCameraOff ? 'videocam-off' : 'videocam'} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.controlText}>
              {isCameraOff ? 'Activar' : 'Apagar'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={switchCamera}
          >
            <MaterialIcons name="flip-camera-ios" size={24} color="#fff" />
            <Text style={styles.controlText}>Cambiar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.controlButton,
              isSpeakerOn && styles.controlButtonActive
            ]} 
            onPress={toggleSpeaker}
          >
            <MaterialIcons 
              name={isSpeakerOn ? 'volume-up' : 'volume-off'} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.controlText}>
              {isSpeakerOn ? 'Altavoz' : 'Auricular'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Botón de finalizar llamada - siempre visible con texto contextual */}
      <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
        {callStatus === 'connected' ? (
          <MaterialIcons name="call-end" size={36} color="#fff" />
        ) : (
          <Text style={styles.endCallText}>Cancelar solicitud</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteStream: {
    flex: 1,
    width: width,
    height: height,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  localPreviewContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  previewLabel: {
    fontSize: 14,
    color: '#777',
    marginBottom: 8,
  },
  localPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  localStreamContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
  },
  localStream: {
    width: '100%',
    height: '100%',
  },
  callInfoContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  callInfoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  participantName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    paddingBottom: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12,
  },
  endCallButton: {
    position: 'absolute',
    bottom: 30,
    left: width / 2 - 80,
    width: 160,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VideollamadaScreen;