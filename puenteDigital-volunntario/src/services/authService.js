// src/services/authService.js
import { supabase } from '../../supabase';
import { asistenteService } from './asistenteService';

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
  }
};