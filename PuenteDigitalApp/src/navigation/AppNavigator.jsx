import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Importar pantallas
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import InicioScreen from '../screens/InicioScreen';
import OpcionesInicioScreen from '../screens/OpcionesInicioScreen';
import NoDisponibleScreen from '../screens/NoDisponibleScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// Nuevas pantallas de videollamada con Agora
import VideoCallScreen from '../screens/Asistencia/VideoCallScreen';
import IncomingCallHandler from '../components/VideoCall/IncomingCallHandler';
import socketService from '../services/socket.service';

const Stack = createStackNavigator();

// Navegador para usuarios no autenticados
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: 'Recuperar contraseña' }}
      />
    </Stack.Navigator>
  );
};

// Navegador para usuarios autenticados
const MainNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Inicio"
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name="Inicio" component={InicioScreen} />
      <Stack.Screen name="OpcionesInicio" component={OpcionesInicioScreen} />
      <Stack.Screen name="Asistencia" component={AsistenciaScreen} />
      <Stack.Screen name="Tutoriales" component={NoDisponibleScreen} />
      <Stack.Screen name="Mensajes" component={NoDisponibleScreen} />
      
      {/* Pantallas existentes de videollamada */}
      <Stack.Screen
        name="WaitingRoom"
        component={WaitingRoomScreen}
        options={{
          gestureEnabled: false
        }}
      />
      <Stack.Screen
        name="Call"
        component={CallScreen}
        options={{
          headerShown: false,
          gestureEnabled: false
        }}
      />
      
      {/* Nueva pantalla de videollamada con Agora */}
      <Stack.Screen
        name="VideoCallScreen"
        component={VideoCallScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          presentation: 'fullScreenModal'
        }}
      />
    </Stack.Navigator>
  );
};

// Pantalla de carga mientras se verifica la autenticación
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#007BFF" />
  </View>
);

// Navegador principal que controla qué stack mostrar basado en el estado de autenticación
const AppNavigator = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Inicializar el servicio de socket si el usuario está autenticado
    const initializeSocketService = async () => {
      if (user) {
        try {
          await socketService.initialize(
            user.uid || user.id, // ID del usuario (ajusta según tu modelo de datos)
            user.displayName || user.nombre || 'Usuario' // Nombre del usuario
          );
          console.log('Servicio de socket inicializado');
        } catch (error) {
          console.error('Error inicializando socket:', error);
        }
      }
    };

    initializeSocketService();

    // Limpieza al cerrar la app
    return () => {
      if (user) {
        socketService.disconnect();
      }
    };
  }, [user]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? (
        <>
          <IncomingCallHandler />
          <MainNavigator />
        </>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;