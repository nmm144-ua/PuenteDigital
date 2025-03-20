// src/services/MensajesService.js
import { supabase } from '../../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class MensajesService {
  constructor() {
    this.tableName = 'mensajes';
    this.userId = null;
  }

  // Inicializar el servicio con el ID del usuario actual
  async init(userId) {
    if (userId) {
      this.userId = userId;
      return true;
    }
    
    // Intentar obtener el ID del usuario desde AsyncStorage
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        this.userId = user.id;
        return true;
      }
    } catch (error) {
      console.error('Error al obtener usuario de AsyncStorage:', error);
    }
    
    return false;
  }

  // Obtener mensajes de una conversación específica
  async getMensajes(solicitudId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('solicitud_id', solicitudId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      return [];
    }
  }

  // Enviar un nuevo mensaje
  async enviarMensaje(solicitudId, mensaje, asistenteId) {
    try {
      if (!this.userId) {
        throw new Error('Usuario no inicializado');
      }
      
      const nuevoMensaje = {
        solicitud_id: solicitudId,
        usuario_id: this.userId,
        asistente_id: asistenteId,
        contenido: mensaje,
        tipo: 'texto',
        leido: false
      };
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(nuevoMensaje)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }

  // Marcar mensaje como leído
  async marcarComoLeido(mensajeId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ leido: true, updated_at: new Date() })
        .eq('id', mensajeId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error al marcar mensaje como leído:', error);
      return false;
    }
  }

  // Marcar todos los mensajes de una conversación como leídos
  async marcarTodosComoLeidos(solicitudId, asistenteId) {
    try {
      if (!this.userId) return false;
      
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ leido: true, updated_at: new Date() })
        .eq('solicitud_id', solicitudId)
        .eq('asistente_id', asistenteId)
        .eq('usuario_id', this.userId)
        .eq('leido', false);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error al marcar mensajes como leídos:', error);
      return false;
    }
  }

  // Suscribirse a nuevos mensajes (usando Supabase Realtime)
  suscribirseAMensajes(solicitudId, callback) {
    try {
      const subscription = supabase
        .channel(`mensajes-${solicitudId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: this.tableName,
          filter: `solicitud_id=eq.${solicitudId}`
        }, payload => {
          callback(payload.new);
        })
        .subscribe();
      
      return subscription;
    } catch (error) {
      console.error('Error al suscribirse a mensajes:', error);
      return null;
    }
  }

  // Cancelar suscripción a mensajes
  cancelarSuscripcion(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }

  // Obtener mensajes no leídos
  async getMensajesNoLeidos(solicitudId) {
    try {
      if (!this.userId) return [];
      
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('solicitud_id', solicitudId)
        .eq('usuario_id', this.userId)
        .eq('leido', false);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error al obtener mensajes no leídos:', error);
      return [];
    }
  }

  // Obtener cantidad de mensajes no leídos
  async getCantidadMensajesNoLeidos() {
    try {
      if (!this.userId) return 0;
      
      const { count, error } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', this.userId)
        .eq('leido', false);
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error('Error al obtener cantidad de mensajes no leídos:', error);
      return 0;
    }
  }
}

export default new MensajesService();