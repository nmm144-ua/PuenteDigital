import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import InicioScreen from '../screens/InicioScreen';
import OpcionesInicioScreen from '../screens/OpcionesInicioScreen';
import NoDisponibleScreen from '../screens/NoDisponibleScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
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
      <Stack.Screen name="Inicio" component={InicioScreen} />
      <Stack.Screen name="OpcionesInicio" component={OpcionesInicioScreen} />
      
      <Stack.Screen name="Asistencia" component={NoDisponibleScreen} />
      <Stack.Screen name="Tutoriales" component={NoDisponibleScreen} />
      <Stack.Screen name="Mensajes" component={NoDisponibleScreen} />

      <Stack.Screen 
        name="ResetPassword" 
        component={ResetPasswordScreen} 
        options={{ title: 'Recuperar contraseña' }}
      />

    </Stack.Navigator>
  );
};

export default AppNavigator;