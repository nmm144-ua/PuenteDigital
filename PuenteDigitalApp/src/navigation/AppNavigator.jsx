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

// Pantallas de asistencia
import AsistenciaScreen from '../screens/Asistencia/AsistenciaScreen';
import EsperaAsistenciaScreen from '../screens/Asistencia/EsperaAsistenciaScreen';
import VideollamadaScreen from '../screens/Asistencia/VideollamadaScreen';
import ChatScreen from '../screens/Asistencia/ChatScreen'; 
import MisSolicitudesScreen from '../screens/Asistencia/MisSolicitudesScreen';

// Pantallas de tutoriales
import TutorialesScreen from '../screens/Tutoriales/TutorialesScreen';
import DetalleTutorialScreen from '../screens/Tutoriales/DetalleTutorialScreen';

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
     {/* Pantallas de tutoriales */}
     <Stack.Screen name="Tutoriales" component={TutorialesScreen} />
      <Stack.Screen name="DetalleTutorial" component={DetalleTutorialScreen} />

      
      <Stack.Screen name="Mensajes" component={NoDisponibleScreen} />
      
      {/* Pantallas de asistencia */}
      <Stack.Screen name="Asistencia" component={AsistenciaScreen} />
      <Stack.Screen name="MisSolicitudes" component={MisSolicitudesScreen} />
      <Stack.Screen name="EsperaAsistencia" component={EsperaAsistenciaScreen} />
      <Stack.Screen 
        name="Videollamada" 
        component={VideollamadaScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          animationEnabled: false,
          presentation: "card"
        }}
      />
      
      {/* Pantalla de chat */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: false,
          gestureEnabled: true
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;