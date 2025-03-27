import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import AsistenciaService from '../../services/AsistenciaService';
import ChatService from '../../services/ChatService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AsistenciaScreen = ({ navigation }) => {
  const [descripcion, setDescripcion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isServiceInitialized, setIsServiceInitialized] = useState(false);

  // Inicializar los servicios cuando se carga la pantalla
  useEffect(() => {
    const initServices = async () => {
      try {
        // Obtener datos de usuario desde AsyncStorage
        const userDataString = await AsyncStorage.getItem('userData');
        if (!userDataString) {
          console.warn('No hay datos de usuario en AsyncStorage');
          return;
        }

        const userData = JSON.parse(userDataString);
        console.log('Datos de usuario cargados:', userData);

        // Inicializar ChatService con los datos de usuario
        await ChatService.init();
        setIsServiceInitialized(true);
      } catch (error) {
        console.error('Error al inicializar servicios:', error);
        Alert.alert(
          'Error',
          'No se pudieron inicializar los servicios. Por favor, reinicia la aplicación.'
        );
      }
    };

    initServices();
  }, []);

  // Solicitar asistencia por chat de texto
  const solicitarAsistenciaTexto = async () => {
    if (!descripcion.trim()) {
      Alert.alert('Error', 'Por favor, describe brevemente el problema');
      return;
    }

    // Verificar que se hayan inicializado los servicios
    if (!isServiceInitialized) {
      try {
        // Intentar inicializar de nuevo si es necesario
        await initializeServices();
      } catch (error) {
        Alert.alert('Error', 'No se pudieron inicializar los servicios necesarios');
        return;
      }
    }

    setIsLoading(true);
    try {
      // Verificar que tengamos datos de usuario
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) {
        throw new Error('No hay datos de usuario para crear solicitud');
      }

      const userData = JSON.parse(userDataString);
      console.log('Creando solicitud con datos de usuario:', userData);


      const solicitudesActivas = await AsistenciaService.verificarSolicitudPendiente();
      if (solicitudesActivas) {
        // Usar la solicitud existente en lugar de crear una nueva
        navigation.navigate('Chat', { 
          solicitudId: solicitudesActivas.id,
          roomId: solicitudesActivas.room_id 
        });
        return;
      }


      // Crear la solicitud en la base de datos
      const solicitud = await ChatService.createChatRequest(descripcion);
      
      if (solicitud && solicitud.id) {
        // Navegar directamente a la pantalla de chat
        navigation.navigate('Chat', { 
          solicitudId: solicitud.id,
          roomId: solicitud.room_id
        });
      } else {
        throw new Error('No se pudo crear la solicitud de chat');
      }
    } catch (error) {
      console.error('Error al solicitar asistencia por chat:', error);
      Alert.alert('Error', 'No se pudo procesar tu solicitud de chat. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función auxiliar para inicializar servicios
  const initializeServices = async () => {
    const userDataString = await AsyncStorage.getItem('userData');
    if (!userDataString) {
      throw new Error('No hay datos de usuario');
    }

    const userData = JSON.parse(userDataString);
    await ChatService.init();
    setIsServiceInitialized(true);
    return true;
  };

  // Solicitar asistencia por videollamada
  const solicitarAsistenciaVideo = async () => {
    if (!descripcion.trim()) {
      Alert.alert('Error', 'Por favor, describe brevemente el problema');
      return;
    }

    setIsLoading(true);
    try {
      // Inicializar AsistenciaService si es necesario
      if (!AsistenciaService.userId) {
        await AsistenciaService.init();
      }
      
      // Crear la solicitud en la base de datos
      const solicitud = await AsistenciaService.crearSolicitud(descripcion);
      
      if (solicitud && solicitud.id) {
        // Navegar a la pantalla de espera
        navigation.navigate('EsperaAsistencia', { 
          solicitudId: solicitud.id,
          roomId: solicitud.room_id
        });
      } else {
        throw new Error('No se pudo crear la solicitud');
      }
    } catch (error) {
      console.error('Error al solicitar asistencia:', error);
      Alert.alert('Error', 'No se pudo procesar tu solicitud. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Solicitar Asistencia</Text>
        <Text style={styles.cardText}>
          Describe brevemente el problema o consulta que deseas resolver:
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Ej: Necesito ayuda para configurar mi correo electrónico"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={4}
        />
      </View>

      <Text style={styles.subtitle}>¿Cómo prefieres recibir asistencia?</Text>

      <TouchableOpacity 
        style={styles.button}
        onPress={solicitarAsistenciaTexto}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Asistencia por chat de texto</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]}
        onPress={solicitarAsistenciaVideo}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Asistencia por videollamada</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.goBack()}
        disabled={isLoading}
      >
        <Text style={styles.linkText}>Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#0056b3',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    color: '#007BFF',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
    width: '80%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007BFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  linkButton: {
    marginTop: 20,
    padding: 10,
  },
  linkText: {
    color: '#007BFF',
    fontSize: 16,
  },
});

export default AsistenciaScreen;