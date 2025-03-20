<!-- src/views/Asistente/ChatView.vue -->
<template>
  <div class="chat-view">
    <div class="container">
      <div class="sidebar" :class="{ 'sidebar-mobile-open': sidebarOpen }">
        <div class="sidebar-header">
          <h2>Chat de Asistencia</h2>
          <button @click="loadSolicitudes" class="refresh-button" title="Actualizar">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoading }"></i>
          </button>
          <button 
            @click="toggleSidebar" 
            class="close-sidebar-button mobile-only" 
            title="Cerrar panel"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div v-if="isLoading" class="solicitudes-loading">
          <div class="spinner"></div>
          <p>Cargando conversaciones...</p>
        </div>
        
        <div v-else-if="solicitudes.length === 0" class="solicitudes-empty">
          <i class="fas fa-comments"></i>
          <p>No hay consultas de chat pendientes</p>
        </div>
        
        <div v-else class="solicitudes-list">
          <!-- Sección de pendientes sin asignar -->
          <div v-if="pendientesSinAsignar.length > 0" class="solicitudes-section">
            <div class="solicitudes-section-title">Pendientes sin asignar</div>
            <div 
              v-for="solicitud in pendientesSinAsignar" 
              :key="solicitud.id" 
              class="solicitud-item"
              :class="{ 'solicitud-active': selectedSolicitudId === solicitud.id }"
            >
              <div @click="selectSolicitud(solicitud)" class="solicitud-content">
                <div class="solicitud-avatar solicitud-avatar-pendiente">
                  {{ getInitials(solicitud.usuario?.nombre || 'Usuario') }}
                </div>
                <div class="solicitud-details">
                  <div class="solicitud-name">
                    {{ solicitud.usuario?.nombre || 'Usuario' }}
                    <span v-if="tieneNuevosMensajes(solicitud.id)" class="badge">Nuevo</span>
                  </div>
                  <div class="solicitud-preview">
                    {{ getPreviewText(solicitud) }}
                  </div>
                </div>
                <div class="solicitud-time">
                  {{ formatDate(solicitud.created_at) }}
                </div>
              </div>
              <button 
                @click="asignarSolicitud(solicitud)" 
                class="asignar-button" 
                title="Asignarme esta solicitud"
              >
                <i class="fas fa-user-check"></i>
              </button>
            </div>
          </div>

          <!-- Sección de asignadas al asistente actual -->
          <div v-if="misAsignadas.length > 0" class="solicitudes-section">
            <div class="solicitudes-section-title">Mis asignaciones</div>
            <div 
              v-for="solicitud in misAsignadas" 
              :key="solicitud.id" 
              @click="selectSolicitud(solicitud)" 
              class="solicitud-item"
              :class="{ 'solicitud-active': selectedSolicitudId === solicitud.id }"
            >
              <div class="solicitud-avatar">
                {{ getInitials(solicitud.usuario?.nombre || 'Usuario') }}
              </div>
              <div class="solicitud-details">
                <div class="solicitud-name">
                  {{ solicitud.usuario?.nombre || 'Usuario' }}
                  <span v-if="tieneNuevosMensajes(solicitud.id)" class="badge">Nuevo</span>
                </div>
                <div class="solicitud-preview">
                  {{ getPreviewText(solicitud) }}
                </div>
              </div>
              <div class="solicitud-time">
                {{ formatDate(solicitud.created_at) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="chat-area">
        <div v-if="!selectedSolicitudId" class="empty-chat-area">
          <div class="empty-state">
            <i class="fas fa-comments"></i>
            <h3>Selecciona una conversación</h3>
            <p>Elige una consulta de chat de la lista para comenzar a atenderla</p>
            <button 
              @click="toggleSidebar" 
              class="select-chat-button mobile-only"
            >
              Seleccionar conversación
            </button>
          </div>
        </div>
        
        <chat-component 
          v-else
          :solicitud-id="selectedSolicitudId"
          :is-asistente="true"
          @close="closeChatRoom"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import ChatComponent from '../../components/Chat/ChatComponent.vue';
import { solicitudesAsistenciaService } from '../../services/solicitudAsistenciaService';
import { mensajesService } from '../../services/mensajesService';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chat.store';
import { asistenteService } from '../../services/asistenteService';
import { supabase } from '../../../supabase';

export default {
  name: 'ChatView',
  components: {
    ChatComponent
  },
  setup() {
    const authStore = useAuthStore();
    const chatStore = useChatStore();
    const solicitudes = ref([]);
    const selectedSolicitudId = ref(null);
    const isLoading = ref(true);
    const mensajesNoLeidos = ref([]);
    const asistenteInfo = ref(null);
    const unsubscribe = ref(null);
    const sidebarOpen = ref(false); // Para vista móvil
    
    // Computed properties para filtrar solicitudes
    const pendientesSinAsignar = computed(() => {
      return solicitudes.value.filter(s => s.estado === 'pendiente' && !s.asistente_id);
    });
    
    const misAsignadas = computed(() => {
      if (!asistenteInfo.value) return [];
      return solicitudes.value.filter(s => s.asistente_id === asistenteInfo.value.id);
    });
    
    // Inicializar chat store
    onMounted(() => {
      chatStore.initialize();
    });
    
    // Cargar información del asistente
    const loadAsistenteInfo = async () => {
      try {
        if (authStore.user) {
          asistenteInfo.value = await asistenteService.getAsistenteByUserId(authStore.user.id);
        }
      } catch (error) {
        console.error('Error al cargar información del asistente:', error);
      }
    };
    
    // Cargar solicitudes
    const loadSolicitudes = async () => {
      isLoading.value = true;
      try {
        if (!asistenteInfo.value) {
          await loadAsistenteInfo();
        }
        
        // Obtener todas las solicitudes de chat usando el método específico
        let chatSolicitudes = await solicitudesAsistenciaService.getChatSolicitudes();
        
        if (asistenteInfo.value) {
          // Si hay asistente, incluir sus solicitudes asignadas (de tipo chat)
          const asignadas = chatSolicitudes.filter(s => s.asistente_id === asistenteInfo.value.id);
          
          // Incluir las pendientes sin asignar
          const pendientes = chatSolicitudes.filter(s => s.estado === 'pendiente' && !s.asistente_id);
          
          // Combinar sin duplicados
          solicitudes.value = [...asignadas, ...pendientes]
            .filter((item, index, self) => 
              index === self.findIndex((t) => t.id === item.id)
            )
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          // Cargar mensajes no leídos
          loadMensajesNoLeidos();
        }
      } catch (error) {
        console.error('Error al cargar solicitudes de chat:', error);
      } finally {
        isLoading.value = false;
      }
    };
    
    // Cargar mensajes no leídos
    const loadMensajesNoLeidos = async () => {
      try {
        if (asistenteInfo.value) {
          const data = await mensajesService.getMensajesNoLeidosAsistente(asistenteInfo.value.id);
          mensajesNoLeidos.value = data || [];
        }
      } catch (error) {
        console.error('Error al cargar mensajes no leídos:', error);
      }
    };
    
    // Verificar si una solicitud tiene mensajes no leídos
    const tieneNuevosMensajes = (solicitudId) => {
      return mensajesNoLeidos.value.some(m => m.solicitud_id === solicitudId);
    };
    
    // Asignar una solicitud al asistente actual
    const asignarSolicitud = async (solicitud) => {
      if (!asistenteInfo.value) {
        console.error('No hay información del asistente');
        return;
      }
      
      try {
        await solicitudesAsistenciaService.asignarAsistente(
          solicitud.id, 
          asistenteInfo.value.id
        );
        
        // Actualizar la lista después de asignar
        await loadSolicitudes();
        
        // Seleccionar la solicitud que acabamos de asignar
        selectedSolicitudId.value = solicitud.id;
      } catch (error) {
        console.error('Error al asignar solicitud:', error);
      }
    };
    
    // Seleccionar una solicitud
    const selectSolicitud = (solicitud) => {
      // Si ya hay una sala activa, salir primero
      if (chatStore.isInRoom && chatStore.roomId !== solicitud.room_id) {
        chatStore.leaveRoom();
      }
      
      // Establecer la solicitud seleccionada
      selectedSolicitudId.value = solicitud.id;
      
      // Cerrar sidebar en modo móvil
      sidebarOpen.value = false;
    };
    
    // Cerrar chat actual
    const closeChatRoom = () => {
      if (chatStore.isInRoom) {
        chatStore.leaveRoom();
      }
      selectedSolicitudId.value = null;
    };
    
    // Alternar visibilidad del sidebar en móvil
    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
    };
    
    // Obtener iniciales para avatar
    const getInitials = (nombre) => {
      if (!nombre) return '?';
      
      return nombre
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    };
    
    // Formatear fecha
    const formatDate = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date >= today) {
        // Hoy: mostrar hora
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (date >= yesterday) {
        // Ayer
        return 'Ayer';
      } else {
        // Otro día: mostrar fecha
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
      }
    };
    
    // Obtener texto de vista previa
    const getPreviewText = (solicitud) => {
      if (solicitud.descripcion) {
        return solicitud.descripcion.length > 30 
          ? solicitud.descripcion.substring(0, 30) + '...' 
          : solicitud.descripcion;
      }
      
      const estadoText = {
        'pendiente': 'Solicitud pendiente',
        'en_proceso': 'En atención',
        'finalizada': 'Asistencia finalizada',
        'cancelada': 'Solicitud cancelada'
      };
      
      return estadoText[solicitud.estado] || 'Sin descripción';
    };
    
    // Configurar suscripción en tiempo real
    const setupRealtimeSubscription = () => {
      // Suscribirse a nuevos mensajes
      const mensajesChannel = supabase
        .channel('nuevos_mensajes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes'
          },
          (payload) => {
            // Actualizar lista de mensajes no leídos
            loadMensajesNoLeidos();
          }
        )
        .subscribe();
      
      // Suscribirse a nuevas solicitudes
      const solicitudesChannel = supabase
        .channel('nuevas_solicitudes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'solicitudes_asistencia'
          },
          (payload) => {
            // Actualizar lista de solicitudes
            loadSolicitudes();
          }
        )
        .subscribe();
      
      // Devolver función para cancelar suscripciones
      return () => {
        supabase.removeChannel(mensajesChannel);
        supabase.removeChannel(solicitudesChannel);
      };
    };
    
    // Eventos del ciclo de vida
    onMounted(async () => {
      await loadAsistenteInfo();
      await loadSolicitudes();
      
      // Configurar suscripción a cambios en tiempo real
      unsubscribe.value = setupRealtimeSubscription();
    });
    
    onUnmounted(() => {
      // Cancelar suscripciones
      if (unsubscribe.value && typeof unsubscribe.value === 'function') {
        unsubscribe.value();
      }
      
      // Limpiar cualquier sala de chat activa
      if (chatStore.isInRoom) {
        chatStore.cleanup();
      }
    });
    
    return {
      solicitudes,
      pendientesSinAsignar,
      misAsignadas,
      selectedSolicitudId,
      isLoading,
      sidebarOpen,
      selectSolicitud,
      asignarSolicitud,
      closeChatRoom,
      toggleSidebar,
      getInitials,
      formatDate,
      getPreviewText,
      tieneNuevosMensajes,
      loadSolicitudes
    };
  }
};
</script>

<style scoped>
.chat-view {
  height: 100%;
  min-height: calc(100vh - 80px);
  background-color: #f5f5f5;
}

.container {
  max-width: 1400px;
  height: 100%;
  margin: 0 auto;
  display: flex;
  padding: 20px;
}

.sidebar {
  width: 320px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-right: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.refresh-button {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.refresh-button:hover {
  background-color: #e3f2fd;
}

.close-sidebar-button {
  display: none;
}

.solicitudes-list {
  flex: 1;
  overflow-y: auto;
}

.solicitudes-section {
  margin-bottom: 15px;
}

.solicitudes-section-title {
  padding: 10px 15px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #616161;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.solicitud-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

/* Modificación para el botón de asignar */
.solicitud-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.solicitud-item:hover {
  background-color: #f9f9f9;
}

.solicitud-active {
  background-color: #e3f2fd;
}

.solicitud-active:hover {
  background-color: #e3f2fd;
}

.solicitud-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #1976d2;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  margin-right: 10px;
  flex-shrink: 0;
}

.solicitud-avatar-pendiente {
  background-color: #ff9800; /* Color para solicitudes pendientes */
}

.solicitud-details {
  flex: 1;
  min-width: 0;
}

.solicitud-name {
  font-weight: 500;
  margin-bottom: 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.solicitud-preview {
  font-size: 0.85rem;
  color: #757575;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.solicitud-time {
  font-size: 0.75rem;
  color: #9e9e9e;
  margin-left: 10px;
  flex-shrink: 0;
}

.asignar-button {
  margin-left: 10px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.asignar-button:hover {
  background-color: #388e3c;
}

.badge {
  background-color: #f44336;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 0.7rem;
  font-weight: normal;
}

.solicitudes-loading, .solicitudes-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 50px 20px;
  text-align: center;
  color: #757575;
}

.solicitudes-empty i {
  font-size: 3rem;
  color: #bdbdbd;
  margin-bottom: 15px;
}

.spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 3px solid #1976d2;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chat-area {
  flex: 1;
  border-radius: 10px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.empty-chat-area {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-color: #fafafa;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  text-align: center;
}

.empty-state i {
  font-size: 4rem;
  color: #e0e0e0;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #424242;
  margin-bottom: 10px;
}

.empty-state p {
  color: #757575;
  max-width: 300px;
  margin-bottom: 20px;
}

.select-chat-button {
  display: none;
}

.mobile-only {
  display: none;
}

/* Adaptación para dispositivos móviles */
@media (max-width: 768px) {
  .container {
    padding: 10px;
    position: relative;
  }
  
  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    width: 85%;
    height: 100%;
    z-index: 10;
    margin-right: 0;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar-mobile-open {
    transform: translateX(0);
  }
  
  .chat-area {
    width: 100%;
  }
  
  .mobile-only {
    display: block;
  }
  
  .close-sidebar-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 30px;
    height: 30px;
    border: none;
    background: none;
    color: #757575;
    cursor: pointer;
  }
  
  .select-chat-button {
    display: block;
    margin-top: 10px;
    padding: 10px 20px;
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #e0e0e0;
    border-radius: 5px;
    cursor: pointer;
  }
}
</style>