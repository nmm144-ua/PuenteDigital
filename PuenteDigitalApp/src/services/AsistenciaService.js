// src/services/AsistenciaService.js
import supabase from '../../supabase';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AsistenciaService {
  // Crear una nueva solicitud de asistencia
  async crearSolicitud(descripcion) {
    try {
      // Obtener información del usuario desde AsyncStorage
      const userDataString = await AsyncStorage.getItem('userData');
      const userData = userDataString ? JSON.parse(userDataString) : null;
      
      if (!userData || !userData.id) {
        throw new Error('No se puede identificar al usuario');
      }
      
      // Generar ID de sala
      const roomId = uuidv4();
      
      // Crear la solicitud en Supabase
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .insert([{
          usuario_id: userData.id,
          descripcion,
          room_id: roomId,
          estado: 'pendiente',
          timestamp: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error al crear solicitud de asistencia:', error);
      throw error;
    }
  }
  
  // Obtener solicitudes del usuario actual
  async obtenerMisSolicitudes() {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      const userData = userDataString ? JSON.parse(userDataString) : null;
      
      if (!userData || !userData.id) {
        throw new Error('No se puede identificar al usuario');
      }
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*, asistente:asistente_id(*)')
        .eq('usuario_id', userData.id)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      throw error;
    }
  }
  
  // Obtener una solicitud específica
  async obtenerSolicitud(solicitudId) {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*, asistente:asistente_id(*)')
        .eq('id', solicitudId)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error al obtener solicitud:', error);
      throw error;
    }
  }
  
  // Cancelar una solicitud de asistencia
  async cancelarSolicitud(solicitudId) {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .update({ estado: 'cancelada' })
        .eq('id', solicitudId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error al cancelar solicitud:', error);
      throw error;
    }
  }
  
  // Verificar si hay una solicitud pendiente
  async verificarSolicitudPendiente() {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      const userData = userDataString ? JSON.parse(userDataString) : null;
      
      if (!userData || !userData.id) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*')
        .eq('usuario_id', userData.id)
        .in('estado', ['pendiente', 'en_proceso'])
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // No data found
        throw error;
      }
      
      return data || null;
    } catch (error) {
      console.error('Error al verificar solicitud pendiente:', error);
      return null;
    }
  }
}

export default new AsistenciaService();