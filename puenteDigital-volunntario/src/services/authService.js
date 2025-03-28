// src/services/authService.js
import { supabase } from '../../supabase';
import { asistenteService } from './asistenteService';
import { usuarioAppService } from './usuarioAppService';

export const authService = {
  // Registrar un nuevo usuario
  async registerUser(email, password) {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return user;
  },

  // Iniciar sesión
  async login(email, password) {
    const { user, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return user;
  },

  // Cerrar sesión
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    return data;
  },

  // Método para actualizar la contraseña
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  }
};