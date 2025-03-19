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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsistenciaService from '../../services/AsistenciaService';

const AsistenciaScreen = ({ navigation }) => {
  const [descripcion, setDescripcion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tipoAsistencia, setTipoAsistencia] = useState(null); // 'chat' o 'video'

  // Solicitar asistencia por chat de texto
  const solicitarAsistenciaTexto = async () => {
    setTipoAsistencia('chat');
    if (!descripcion.trim()) {
      Alert.alert('Error', 'Por favor, describe brevemente el problema');
      return;
    }

    solicitarAsistencia('chat');
  };

  // Solicitar asistencia por videollamada
  const solicitarAsistenciaVideo = async () => {
    setTipoAsistencia('video');
    if (!descripcion.trim()) {
      Alert.alert('Error', 'Por favor, describe brevemente el problema');
      return;
    }

    solicitarAsistencia('video');
  };

  // Función común para solicitar asistencia
  const solicitarAsistencia = async (tipo) => {
    setIsLoading(true);
    try {
      // Crear la solicitud en la base de datos
      const solicitud = await AsistenciaService.crearSolicitud(descripcion, tipo);
      
      if (solicitud && solicitud.id) {
        // Navegar a la pantalla de espera
        navigation.navigate('EsperaAsistencia', { 
          solicitudId: solicitud.id,
          roomId: solicitud.room_id,
          tipoAsistencia: tipo
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
        style={[
          styles.button, 
          styles.chatButton,
          tipoAsistencia === 'chat' && styles.selectedButton
        ]}
        onPress={solicitarAsistenciaTexto}
        disabled={isLoading}
      >
        <View style={styles.buttonContent}>
          <MaterialIcons name="chat" size={24} color="#fff" />
          <Text style={styles.buttonText}>Asistencia por chat de texto</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[
          styles.button, 
          styles.videoButton,
          tipoAsistencia === 'video' && styles.selectedButton
        ]}
        onPress={solicitarAsistenciaVideo}
        disabled={isLoading}
      >
        <View style={styles.buttonContent}>
          {isLoading && tipoAsistencia === 'video' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialIcons name="videocam" size={24} color="#fff" />
          )}
          <Text style={styles.buttonText}>Asistencia por videollamada</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <MaterialIcons name="info-outline" size={20} color="#666" />
        <Text style={styles.infoText}>
          El chat de texto te permite comunicarte con un asistente a través de mensajes escritos.
          La videollamada te permite una comunicación con video y audio en tiempo real.
        </Text>
      </View>

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
    backgroundColor: '#F5F7FB',
  },
  subtitle: {
    fontSize: 18,
    color: '#0056b3',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    fontWeight: '600',
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
    backgroundColor: '#fff',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    backgroundColor: '#5C6BC0', // Azul índigo
  },
  videoButton: {
    backgroundColor: '#007BFF', // Azul primario
    marginTop: 15,
  },
  selectedButton: {
    backgroundColor: '#28a745', // Verde para mostrar selección
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007BFF',
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
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