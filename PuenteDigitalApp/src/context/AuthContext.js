import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../../supabase';
import { authService } from '../services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    handleAnonymousAccess: authService.registerAnonymousUser,
    login: authService.loginUser,
    register: authService.registerUser,
    logout: authService.logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


/*

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from './path/to/AuthContext';

// Importación de pantallas
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import InicioScreen from '../screens/InicioScreen';
import OpcionesInicioScreen from '../screens/OpcionesInicioScreen';
import NoDisponibleScreen from '../screens/NoDisponibleScreen';
import LoadingScreen from '../screens/LoadingScreen'; // Crear esta pantalla para estados de carga

const Stack = createStackNavigator();

// Navegación para usuarios no autenticados
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
    </Stack.Navigator>
  );
};

// Navegación para usuarios autenticados
const AppNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Inicio"
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name="Inicio" component={InicioScreen} />
      <Stack.Screen name="OpcionesInicio" component={OpcionesInicioScreen} />
      <Stack.Screen name="Asistencia" component={NoDisponibleScreen} />
      <Stack.Screen name="Tutoriales" component={NoDisponibleScreen} />
      <Stack.Screen name="Mensajes" component={NoDisponibleScreen} />
    </Stack.Navigator>
  );
};

// Navegador principal que controla el acceso según el estado de autenticación
const RootNavigator = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;


*/