// src/services/supabaseService.js
import { supabase } from '../../supabase';

export const supabaseService = {
  // Registrar un nuevo usuario
  async registerUser(email, password) {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return user;
  },

  // Obtener el rol del usuario
  async getUserRole(userId) {
    const { data, error } = await supabase
      .from('asistentes')
      .select('rol')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data?.rol || 'asistente';
  },

  // Actualizar el rol de un usuario
  async updateUserRole(asistenteId, newRole) {
    const { data, error } = await supabase
      .from('asistentes')
      .update({ rol: newRole })
      .eq('id', asistenteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};