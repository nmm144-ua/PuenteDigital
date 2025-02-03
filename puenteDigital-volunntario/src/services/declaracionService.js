// src/services/declaracionService.js
import { supabase } from '../../supabase';

export const declaracionService = {
  // Crear una declaración de responsabilidad
  async createDeclaracionResponsabilidad(declaracionData) {
    const { data, error } = await supabase
      .from('declaraciones_responsabilidad')
      .insert([declaracionData]);
    if (error) throw error;
    return data;
  },

  // Obtener una declaración por ID (si es necesario)
  async getDeclaracionById(declaracionId) {
    const { data, error } = await supabase
      .from('declaraciones_responsabilidad')
      .select('*')
      .eq('id', declaracionId)
      .single();
    if (error) throw error;
    return data;
  },

  // Eliminar una declaración por ID
  async deleteDeclaracionById(declaracionId) {
    const { data, error } = await supabase
      .from('declaraciones_responsabilidad')
      .delete()
      .eq('id', declaracionId);
    if (error) throw error;
    return data;
  },

  // Obtener todas las declaraciones de un asistente
  async getDeclaracionByAsistenteId(asistenteId) {
    const { data, error } = await supabase
      .from('declaraciones_responsabilidad')
      .select('*')
      .eq('asistente_id', asistenteId);
    if (error) throw error;
    return data;
  },
};