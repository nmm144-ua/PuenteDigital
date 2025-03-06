import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../../supabase';
import { authService } from '../services/authService';

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

  // Método para registro anónimo
  const registerAnonymous = async () => {
    try {
      setLoading(true);
      const result = await authService.registerAnonymousUser();
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
      return result;
    } catch (error) {
      console.error('AuthContext: Error in login:', error);
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
      return result;
    } catch (error) {
      console.error('AuthContext: Error in register:', error);
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
      return result;
    } catch (error) {
      console.error('AuthContext: Error in logout:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };


  const value = {
    user,
    loading,
    registerAnonymous,
    handleAnonymousAccess: registerAnonymous,  // Mantener compatibilidad con código existente
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
  
  // Verificar que tengamos un contexto válido
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  
  return context;
};