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
  const [callStatus, setCallStatus] = useState('connecting'); // 'connecting', 'connected', 'ended'
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
      console.log("endCall: Iniciando proceso de finalización");
      
      // Detener temporizador
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      
      // Actualizar el estado primero
      setCallStatus('ended');
      
      // Guardar referencia a remoteStream antes de limpiar
      const currentRemoteStream = remoteStream;
      
      // Detener y liberar remoteStream explícitamente
      if (currentRemoteStream) {
        try {
          currentRemoteStream.getTracks().forEach(track => {
            track.stop();
          });
          setRemoteStream(null);
        } catch (e) {
          console.warn('Error al detener tracks remotos:', e);
        }
      }
      
      // Notificar a través del socket que la llamada ha finalizado
      SocketService.endCall(roomId, asistenteId);
      
      // Limpiar recursos WebRTC
      WebRTCService.cleanup();
      
      // Navegar de vuelta a la pantalla anterior después de un breve retraso
      setTimeout(() => {
        navigation.navigate('OpcionesInicio');
      }, 500);
    } catch (error) {
      console.error('Error al finalizar la llamada:', error);
      navigation.navigate('OpcionesInicio');
    }
  };
  
  // Función para alternar micrófono
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  // Función para alternar cámara
  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };
  
  // Función para cambiar entre cámara frontal y trasera
  const switchCamera = async () => {
    try {
      await WebRTCService.switchCamera();
    } catch (error) {
      console.error('Error al cambiar de cámara:', error);
    }
  };
  
  // Función para alternar altavoz
  const toggleSpeaker = () => {
    WebRTCService.toggleSpeaker(!isSpeakerOn);
    setIsSpeakerOn(!isSpeakerOn);
  };
  
  useEffect(() => {
    console.log("Montando VideollamadaScreen...");
    
    const initialize = async () => {
      if (initialized.current) return;
      initialized.current = true;
      
      try {
        // 1. Verificar permisos
        const permisos = await PermissionsService.requestCallPermissions();
        if (!permisos) {
          throw new Error("Permisos de cámara/micrófono no concedidos");
        }
        
        // 2. Configurar callbacks ANTES de cualquier inicialización
        WebRTCService.registerCallbacks({
          onRemoteStream: (userId, stream) => {
            console.log("CALLBACK: Stream remoto recibido de:", userId);
            if (stream) {
              console.log("Audio tracks:", stream.getAudioTracks().length);
              console.log("Video tracks:", stream.getVideoTracks().length);
              setRemoteStream(stream);
              setCallStatus('connected');
              
              // Iniciar temporizador
              if (!durationTimerRef.current) {
                durationTimerRef.current = setInterval(() => {
                  setCallDuration(prev => prev + 1);
                }, 1000);
              }
            }
          },
          onRemoteStreamClosed: () => {
            setCallStatus('ended');
            if (durationTimerRef.current) {
              clearInterval(durationTimerRef.current);
              durationTimerRef.current = null;
            }
          },
          onConnectionStateChange: (userId, state) => {
            console.log(`Estado de conexión para ${userId}: ${state}`);
          },
          onError: (type, error) => {
            console.error(`Error WebRTC (${type}):`, error);
          }
        });
        
        // 3. Configurar IDs
        const myUserId = user?.id || 'anonymous';
        WebRTCService.setUserIds(myUserId, asistenteId);
        
        // 4. Configurar listeners de socket
        SocketService.off('offer');
        SocketService.off('answer');
        SocketService.off('ice-candidate');
        SocketService.off('call-ended');
        
        SocketService.onOffer(async (data) => {
          console.log("Oferta recibida de:", data.from);
          await WebRTCService.handleIncomingOffer(data.offer, data.from);
        });
        
        SocketService.onAnswer((data) => {
          console.log("Respuesta recibida de:", data.from);
          WebRTCService.handleAnswer(data.answer);
        });
        
        SocketService.onIceCandidate((data) => {
          WebRTCService.addIceCandidate(data.candidate);
        });
        
        SocketService.onCallEnded(() => {
          Alert.alert('Llamada finalizada', 'El otro usuario ha finalizado la llamada');
          endCall();
        });
        
        // 5. Inicializar WebRTC
        await WebRTCService.init();
        
        // 6. Obtener stream local
        const stream = await WebRTCService.getLocalStream();
        setLocalStream(stream);
        
        // 7. Verificar streams remotos existentes
        const remoteStreams = WebRTCService.getRemoteStreams();
        if (remoteStreams && Object.keys(remoteStreams).length > 0) {
          // Use the first remote stream available
          const firstStreamKey = Object.keys(remoteStreams)[0];
          setRemoteStream(remoteStreams[firstStreamKey]);
          setCallStatus('connected');
          
          // Iniciar temporizador
          if (!durationTimerRef.current) {
            durationTimerRef.current = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }
        }
      } catch (error) {
        console.error("Error en inicialización:", error);
        Alert.alert(
          'Error de conexión',
          'No se pudo establecer la videollamada: ' + error.message,
          [{ text: 'Volver', onPress: () => navigation.goBack() }]
        );
      }
    };
    
    initialize();
    
    // Manejar botón de retroceso
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Finalizar videollamada',
        '¿Estás seguro que deseas finalizar la videollamada?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Finalizar', style: 'destructive', onPress: endCall }
        ]
      );
      return true;
    });
    
    // Limpiar recursos al desmontar
    return () => {
      console.log("Desmontando VideollamadaScreen...");
      backHandler.remove();
      
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      
      // Remover listeners
      SocketService.off('offer');
      SocketService.off('answer');
      SocketService.off('ice-candidate');
      SocketService.off('call-ended');
      
      // No limpiar WebRTC aquí para evitar problemas en la navegación
    };
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Stream remoto (pantalla completa) */}
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteStream}
          objectFit="cover"
          mirror={false}
          zOrder={0} // Asegura que esté en la capa inferior
          // Importante: Añadir key para forzar re-renderizado cuando cambia el stream
          key={`remote-stream-${remoteStream.id}`}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {callStatus === 'connecting' 
              ? `Conectando con ${asistenteName || 'el asistente'}...` 
              : callStatus === 'ended'
                ? 'Llamada finalizada'
                : 'Esperando video remoto...'}
          </Text>
        </View>
      )}
      
      {/* Stream local (miniatura) */}
      {localStream && (
        <View style={styles.localStreamContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localStream}
            objectFit="cover"
            mirror={true}
            zOrder={1} // Asegura que esté en la capa superior
            key={`local-stream-${localStream.id}`}
          />
        </View>
      )}
      
      {/* Información de la llamada */}
      <View style={styles.callInfoContainer}>
        <Text style={styles.callInfoText}>
          {callStatus === 'connected' 
            ? `Duración: ${formatCallDuration(callDuration)}` 
            : callStatus === 'connecting' 
              ? 'Conectando...' 
              : 'Llamada finalizada'}
        </Text>
        <Text style={styles.participantName}>
          {asistenteName || 'Asistente'}
        </Text>
      </View>
      
      {/* Controles de la llamada */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
          <MaterialIcons 
            name={isMuted ? 'mic-off' : 'mic'} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.controlText}>
            {isMuted ? 'Activar' : 'Silenciar'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
          <MaterialIcons 
            name={isCameraOff ? 'videocam-off' : 'videocam'} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.controlText}>
            {isCameraOff ? 'Activar' : 'Apagar'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
          <MaterialIcons name="flip-camera-ios" size={24} color="#fff" />
          <Text style={styles.controlText}>Cambiar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleSpeaker}>
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
      
      {/* Botón de finalizar llamada */}
      <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
        <MaterialIcons name="call-end" size={36} color="#fff" />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
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
  },
  controlText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12,
  },
  endCallButton: {
    position: 'absolute',
    bottom: 30,
    left: width / 2 - 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VideollamadaScreen;