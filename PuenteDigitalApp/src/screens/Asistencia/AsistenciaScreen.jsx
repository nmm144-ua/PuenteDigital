import React, { useState } from 'react';
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

const AsistenciaScreen = ({ navigation }) => {
  const [descripcion, setDescripcion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Solicitar asistencia por chat de texto
  const solicitarAsistenciaTexto = async () => {
    if (!descripcion.trim()) {
      Alert.alert('Error', 'Por favor, describe brevemente el problema');
      return;
    }

    setIsLoading(true);
    try {
      // Crear la solicitud en la base de datos, especificando tipo_asistencia como 'chat'
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

  // Solicitar asistencia por videollamada
  const solicitarAsistenciaVideo = async () => {
    if (!descripcion.trim()) {
      Alert.alert('Error', 'Por favor, describe brevemente el problema');
      return;
    }

    setIsLoading(true);
    try {
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