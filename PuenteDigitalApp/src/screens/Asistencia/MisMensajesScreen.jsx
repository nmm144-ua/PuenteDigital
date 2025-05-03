import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsistenciaService from '../../services/AsistenciaService';
import ChatService from '../../services/ChatService';

const MisMensajesScreen = ({ navigation }) => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar las solicitudes de chat del usuario
  const loadSolicitudesChat = async () => {
    try {
      setIsLoading(true);
      
      // Obtener todas las solicitudes
      const data = await AsistenciaService.obtenerMisSolicitudes();
      
      // Filtrar solo las de tipo chat
      const chatSolicitudes = data.filter(solicitud => solicitud.tipo_asistencia === 'chat');
      
      // Ordenar por fecha (más reciente primero)
      const sortedData = chatSolicitudes.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setSolicitudes(sortedData);
    } catch (error) {
      console.error('Error al cargar solicitudes de chat:', error);
      Alert.alert('Error', 'No se pudieron cargar tus mensajes');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadSolicitudesChat();
  };

  // Obtener el texto de estado de la solicitud
  const getEstadoText = (estado) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_proceso': return 'En proceso';
      case 'finalizada': return 'Finalizada';
      case 'cancelada': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  // Obtener color según estado
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return '#FFC107';
      case 'en_proceso': return '#007BFF';
      case 'finalizada': return '#28A745';
      case 'cancelada': return '#DC3545';
      default: return '#6C757D';
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  // Ir al chat de una solicitud
  const irAlChat = (solicitud) => {
    // Si la solicitud está en proceso o finalizada, navegar directamente al chat
    if (solicitud.estado === 'en_proceso' || solicitud.estado === 'finalizada') {
      navigation.navigate('Chat', {
        solicitudId: solicitud.id,
        roomId: solicitud.room_id
      });
    } else if (solicitud.estado === 'pendiente') {
      // Si está pendiente, navegar a la pantalla de espera
      navigation.navigate('EsperaAsistencia', {
        solicitudId: solicitud.id,
        roomId: solicitud.room_id
      });
    } else {
      // Si está cancelada, mostrar mensaje
      Alert.alert(
        'Solicitud cancelada',
        'Esta solicitud ha sido cancelada. ¿Deseas crear una nueva solicitud?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Sí, crear nueva', 
            onPress: () => navigation.navigate('Asistencia')
          }
        ]
      );
    }
  };

  // Renderizar un ítem de la lista
  const renderSolicitudItem = ({ item }) => {
    // Obtener último mensaje (esto es opcional, si tienes la funcionalidad)
    // const ultimoMensaje = item.ultimo_mensaje || 'No hay mensajes';
    
    return (
      <TouchableOpacity 
        style={styles.solicitudItem}
        onPress={() => irAlChat(item)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.tipoContainer}>
            <MaterialIcons 
              name="chat" 
              size={22} 
              color="#007BFF" 
            />
            <Text style={styles.tipoText}>Chat</Text>
          </View>
          
          <View style={[
            styles.estadoContainer, 
            { backgroundColor: getEstadoColor(item.estado) + '20' } // añadir transparencia
          ]}>
            <View 
              style={[
                styles.estadoDot, 
                { backgroundColor: getEstadoColor(item.estado) }
              ]} 
            />
            <Text 
              style={[
                styles.estadoText, 
                { color: getEstadoColor(item.estado) }
              ]}
            >
              {getEstadoText(item.estado)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.descripcion} numberOfLines={2}>
          {item.descripcion}
        </Text>
        
        {/* Aquí podrías mostrar el último mensaje si lo tuvieras */}
        {/* <Text style={styles.ultimoMensaje} numberOfLines={1}>
          {ultimoMensaje}
        </Text> */}
        
        <View style={styles.itemFooter}>
          <Text style={styles.fechaText}>
            {formatDate(item.created_at)}
          </Text>
          
          {item.asistente ? (
            <Text style={styles.asistenteText}>
              Asistente: {item.asistente.nombre}
            </Text>
          ) : (
            <Text style={styles.sinAsistenteText}>
              Sin asistente asignado
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    // Cargar solicitudes al montar
    loadSolicitudesChat();
    
    // Actualizar cuando la pantalla obtenga el foco
    const unsubscribe = navigation.addListener('focus', () => {
      loadSolicitudesChat();
    });
    
    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Mis mensajes</Text>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('Asistencia')}
        >
          <MaterialIcons name="add" size={24} color="#007BFF" />
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Cargando conversaciones...</Text>
        </View>
      ) : (
        <FlatList
          data={solicitudes}
          renderItem={renderSolicitudItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#007BFF"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat" size={60} color="#e0e0e0" />
              <Text style={styles.emptyText}>No tienes conversaciones</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('Asistencia')}
              >
                <Text style={styles.createButtonText}>Iniciar chat</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 25, // Aumentamos el padding superior
    marginTop: 10, // Añadimos margen superior
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
  },
  createButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  solicitudItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipoText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#007BFF',
    fontWeight: '500',
  },
  estadoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  estadoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  descripcion: {
    fontSize: 15,
    color: '#333',
    marginBottom: 10,
  },
  // Estilo para el último mensaje (opcional)
  ultimoMensaje: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  fechaText: {
    fontSize: 12,
    color: '#6C757D',
  },
  asistenteText: {
    fontSize: 12,
    color: '#28A745',
    fontWeight: '500',
  },
  sinAsistenteText: {
    fontSize: 12,
    color: '#6C757D',
    fontStyle: 'italic',
  }
});

export default MisMensajesScreen;