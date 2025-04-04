// src/services/AsistenciaService.js
import { supabase } from '../../supabase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AsistenciaService {
  constructor() {
    this.userId = null;        // ID de autenticación (auth.users)
    this.userDbId = null;      // ID en la tabla de usuario
    this.isAsistente = false;  // Indica si el usuario es asistente
  }
  
  // Inicializar servicio
  async init() {
    try {
      // Obtener información del usuario desde AsyncStorage
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (!userDataString) {
        console.error('No se encontró información de usuario en AsyncStorage');
        
        // Para usuarios anónimos, retornar true pero con ID null
        console.log('Configurando como usuario anónimo');
        this.userId = null;
        this.userDbId = null;
        this.isAsistente = false;
        
        // Intentar obtener ID de dispositivo
        try {
          const deviceInfo = await AsyncStorage.getItem('device_info');
          if (deviceInfo) {
            const deviceData = JSON.parse(deviceInfo);
            console.log('Usando ID de dispositivo como identificador:', deviceData.deviceId);
            this.deviceId = deviceData.deviceId;
          }
        } catch (deviceError) {
          console.warn('No se pudo obtener información del dispositivo');
        }
        
        return true; // Permitir continuar como anónimo
      }
      
      const userData = JSON.parse(userDataString);
      
      if (!userData || !userData.id) {
        console.warn('Datos de usuario inválidos, tratando como anónimo:', userData);
        
        // Si son datos de usuario anónimo, usar el id_dispositivo si está disponible
        if (userData && userData.id_dispositivo) {
          console.log('Usando ID de dispositivo:', userData.id_dispositivo);
          this.deviceId = userData.id_dispositivo;
          this.userDbId = userData.userDbId; // Puede ser el ID en la tabla usuario
        }
        
        this.userId = null;
        this.isAsistente = false;
        
        return true; // Permitir continuar como anónimo
      }
      
      this.userId = userData.id;           // ID de autenticación (auth.users)
      this.userDbId = userData.userDbId;   // ID en la tabla usuario
      this.isAsistente = userData.isAsistente || false;
      
      console.log('AsistenciaService inicializado con:', {
        userId: this.userId,
        userDbId: this.userDbId,
        isAsistente: this.isAsistente
      });
      
      return true;
    } catch (error) {
      console.error('Error al inicializar AsistenciaService:', error);
      
      // En caso de error, configurar como anónimo pero devolver true
      // para que la app pueda continuar funcionando
      this.userId = null;
      this.userDbId = null;
      this.isAsistente = false;
      
      return true;
    }
  }
  
  // Modificar también el método crearSolicitud para manejar usuarios anónimos
  async crearSolicitud(descripcion, tipoAsistencia ) {
    try {
      // Intentar inicializar si no se ha hecho
      if (!this.userDbId && !this.deviceId) {
        const inicializado = await this.init();
        if (!inicializado) {
          throw new Error('No se pudo inicializar el servicio');
        }
      }
      
      // Para usuarios anónimos sin userDbId pero con deviceId, intentar encontrar o crear
      // un registro de usuario anónimo en la tabla
      if (!this.userDbId && this.deviceId) {
        console.log('Buscando usuario asociado al dispositivo:', this.deviceId);
        
        // Buscar usuario existente para este dispositivo
        const { data: usuarioExistente, error: errorBusqueda } = await supabase
          .from('usuario')
          .select('id')
          .eq('id_dispositivo', this.deviceId)
          .single();
        
        if (!errorBusqueda && usuarioExistente) {
          // Usar usuario existente
          this.userDbId = usuarioExistente.id;
          console.log('Usuario anónimo existente encontrado:', this.userDbId);
        } else {
          // Crear nuevo usuario anónimo
          console.log('Creando nuevo usuario anónimo para dispositivo:', this.deviceId);
          
          const { data: nuevoUsuario, error: errorCreacion } = await supabase
            .from('usuario')
            .insert([{
              nombre: 'Usuario', // Valor predeterminado
              ip: null,
              id_dispositivo: this.deviceId,
              fecha_registro: new Date().toISOString(),
              tipo_usuario: 'anonimo',
              ultimo_acceso: new Date().toISOString()
            }])
            .select();
          
          if (errorCreacion) {
            console.error('Error al crear usuario anónimo:', errorCreacion);
            throw new Error('No se pudo crear usuario anónimo');
          }
          
          // Usar el ID del usuario recién creado
          this.userDbId = nuevoUsuario[0].id;
          console.log('Nuevo usuario anónimo creado:', this.userDbId);
          
          // Actualizar AsyncStorage con la información del nuevo usuario
          const userToStore = {
            id: null, // No hay ID de auth
            userDbId: this.userDbId,
            id_dispositivo: this.deviceId,
            nombre: 'Usuario',
            tipo_usuario: 'anonimo',
            isAnonymous: true,
            isAsistente: false,
            userRole: 'usuario'
          };
          
          await AsyncStorage.setItem('userData', JSON.stringify(userToStore));
        }
      }
      
      if (!this.userDbId) {
        throw new Error('No se puede identificar al usuario');
      }
      
      // Generar ID de sala
      const roomId = `${tipoAsistencia}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      console.log('Creando solicitud:', {
        usuario_id: this.userDbId,
        descripcion,
        tipoAsistencia,
        roomId
      });
      
      // Crear la solicitud en Supabase
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .insert([{
          usuario_id: this.userDbId,
          descripcion,
          room_id: roomId,
          estado: 'pendiente',
          tipo_asistencia: tipoAsistencia
        }])
        .select();
      
      if (error) {
        console.error('Error en Supabase al crear solicitud:', error);
        throw error;
      }
      
      console.log('Solicitud creada con éxito:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error al crear solicitud de asistencia:', error);
      throw error;
    }
  }
  
  // Obtener solicitudes del usuario actual
  async obtenerMisSolicitudes() {
    try {
      // Intentar inicializar si no se ha hecho
      if (!this.userDbId) {
        const inicializado = await this.init();
        if (!inicializado) {
          throw new Error('No se pudo inicializar el servicio');
        }
      }
      
      if (!this.userDbId) {
        throw new Error('No se puede identificar al usuario');
      }
      
      console.log('Obteniendo solicitudes para usuario:', this.userDbId);
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*, asistente:asistente_id(*)')
        .eq('usuario_id', this.userDbId)
        .order('estado', { ascending: true }) // Ordenar por estado (pendiente, en_proceso primero)
        .order('created_at', { ascending: false }); // Luego por fecha (más reciente primero)
      
      if (error) {
        console.error('Error al obtener solicitudes:', error);
        throw error;
      }
      
      console.log(`Se encontraron ${data?.length || 0} solicitudes`);
      return data || [];
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      throw error;
    }
  }
  
  // Obtener una solicitud específica
  async obtenerSolicitud(solicitudId) {
    try {
      console.log('Obteniendo solicitud:', solicitudId);
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*, asistente:asistente_id(*), usuario:usuario_id(*)')
        .eq('id', solicitudId)
        .single();
      
      if (error) {
        console.error('Error al obtener solicitud:', error);
        throw error;
      }
      
      console.log('Solicitud obtenida:', data);
      return data;
    } catch (error) {
      console.error('Error al obtener solicitud:', error);
      throw error;
    }
  }
  
  // Cancelar una solicitud de asistencia
  async cancelarSolicitud(solicitudId) {
    try {
      console.log('Cancelando solicitud:', solicitudId);
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .update({ estado: 'cancelada' })
        .eq('id', solicitudId)
        .select();
      
      if (error) {
        console.error('Error al cancelar solicitud:', error);
        throw error;
      }
      
      console.log('Solicitud cancelada con éxito');
      return data[0];
    } catch (error) {
      console.error('Error al cancelar solicitud:', error);
      throw error;
    }
  }
  
  // Verificar si hay una solicitud pendiente
  async verificarSolicitudPendiente() {
    try {
      // Intentar inicializar si no se ha hecho
      if (!this.userDbId) {
        const inicializado = await this.init();
        if (!inicializado) {
          return null;
        }
      }
      
      if (!this.userDbId) {
        console.warn('No se puede verificar solicitud pendiente sin ID de usuario');
        return null;
      }
      
      console.log('Verificando solicitudes pendientes para usuario:', this.userDbId);
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*')
        .eq('usuario_id', this.userDbId)
        .in('estado', ['pendiente', 'en_proceso']) // Solo buscar solicitudes activas
        .eq('tipo_asistencia', 'chat') // Especificar tipo chat
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // No data found
        console.error('Error al verificar solicitud pendiente:', error);
        throw error;
      }
      
      if (data) {
        console.log('Solicitud pendiente encontrada:', data);
      } else {
        console.log('No hay solicitudes pendientes');
      }
      
      return data || null;
    } catch (error) {
      console.error('Error al verificar solicitud pendiente:', error);
      return null;
    }
  }
  
  // Obtener información del usuario actual
  async obtenerUsuarioActual() {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      const userData = userDataString ? JSON.parse(userDataString) : null;
      
      if (userData) {
        // Si solo tenemos el auth.users ID pero no el ID en la tabla usuario
        if (userData.id && !userData.userDbId) {
          try {
            // Buscar el ID en la tabla usuario
            const { data, error } = await supabase
              .from('usuario')
              .select('id')
              .eq('user_id', userData.id)
              .single();
            
            if (!error && data) {
              userData.userDbId = data.id;
              
              // Actualizar el objeto en AsyncStorage
              await AsyncStorage.setItem('userData', JSON.stringify(userData));
            }
          } catch (dbError) {
            console.warn('Error al buscar ID de usuario en BD:', dbError);
          }
        }
      }
      
      return userData;
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      return null;
    }
  }
  
  // Obtener solicitudes asignadas (para asistentes)
  async obtenerSolicitudesAsignadas() {
    try {
      // Intentar inicializar si no se ha hecho
      if (!this.userDbId || !this.isAsistente) {
        const inicializado = await this.init();
        if (!inicializado || !this.isAsistente) {
          throw new Error('No se tiene acceso como asistente');
        }
      }
      
      console.log('Obteniendo solicitudes asignadas para asistente:', this.userDbId);
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*, usuario:usuario_id(*)')
        .eq('asistente_id', this.userDbId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error al obtener solicitudes asignadas:', error);
        throw error;
      }
      
      console.log(`Se encontraron ${data?.length || 0} solicitudes asignadas`);
      return data || [];
    } catch (error) {
      console.error('Error al obtener solicitudes asignadas:', error);
      throw error;
    }
  }
  
  // Obtener solicitudes pendientes (para asistentes)
  async obtenerSolicitudesPendientes() {
    try {
      // Solo los asistentes pueden obtener solicitudes pendientes
      if (!this.isAsistente) {
        console.warn('Operación no permitida: solo asistentes pueden ver solicitudes pendientes');
        return [];
      }
      
      console.log('Obteniendo solicitudes pendientes');
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .select('*, usuario:usuario_id(*)')
        .eq('estado', 'pendiente')
        .is('asistente_id', null)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error al obtener solicitudes pendientes:', error);
        throw error;
      }
      
      console.log(`Se encontraron ${data?.length || 0} solicitudes pendientes`);
      return data || [];
    } catch (error) {
      console.error('Error al obtener solicitudes pendientes:', error);
      throw error;
    }
  }
  
  // Asignar una solicitud (para asistentes)
  async asignarSolicitud(solicitudId) {
    try {
      // Intentar inicializar si no se ha hecho
      if (!this.userDbId || !this.isAsistente) {
        const inicializado = await this.init();
        if (!inicializado || !this.isAsistente) {
          throw new Error('No se tiene acceso como asistente');
        }
      }
      
      console.log('Asignando solicitud', solicitudId, 'al asistente', this.userDbId);
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .update({
          asistente_id: this.userDbId,
          estado: 'en_proceso',
          atendido_timestamp: new Date().toISOString()
        })
        .eq('id', solicitudId)
        .select();
      
      if (error) {
        console.error('Error al asignar solicitud:', error);
        throw error;
      }
      
      console.log('Solicitud asignada con éxito');
      return data[0];
    } catch (error) {
      console.error('Error al asignar solicitud:', error);
      throw error;
    }
  }
  
  // Finalizar una solicitud
  async finalizarSolicitud(solicitudId) {
    try {
      console.log('Finalizando solicitud:', solicitudId);
      
      const { data, error } = await supabase
        .from('solicitudes_asistencia')
        .update({
          estado: 'finalizada',
          finalizado_timestamp: new Date().toISOString()
        })
        .eq('id', solicitudId)
        .select();
      
      if (error) {
        console.error('Error al finalizar solicitud:', error);
        throw error;
      }
      
      console.log('Solicitud finalizada con éxito');
      return data[0];
    } catch (error) {
      console.error('Error al finalizar solicitud:', error);
      throw error;
    }
  }
}

export default new AsistenciaService();