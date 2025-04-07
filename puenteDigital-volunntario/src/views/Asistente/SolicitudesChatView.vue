<!-- src/views/Chat/SolicitudesChatView.vue -->
<template>
  <div class="gestion-chat">
    <div class="header-container">
      <h1>Solicitudes de Asistencia por Chat</h1>
      <button 
        @click="refreshSolicitudes" 
        class="refresh-button"
        :disabled="isLoading"
      >
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoading }"></i>
        <span v-if="isLoading">Cargando...</span>
        <span v-else>Actualizar</span>
      </button>
    </div>
    
    <!-- Filtros -->
    <div class="filters-container">
      <div class="filter-group">
        <label for="estado">Estado:</label>
        <select id="estado" v-model="filtros.estado" class="filter-select">
          <option value="all">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="completada">Completada</option>
        </select>
      </div>
      <div class="search-group">
        <input 
          type="text" 
          v-model="filtros.search" 
          placeholder="Buscar por descripción o nombre"
          class="search-input"
        />
        <i class="fas fa-search search-icon"></i>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando solicitudes...</p>
    </div>
    
    <div v-else-if="solicitudesFiltradas.length === 0" class="empty-state">
      <i class="fas fa-inbox"></i>
      <p>No hay solicitudes de chat que coincidan con los filtros aplicados</p>
    
    </div>
    
    <div v-else class="solicitudes-list">
      <div v-for="solicitud in solicitudesFiltradas" :key="solicitud.id" class="solicitud-card">
        <div class="solicitud-info">
          <h3>{{ solicitud.usuario?.nombre || 'Usuario' }}</h3>
          <p class="solicitud-description">{{ solicitud.descripcion || 'Sin descripción' }}</p>
          <div class="solicitud-meta">
            <span class="timestamp">
              {{ formatDate(solicitud.created_at) }}
            </span>
            <span class="waiting-time">
              Esperando: {{ formatWaitingTime(solicitud.created_at) }}
            </span>
            <span class="estado-badge" :class="solicitud.estado">
              {{ formatEstado(solicitud.estado) }}
            </span>
          </div>
        </div>
        <div class="solicitud-actions">
          <button 
            v-if="solicitud.estado === 'pendiente'"
            @click="aceptarSolicitud(solicitud)" 
            class="attend-button"
          >
            <i class="fas fa-check"></i> Aceptar
          </button>
          <button 
            v-else-if="solicitud.estado === 'en_proceso'"
            @click="continuarSolicitud(solicitud)" 
            class="resume-button"
          >
            <i class="fas fa-arrow-right"></i> Continuar
          </button>
          <button 
            v-else
            @click="verDetalle(solicitud)" 
            class="view-button"
          >
            <i class="fas fa-eye"></i> Ver
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import socketService from '../../services/socket.service';
import { solicitudesAsistenciaService } from '../../services/solicitudAsistenciaService';
import { useAuthStore } from '@/stores/authStore';
import { asistenteService } from '../../services/asistenteService';
import { supabase } from '../../../supabase';

export default {
  name: 'SolicitudesChatView',
  
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const solicitudes = ref([]);
    const isLoading = ref(true);
    const asistenteInfo = ref(null);
    const autoRefreshInterval = ref(null);
    
    // Filtros
    const filtros = ref({
      estado: 'pendiente',  // Por defecto, mostrar pendientes
      search: ''
    });
    
    // Obtener información del asistente actual
    const loadAsistenteInfo = async () => {
      try {
        if (authStore.user) {
          asistenteInfo.value = await asistenteService.getAsistenteByUserId(authStore.user.id);
          console.log('Información del asistente cargada:', asistenteInfo.value);
        } else {
          console.error('No hay usuario autenticado');
        }
      } catch (error) {
        console.error('Error al cargar información del asistente:', error);
      }
    };
    
    // Configuración de suscripción en tiempo real
    const setupRealtimeSubscription = () => {
      // Inicializa la suscripción a cambios en la tabla
      const channel = supabase
        .channel('chat_solicitudes_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'solicitudes_asistencia',
            filter: 'tipo_asistencia=eq.chat'
          },
          (payload) => {
            // Recargar solicitudes cuando haya cambios
            loadSolicitudes();
          }
        )
        .subscribe();
      
      // Devolver función para limpiar suscripción
      return () => {
        supabase.removeChannel(channel);
      };
    };
    
    // Cargar solicitudes directamente usando el servicio
    const loadSolicitudes = async () => {
      isLoading.value = true;
      try {
        // Cargar todas las solicitudes de chat
        const todasSolicitudes = await solicitudesAsistenciaService.getAllSolicitudes();
        
        // Filtrar solo las de tipo chat
        solicitudes.value = todasSolicitudes.filter(s => s.tipo_asistencia === 'chat');
        console.log('Solicitudes de chat cargadas:', solicitudes.value.length);
      } catch (error) {
        console.error('Error al cargar solicitudes:', error);
      } finally {
        isLoading.value = false;
      }
    };
    
    // Actualizar solicitudes
    const refreshSolicitudes = () => {
      loadSolicitudes();
    };
    
    // Solicitudes filtradas por los criterios seleccionados
    const solicitudesFiltradas = computed(() => {
      return solicitudes.value.filter(s => {
        // Filtro por estado
        if (filtros.value.estado !== 'all' && s.estado !== filtros.value.estado) {
          return false;
        }
        
        // Filtro por búsqueda
        if (filtros.value.search) {
          const searchTerms = filtros.value.search.toLowerCase();
          const descripcion = s.descripcion?.toLowerCase() || '';
          const usuario = s.usuario?.nombre?.toLowerCase() || '';
          
          if (!descripcion.includes(searchTerms) && !usuario.includes(searchTerms)) {
            return false;
          }
        }
        
        return true;
      });
    });
    
    // Formatear fecha
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return format(date, 'dd/MM/yy HH:mm', { locale: es });
    };
    
    // Formatear tiempo de espera
    const formatWaitingTime = (timestamp) => {
      if (!timestamp) return 'N/A';
      
      const start = new Date(timestamp);
      const now = new Date();
      const diffMs = now - start;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Menos de un minuto';
      if (diffMins === 1) return '1 minuto';
      if (diffMins < 60) return `${diffMins} minutos`;
      
      const hours = Math.floor(diffMins / 60);
      if (hours === 1) return '1 hora';
      return `${hours} horas`;
    };
    
    // Formatear estado
    const formatEstado = (estado) => {
      switch (estado) {
        case 'pendiente': return 'Pendiente';
        case 'en_proceso': return 'En proceso';
        case 'completada': return 'Completada';
        case 'cancelada': return 'Cancelada';
        default: return estado;
      }
    };
    
    // Aceptar solicitud
    const aceptarSolicitud = async (solicitud) => {
      try {
        // Verificar que tenemos información del asistente
        if (!asistenteInfo.value) {
          alert('No se pudo identificar tu información de asistente.');
          return;
        }
        
        // Confirmar
        if (!confirm(`¿Deseas aceptar la solicitud de ${solicitud.usuario?.nombre || 'Usuario'}?`)) {
          return;
        }
        
        isLoading.value = true;
        
        // Actualizar estado en la base de datos
        await solicitudesAsistenciaService.asignarAsistente(
          solicitud.id, 
          asistenteInfo.value.id
        );
        
        // Para chat, conectar al socket y notificar
        const roomId = solicitud.room_id || `solicitud-${solicitud.id}`;
        
        // Conectar al socket
        await socketService.connect();
        
        // Unirse a la sala
        socketService.joinRoom(
          roomId, 
          asistenteInfo.value.id, 
          asistenteInfo.value.nombre || 'Asistente'
        );
        
        // Notificar que el asistente ha aceptado
        socketService.socket.emit('accept-room', {
          roomId,
          asistenteId: asistenteInfo.value.id,
          asistenteName: asistenteInfo.value.nombre || 'Asistente'
        });
        
        // Navegar a la pantalla de chat
        router.push(`/asistente/chat/${solicitud.id}/${roomId}`);
      } catch (error) {
        console.error('Error al aceptar solicitud:', error);
        alert('Error al aceptar la solicitud. Inténtalo de nuevo.');
      } finally {
        isLoading.value = false;
      }
    };
    
    // Continuar con una solicitud en proceso
    const continuarSolicitud = (solicitud) => {
      // Verificar que sea el mismo asistente
      if (solicitud.asistente_id !== asistenteInfo.value?.id) {
        alert('Esta solicitud está siendo atendida por otro asistente.');
        return;
      }
      
      const roomId = solicitud.room_id || `solicitud-${solicitud.id}`;
      router.push(`/asistente/chat/${solicitud.id}/${roomId}`);
    };
    
    // Ver detalle de una solicitud completada
    const verDetalle = (solicitud) => {
      router.push(`/asistente/solicitud/${solicitud.id}`);
    };

    // Configurar auto-refresco cada 2 segundos
    const startAutoRefresh = () => {
      // Limpiar intervalo existente si hay uno
      if (autoRefreshInterval.value) {
        clearInterval(autoRefreshInterval.value);
      }
      
      // Crear nuevo intervalo
      autoRefreshInterval.value = setInterval(() => {
        loadSolicitudes();
      }, 3000); // 3 segundos
    };

    // Detener auto-refresco
    const stopAutoRefresh = () => {
      if (autoRefreshInterval.value) {
        clearInterval(autoRefreshInterval.value);
        autoRefreshInterval.value = null;
      }
    };

    
    // ===== CICLO DE VIDA =====
    
    onMounted(async () => {
      // Cargar información del asistente
      await loadAsistenteInfo();
      
      // Cargar solicitudes iniciales
      await loadSolicitudes();


      // Iniciar auto-refresco
      startAutoRefresh();
          
      // Configurar suscripción en tiempo real
      const unsubscribe = setupRealtimeSubscription();
      
      // Limpiar suscripción al desmontar
      onUnmounted(() => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
        stopAutoRefresh();
      });
    });
    
    return {
      solicitudes,
      isLoading,
      filtros,
      solicitudesFiltradas,
      asistenteInfo,
      
      // Métodos
      refreshSolicitudes,
      formatDate,
      formatWaitingTime,
      formatEstado,
      aceptarSolicitud,
      continuarSolicitud,
      verDetalle
    };
  }
};
</script>

<style scoped>
.gestion-chat {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
}

h1 {
  font-size: 1.8rem;
  color: #333;
  margin: 0;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.refresh-button:hover {
  background-color: #45a049;
}

.refresh-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.filters-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-group, .search-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  background-color: white;
}

.search-group {
  position: relative;
  flex-grow: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  padding-right: 35px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.search-icon {
  position: absolute;
  right: 10px;
  color: #999;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #3498db;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 50px 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px dashed #ddd;
}

.empty-state i {
  font-size: 48px;
  color: #ccc;
  margin-bottom: 15px;
}

.empty-state p {
  font-size: 1.2rem;
  color: #555;
  margin-bottom: 10px;
}

.solicitudes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.solicitud-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.solicitud-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.solicitud-info {
  margin-bottom: 15px;
}

.solicitud-info h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 1.2rem;
}

.solicitud-description {
  color: #555;
  margin-bottom: 15px;
  line-height: 1.4;
  max-height: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.solicitud-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 0.85rem;
}

.timestamp {
  color: #777;
}

.waiting-time {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 5px 10px;
  border-radius: 15px;
}

.estado-badge {
  padding: 5px 10px;
  border-radius: 15px;
  white-space: nowrap;
}

.estado-badge.pendiente {
  background-color: #fff3e0;
  color: #e65100;
}

.estado-badge.en_proceso {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.estado-badge.completada {
  background-color: #e0f2f1;
  color: #00695c;
}

.estado-badge.cancelada {
  background-color: #f5f5f5;
  color: #757575;
}

.solicitud-actions {
  margin-top: auto;
}

.attend-button, .resume-button, .view-button {
  width: 100%;
  border: none;
  border-radius: 4px;
  padding: 10px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.attend-button {
  background-color: #3f51b5;
  color: white;
}

.attend-button:hover {
  background-color: #303f9f;
}

.resume-button {
  background-color: #4caf50;
  color: white;
}

.resume-button:hover {
  background-color: #388e3c;
}

.view-button {
  background-color: #f5f5f5;
  color: #555;
}

.view-button:hover {
  background-color: #e0e0e0;
}

@media (max-width: 768px) {
  .solicitudes-list {
    grid-template-columns: 1fr;
  }
  
  .header-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .search-group {
    max-width: none;
    width: 100%;
  }
  
  .filters-container {
    flex-direction: column;
  }
}
</style>