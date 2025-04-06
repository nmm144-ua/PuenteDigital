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
  const webrtcInitializedRef = useRef(false);
  
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
      
      // Notificar a través del socket que la llamada ha finalizado
      if (SocketService.endCall) {
        console.log(`endCall: Notificando finalización - sala: ${roomId}, asistente: ${asistenteId}`);
        SocketService.endCall(roomId, asistenteId);
      } else {
        console.error("endCall: Método SocketService.endCall no está definido");
      }
      
      // Detener y liberar los streams
      if (localStream) {
        console.log("endCall: Deteniendo streams locales");
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Limpiar el servicio WebRTC
      console.log("endCall: Limpiando WebRTC");
      await WebRTCService.cleanup();
      
      // Actualizar el estado
      console.log("endCall: Actualizando estado a 'ended'");
      setCallStatus('ended');
      
      // Navegar de vuelta a la pantalla anterior
      console.log("endCall: Navegando a pantalla anterior");
      navigation.navigate('OpcionesInicio');
    } catch (error) {
      console.error('Error al finalizar la llamada:', error);
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
      await WebRTCService.switchCamera(localStream);
    } catch (error) {
      console.error('Error al cambiar de cámara:', error);
      Alert.alert('Error', 'No se pudo cambiar la cámara');
    }
  };
  
  // Función para alternar altavoz
  const toggleSpeaker = () => {
    // Esta funcionalidad requiere configuración adicional en Android/iOS
    WebRTCService.toggleSpeaker(!isSpeakerOn);
    setIsSpeakerOn(!isSpeakerOn);
  };
  
  // Función para inicializar WebRTC
  const inicializarWebRTC = async () => {
    try {
      // Verificar permisos de cámara y micrófono
      const permisos = await PermissionsService.requestCallPermissions();
      if (!permisos) {
        Alert.alert(
          'Permisos requeridos',
          'Para realizar videollamadas necesitas conceder permisos de cámara y micrófono.',
          [{ text: 'Entendido', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      // Inicializar el servicio WebRTC
      await WebRTCService.init();
      
      // Obtener el stream local (cámara y micrófono)
      const stream = await WebRTCService.getLocalStream();
      setLocalStream(stream);
      
      // Configurar WebRTC para recibir el stream remoto
      WebRTCService.onRemoteStream((userId, stream) => {
        console.log('Stream remoto recibido de', userId);
        
        if (!stream) {
          console.error('Stream recibido es null o undefined');
          return;
        }
        
        console.log('Stream ID:', stream.id);
        console.log('Audio tracks:', stream.getAudioTracks().length);
        console.log('Video tracks:', stream.getVideoTracks().length);
        
        // Asignar el stream remoto
        setRemoteStream(stream);
        setCallStatus('connected');
        
        // Iniciar temporizador de duración de llamada
        durationTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      });
      
      // Configurar listeners para eventos del socket
      SocketService.onIceCandidate((data) => {
        WebRTCService.addIceCandidate(data.candidate);
      });
      
      SocketService.onOffer(async (data) => {
        await WebRTCService.handleOffer(data.offer);
        const answer = await WebRTCService.createAnswer();
        SocketService.sendAnswer(answer, data.from, user?.id || 'anonymous');
      });
      
      SocketService.onAnswer((data) => {
        WebRTCService.handleAnswer(data.answer);
      });
      
      SocketService.onCallEnded(() => {
        Alert.alert('Llamada finalizada', 'El asistente ha finalizado la llamada');
        endCall();
      });
      
      webrtcInitializedRef.current = true;
    } catch (error) {
      console.error('Error al inicializar WebRTC:', error);
      Alert.alert(
        'Error de conexión',
        'No se pudo establecer la videollamada. Por favor, inténtalo de nuevo.',
        [{ text: 'Volver', onPress: () => navigation.goBack() }]
      );
    }
  };
  
  useEffect(() => {
    // Crear función para inicializar WebRTC
    const inicializarWebRTC = async () => {
      try {
        // Verificar permisos de cámara y micrófono primero
        const permisos = await PermissionsService.requestCallPermissions();
        if (!permisos) {
          Alert.alert(
            'Permisos requeridos',
            'Para realizar videollamadas necesitas conceder permisos de cámara y micrófono.',
            [{ text: 'Entendido', onPress: () => navigation.goBack() }]
          );
          return;
        }
        
        // PASO 1: Inicializar WebRTC
        await WebRTCService.init();
        
        // PASO 2: Configurar IDs explícitamente (ESTO ES CRÍTICO)
        WebRTCService.setUserId(user?.id || 'anonymous');
        WebRTCService.setRemoteUserId(asistenteId);
        
        // PASO 3: Registrar callbacks
        WebRTCService.registerCallbacks({
          onRemoteStream: (userId, stream) => {
            console.log('Stream remoto recibido de', userId);
            
            if (!stream) {
              console.error('Stream recibido es null o undefined');
              return;
            }
            
            console.log('Stream ID:', stream.id);
            console.log('Audio tracks:', stream.getAudioTracks().length);
            console.log('Video tracks:', stream.getVideoTracks().length);
            
            // Asignar el stream remoto
            setRemoteStream(stream);
            setCallStatus('connected');
            
            // Iniciar temporizador de duración de llamada
            if (durationTimerRef.current) {
              clearInterval(durationTimerRef.current);
            }
            
            durationTimerRef.current = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          },
          onRemoteStreamClosed: (userId) => {
            console.log('Stream remoto cerrado para', userId);
            setRemoteStream(null);
            setCallStatus('ended');
            
            if (durationTimerRef.current) {
              clearInterval(durationTimerRef.current);
            }
          },
          onConnectionStateChange: (userId, state) => {
            console.log(`Estado de conexión para ${userId}: ${state}`);
            
            // Si la conexión falla, mostramos una alerta
            if (state === 'failed' || state === 'disconnected') {
              Alert.alert(
                'Problema de conexión',
                'Se ha perdido la conexión con el otro usuario. Intenta nuevamente.',
                [{ text: 'Entendido', onPress: () => navigation.goBack() }]
              );
            }
          },
          onError: (type, error) => {
            console.error(`Error de ${type}:`, error);
            
            // Solo mostrar errores críticos al usuario
            if (type === 'fatal') {
              Alert.alert(
                'Error en la videollamada',
                'Ha ocurrido un error que impide continuar. Intenta nuevamente.',
                [{ text: 'Volver', onPress: () => navigation.goBack() }]
              );
            }
          }
        });
        
        // PASO 4: Obtener stream local
        const stream = await WebRTCService.getLocalStream();
        setLocalStream(stream);
        
        // PASO 5: Configurar los listeners de socket
        setupSocketListeners();
        
        webrtcInitializedRef.current = true;
      } catch (error) {
        console.error('Error al inicializar WebRTC:', error);
        Alert.alert(
          'Error de conexión',
          'No se pudo establecer la videollamada. Por favor, inténtalo de nuevo.',
          [{ text: 'Volver', onPress: () => navigation.goBack() }]
        );
      }
    };
    
    // Configurar listeners de socket
    const setupSocketListeners = () => {
      // IMPORTANTE: Remover listeners previos para evitar duplicados
      SocketService.off('offer');
      SocketService.off('answer');
      SocketService.off('ice-candidate');
      SocketService.off('call-ended');
      
      SocketService.onOffer(async (data) => {
        console.log('Oferta recibida en component:', data.from);
        
        // Verificar que la oferta es para nosotros
        if (data.to && data.to !== user?.id && data.to !== 'anonymous') {
          console.log(`Oferta para ${data.to}, ignorando`);
          return;
        }
        
        try {
          // Importante: Asegurarse de que WebRTC está correctamente inicializado
          if (!webrtcInitializedRef.current) {
            await inicializarWebRTC();
          }
          
          // Manejar la oferta recibida
          const result = await WebRTCService.handleIncomingOffer(data.offer, data.from);
          console.log('Resultado de handleIncomingOffer:', result);
        } catch (error) {
          console.error('Error al manejar oferta:', error);
        }
      });
      
      SocketService.onAnswer(async (data) => {
        console.log('Respuesta recibida de:', data.from);
        
        try {
          // Manejar la respuesta
          await WebRTCService.handleAnswer(data.answer);
        } catch (error) {
          console.error('Error al manejar respuesta:', error);
        }
      });
      
      SocketService.onIceCandidate((data) => {
        console.log('Candidato ICE recibido de:', data.from);
        
        // Añadir candidato ICE
        WebRTCService.addIceCandidate(data.candidate)
          .catch(error => console.error('Error al añadir candidato ICE:', error));
      });
      
      SocketService.onCallEnded(() => {
        Alert.alert('Llamada finalizada', 'El otro usuario ha finalizado la llamada');
        endCall();
      });
    };
    
    // Inicializar WebRTC solo si no se ha hecho ya
    if (!webrtcInitializedRef.current) {
      inicializarWebRTC().catch(error => {
        console.error('Error durante la inicialización:', error);
      });
    }
    
    // Prevenir navegación hacia atrás sin finalizar la llamada
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
    
    // Limpiar al desmontar
    return () => {
      console.log('Desmontando VideollamadaScreen, limpiando recursos...');
      
      // Remover back handler
      backHandler.remove();
      
      // Detener temporizador
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      
      // Remover listeners de socket
      SocketService.off('offer');
      SocketService.off('answer');
      SocketService.off('ice-candidate');
      SocketService.off('call-ended');
      
      // Limpiar WebRTC
      WebRTCService.cleanup().catch(error => {
        console.error('Error al limpiar WebRTC:', error);
      });
    };
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Stream remoto (pantalla completa) */}
      {remoteStream ? (
        <View style={styles.remoteStreamContainer}>
          {typeof remoteStream.toURL === 'function' ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteStream}
              objectFit="cover"
              mirror={false}
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Error: No se puede mostrar el video remoto
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {callStatus === 'connecting' 
              ? `Conectando con ${asistenteName || 'el asistente'}...` 
              : 'Llamada finalizada'}
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