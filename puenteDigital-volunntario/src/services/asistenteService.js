// src/services/asistenteService.js
import { supabase } from '../../supabase';

export const asistenteService = {
  // Crear un nuevo asistente
  async createAsistente(asistenteData) {
    const datos = {
      ...asistenteData,
      rol: asistenteData.rol || 'asistente'
    };

    const { data, error } = await supabase
      .from('asistentes')
      .insert([datos])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Obtener un asistente por ID
  async getAsistenteById(asistenteId) {
    const { data, error } = await supabase
      .from('asistentes')
      .select('*')
      .eq('id', asistenteId)
      .single();
    if (error) throw error;
    return data;
  },

  // Obtener un asistente por ID de usuario
  async getAsistenteByUserId(userId) {
    const { data, error } = await supabase
      .from('asistentes')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAsistenteByEmail(email) {
    const { data, error } = await supabase
      .from('asistentes')
      .select('*')
      .eq('email', email);
          
    if (error) throw error;
    return data;
  },


  // Actualizar el estado de un asistente
  async actualizarEstadoAsistente(userId, nuevoEstado) {
    const { data, error } = await supabase
      .from('asistentes')
      .update({
        activo: nuevoEstado,
        disponible: nuevoEstado
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },


  //modificar asistente
  async updateAsistente(userId, asistenteData) {
    const { data, error } = await supabase
      .from('asistentes')
      .update(asistenteData)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};