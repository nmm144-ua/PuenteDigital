// src/services/supabaseService.js
import { supabase } from '../../supabase'; // Asegúrate de importar el cliente de Supabase

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

  // Crear un nuevo asistente
  async createAsistente(asistenteData) {
    // Por defecto, los nuevos usuarios son asistentes a menos que se especifique lo contrario
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

  // Crear una declaración de responsabilidad
  async createDeclaracionResponsabilidad(declaracionData) {
    const { data, error } = await supabase
      .from('declaraciones_responsabilidad')
      .insert([declaracionData]);
    if (error) throw error;
    return data;
  },

  // Cambiar el estado de un asistente (ejemplo)
  async updateAsistenteEstado(asistenteId, nuevoEstado) {
    const { data, error } = await supabase
      .from('asistentes')
      .update({ estado: nuevoEstado })
      .eq('id', asistenteId);
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

};