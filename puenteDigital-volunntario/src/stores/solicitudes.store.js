// src/stores/solicitudes.store.js
import { defineStore } from 'pinia';
import { solicitudesAsistenciaService } from '../services/solicitudAsistenciaService';

export const useSolicitudesStore = defineStore('solicitudes', {
  state: () => ({
    solicitudes: [],
    solicitudActual: null,
    loading: false,
    error: null
  }),
  
  getters: {
    pendientes: (state) => state.solicitudes.filter(s => s.estado === 'pendiente'),
    enProceso: (state) => state.solicitudes.filter(s => s.estado === 'en_proceso'),
    completadas: (state) => state.solicitudes.filter(s => s.estado === 'finalizada' || s.estado === 'completada'),
    
    // Filtros por tipo
    pendientesChat: (state) => 
      state.solicitudes.filter(s => s.estado === 'pendiente' && s.tipo_asistencia === 'chat'),
    pendientesVideo: (state) => 
      state.solicitudes.filter(s => s.estado === 'pendiente' && s.tipo_asistencia === 'video'),
    
    // Estadísticas
    estadisticas: (state) => {
      const pendientes = state.solicitudes.filter(s => s.estado === 'pendiente').length;
      const enProceso = state.solicitudes.filter(s => s.estado === 'en_proceso').length;
      const completadas = state.solicitudes.filter(s => 
        s.estado === 'finalizada' || s.estado === 'completada').length;
      const pendienteChat = state.solicitudes.filter(s => 
        s.estado === 'pendiente' && s.tipo_asistencia === 'chat').length;
      const pendienteVideo = state.solicitudes.filter(s => 
        s.estado === 'pendiente' && s.tipo_asistencia === 'video').length;
      
      return {
        pendientes,
        enProceso,
        completadas,
        pendienteChat,
        pendienteVideo,
        total: state.solicitudes.length
      };
    }
  },
  
  actions: {
    // Obtener todas las solicitudes
    async getSolicitudes() {
      this.loading = true;
      this.error = null;
      
      try {
        const solicitudes = await solicitudesAsistenciaService.getAllSolicitudes();
        this.solicitudes = solicitudes;
        return solicitudes;
      } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Obtener solicitudes pendientes
    async getSolicitudesPendientes() {
      this.loading = true;
      this.error = null;
      
      try {
        const solicitudes = await solicitudesAsistenciaService.getPendienteSolicitudes();
        // Actualizar solo las pendientes, manteniendo el resto
        const pendientesIds = solicitudes.map(s => s.id);
        this.solicitudes = [
          ...this.solicitudes.filter(s => !pendientesIds.includes(s.id) && s.estado !== 'pendiente'),
          ...solicitudes
        ];
        return solicitudes;
      } catch (error) {
        console.error('Error al obtener solicitudes pendientes:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Obtener solicitudes pendientes por tipo
    async getSolicitudesPendientesByTipo(tipo) {
      this.loading = true;
      this.error = null;
      
      try {
        const solicitudes = await solicitudesAsistenciaService.getPendienteSolicitudesByTipo(tipo);
        return solicitudes;
      } catch (error) {
        console.error(`Error al obtener solicitudes pendientes de tipo ${tipo}:`, error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Obtener una solicitud por ID
    async getSolicitudById(id) {
      this.loading = true;
      this.error = null;
      
      try {
        const solicitud = await solicitudesAsistenciaService.getSolicitudById(id);
        this.solicitudActual = solicitud;
        
        // Actualizar la solicitud en la lista si existe
        const index = this.solicitudes.findIndex(s => s.id === solicitud.id);
        if (index !== -1) {
          this.solicitudes[index] = solicitud;
        } else {
          this.solicitudes.push(solicitud);
        }
        
        return solicitud;
      } catch (error) {
        console.error(`Error al obtener solicitud ${id}:`, error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Crear una nueva solicitud
    async createSolicitud(solicitudData) {
      this.loading = true;
      this.error = null;
      
      try {
        const nuevaSolicitud = await solicitudesAsistenciaService.createSolicitud(solicitudData);
        this.solicitudes.unshift(nuevaSolicitud);
        return nuevaSolicitud;
      } catch (error) {
        console.error('Error al crear solicitud:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Asignar un asistente a una solicitud
    async asignarAsistente(solicitudId, asistenteId) {
      this.loading = true;
      this.error = null;
      
      try {
        const solicitudActualizada = await solicitudesAsistenciaService.asignarAsistente(solicitudId, asistenteId);
        
        // Actualizar en la lista
        const index = this.solicitudes.findIndex(s => s.id === solicitudId);
        if (index !== -1) {
          this.solicitudes[index] = solicitudActualizada;
        }
        
        // Actualizar solicitud actual si corresponde
        if (this.solicitudActual && this.solicitudActual.id === solicitudId) {
          this.solicitudActual = solicitudActualizada;
        }

        
        return solicitudActualizada;
      } catch (error) {
        console.error(`Error al asignar asistente a solicitud ${solicitudId}:`, error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Actualizar una solicitud
    async actualizarSolicitud(solicitudId, updateData) {
      this.loading = true;
      this.error = null;
      
      try {
        const solicitudActualizada = await solicitudesAsistenciaService.updateSolicitud(solicitudId, updateData);
        
        // Actualizar en la lista
        const index = this.solicitudes.findIndex(s => s.id === solicitudId);
        if (index !== -1) {
          this.solicitudes[index] = solicitudActualizada;
        }
        
        // Actualizar solicitud actual si corresponde
        if (this.solicitudActual && this.solicitudActual.id === solicitudId) {
          this.solicitudActual = solicitudActualizada;
        }
        
        return solicitudActualizada;
      } catch (error) {
        console.error(`Error al actualizar solicitud ${solicitudId}:`, error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Finalizar una solicitud
    async finalizarSolicitud(solicitudId) {
      this.loading = true;
      this.error = null;
      
      try {
        const solicitudActualizada = await solicitudesAsistenciaService.finalizarSolicitud(solicitudId);
        
        // Actualizar en la lista
        const index = this.solicitudes.findIndex(s => s.id === solicitudId);
        if (index !== -1) {
          this.solicitudes[index] = solicitudActualizada;
        }
        
        // Actualizar solicitud actual si corresponde
        if (this.solicitudActual && this.solicitudActual.id === solicitudId) {
          this.solicitudActual = solicitudActualizada;
        }
        
        return solicitudActualizada;
      } catch (error) {
        console.error(`Error al finalizar solicitud ${solicitudId}:`, error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Cancelar una solicitud
    async cancelarSolicitud(solicitudId) {
      this.loading = true;
      this.error = null;
      
      try {
        const solicitudActualizada = await solicitudesAsistenciaService.cancelarSolicitud(solicitudId);
        
        // Actualizar en la lista
        const index = this.solicitudes.findIndex(s => s.id === solicitudId);
        if (index !== -1) {
          this.solicitudes[index] = solicitudActualizada;
        }
        
        // Actualizar solicitud actual si corresponde
        if (this.solicitudActual && this.solicitudActual.id === solicitudId) {
          this.solicitudActual = solicitudActualizada;
        }
        
        return solicitudActualizada;
      } catch (error) {
        console.error(`Error al cancelar solicitud ${solicitudId}:`, error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Obtener mensajes de una solicitud
    async getMensajesBySolicitud(solicitudId) {
      this.loading = true;
      this.error = null;
      
      try {
        const mensajes = await solicitudesAsistenciaService.getMensajesBySolicitud(solicitudId);
        return mensajes;
      } catch (error) {
        console.error(`Error al obtener mensajes de solicitud ${solicitudId}:`, error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Enviar un mensaje
    async sendMensaje(mensajeData) {
      this.error = null;
      
      try {
        const nuevoMensaje = await solicitudesAsistenciaService.sendMensaje(mensajeData);
        return nuevoMensaje;
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        this.error = error.message;
        throw error;
      }
    },
    
    // Marcar mensajes como leídos
    async markMensajesAsRead(solicitudId, userId, isAsistente = false) {
      try {
        await solicitudesAsistenciaService.markMensajesAsRead(solicitudId, userId, isAsistente);
      } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
      }
    }
  }
});