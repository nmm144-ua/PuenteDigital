import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { requestDeviceInfoPermissions } from '../utils/PermissionsHandlers';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WelcomeScreen = ({ navigation }) => {
  const { registerAnonymous } = useAuth();
  const [loading, setLoading] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  // Verificamos permisos una sola vez al cargar la pantalla
  useEffect(() => {
    const checkPermission = async () => {
      // Solo verificamos si aún no se ha comprobado
      if (!permissionChecked) {
        const hasPermission = await AsyncStorage.getItem('device_info_permission_granted');
        setPermissionChecked(true);
        // No hacemos nada más aquí, solo marcamos que ya lo verificamos
      }
    };
    
    checkPermission();
  }, [permissionChecked]);

  const handleContinueWithoutAccount = async () => {
    setLoading(true);
    
    try {
      // Solicitamos permisos solo si es necesario
      const permissionsGranted = await requestDeviceInfoPermissions();
      
      if (!permissionsGranted) {
        setLoading(false);
        Alert.alert(
          'Permisos requeridos',
          'Necesitamos permisos de acceso a información básica del dispositivo para continuar.'
        );
        return;
      }
      
      // Una vez concedidos los permisos, procedemos al registro
      const result = await registerAnonymous();
      
      if (result.success) {
        // El cambio de navegación será automático gracias al contexto de autenticación
      } else {
        let errorMessage = 'No se pudo continuar sin cuenta. Por favor, intente nuevamente.';
        
        if (result.error && result.error.message) {
          errorMessage = result.error.message;
        } else if (result.error && typeof result.error === 'string') {
          errorMessage = result.error;
        }
        
        Alert.alert(
          'Error',
          errorMessage,
          [
            { 
              text: 'Reintentar', 
              onPress: () => handleContinueWithoutAccount() 
            },
            { 
              text: 'Cancelar',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Ocurrió un problema al procesar su solicitud.',
        [
          { 
            text: 'Reintentar', 
            onPress: () => handleContinueWithoutAccount() 
          },
          { 
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PuenteDigital</Text>
      <Text style={styles.subtitle}>Bienvenid@</Text>
      <Text style={styles.text}>Pulse una opción de aquí para Comenzar</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.buttonText}>Ya tiene cuenta</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.buttonText}>Crear una cuenta</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleContinueWithoutAccount}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Cargando...' : 'Seguir sin cuenta'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  title: {
    fontSize: 32,
    color: '#007BFF',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 24,
    color: '#0056b3',
    marginTop: 10,
  },
  text: {
    fontSize: 16,
    color: '#007BFF',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    width: '80%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default WelcomeScreen;