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

const EsperaAsistenciaScreen = ({ route, navigation }) => {
  const { solicitudId, roomId } = route.params;
  const { user } = useAuth();
  const [waitTime, setWaitTime] = useState(0);
  const [solicitud, setSolicitud] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const timerRef = useRef(null);
  const socketConnectedRef = useRef(false);
  
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
              // Primero abandonar la sala de socket.io
              if (socketConnectedRef.current && roomId) {
                SocketService.leaveRoom(roomId);
              }
              
              // Luego actualizar la solicitud en la base de datos
              await AsistenciaService.cancelarSolicitud(solicitudId);
              
              // Finalmente navegar de vuelta
              navigation.navigate('OpcionesInicio');
            } catch (error) {
              console.error('Error al cancelar solicitud:', error);
              Alert.alert('Error', 'No se pudo cancelar la solicitud');
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
      
      // Si la solicitud ya está en proceso o completada, determinar a qué pantalla navegar
      if (data.estado === 'en_proceso' && data.asistente_id) {
        // Verificar el tipo de asistencia
        if (data.tipo_asistencia === 'chat') {
          // Si es de tipo chat, navegar al chat
          navigation.replace('Chat', { 
            solicitudId: data.id,
            roomId: data.room_id
          });
        } else {
          // Si es videollamada o no especifica, mantener el comportamiento original
          navigation.replace('Videollamada', { 
            solicitudId: data.id,
            roomId: data.room_id,
            asistenteId: data.asistente_id,
            asistenteName: data.asistente?.nombre || 'Asistente'
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar solicitud:', error);
    }
  };
  
  // Inicializar la conexión al socket
  const inicializarSocket = async () => {
    if (!socketConnectedRef.current) {
      try {
        // Obtener información del usuario
        const userData = await AsistenciaService.obtenerUsuarioActual();
        const userId = userData?.id || user?.id || 'anonymous';
        const userName = userData?.nombre || user?.nombre || 'Usuario';
        
        // Conectar al servidor de sockets
        await SocketService.connect();
        
        // Unirse a la sala
        SocketService.joinRoom(roomId, userId, userName);
        
        // Escuchar la llamada entrante o asignación de chat
        SocketService.onCallRequested((data) => {
          // Recargar la solicitud para obtener el tipo actualizado
          cargarSolicitud();
        });
        
        socketConnectedRef.current = true;
        setIsConnecting(false);
      } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        Alert.alert(
          'Error de conexión',
          'No se pudo establecer conexión con el servidor. Inténtalo de nuevo.',
          [
            { 
              text: 'Reintentar', 
              onPress: () => inicializarSocket() 
            },
            { 
              text: 'Cancelar', 
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
      }
    }
  };
  
  useEffect(() => {
    // Inicializar la conexión con el servidor
    inicializarSocket();
    
    // Cargar la información de la solicitud
    cargarSolicitud();
    
    // Iniciar temporizador para mostrar tiempo de espera
    timerRef.current = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);
    
    // Consultar cada 10 segundos si la solicitud fue aceptada
    const checkInterval = setInterval(() => {
      cargarSolicitud();
    }, 10000);
    
    // Prevenir navegación hacia atrás sin cancelar la solicitud
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      cancelarSolicitud();
      return true;
    });
    
    return () => {
      clearInterval(timerRef.current);
      clearInterval(checkInterval);
      backHandler.remove();
      
      // Desconectar del socket si navegamos fuera sin aceptar
      if (socketConnectedRef.current && roomId) {
        SocketService.leaveRoom(roomId);
      }
    };
  }, []);
  
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Esperando asistente</Text>
        
        <ActivityIndicator size="large" color="#007BFF" style={styles.spinner} />
        
        <Text style={styles.waitTimeText}>
          Tiempo de espera: {formatTime(waitTime)}
        </Text>
        
        <Text style={styles.cardText}>
          Estamos buscando un asistente disponible para ayudarte. En cuanto alguien acepte tu solicitud, 
          comenzará la asistencia automáticamente.
        </Text>
        
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
    borderRadius: 10,
    padding: 20,
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
    borderRadius: 5,
    width: '80%',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default EsperaAsistenciaScreen;