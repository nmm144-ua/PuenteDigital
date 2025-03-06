// src/services/asistenteService.js
import { supabase } from '../../supabase';

export const usuarioAppService = {
  
  // Obtener un usuario por ID
  async getUsuarioByID(usuarioID) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('id', usuarioID)
      .single();
    if (error) throw error;
    return data;
  },

  // Obtener un usuario por ID de usuario
  async getUsuarioyUserId(userId) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUsuarioByEmail(email) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email);
          
    if (error) throw error;
    return data;
  },


};