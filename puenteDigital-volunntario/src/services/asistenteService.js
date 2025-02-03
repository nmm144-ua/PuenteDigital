// src/services/asistenteService.js
import { supabase } from '../../supabase';
import { declaracionService } from './declaracionService';
import { jornadasService } from './jornadasService';

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
  },

  // Eliminar un asistente
  async deleteAsistente(asistenteId) {
    const asistente = await this.getAsistenteById(asistenteId);
    const user_id = asistente.user_id;

    // Eliminar la declaración del asistente
    const declaracion = await declaracionService.getDeclaracionByAsistenteId(asistenteId);
    if (declaracion[0]) {
      const error2 = await declaracionService.deleteDeclaracionById(declaracion[0].id);
      if (error2) throw error2;
    }

    // Eliminar todos los registros de jornadas del asistente
    const { error1 } = await jornadasService.deleteJornadaByAsistenteId(asistenteId);
    if (error1) throw error1;

    const { error } = await supabase
      .from('asistentes')
      .delete()
      .eq('id', asistenteId);
    
    if (error) throw error;
    
    // Eliminar el usuario de autenticación
    await supabase.auth.deleteUser({ userId: user_id });
  },

  // Obtener todos los asistentes
  async getAllAsistentes() {
    const { data, error } = await supabase
      .from('asistentes')
      .select('*');
    
    if (error) throw error;
    return data;
  },

  // Obtener todos los asistentes activos
  async getAllAsistentesActivos() {
    const { data, error } = await supabase
      .from('asistentes')
      .select('*')
      .eq('activo', true);
    
    if (error) throw error;
    return data;
  },

  // Obtener todos los asistentes con la cuenta desactviada
  async getAllAsistentesDesactivados() {
    const { data, error } = await supabase
      .from('asistentes')
      .select('*')
      .eq('cuentaAceptada', false);
    
    if (error) throw error;
    return data;
  },

  // Activar la cuenta de un asistente
  async activarCuentaAsistente(asistenteId) {
    const { data, error } = await supabase
      .from('asistentes')
      .update({ cuentaAceptada: true })
      .eq('id', asistenteId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

};