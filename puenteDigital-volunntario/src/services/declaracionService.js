// src/services/declaracionService.js
import { supabase } from '../../supabase';

export const declaracionService = {
  // Crear una declaración de responsabilidad con firma como base64
  async createDeclaracionResponsabilidad(declaracionData, signatureDataURL) {
    try {
      // Guardar directamente la URL de la firma en la tabla
      // en lugar de subir a Storage
      const datosDeclaracion = {
        ...declaracionData,
        firma_url: signatureDataURL // Guardar la firma como base64 directamente
      };
      
      const { data, error } = await supabase
        .from('declaraciones_responsabilidad')
        .insert([datosDeclaracion])
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error al crear la declaración:', error);
      throw error;
    }
  },

  // Obtener una declaración por ID
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
    try {
      const { error } = await supabase
        .from('declaraciones_responsabilidad')
        .delete()
        .eq('id', declaracionId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al eliminar la declaración:', error);
      throw error;
    }
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