// screens/ResetPasswordScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { supabase } from '../../supabase';

const ResetPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Solicitar email para recuperación de contraseña
  const requestPasswordReset = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Por favor, introduce un email válido');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://192.168.1.99:3000/reset-password',
      });
      
      if (error) throw error;
      
      // Mostrar instrucciones claras
      Alert.alert(
        'Correo enviado',
        'Te hemos enviado un correo con un enlace para restablecer tu contraseña.\n\n' + 
        '1. Abre el enlace en tu navegador\n' +
        '2. Sigue las instrucciones para cambiar tu contraseña\n' +
        '3. Vuelve a esta aplicación e inicia sesión con tu nueva contraseña',
        [
          { 
            text: 'Abrir app de correo', 
            onPress: openEmailApp 
          },
          { 
            text: 'Volver al inicio de sesión', 
            onPress: () => navigation.navigate('Login') 
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para intentar abrir la app de correo
  const openEmailApp = async () => {
    try {
      await Linking.openURL('mail:');
    } catch (error) {
      console.log('No se pudo abrir la app de correo');
      Alert.alert(
        'No se pudo abrir el correo',
        'Por favor, abre manualmente tu aplicación de correo para verificar el enlace de recuperación.'
      );
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Recuperar contraseña</Text>
          
          <View style={styles.formContainer}>
            <Text style={styles.infoText}>
              Introduce tu dirección de correo electrónico y te enviaremos un enlace 
              para restablecer tu contraseña.
            </Text>
            
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Introduce tu email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            
            <TouchableOpacity 
              style={[styles.button, loading && styles.disabledButton]}
              onPress={requestPasswordReset}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.secondaryButtonText}>Volver al inicio de sesión</Text>
            </TouchableOpacity>
            
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Proceso de recuperación</Text>
              <Text style={styles.infoText}>
                1. Recibirás un correo con un enlace para restablecer tu contraseña. Pulse en el texto que pone "Mostrar texto citado".
              </Text>
              <Text style={styles.infoText}>
                2. Abre el enlace en el navegador de tu dispositivo
              </Text>
              <Text style={styles.infoText}>
                3. Ingresa y confirma tu nueva contraseña
              </Text>
              <Text style={styles.infoText}>
                4. Una vez cambiada, vuelve a esta app e inicia sesión con la nueva contraseña
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4285f4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#a9c6fa',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
  },
  infoText: {
    marginBottom: 10,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  }
});

export default ResetPasswordScreen;