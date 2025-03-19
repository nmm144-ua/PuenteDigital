// src/services/solicitudesAsistenciaService.js
import { supabase } from '../../supabase';

export const solicitudesAsistenciaService = {
  // Crear una nueva solicitud de asistencia
  async createSolicitud(solicitudData) {
    const { usuario_id, descripcion, room_id } = solicitudData;
    
    const datos = {
      usuario_id,
      descripcion,
      room_id,
      estado: 'pendiente'
      // created_at se genera automáticamente con el default now()
    };

    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .insert([datos])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Obtener una solicitud por ID
  async getSolicitudById(solicitudId) {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .select('*, usuario:usuario_id(*), asistente:asistente_id(*)')
      .eq('id', solicitudId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Obtener todas las solicitudes pendientes
  async getPendienteSolicitudes() {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .select('*, usuario:usuario_id(*)')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true }); // Usar created_at en lugar de timestamp
    
    if (error) throw error;
    return data;
  },

  // Asignar un asistente a una solicitud
  async asignarAsistente(solicitudId, asistenteId) {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .update({
        asistente_id: asistenteId,
        estado: 'en_proceso',
        atendido_timestamp: new Date().toISOString()
      })
      .eq('id', solicitudId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Finalizar una solicitud de asistencia
  async finalizarSolicitud(solicitudId) {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .update({
        estado: 'finalizada',
        finalizado_timestamp: new Date().toISOString()
      })
      .eq('id', solicitudId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Cancelar una solicitud de asistencia
  async cancelarSolicitud(solicitudId) {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .update({
        estado: 'cancelada'
      })
      .eq('id', solicitudId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Obtener solicitudes por usuario
  async getSolicitudesByUsuario(usuarioId) {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .select('*, asistente:asistente_id(*)')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false }); // Usar created_at en lugar de timestamp
    
    if (error) throw error;
    return data;
  },

  // Obtener solicitudes atendidas por un asistente
  async getSolicitudesByAsistente(asistenteId) {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .select('*, usuario:usuario_id(*)')
      .eq('asistente_id', asistenteId)
      .order('created_at', { ascending: false }); // Usar created_at en lugar de timestamp
    
    if (error) throw error;
    return data;
  },

  // Obtener estadísticas de solicitudes
  async getEstadisticas() {
    const { data: pendientes, error: errorPendientes } = await supabase
      .from('solicitudes_asistencia')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    
    const { data: enProceso, error: errorEnProceso } = await supabase
      .from('solicitudes_asistencia')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'en_proceso');
    
    const { data: finalizadas, error: errorFinalizadas } = await supabase
      .from('solicitudes_asistencia')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'finalizada');
    
    if (errorPendientes || errorEnProceso || errorFinalizadas) {
      throw new Error('Error al obtener estadísticas');
    }
    
    return {
      pendientes: pendientes?.length || 0,
      enProceso: enProceso?.length || 0,
      finalizadas: finalizadas?.length || 0
    };
  }
};