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
          
          // Obtener información del dispositivo
          const deviceId = await getDeviceId();
          
          // Crear datos de usuario anónimo
          const anonUserData = {
            id: null,                   // No hay ID de auth
            userDbId: null,             // Se asignará cuando sea necesario
            id_dispositivo: deviceId,   // ID del dispositivo para identificar
            nombre: 'Usuario',          // Nombre predeterminado
            tipo_usuario: 'anonimo',    // Tipo de usuario
            isAnonymous: true,          // Flag para indicar anónimo
            isAsistente: false,         // No es asistente
            userRole: 'usuario'         // Rol
          };
          
          // Guardar datos de usuario anónimo
          await AsyncStorage.setItem('userData', JSON.stringify(anonUserData));
          console.log('Datos de usuario anónimo creados:', anonUserData);
          
          // Inicializar ChatService con datos anónimos
          await ChatService.init();
          setIsServiceInitialized(true);
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
    const getDeviceId = async () => {
      try {
        // Intentar obtener el ID existente primero
        const deviceInfo = await AsyncStorage.getItem('device_info');
        if (deviceInfo) {
          const info = JSON.parse(deviceInfo);
          return info.deviceId;
        }
        
        // Si no existe, crear un nuevo ID único
        const deviceId = `android-${Platform.OS}-${Date.now()}`;
        
        // Guardar para uso futuro
        await AsyncStorage.setItem('device_info', JSON.stringify({ 
          deviceId, 
          created: new Date().toISOString() 
        }));
        
        return deviceId;
      } catch (error) {
        console.error('Error al obtener ID de dispositivo:', error);
        // Generar ID temporal como fallback
        return `fallback-${Platform.OS}-${Date.now()}`;
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
  
      // Verificar si hay solicitudes activas no finalizadas
      console.log('Verificando solicitudes existentes no finalizadas...');
      
      // Inicializar AsistenciaService (aceptará usuarios anónimos después de las modificaciones)
      await AsistenciaService.init();
      
      // Comprobar si hay solicitudes existentes
      const solicitudesActivas = await AsistenciaService.obtenerMisSolicitudes();
      
      // Buscar una solicitud que esté en_proceso o pendiente (no finalizada ni cancelada)
      const solicitudExistente = solicitudesActivas.find(
        s => (s.estado === 'pendiente' || s.estado === 'en_proceso') && s.tipo_asistencia === 'chat'
      );
      
      if (solicitudExistente) {
        console.log('Encontrada solicitud existente no finalizada:', solicitudExistente);
        // Usar la solicitud existente en lugar de crear una nueva
        navigation.navigate('Chat', { 
          solicitudId: solicitudExistente.id,
          roomId: solicitudExistente.room_id 
        });
        return;
      }
  
      console.log('No hay solicitudes existentes, creando una nueva...');
      // Crear la solicitud en la base de datos
      
      // Si estamos usando usuario anónimo, asegurar que se registre correctamente
      if (!userData.userDbId && userData.isAnonymous) {
        // Actualizar el deviceId en AsistenciaService
        AsistenciaService.deviceId = userData.id_dispositivo || await getDeviceId();
      }
      
      // Crear la solicitud (si es anónimo, el servicio intentará crear un usuario)
      const solicitud = await AsistenciaService.crearSolicitud(descripcion, 'chat');
      
      if (solicitud && solicitud.id) {
        // Si era usuario anónimo y se creó un userDbId, guardarlo
        if (userData.isAnonymous && AsistenciaService.userDbId && !userData.userDbId) {
          userData.userDbId = AsistenciaService.userDbId;
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          console.log('Actualizado userDbId para usuario anónimo:', userData);
        }
        
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
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (!userDataString) {
        // Crear datos de usuario anónimo si no existen
        const deviceId = await getDeviceId();
        
        const anonUserData = {
          id: null,
          userDbId: null,
          id_dispositivo: deviceId,
          nombre: 'Usuario',
          tipo_usuario: 'anonimo',
          isAnonymous: true,
          isAsistente: false,
          userRole: 'usuario'
        };
        
        await AsyncStorage.setItem('userData', JSON.stringify(anonUserData));
        console.log('Creados datos para usuario anónimo:', anonUserData);
      }
  
      // Ahora es seguro inicializar los servicios
      await ChatService.init();
      setIsServiceInitialized(true);
      return true;
    } catch (error) {
      console.error('Error en initializeServices:', error);
      throw error;
    }
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
      const solicitud = await AsistenciaService.crearSolicitud(descripcion, 'video');
      
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