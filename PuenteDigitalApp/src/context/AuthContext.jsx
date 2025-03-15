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
          await updateLastAccess(session.user.id);
          
          // Obtener información de usuario de la tabla usuario
          const { data: userData, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (userData && !error) {
            // Guardar información de usuario en AsyncStorage
            await AsyncStorage.setItem('userData', JSON.stringify({
              id: userData.id,             // ID en la tabla usuario
              user_id: userData.user_id,   // UUID de auth.users
              nombre: userData.nombre,
              email: userData.email,
              tipo_usuario: userData.tipo_usuario
            }));
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // Usuario cerró sesión
        setUser(null);
        await AsyncStorage.removeItem('device_info_permission_granted');
        await AsyncStorage.removeItem('userData'); // Limpiar datos de usuario
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
      // Primero intentamos actualizar usando user_id
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (userError || !userData) {
        console.warn('No se encontró usuario con user_id:', userId);
        return;
      }

      // Actualizamos el último acceso
      await supabase
        .from('usuario')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('id', userData.id);
    } catch (error) {
      console.error('Error al actualizar último acceso:', error);
    }
  };

  // Verificar si hay un usuario actualmente autenticado
  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        await updateLastAccess(session.user.id);
        
        // Obtener y guardar la información completa del usuario
        const { data: userData, error } = await supabase
          .from('usuario')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (userData && !error) {
          // Guardar información de usuario en AsyncStorage
          await AsyncStorage.setItem('userData', JSON.stringify({
            id: userData.id,             // ID en la tabla usuario
            user_id: userData.user_id,   // UUID de auth.users
            nombre: userData.nombre,
            email: userData.email,
            tipo_usuario: userData.tipo_usuario
          }));
        }
      } else {
        setUser(null);
        await AsyncStorage.removeItem('userData');
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
      
      const result = await authService.registerAnonymousUser();
      
      // Si el registro anónimo fue exitoso, guardamos la información en AsyncStorage
      if (result.success && result.data) {
        // Crear un objeto con la información del usuario anónimo
        const tempUser = {
          id: result.data.id,  // ID en la tabla usuario
          id_dispositivo: result.data.id_dispositivo,
          tipo_usuario: 'anonimo',
          isAnonymous: true
        };
        
        // Guardar en AsyncStorage
        await AsyncStorage.setItem('userData', JSON.stringify(tempUser));
        
        // Establecer el usuario en el estado
        setUser({
          ...tempUser,
          role: 'anonymous'
        });
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
      
      return result;
    } catch (error) {
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
      
      return result;
    } catch (error) {
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
      
      const result = await authService.logout();
      
      // La actualización del usuario será manejada por onAuthStateChange
      
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