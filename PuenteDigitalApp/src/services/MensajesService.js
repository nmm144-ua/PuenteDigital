// src/services/MensajesService.js
import { supabase } from '../../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class MensajesService {
  constructor() {
    this.tableName = 'mensajes';
    this.userId = null;     // ID del usuario autenticado (auth.users)
    this.userDbId = null;   // ID en la tabla usuario
    this.isAsistente = false; // Indica si el usuario es asistente
    this.asistenteId = null; // ID del asistente (si aplica)
  }

  // Inicializar el servicio con el ID del usuario actual
  async init(userId, isAsistente = false) {
    try {
      if (userId) {
        this.userId = userId;
        this.isAsistente = isAsistente;
        
        // Buscar el ID correspondiente en la tabla usuario o asistentes
        if (isAsistente) {
          const { data: asistente, error: asistenteError } = await supabase
            .from('asistentes')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          if (asistenteError) throw asistenteError;
          
          if (asistente) {
            this.userDbId = asistente.id;
            this.asistenteId = asistente.id;
          }
        } else {
          const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          if (usuarioError) throw usuarioError;
          
          if (usuario) {
            this.userDbId = usuario.id;
          }
        }
        
        return true;
      }
      
      // Intentar obtener el usuario desde AsyncStorage
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        this.userId = user.id;
        this.isAsistente = user.isAsistente || false;
        this.userDbId = user.userDbId || null;
        this.asistenteId = user.asistenteId || null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error al inicializar MensajesService:', error);
      return false;
    }
  }

  // Obtener mensajes de una conversación específica
  async getMensajes(solicitudId) {
    try {
      // Incluir información de usuario y asistente en la consulta
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          usuario:usuario_id(*),
          asistente:asistente_id(*)
        `)
        .eq('solicitud_id', solicitudId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Marcar todos los mensajes como leídos (los que el usuario actual debe leer)
      await this.marcarTodosComoLeidos(solicitudId);
      
      return data || [];
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      return [];
    }
  }

  // Enviar un nuevo mensaje
  async enviarMensaje(solicitudId, mensaje, asistenteId = null) {
    try {
      if (!this.userDbId) {
        throw new Error('Usuario no inicializado correctamente');
      }
      
      const nuevoMensaje = {
        solicitud_id: solicitudId,
        contenido: mensaje,
        tipo: 'texto',
        leido: false
      };
      
      // Establecer usuario_id o asistente_id según corresponda
      if (this.isAsistente) {
        nuevoMensaje.asistente_id = this.userDbId; // Id del asistente en la tabla asistentes
      } else {
        nuevoMensaje.usuario_id = this.userDbId; // Id del usuario en la tabla usuario
      }
      
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
        .update({ 
          leido: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', mensajeId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error al marcar mensaje como leído:', error);
      return false;
    }
  }

  // Marcar todos los mensajes de una conversación como leídos
  async marcarTodosComoLeidos(solicitudId) {
    try {
      if (!this.userDbId) return false;
      
      let query = supabase
        .from(this.tableName)
        .update({ 
          leido: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('solicitud_id', solicitudId)
        .eq('leido', false);
      
      // Si es usuario, marcar mensajes de asistentes como leídos
      if (!this.isAsistente) {
        query = query.not('asistente_id', 'is', null);
      } 
      // Si es asistente, marcar mensajes de usuarios como leídos
      else {
        query = query.not('usuario_id', 'is', null);
      }
      
      const { data, error } = await query;
      
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
          // Procesar el mensaje recibido
          this.procesarMensajeRecibido(payload.new, callback);
        })
        .subscribe();
      
      return subscription;
    } catch (error) {
      console.error('Error al suscribirse a mensajes:', error);
      return null;
    }
  }

  // Procesar un mensaje recibido para completar información faltante
  async procesarMensajeRecibido(mensaje, callback) {
    try {
      // Si el mensaje es del usuario actual, no hacer nada adicional
      let isFromCurrentUser = false;
      
      if (this.isAsistente && mensaje.asistente_id === this.userDbId) {
        isFromCurrentUser = true;
      } else if (!this.isAsistente && mensaje.usuario_id === this.userDbId) {
        isFromCurrentUser = true;
      }
      
      // Si no es nuestro mensaje, marcarlo como leído
      if (!isFromCurrentUser) {
        // Marcar como leído automáticamente si la app está abierta
        this.marcarComoLeido(mensaje.id);
      }
      
      // Si falta información del remitente, completarla
      let nombreRemitente = 'Usuario';
      
      if (!isFromCurrentUser) {
        if (mensaje.asistente_id) {
          // Buscar nombre del asistente
          const { data: asistente } = await supabase
            .from('asistentes')
            .select('nombre')
            .eq('id', mensaje.asistente_id)
            .single();
          
          if (asistente) nombreRemitente = asistente.nombre;
        } else if (mensaje.usuario_id) {
          // Buscar nombre del usuario
          const { data: usuario } = await supabase
            .from('usuario')
            .select('nombre')
            .eq('id', mensaje.usuario_id)
            .single();
          
          if (usuario) nombreRemitente = usuario.nombre;
        }
      } else {
        nombreRemitente = 'Tú'; // Si es mensaje propio
      }
      
      // Añadir información procesada al mensaje
      const mensajeCompleto = {
        ...mensaje,
        nombreRemitente,
        isFromCurrentUser
      };
      
      // Ejecutar el callback con el mensaje completo
      callback(mensajeCompleto);
    } catch (error) {
      console.error('Error al procesar mensaje recibido:', error);
      // Devolver el mensaje original si hay error
      callback(mensaje);
    }
  }

  // Cancelar suscripción a mensajes
  cancelarSuscripcion(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }

  // Obtener mensajes no leídos de una solicitud específica
  async getMensajesNoLeidos(solicitudId) {
    try {
      if (!this.userDbId) return [];
      
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('solicitud_id', solicitudId)
        .eq('leido', false);
      
      // Si es usuario, buscar mensajes no leídos de asistentes
      if (!this.isAsistente) {
        query = query.not('asistente_id', 'is', null);
      } 
      // Si es asistente, buscar mensajes no leídos de usuarios
      else {
        query = query.not('usuario_id', 'is', null);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error al obtener mensajes no leídos:', error);
      return [];
    }
  }

  // Obtener cantidad de mensajes no leídos en todas las solicitudes
  async getCantidadMensajesNoLeidos() {
    try {
      if (!this.userDbId) return 0;
      
      // Para usuarios normales
      if (!this.isAsistente) {
        // Primero obtener las solicitudes del usuario
        const { data: solicitudes, error: errorSolicitudes } = await supabase
          .from('solicitudes_asistencia')
          .select('id')
          .eq('usuario_id', this.userDbId);
        
        if (errorSolicitudes) throw errorSolicitudes;
        
        if (!solicitudes || solicitudes.length === 0) return 0;
        
        // Luego contar mensajes no leídos en esas solicitudes
        const solicitudIds = solicitudes.map(s => s.id);
        
        const { count, error } = await supabase
          .from(this.tableName)
          .select('*', { count: 'exact', head: true })
          .in('solicitud_id', solicitudIds)
          .not('asistente_id', 'is', null)
          .eq('leido', false);
        
        if (error) throw error;
        
        return count || 0;
      } 
      // Para asistentes
      else {
        // Primero obtener las solicitudes asignadas al asistente
        const { data: solicitudes, error: errorSolicitudes } = await supabase
          .from('solicitudes_asistencia')
          .select('id')
          .eq('asistente_id', this.asistenteId);
        
        if (errorSolicitudes) throw errorSolicitudes;
        
        if (!solicitudes || solicitudes.length === 0) return 0;
        
        // Luego contar mensajes no leídos en esas solicitudes
        const solicitudIds = solicitudes.map(s => s.id);
        
        const { count, error } = await supabase
          .from(this.tableName)
          .select('*', { count: 'exact', head: true })
          .in('solicitud_id', solicitudIds)
          .not('usuario_id', 'is', null)
          .eq('leido', false);
        
        if (error) throw error;
        
        return count || 0;
      }
    } catch (error) {
      console.error('Error al obtener cantidad de mensajes no leídos:', error);
      return 0;
    }
  }
  
  // Obtener todas las solicitudes con mensajes no leídos
  async getSolicitudesConMensajesNoLeidos() {
    try {
      if (!this.userDbId) return [];
      
      if (!this.isAsistente) {
        // Para usuarios: obtener solicitudes propias
        const { data: solicitudes, error: errorSolicitudes } = await supabase
          .from('solicitudes_asistencia')
          .select('id')
          .eq('usuario_id', this.userDbId);
        
        if (errorSolicitudes) throw errorSolicitudes;
        
        if (!solicitudes || solicitudes.length === 0) return [];
        
        // Obtener mensajes no leídos agrupados por solicitud
        const solicitudIds = solicitudes.map(s => s.id);
        
        const { data, error } = await supabase
          .from(this.tableName)
          .select('solicitud_id, count(*)')
          .in('solicitud_id', solicitudIds)
          .not('asistente_id', 'is', null)
          .eq('leido', false)
          .group('solicitud_id');
        
        if (error) throw error;
        
        return data || [];
      } else {
        // Para asistentes: obtener solicitudes asignadas
        const { data: solicitudes, error: errorSolicitudes } = await supabase
          .from('solicitudes_asistencia')
          .select('id')
          .eq('asistente_id', this.asistenteId);
        
        if (errorSolicitudes) throw errorSolicitudes;
        
        if (!solicitudes || solicitudes.length === 0) return [];
        
        // Obtener mensajes no leídos agrupados por solicitud
        const solicitudIds = solicitudes.map(s => s.id);
        
        const { data, error } = await supabase
          .from(this.tableName)
          .select('solicitud_id, count(*)')
          .in('solicitud_id', solicitudIds)
          .not('usuario_id', 'is', null)
          .eq('leido', false)
          .group('solicitud_id');
        
        if (error) throw error;
        
        return data || [];
      }
    } catch (error) {
      console.error('Error al obtener solicitudes con mensajes no leídos:', error);
      return [];
    }
  }
}

export default new MensajesService();