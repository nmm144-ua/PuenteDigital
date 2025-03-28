// src/services/usuarioAppService.js
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

  // Obtener todos los usuarios
  async getAllUsuarios() {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Obtener usuarios anónimos
  async getUsuariosAnonimos() {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('tipo_usuario', 'anonimo')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Obtener usuarios registrados (no anónimos)
  async getUsuariosRegistrados() {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .neq('tipo_usuario', 'anonimo')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Eliminar un usuario por ID
  async deleteUsuario(usuarioID) {
    const { error } = await supabase
      .from('usuario')
      .delete()
      .eq('id', usuarioID);
    
    if (error) throw error;
    return true;
  }
};