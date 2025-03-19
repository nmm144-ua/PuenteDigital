import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  BackHandler
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import AsistenciaService from '../../services/AsistenciaService';
import SocketService from '../../services/socketService';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const EsperaAsistenciaScreen = ({ route, navigation }) => {
  const { solicitudId, roomId, tipoAsistencia = 'video' } = route.params;
  const { user } = useAuth();
  const [waitTime, setWaitTime] = useState(0);
  const [solicitud, setSolicitud] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [asistenteName, setAsistenteName] = useState(null);
  
  const timerRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const socketInitializedRef = useRef(false);
  
  // Formatear el tiempo de espera (minutos:segundos)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Cancelar la solicitud
  const cancelarSolicitud = async () => {
    Alert.alert(
      'Cancelar solicitud',
      '¿Estás seguro que deseas cancelar tu solicitud de asistencia?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Primero abandonar la sala de socket.io si estamos conectados
              if (socketInitializedRef.current && roomId) {
                SocketService.leaveRoom();
              }
              
              // Luego actualizar la solicitud en la base de datos
              await AsistenciaService.cancelarSolicitud(solicitudId);
              
              // Finalmente navegar de vuelta
              navigation.navigate('OpcionesInicio');
            } catch (error) {
              console.error('Error al cancelar solicitud:', error);
              Alert.alert('Error', 'No se pudo cancelar la solicitud');
              navigation.navigate('OpcionesInicio');
            }
          }
        }
      ]
    );
  };
  
  // Cargar información de la solicitud
  const cargarSolicitud = async () => {
    try {
      const data = await AsistenciaService.obtenerSolicitud(solicitudId);
      setSolicitud(data);
      
      // Si la solicitud ya está en proceso o asignada, procesar
      if (data.estado === 'en_proceso' && data.asistente_id) {
        const nombreAsistente = data.asistente?.nombre || 'Asistente';
        setAsistenteName(nombreAsistente);
      }
      
      return data;
    } catch (error) {
      console.error('Error al cargar solicitud:', error);
      return null;
    }
  };
  
  // Manejar evento de sala aceptada por el asistente
  const handleRoomAccepted = (data) => {
    console.log('Sala aceptada por asistente:', data);
    
    // Verificar que sea para esta sala
    if (data.roomId === roomId) {
      // Guardar información del asistente
      setAsistenteName(data.asistenteName || 'Asistente');
      
      // Navegar a la pantalla correspondiente
      if (tipoAsistencia === 'chat') {
        navigation.replace('Chat', { 
          solicitudId,
          roomId,
          asistenteId: data.asistenteId,
          asistenteName: data.asistenteName || 'Asistente'
        });
      } else {
        // Para videollamada, vamos a la pantalla de videollamada
        // pero NO iniciamos la llamada, solo esperamos pasivamente
        navigation.replace('Videollamada', { 
          solicitudId,
          roomId,
          asistenteId: data.asistenteId,
          asistenteName: data.asistenteName || 'Asistente'
        });
      }
    }
  };
  
  // Inicializar la conexión socket
  const inicializarSocket = async () => {
    if (socketInitializedRef.current) return;
    
    try {
      // Conectar al servidor de sockets si no estamos conectados
      if (!SocketService.isConnected) {
        await SocketService.connect();
      }
      
      // Unirse a la sala de espera
      const userId = user?.id || 'anonymous';
      const userName = user?.nombre || 'Usuario';
      
      await SocketService.joinRoom(roomId, userId, userName);
      
      // Configurar evento para cuando un asistente acepta la solicitud
      SocketService.onRoomAccepted(handleRoomAccepted);
      
      socketInitializedRef.current = true;
      setIsConnecting(false);
    } catch (error) {
      console.error('Error al inicializar Socket.IO:', error);
      setIsConnecting(false);
    }
  };
  
  // Iniciar la aplicación
  const iniciar = async () => {
    // Cargar la información de la solicitud
    const solicitudData = await cargarSolicitud();
    
    // Si la solicitud ya está en proceso, mostrar notificación y redirigir
    if (solicitudData && solicitudData.estado === 'en_proceso' && solicitudData.asistente_id) {
      // Mostrar notificación
      const nombreAsistente = solicitudData.asistente?.nombre || 'Un asistente';
      Alert.alert(
        'Solicitud aceptada',
        `${nombreAsistente} ya ha aceptado tu solicitud.`,
        [{ text: 'Continuar' }]
      );
      
      // Redirigir a la pantalla correspondiente
      if (tipoAsistencia === 'chat') {
        navigation.replace('Chat', { 
          solicitudId: solicitudData.id,
          roomId: solicitudData.room_id,
          asistenteId: solicitudData.asistente_id,
          asistenteName: nombreAsistente
        });
      } else {
        navigation.replace('Videollamada', { 
          solicitudId: solicitudData.id,
          roomId: solicitudData.room_id,
          asistenteId: solicitudData.asistente_id,
          asistenteName: nombreAsistente
        });
      }
      return;
    }
    
    // Inicializar la conexión socket
    await inicializarSocket();
  };
  
  useEffect(() => {
    // Iniciar la aplicación
    iniciar();
    
    // Iniciar temporizador para mostrar tiempo de espera
    timerRef.current = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);
    
    // Consultar periódicamente si la solicitud fue aceptada
    checkIntervalRef.current = setInterval(() => {
      cargarSolicitud();
    }, 5000);
    
    // Prevenir navegación hacia atrás sin cancelar la solicitud
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      cancelarSolicitud();
      return true;
    });
    
    return () => {
      // Limpiar temporizadores
      if (timerRef.current) clearInterval(timerRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      
      // Remover handler de navegación
      backHandler.remove();
      
      // Remover listener de socket
      SocketService.offRoomAccepted(handleRoomAccepted);
      
      // No desconectar del socket, solo abandonar la sala si estamos en ella
      if (socketInitializedRef.current && roomId && SocketService.currentRoom === roomId) {
        SocketService.leaveRoom();
      }
    };
  }, []);
  
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Esperando asistente
        </Text>
        
        <View style={styles.iconContainer}>
          {tipoAsistencia === 'chat' ? (
            <MaterialIcons name="chat" size={60} color="#007BFF" />
          ) : (
            <MaterialIcons name="videocam" size={60} color="#007BFF" />
          )}
        </View>
        
        <ActivityIndicator size="large" color="#007BFF" style={styles.spinner} />
        
        <Text style={styles.waitTimeText}>
          Tiempo de espera: {formatTime(waitTime)}
        </Text>
        
        <Text style={styles.cardText}>
          Estamos buscando un asistente disponible para ayudarte con tu 
          {tipoAsistencia === 'chat' ? ' chat' : 'a videollamada'}.
          {asistenteName ? (
            ` ${asistenteName} te atenderá pronto.`
          ) : (
            ` En cuanto alguien acepte tu solicitud serás notificado.`
          )}
        </Text>
        
        <View style={styles.infoContainer}>
          <MaterialIcons name="info-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            {tipoAsistencia === 'chat' 
              ? 'El asistente podrá ver tu descripción del problema y te ayudará a resolverlo mediante mensajes de texto.'
              : 'El asistente podrá ver tu descripción del problema y te ayudará a resolverlo mediante una videollamada.'}
          </Text>
        </View>
        
        {isConnecting && (
          <Text style={styles.connectingText}>
            Conectando con el servidor...
          </Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={cancelarSolicitud}
      >
        <MaterialIcons name="cancel" size={18} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.cancelButtonText}>Cancelar solicitud</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 24,
    color: '#007BFF',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 20,
  },
  spinner: {
    marginVertical: 20,
  },
  waitTimeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#007BFF',
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  connectingText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 15,
    fontStyle: 'italic',
  },
  cancelButton: {
    marginTop: 30,
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default EsperaAsistenciaScreen;