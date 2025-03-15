<!-- src/views/Asistente/GestionLlamadas.vue -->
<template>
  <div class="gestion-llamadas">
    <div class="header-container">
      <h1>Gestión de Solicitudes de Asistencia</h1>
      <button 
        @click="refreshSolicitudes" 
        class="refresh-button"
        :disabled="isLoading"
      >
        <span v-if="isLoading">Cargando...</span>
        <span v-else>Actualizar</span>
      </button>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando solicitudes...</p>
    </div>
    
    <div v-else-if="pendingSolicitudes.length === 0" class="empty-state">
      <p>No hay solicitudes pendientes en este momento.</p>
      <p class="empty-subtitle">Las nuevas solicitudes aparecerán aquí automáticamente.</p>
    </div>
    
    <div v-else class="solicitudes-list">
      <div v-for="solicitud in pendingSolicitudes" :key="solicitud.id" class="solicitud-card">
        <div class="solicitud-info">
          <h3>{{ solicitud.userName }}</h3>
          <p class="solicitud-description">{{ solicitud.description || 'Sin descripción' }}</p>
          <div class="solicitud-meta">
            <span class="waiting-time">
              Esperando: {{ formatWaitingTime(solicitud.timestamp) }}
            </span>
            <span class="room-id">
              ID de Sala: {{ solicitud.roomId }}
            </span>
          </div>
        </div>
        <div class="solicitud-actions">
          <button @click="atenderSolicitud(solicitud)" class="attend-button">
            Atender
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCallStore } from '../../stores/call.store';
import { solicitudesAsistenciaService } from '../../services/solicitudAsistenciaService';
import { useAuthStore } from '@/stores/authStore';
import { asistenteService } from '../../services/asistenteService';
import { supabase } from '../../../supabase';

export default {
  name: 'GestionLlamadas',
  setup() {
    const router = useRouter();
    const callStore = useCallStore();
    const { user } = useAuthStore(); // Obtener usuario autenticado
    const pendingSolicitudes = ref([]);
    const isLoading = ref(true);
    const asistenteInfo = ref(null);
    
    // Configuración de suscripción en tiempo real
    const setupRealtimeSubscription = () => {
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
              // Transformar al formato esperado
              const nuevaSolicitud = {
                id: payload.new.id,
                roomId: payload.new.room_id,
                userName: 'Nuevo usuario', // Se actualizará al cargar solicitudes completas
                timestamp: payload.new.created_at, 
                description: payload.new.descripcion
              };
              
              // Añadir a la lista y notificar
              pendingSolicitudes.value.push(nuevaSolicitud);
              // Aquí podrías añadir una notificación sonora o visual
              
              // Recargar todas las solicitudes para obtener información completa
              loadSolicitudes();
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
    
    // Cargar solicitudes pendientes desde Supabase
    const loadSolicitudes = async () => {
      isLoading.value = true;
      try {
        // Cargar solicitudes pendientes desde el servicio
        const solicitudes = await solicitudesAsistenciaService.getPendienteSolicitudes();
        
        // Transformar para que coincida con el formato esperado por la interfaz
        pendingSolicitudes.value = solicitudes.map(s => ({
          id: s.id,
          roomId: s.room_id,
          userName: s.usuario?.nombre || 'Usuario',
          timestamp: s.created_at,
          description: s.descripcion
        }));
      } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        // Mostrar error en la interfaz si es necesario
      } finally {
        isLoading.value = false;
      }
    };
    
    // Actualizar solicitudes
    const refreshSolicitudes = () => {
      loadSolicitudes();
    };
    
    // Formatear tiempo de espera (mantener como está)
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
    
    // Cargar datos al montar el componente
    onMounted(async () => {
      await loadAsistenteInfo();
      await loadSolicitudes();
      
      // Configurar suscripción en tiempo real
      const unsubscribe = setupRealtimeSubscription();
      
      // Limpiar suscripción al desmontar el componente
      onUnmounted(() => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    });
    
    return {
      pendingSolicitudes,
      isLoading,
      formatWaitingTime,
      atenderSolicitud,
      refreshSolicitudes
    };
  }
};
</script>

<style scoped>
/* Mantener el estilo existente sin cambios */
.gestion-llamadas {
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
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
  margin-left: 20px;
}

.refresh-button:hover {
  background-color: #45a049;
}

.refresh-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
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

.empty-state p {
  font-size: 1.2rem;
  color: #555;
  margin-bottom: 10px;
}

.empty-subtitle {
  font-size: 0.9rem;
  color: #888;
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
}

.solicitud-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 0.85rem;
}

.waiting-time {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 5px 10px;
  border-radius: 15px;
}

.room-id {
  background-color: #eeeeee;
  color: #616161;
  padding: 5px 10px;
  border-radius: 15px;
}

.solicitud-actions {
  margin-top: auto;
}

.attend-button {
  width: 100%;
  background-color: #3f51b5;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.attend-button:hover {
  background-color: #303f9f;
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
  
  .refresh-button {
    align-self: flex-end;
  }
}
</style>