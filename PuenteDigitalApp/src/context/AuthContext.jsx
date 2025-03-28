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
      console.log('Auth state change:', event);
      
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
            console.log('Información de usuario cargada:', userData);
            
            // Guardar información de usuario en AsyncStorage con la estructura correcta
            const userToStore = {
              id: session.user.id,         // ID de autenticación (auth.users)
              userDbId: userData.id,       // ID en la tabla usuario
              user_id: userData.user_id,   // UUID de auth.users (redundante pero útil)
              nombre: userData.nombre,
              email: userData.email,
              tipo_usuario: userData.tipo_usuario,
              isAsistente: false,          // Por defecto, es usuario normal
              userRole: 'usuario'          // Rol para compatibilidad con servicios
            };
            
            console.log('Guardando datos de usuario:', userToStore);
            
            // Verificar si el usuario también es asistente
            try {
              const { data: asistenteData, error: asistenteError } = await supabase
                .from('asistentes')
                .select('id, rol')
                .eq('user_id', session.user.id)
                .single();
              
              if (asistenteData && !asistenteError) {
                console.log('Usuario también es asistente:', asistenteData);
                userToStore.isAsistente = true;
                userToStore.asistenteId = asistenteData.id;
                userToStore.userRole = asistenteData.rol || 'asistente';
              }
            } catch (asistenteError) {
              console.log('Usuario no es asistente');
            }
            
            // Guardar en AsyncStorage
            await AsyncStorage.setItem('userData', JSON.stringify(userToStore));
          } else {
            console.warn('No se pudo obtener información de usuario:', error);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // Usuario cerró sesión
        setUser(null);
        await AsyncStorage.removeItem('device_info_permission_granted');
        await AsyncStorage.removeItem('userData'); // Limpiar datos de usuario
        await AsyncStorage.removeItem('user');     // Limpiar datos antiguos si existen
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
      const { error } = await supabase
        .from('usuario')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('id', userData.id);
      
      if (error) {
        console.error('Error al actualizar último acceso:', error);
      } else {
        console.log('Último acceso actualizado correctamente');
      }
    } catch (error) {
      console.error('Error al actualizar último acceso:', error);
    }
  };

  // Verificar si hay un usuario actualmente autenticado
  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Sesión activa encontrada:', session.user.email);
        setUser(session.user);
        await updateLastAccess(session.user.id);
        
        // Obtener y guardar la información completa del usuario
        const { data: userData, error } = await supabase
          .from('usuario')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (userData && !error) {
          console.log('Información de usuario cargada:', userData);
          
          // Verificar si el usuario también es asistente
          let isAsistente = false;
          let asistenteId = null;
          let userRole = 'usuario';
          
          try {
            const { data: asistenteData, error: asistenteError } = await supabase
              .from('asistentes')
              .select('id, rol')
              .eq('user_id', session.user.id)
              .single();
            
            if (asistenteData && !asistenteError) {
              console.log('Usuario también es asistente:', asistenteData);
              isAsistente = true;
              asistenteId = asistenteData.id;
              userRole = asistenteData.rol || 'asistente';
            }
          } catch (asistenteError) {
            console.log('Usuario no es asistente');
          }
          
          // Guardar información de usuario en AsyncStorage con la estructura correcta
          const userToStore = {
            id: session.user.id,         // ID de autenticación (auth.users)
            userDbId: userData.id,       // ID en la tabla usuario
            user_id: userData.user_id,   // UUID de auth.users (redundante pero útil)
            nombre: userData.nombre,
            email: userData.email,
            tipo_usuario: userData.tipo_usuario,
            isAsistente,                 // Indica si el usuario es asistente
            asistenteId,                 // ID en la tabla asistentes (si aplica)
            userRole                     // Rol para compatibilidad con servicios
          };
          
          console.log('Guardando datos de usuario en AsyncStorage:', userToStore);
          await AsyncStorage.setItem('userData', JSON.stringify(userToStore));
        } else {
          console.warn('No se pudo obtener información de usuario:', error);
          setUser(null);
          await AsyncStorage.removeItem('userData');
        }
      } else {
        console.log('No hay sesión activa');
        setUser(null);
        await AsyncStorage.removeItem('userData');
      }
    } catch (error) {
      console.error('Error verificando usuario:', error);
      setUser(null);
      await AsyncStorage.removeItem('userData');
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
        console.log('Registro anónimo exitoso:', result.data);
        
        // Crear un objeto con la información del usuario anónimo
        const tempUser = {
          id: null,                     // No hay ID de auth.users
          userDbId: result.data.id,     // ID en la tabla usuario
          id_dispositivo: result.data.id_dispositivo,
          nombre: 'Usuario anónimo',
          tipo_usuario: 'anonimo',
          isAnonymous: true,
          isAsistente: false,
          userRole: 'usuario'
        };
        
        console.log('Guardando datos de usuario anónimo:', tempUser);
        
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
      console.error('Error en registro anónimo:', error);
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
      
      // Modificación para asegurar que userDbId está correctamente guardado
      if (result.success && result.data && result.data.user) {
        // Obtener información completa del usuario
        try {
          const { data: userData, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('user_id', result.data.user.id)
            .single();
          
          if (userData && !error) {
            // Crear estructura correcta de datos de usuario
            const userToStore = {
              id: result.data.user.id,    // ID de autenticación
              userDbId: userData.id,      // ID en la tabla usuario
              user_id: userData.user_id,  // UUID de auth (redundante)
              nombre: userData.nombre,
              email: userData.email,
              tipo_usuario: userData.tipo_usuario,
              isAsistente: false,
              userRole: 'usuario'
            };
            
            // Verificar si el usuario también es asistente
            try {
              const { data: asistenteData, error: asistenteError } = await supabase
                .from('asistentes')
                .select('id, rol')
                .eq('user_id', result.data.user.id)
                .single();
              
              if (asistenteData && !asistenteError) {
                userToStore.isAsistente = true;
                userToStore.asistenteId = asistenteData.id;
                userToStore.userRole = asistenteData.rol || 'asistente';
              }
            } catch (asistenteError) {
              // No es asistente, no hay problema
            }
            
            console.log('Login exitoso, guardando datos:', userToStore);
            await AsyncStorage.setItem('userData', JSON.stringify(userToStore));
          }
        } catch (userError) {
          console.error('Error al obtener datos de usuario tras login:', userError);
        }
      }
      
      console.log('Resultado de login:', result);
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
      console.log('Resultado de registro:', result);
      
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
      console.log('Resultado de logout:', result);
      
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