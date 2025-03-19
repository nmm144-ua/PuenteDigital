// src/services/mensajesService.js
import { supabase } from '../../supabase';

export const mensajesService = {
  // Enviar un nuevo mensaje
  async enviarMensaje(mensaje) {
    const { solicitud_id, asistente_id, usuario_id, contenido, tipo = 'texto' } = mensaje;
    
    const datos = {
      solicitud_id,
      asistente_id,
      usuario_id,
      contenido,
      tipo,
      leido: false
    };

    const { data, error } = await supabase
      .from('mensajes')
      .insert([datos])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Obtener mensajes de una solicitud específica
  async getMensajesBySolicitud(solicitudId) {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*, usuario:usuario_id(*), asistente:asistente_id(*)')
      .eq('solicitud_id', solicitudId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Marcar mensajes como leídos
  async marcarComoLeidos(solicitudId, usuarioId) {
    const { data, error } = await supabase
      .from('mensajes')
      .update({ leido: true })
      .eq('solicitud_id', solicitudId)
      .not('usuario_id', 'eq', usuarioId)
      .select();
    
    if (error) throw error;
    return data;
  },

  // Suscribirse a nuevos mensajes de una solicitud
  suscribirseAMensajes(solicitudId, callback) {
    const channel = supabase
      .channel(`mensajes_${solicitudId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `solicitud_id=eq.${solicitudId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
    
    // Devolver función para cancelar suscripción
    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Obtener mensajes no leídos para un usuario
  async getMensajesNoLeidos(usuarioId) {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*, solicitud:solicitud_id(*), asistente:asistente_id(*)')
      .eq('usuario_id', usuarioId)
      .eq('leido', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Obtener mensajes no leídos para un asistente
  async getMensajesNoLeidosAsistente(asistenteId) {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*, solicitud:solicitud_id(*), usuario:usuario_id(*)')
      .eq('asistente_id', asistenteId)
      .eq('leido', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};