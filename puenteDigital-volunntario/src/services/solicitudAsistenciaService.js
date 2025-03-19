// src/services/solicitudesAsistenciaService.js
import { supabase } from '../../supabase';

export const solicitudesAsistenciaService = {
  // Crear una nueva solicitud de asistencia
  async createSolicitud(solicitudData) {
    const { usuario_id, descripcion, room_id, tipo_asistencia = 'video' } = solicitudData;
    
    const datos = {
      usuario_id,
      descripcion,
      room_id,
      estado: 'pendiente',
      tipo_asistencia, // 'video' o 'chat'
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
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Obtener todas las solicitudes pendientes por tipo
  async getPendienteSolicitudesByTipo(tipo) {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .select('*, usuario:usuario_id(*)')
      .eq('estado', 'pendiente')
      .eq('tipo_asistencia', tipo)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Obtener todas las solicitudes
  async getAllSolicitudes() {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .select('*, usuario:usuario_id(*), asistente:asistente_id(*)')
      .order('created_at', { ascending: false });
    
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

  // Actualizar una solicitud
  async updateSolicitud(solicitudId, updateData) {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .update(updateData)
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
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Obtener solicitudes atendidas por un asistente
  async getSolicitudesByAsistente(asistenteId) {
    const { data, error } = await supabase
      .from('solicitudes_asistencia')
      .select('*, usuario:usuario_id(*)')
      .eq('asistente_id', asistenteId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Obtener estadísticas de solicitudes
  async getEstadisticas() {
    const [pendientesResult, enProcesoResult, finalizadasResult, pendienteChatResult, pendienteVideoResult] = await Promise.all([
      supabase
        .from('solicitudes_asistencia')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente'),
      
      supabase
        .from('solicitudes_asistencia')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'en_proceso'),
      
      supabase
        .from('solicitudes_asistencia')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'finalizada'),
      
      supabase
        .from('solicitudes_asistencia')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
        .eq('tipo_asistencia', 'chat'),
      
      supabase
        .from('solicitudes_asistencia')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
        .eq('tipo_asistencia', 'video')
    ]);
    
    const pendientes = pendientesResult.error ? 0 : pendientesResult.count;
    const enProceso = enProcesoResult.error ? 0 : enProcesoResult.count;
    const finalizadas = finalizadasResult.error ? 0 : finalizadasResult.count;
    const pendienteChat = pendienteChatResult.error ? 0 : pendienteChatResult.count;
    const pendienteVideo = pendienteVideoResult.error ? 0 : pendienteVideoResult.count;
    
    return {
      pendientes,
      enProceso,
      finalizadas,
      pendienteChat,
      pendienteVideo,
      total: pendientes + enProceso + finalizadas
    };
  },

  // Obtener mensajes de una solicitud
  async getMensajesBySolicitud(solicitudId) {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .eq('solicitud_id', solicitudId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Enviar un mensaje en una solicitud
  async sendMensaje(mensajeData) {
    const { solicitud_id, asistente_id, usuario_id, contenido, tipo = 'texto' } = mensajeData;
    
    const datos = {
      solicitud_id,
      asistente_id,
      usuario_id,
      contenido,
      tipo,
      leido: false
      // created_at se genera automáticamente
    };

    const { data, error } = await supabase
      .from('mensajes')
      .insert([datos])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Marcar mensajes como leídos
  async markMensajesAsRead(solicitudId, userId, isAsistente = false) {
    const updateData = {
      leido: true,
      updated_at: new Date().toISOString()
    };

    let query = supabase
      .from('mensajes')
      .update(updateData)
      .eq('solicitud_id', solicitudId)
      .eq('leido', false);

    // Si es asistente, marcar mensajes del usuario como leídos
    if (isAsistente) {
      query = query.is('asistente_id', null);
    } else {
      // Si es usuario, marcar mensajes del asistente como leídos
      query = query.not('asistente_id', null);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },

  // Suscribirse a nuevos mensajes
  subscribeMensajes(solicitudId, callback) {
    return supabase
      .channel(`mensajes-${solicitudId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `solicitud_id=eq.${solicitudId}`
      }, payload => {
        callback(payload.new);
      })
      .subscribe();
  }
};