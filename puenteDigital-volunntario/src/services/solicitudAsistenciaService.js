// src/services/solicitudAsistenciaService.js
import { supabase } from '../../supabase';

export const solicitudesAsistenciaService = {
  // Crear una nueva solicitud de asistencia
  async createSolicitud(solicitudData) {
    const { usuario_id, descripcion, room_id, tipo_asistencia = 'chat' } = solicitudData;
    
    const datos = {
      usuario_id,
      descripcion,
      room_id,
      tipo_asistencia,
      estado: 'pendiente'
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
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select(`
          *,
          usuario:usuario_id(*),
          asistente:asistente_id(*)
        `)
        .eq('id', solicitudId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener solicitud por ID:', error);
      throw error;
    }
  },

  // Asignar un asistente a una solicitud
  async asignarAsistente(solicitudId, asistenteId) {
    try {
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
      
      // Incluir información del asistente
      if (data) {
        const solicitudConDetalles = await this.getSolicitudById(solicitudId);
        return solicitudConDetalles;
      }
      
      return data;
    } catch (error) {
      console.error('Error al asignar asistente:', error);
      throw error;
    }
  },

  // Obtener solicitudes asignadas a un asistente
  async getSolicitudesByAsistente(asistenteId) {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select(`
          *,
          usuario:usuario_id(*)
        `)
        .eq('asistente_id', asistenteId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener solicitudes del asistente:', error);
      throw error;
    }
  },
  
  // Obtener solicitudes de un usuario
  async getSolicitudesByUsuario(usuarioId) {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select(`
          *,
          asistente:asistente_id(*)
        `)
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener solicitudes del usuario:', error);
      throw error;
    }
  },

  // Obtener solicitudes pendientes
  async getPendienteSolicitudes() {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select(`
          *,
          usuario:usuario_id(*)
        `)
        .eq('estado', 'pendiente')
        .is('asistente_id', null)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener solicitudes pendientes:', error);
      throw error;
    }
  },

  // Obtener solicitudes de videollamada pendientes
  async getVideoSolicitudes() {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select(`
          *,
          usuario:usuario_id(*)
        `)
        .eq('estado', 'pendiente')
        .eq('tipo_asistencia', 'video')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener solicitudes de video:', error);
      throw error;
    }
  },

  // Obtener solicitudes de chat pendientes
  async getChatSolicitudes() {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select(`
          *,
          usuario:usuario_id(*)
        `)
        .eq('estado', 'pendiente')
        .eq('tipo_asistencia', 'chat')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener solicitudes de chat:', error);
      throw error;
    }
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

  // Obtener estadísticas de solicitudes
  async getEstadisticas() {
    try {
      // Obtener conteo de solicitudes por estado
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('estado', { count: 'exact' })
        .in('estado', ['pendiente', 'en_proceso', 'finalizada', 'cancelada'])
        .eq('tipo_asistencia', 'chat');
      
      if (error) throw error;
      
      // Procesar los resultados para obtener conteos por estado
      const conteo = {
        pendientes: 0,
        enProceso: 0,
        finalizadas: 0,
        canceladas: 0
      };
      
      // Contar manualmente para mayor precisión
      data.forEach(item => {
        if (item.estado === 'pendiente') conteo.pendientes++;
        else if (item.estado === 'en_proceso') conteo.enProceso++;
        else if (item.estado === 'finalizada') conteo.finalizadas++;
        else if (item.estado === 'cancelada') conteo.canceladas++;
      });
      
      return conteo;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw new Error('Error al obtener estadísticas: ' + error.message);
    }
  },

  // Eliminar una solicitud de asistencia
  async eliminarSolicitud(solicitudId) {
    try {
      // Verificar que hay solicitudId válido
      if (!solicitudId) {
        throw new Error('ID de solicitud no válido');
      }

      console.log('Eliminando solicitud:', solicitudId);
      
      // Eliminar la solicitud de la base de datos
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .delete()
        .eq('id', solicitudId);
      
      if (error) throw error;
      
      console.log('Solicitud eliminada correctamente');
      return { success: true, message: 'Solicitud eliminada correctamente' };
    } catch (error) {
      console.error('Error al eliminar la solicitud:', error);
      throw error;
    }
  },

  // Reabrir una solicitud finalizada
  async reabrirSolicitud(solicitudId) {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .update({
          estado: 'en_proceso',
          finalizado_timestamp: null
        })
        .eq('id', solicitudId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('Solicitud reabierta correctamente:', data);
      return data;
    } catch (error) {
      console.error('Error al reabrir la solicitud:', error);
      throw error;
    }
  },

  async guardarInforme(solicitudId, informe) {
    try {
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .update({ informe: informe })
        .eq('id', solicitudId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al guardar el informe:', error);
      return false;
    }
  }
};