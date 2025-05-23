<!-- src/views/Asistente/GestionLlamadas.vue -->
<template>
  <div class="gestion-llamadas">
    <div class="page-background"></div>
    
    <div class="page-content">
      <div class="header-container">
        <div class="header-left">
          <div class="header-icon">
            <i class="fas fa-headset"></i>
          </div>
          <h1>Gestión de Solicitudes</h1>
        </div>
        
        <div class="header-actions">
          <button 
            @click="refreshSolicitudes" 
            class="refresh-button"
            :disabled="isLoading"
          >
            <i class="fas fa-sync-alt" :class="{'fa-spin': isLoading}"></i>
            <span v-if="isLoading">Cargando...</span>
            <span v-else>Actualizar</span>
          </button>
        </div>
      </div>
      
      <div class="stats-bar">
        <div class="stat-item">
          <div class="stat-icon">
            <i class="fas fa-clipboard-list"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ pendingSolicitudes.length }}</div>
            <div class="stat-label">Solicitudes pendientes</div>
          </div>
        </div>
        
        <div class="stat-item">
          <div class="stat-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ waitingStats.averageTime }}</div>
            <div class="stat-label">Tiempo promedio de espera</div>
          </div>
        </div>
        
        <div class="stat-item">
          <div class="stat-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ waitingStats.assistants }}</div>
            <div class="stat-label">Asistentes disponibles</div>
          </div>
        </div>
      </div>
      
      <div v-if="isInitialLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Cargando solicitudes...</p>
      </div>
      
      <div v-else-if="pendingSolicitudes.length === 0" class="empty-state">
        <i class="fas fa-check-circle"></i>
        <h3>No hay solicitudes pendientes</h3>
        <p>Las nuevas solicitudes aparecerán aquí automáticamente.</p>
      </div>
      
      <div v-else>
        <h2 class="section-title">Solicitudes Pendientes</h2>
        
        <div class="solicitudes-list">
          <div 
            v-for="solicitud in pendingSolicitudes" 
            :key="solicitud.id" 
            class="solicitud-card"
            :class="{'solicitud-nueva': esNuevaSolicitud(solicitud.id)}"
          >
            <div class="solicitud-header">
              <div class="user-avatar">
                {{ getInitials(solicitud.userName) }}
              </div>
              <div class="user-info">
                <h3>{{ solicitud.userName }}</h3>
                <div class="waiting-time">
                  <i class="fas fa-hourglass-half"></i>
                  <span>{{ formatWaitingTime(solicitud.timestamp) }}</span>
                </div>
              </div>
              <div class="priority-badge" :class="getPriorityClass(solicitud.timestamp)">
                {{ getPriorityText(solicitud.timestamp) }}
              </div>
            </div>
            
            <div class="solicitud-body">
              <div class="description-label">Descripción:</div>
              <p class="solicitud-description">{{ solicitud.description || 'Sin descripción proporcionada' }}</p>
              
              <div class="solicitud-meta">
                <div class="meta-item">
                  <i class="fas fa-calendar-alt"></i>
                  <span>{{ formatDate(solicitud.timestamp) }}</span>
                </div>
                <div class="meta-item">
                  <i class="fas fa-tag"></i>
                  <span>ID: {{ solicitud.id }}</span>
                </div>
              </div>
            </div>
            
            <div class="solicitud-actions">
              <button @click="atenderSolicitud(solicitud)" class="attend-button">
                <i class="fas fa-headset"></i>
                <span>Atender solicitud</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCallStore } from '../../stores/call.store';
import { solicitudesAsistenciaService } from '../../services/solicitudAsistenciaService';
import { useAuthStore } from '@/stores/authStore';
import { asistenteService } from '../../services/asistenteService';
import { supabase } from '../../../supabase';
import notificationService from '../../services/notificacion.service';

export default {
  name: 'GestionLlamadas',
  setup() {
    const router = useRouter();
    const callStore = useCallStore();
    const { user } = useAuthStore(); // Obtener usuario autenticado
    const pendingSolicitudes = ref([]);
    const isLoading = ref(false); // Cambiar a false inicialmente
    const isInitialLoading = ref(true); // Nuevo flag para carga inicial
    const asistenteInfo = ref(null);
    const autoRefreshInterval = ref(null);
    const solicitudesConocidas = ref(new Set()); // Para rastrear solicitudes ya vistas
    const nuevasSolicitudes = ref(new Set()); // Para destacar solicitudes recién llegadas
    
    // Configurar auto-refresco cada 5 segundos (un poco más lento que antes)
    const startAutoRefresh = () => {
      // Limpiar intervalo existente si hay uno
      if (autoRefreshInterval.value) {
        clearInterval(autoRefreshInterval.value);
      }
      
      // Crear nuevo intervalo
      autoRefreshInterval.value = setInterval(() => {
        silentRefresh(); // Usar actualización silenciosa
      }, 5000); // 5000 ms = 5 segundos
    };

    const stopAutoRefresh = () => {
      if (autoRefreshInterval.value) {
        clearInterval(autoRefreshInterval.value);
        autoRefreshInterval.value = null;
      }
    };

    // Verificar si una solicitud es nueva (para efectos visuales)
    const esNuevaSolicitud = (id) => {
      return nuevasSolicitudes.value.has(id);
    };

    // Estadísticas calculadas
    const waitingStats = computed(() => {
      if (pendingSolicitudes.value.length === 0) {
        return {
          averageTime: '0 min',
          assistants: '0'
        };
      }
      
      // Calcular tiempo promedio (simulado para la demo)
      // En un entorno real, esto vendría de la API
      const minWaitTime = Math.floor(Math.random() * 5) + 1;
      
      return {
        averageTime: `${minWaitTime} min`,
        assistants: Math.floor(Math.random() * 5) + 1
      };
    });
    
    // Configuración de suscripción en tiempo real 
    const setupRealtimeSubscription = () => {
      const notificacionesProcesadas = new Set();

      // Inicializa la suscripción a cambios en la tabla
      const channel = supabase
        .channel('solicitudes_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'solicitudes_asistencia',
            filter: 'estado=eq.pendiente'
          },
          (payload) => {
            // Verificar si la nueva solicitud está pendiente
            if (payload.new.estado === 'pendiente') {
              console.log('Nueva solicitud detectada en componente:', payload.new);

              // Verificar si ya procesamos esta notificación (por ID)
              const notificationKey = `insert_${payload.new.id}`;
              if (notificacionesProcesadas.has(notificationKey)) {
                console.log('Notificación ya procesada, ignorando:', notificationKey);
                return;
              }

              // Limpiar registros antiguos (mantener tamaño del Set controlado)
              if (notificacionesProcesadas.size > 50) {
                const firstKey = notificacionesProcesadas.values().next().value;
                notificacionesProcesadas.delete(firstKey);
              }

              notificacionesProcesadas.add(notificationKey);
              
              // Marcar como nueva solicitud para efectos visuales
              nuevasSolicitudes.value.add(payload.new.id);
              
              // Ya no mostramos notificaciones aquí, lo hace el servicio global
              // Solo actualizamos la UI
              silentRefresh();
              
              // Programar eliminación del estado "nueva" después de 30 segundos
              setTimeout(() => {
                nuevasSolicitudes.value.delete(payload.new.id);
              }, 30000);
            }
          }
        )
        .subscribe();
      
      // Devolver función para limpiar suscripción
      return () => {
        supabase.removeChannel(channel);
      };
    };

    // Obtener información del asistente actual
    const loadAsistenteInfo = async () => {
      try {
        if (user) {
          asistenteInfo.value = await asistenteService.getAsistenteByUserId(user.id);
        }
      } catch (error) {
        console.error('Error al cargar información del asistente:', error);
      }
    };
    
    // Actualización silenciosa que no muestra indicadores de carga
    const silentRefresh = async () => {
      try {
        // No activamos isLoading aquí para evitar parpadeos
        
        // Cargar solicitudes pendientes de video desde el servicio
        const solicitudes = await solicitudesAsistenciaService.getVideoSolicitudes();
        
        // También cargar solicitudes pendientes de chat (para detectar nuevas, aunque no las mostremos)
        const solicitudesChat = await solicitudesAsistenciaService.getChatSolicitudes();
        
        // Transformar solicitudes de video para que coincidan con el formato esperado
        const solicitudesFormateadas = solicitudes.map(s => ({
          id: s.id,
          roomId: s.room_id,
          userName: s.usuario?.nombre || 'Usuario',
          timestamp: s.created_at,
          description: s.descripcion,
          tipo: 'video'
        }));
        
        // Transformar solicitudes de chat
        const solicitudesChatFormateadas = solicitudesChat.map(s => ({
          id: s.id,
          roomId: s.room_id,
          userName: s.usuario?.nombre || 'Usuario',
          timestamp: s.created_at,
          description: s.descripcion,
          tipo: 'chat'
        }));
        
        // Detectar nuevas solicitudes de video que no estaban en la lista anterior
        const nuevasIdsVideo = solicitudesFormateadas
          .filter(s => !solicitudesConocidas.value.has(s.id))
          .map(s => s.id);
        
        // Detectar nuevas solicitudes de chat que no estaban en la lista anterior
        const nuevasIdsChat = solicitudesChatFormateadas
          .filter(s => !solicitudesConocidas.value.has(s.id))
          .map(s => s.id);
        
        // Unir todas las nuevas IDs
        const nuevasIds = [...nuevasIdsVideo, ...nuevasIdsChat];
        
        // Actualizar conjunto de solicitudes conocidas para ambos tipos
        solicitudesFormateadas.forEach(s => {
          solicitudesConocidas.value.add(s.id);
        });
        
        solicitudesChatFormateadas.forEach(s => {
          solicitudesConocidas.value.add(s.id);
        });
        
        // Añadir a la lista de nuevas solicitudes (para destacarlas visualmente)
        // pero ya NO mostramos notificaciones aquí (lo hace el servicio global)
        if (!isInitialLoading.value) {
          nuevasIds.forEach(id => nuevasSolicitudes.value.add(id));
          
          // Programar eliminación del estado "nueva" después de 30 segundos
          nuevasIds.forEach(id => {
            setTimeout(() => {
              nuevasSolicitudes.value.delete(id);
            }, 30000);
          });
        }
        
        // Actualizar lista de solicitudes (solo videollamadas para el display)
        pendingSolicitudes.value = solicitudesFormateadas;
        
      } catch (error) {
        console.error('Error al actualizar silenciosamente las solicitudes:', error);
      } finally {
        // Desactivar indicador de carga inicial si estaba activo
        isInitialLoading.value = false;
      }
    };
    
    // Cargar solicitudes pendientes desde Supabase (con indicadores de carga visibles)
    const loadSolicitudes = async () => {
      isLoading.value = true;
      try {
        await silentRefresh();
      } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        // Mostrar error en la interfaz si es necesario
      } finally {
        isLoading.value = false;
        isInitialLoading.value = false;
      }
    };
    
    // Actualizar solicitudes (llamado por el botón de actualizar)
    const refreshSolicitudes = () => {
      loadSolicitudes(); // Usamos la versión con indicadores visibles para feedback
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
    
    // Obtener iniciales del nombre
    const getInitials = (name) => {
      if (!name) return '?';
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    };
    
    // Formatear fecha completa
    const formatDate = (timestamp) => {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    // Obtener clase de prioridad según tiempo de espera
    const getPriorityClass = (timestamp) => {
      if (!timestamp) return 'priority-normal';
      
      const start = new Date(timestamp);
      const now = new Date();
      const diffMs = now - start;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins > 30) return 'priority-high';
      if (diffMins > 10) return 'priority-medium';
      return 'priority-normal';
    };
    
    // Obtener texto de prioridad
    const getPriorityText = (timestamp) => {
      if (!timestamp) return 'Normal';
      
      const start = new Date(timestamp);
      const now = new Date();
      const diffMs = now - start;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins > 30) return 'Alta';
      if (diffMins > 10) return 'Media';
      return 'Normal';
    };
    
    // Atender una solicitud
    const atenderSolicitud = async (solicitud) => {
      try {
        if (!asistenteInfo.value) {
          alert('No se pudo identificar tu información de asistente.');
          return;
        }
        
        // Actualizar la solicitud en la base de datos
        await solicitudesAsistenciaService.asignarAsistente(
          solicitud.id, 
          asistenteInfo.value.id
        );
        
        // Configurar información en el store
        callStore.setUserRole('asistente');
        callStore.userName = asistenteInfo.value.nombre || 'Asistente Técnico';
        callStore.setCurrentRequest(solicitud);
        
        // Navegar a la nueva ruta de videollamada en lugar de room
        router.push({
          name: 'VideollamadaView',
          params: { id: solicitud.roomId }
        });
      } catch (error) {
        console.error('Error al atender solicitud:', error);
        alert('No se pudo conectar a la sala. Inténtalo de nuevo.');
      }
    };
    
    // Actualizar dinámicamente los tiempos de espera mostrados
    const startTimeUpdater = () => {
      const timeUpdater = setInterval(() => {
        // Forzar actualización de los componentes reactivos
        pendingSolicitudes.value = [...pendingSolicitudes.value];
      }, 60000); // Actualizar cada minuto
      
      return () => clearInterval(timeUpdater);
    };
    
    // Cargar datos al montar el componente
    onMounted(async () => {
      await loadAsistenteInfo();
      await loadSolicitudes();

      // Iniciar auto-refresco
      startAutoRefresh();
      
      // Iniciar actualizador de tiempos
      const clearTimeUpdater = startTimeUpdater();
      
      // Configurar suscripción en tiempo real
      const unsubscribe = setupRealtimeSubscription();
      
      // Limpiar suscripción al desmontar el componente
      onUnmounted(() => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
        stopAutoRefresh();
        clearTimeUpdater();
      });
    });
    
    return {
      pendingSolicitudes,
      isLoading,
      isInitialLoading,
      waitingStats,
      formatWaitingTime,
      formatDate,
      getInitials,
      getPriorityClass,
      getPriorityText,
      atenderSolicitud,
      refreshSolicitudes,
      esNuevaSolicitud
    };
  }
};
</script>

<style scoped>
/* Estilos generales */
.gestion-llamadas {
  position: relative;
  width: 100%;
  min-height: 100vh;
  color: #333;
}

.page-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(135deg, #266cee, #0a4bb3);
  z-index: 0;
}

.page-content {
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Estilos del encabezado */
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.refresh-button {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 0.7rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-button:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.refresh-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.refresh-button i {
  font-size: 0.9rem;
}

/* Barra de estadísticas */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.stat-item {
  background-color: white;
  border-radius: 12px;
  padding: 1.2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background-color: #e8f2ff;
  color: #266cee;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 22px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #266cee;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
}

/* Estado de carga y vacío */
.loading-container {
  background-color: white;
  border-radius: 16px;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.spinner {
  border: 4px solid rgba(38, 108, 238, 0.1);
  border-radius: 50%;
  border-top: 4px solid #266cee;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container p {
  font-size: 1.1rem;
  color: #6c757d;
}

.empty-state {
  background-color: white;
  border-radius: 16px;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.empty-state i {
  font-size: 3.5rem;
  color: #266cee;
  margin-bottom: 1.5rem;
  opacity: 0.7;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 1.1rem;
  color: #6c757d;
  max-width: 400px;
}

/* Título de sección */
.section-title {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 50px;
  height: 4px;
  background: #266cee;
  border-radius: 2px;
}

/* Lista de solicitudes */
.solicitudes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.solicitud-card {
  background-color: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
}

.solicitud-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

/* Estilo para tarjetas de solicitudes nuevas */
.solicitud-nueva {
  animation: highlightNew 1.5s ease-in-out infinite alternate;
  box-shadow: 0 10px 30px rgba(38, 108, 238, 0.2);
  border: 2px solid #266cee;
}

@keyframes highlightNew {
  from { box-shadow: 0 10px 30px rgba(38, 108, 238, 0.2); }
  to { box-shadow: 0 10px 30px rgba(38, 108, 238, 0.5); }
}

.solicitud-header {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  border-bottom: 1px solid #f0f0f0;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #266cee;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 600;
  font-size: 1.2rem;
}

.user-info {
  flex: 1;
}

.user-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  color: #333;
}

.waiting-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #6c757d;
}

.priority-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.priority-normal {
  background-color: #e8f2ff;
  color: #266cee;
}

.priority-medium {
  background-color: #fff8e1;
  color: #ffa000;
}

.priority-high {
  background-color: #ffebee;
  color: #f44336;
}

.solicitud-body {
  padding: 1.5rem;
  flex: 1;
}

.description-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.solicitud-description {
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
  color: #333;
  font-size: 0.95rem;
}

.solicitud-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: auto;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #6c757d;
}

.meta-item i {
  color: #266cee;
}

.solicitud-actions {
  padding: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.attend-button {
  width: 100%;
  background: linear-gradient(135deg, #266cee, #0a4bb3);
  color: white;
  border: none;
  padding: 0.9rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
}

.attend-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(38, 108, 238, 0.3);
}

.attend-button i {
  font-size: 1.1rem;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-content {
    padding: 1.5rem 1rem;
  }
  
  .header-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .stats-bar {
    grid-template-columns: 1fr;
  }
  
  .solicitudes-list {
    grid-template-columns: 1fr;
  }
}

/* Animaciones para notificaciones y actualizaciones suaves */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.solicitud-card {
  animation: fadeIn 0.3s ease-out;
}

/* Transiciones para cambios en la lista */
.solicitudes-list {
  position: relative;
}

.solicitudes-list > * {
  transition: all 0.3s ease;
}

/* Indicador de actualización */
.refresh-indicator {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background-color: rgba(38, 108, 238, 0.9);
  color: white;
  border-radius: 4px;
  font-size: 0.9rem;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.refresh-indicator.active {
  opacity: 1;
  transform: translateY(0);
}
</style>