import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../../supabase';
import { authService } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Crear un contexto por defecto con funciones vacías para evitar errores
const AuthContext = createContext({
  user: null,
  loading: false,
  registerAnonymous: () => Promise.resolve({ success: false, error: 'No implementado' }),
  handleAnonymousAccess: () => Promise.resolve({ success: false, error: 'No implementado' }),
  login: () => Promise.resolve({ success: false, error: 'No implementado' }),
  register: () => Promise.resolve({ success: false, error: 'No implementado' }),
  logout: () => Promise.resolve({ success: false, error: 'No implementado' }),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Efecto para verificar la sesión inicial y configurar oyentes
  useEffect(() => {
    checkUser();

    // Suscribirse a cambios en el estado de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Usuario inició sesión o se refrescó el token
        if (session?.user) {
          setUser(session.user);
          updateLastAccess(session.user.id);
          logEvent('session_start', session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        // Usuario cerró sesión
        if (user) {
          logEvent('session_end', user.id);
        }
        setUser(null);
        await AsyncStorage.removeItem('device_info_permission_granted');
      } else if (event === 'USER_UPDATED') {
        // La información del usuario ha sido actualizada
        setUser(session?.user || null);
      }
      
      setLoading(false);
    });

    // Limpiar suscripción al desmontar
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Registro del último acceso para un usuario
  const updateLastAccess = async (userId) => {
    if (!userId) return;
    
    try {
      await supabase
        .from('usuario')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('user_id', userId);

        await supabase
        .from('usuario')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error al actualizar último acceso:', error);
    }
  };

  // Registro básico de eventos de usuario
  const logEvent = async (eventType, userId = null) => {
    try {
      const eventData = {
        user_id: userId,
        tipo_evento: eventType,
        timestamp: new Date().toISOString()
      };
      
      await supabase
        .from('eventos_usuario')
        .insert(eventData);
    } catch (error) {
      console.error('Error al registrar evento:', error);
    }
  };

  // Verificar si hay un usuario actualmente autenticado
  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        updateLastAccess(session.user.id);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error verificando usuario:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Método para registro anónimo
  const registerAnonymous = async () => {
    try {
      setLoading(true);
      logEvent('anonymous_access');
      
      const result = await authService.registerAnonymousUser();
      
      // Si el registro anónimo fue exitoso pero no establecemos un user,
      // podemos crear un usuario temporal (opcional)
      if (result.success && result.data) {
        // NOTA: Este usuario 'semi-autenticado' solo se usa si quieres
        // que los usuarios anónimos tengan acceso a rutas protegidas
        // Si no lo deseas, comenta o elimina estas líneas
        const tempUser = {
          id: result.data.id_dispositivo,
          role: 'anonymous',
          isAnonymous: true
        };
        setUser(tempUser);
        
      }
      
      return result;
    } catch (error) {
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // Método para login
  const login = async (email, password) => {
    try {
      setLoading(true);
      const result = await authService.loginUser(email, password);
      
      // La actualización del usuario será manejada por onAuthStateChange
      // No necesitamos establecer manualmente el usuario aquí
      
      if (result.success) {
        logEvent('login_success');
      } else {
        logEvent('login_failed');
      }
      
      return result;
    } catch (error) {
      logEvent('login_error');
      console.error('Error en login:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // Método para registro
  const register = async (fullName, email, password) => {
    try {
      setLoading(true);
      const result = await authService.registerUser(fullName, email, password);
      
      // La actualización del usuario será manejada por onAuthStateChange
      // No necesitamos establecer manualmente el usuario aquí
      
      if (result.success) {
        logEvent('register_success');
      } else {
        logEvent('register_failed');
      }
      
      return result;
    } catch (error) {
      logEvent('register_error');
      console.error('Error en registro:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // Método para logout
  const logout = async () => {
    try {
      setLoading(true);
      logEvent('logout', user?.id);
      
      const result = await authService.logout();
      
      // La actualización del usuario será manejada por onAuthStateChange
      // No necesitamos establecer manualmente el usuario como null aquí
      
      return result;
    } catch (error) {
      console.error('Error en logout:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    registerAnonymous,
    handleAnonymousAccess: registerAnonymous,  // Compatibilidad
    login,
    register,
    logout,
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
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  
  return context;
};