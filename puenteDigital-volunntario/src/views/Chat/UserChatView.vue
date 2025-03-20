<!-- src/views/Usuario/UserChatView.vue -->
<template>
  <div class="chat-view">
    <div class="container">
      <!-- Panel lateral (Sidebar) -->
      <div class="sidebar" :class="{ 'sidebar-mobile-open': sidebarOpen }">
        <div class="sidebar-header">
          <h2><i class="fas fa-comments"></i> Chat de Asistencia</h2>
          <div class="sidebar-actions">
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
        </div>
        
        <!-- Estado de carga -->
        <div v-if="isLoading" class="solicitudes-loading">
          <div class="spinner"></div>
          <p>Cargando conversaciones...</p>
        </div>
        
        <!-- Estado vacío -->
        <div v-else-if="solicitudes.length === 0" class="solicitudes-empty">
          <div class="empty-icon-container">
            <i class="fas fa-comments"></i>
          </div>
          <h3>No hay conversaciones</h3>
          <p class="solicitudes-empty-subtitle">Las consultas creadas desde la app móvil aparecerán aquí</p>
        </div>
        
        <!-- Lista de conversaciones -->
        <div v-else class="solicitudes-list">
          <div 
            v-for="solicitud in solicitudes" 
            :key="solicitud.id" 
            @click="selectSolicitud(solicitud)" 
            class="solicitud-item"
            :class="{ 'solicitud-active': selectedSolicitudId === solicitud.id }"
          >
            <div 
              class="solicitud-avatar"
              :class="{ 'avatar-asistente': solicitud.asistente }"
            >
              {{ solicitud.asistente ? 
                getInitials(solicitud.asistente.nombre || 'Asistente') : 
                'S' }}
            </div>
            <div class="solicitud-details">
              <div class="solicitud-name">
                {{ solicitud.asistente ? solicitud.asistente.nombre : 'Sin asignar' }}
                <span v-if="tieneNuevosMensajes(solicitud.id)" class="badge">Nuevo</span>
              </div>
              <div class="solicitud-preview">
                {{ getPreviewText(solicitud) }}
              </div>
            </div>
            <div class="solicitud-meta">
              <div class="solicitud-time">
                {{ formatDate(solicitud.created_at) }}
              </div>
              <div class="solicitud-status" :class="'status-' + solicitud.estado">
                <span class="status-dot"></span>
                {{ getStatusText(solicitud.estado) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Área de chat principal -->
      <div class="chat-area">
        <!-- Estado vacío cuando no hay ninguna conversación seleccionada -->
        <div v-if="!selectedSolicitudId" class="empty-chat-area">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-comments"></i>
            </div>
            <h3>Bienvenido al chat de asistencia</h3>
            <p v-if="solicitudes.length > 0">Selecciona una conversación para continuar</p>
            <p v-else>Las conversaciones iniciadas desde la app móvil aparecerán aquí</p>
            <div class="empty-state-actions">
              <button 
                @click="toggleSidebar" 
                class="select-chat-button mobile-only"
              >
                <i class="fas fa-list"></i> Seleccionar conversación
              </button>
            </div>
          </div>
        </div>
        
        <!-- Componente de chat cuando hay una conversación seleccionada -->
        <chat-component 
          v-else
          :solicitud-id="selectedSolicitudId"
          :is-asistente="false"
          @close="closeChatRoom"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import ChatComponent from '../../components/Chat/ChatComponent.vue';
import { solicitudesAsistenciaService } from '../../services/solicitudAsistenciaService';
import { mensajesService } from '../../services/mensajesService';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chat.store';
import { supabase } from '../../../supabase';

export default {
  name: 'UserChatView',
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
    const unsubscribe = ref(null);
    const sidebarOpen = ref(false); // Para vista móvil
    
    // Inicializar chat store
    onMounted(() => {
      chatStore.initialize();
    });
    
    // Cargar solicitudes del usuario (solo tipo chat)
    const loadSolicitudes = async () => {
      isLoading.value = true;
      try {
        if (authStore.user) {
          // Utilizamos el método específico para obtener solicitudes de chat
          let chatSolicitudes = await solicitudesAsistenciaService.getChatSolicitudes();
                    
          // Ordenar por fecha
          solicitudes.value = chatSolicitudes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
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
        if (authStore.user) {
          const data = await mensajesService.getMensajesNoLeidos(authStore.user.id);
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
    
    // Obtener texto de estado
    const getStatusText = (estado) => {
      const estadoText = {
        'pendiente': 'Pendiente',
        'en_proceso': 'En proceso',
        'finalizada': 'Finalizada',
        'cancelada': 'Cancelada'
      };
      
      return estadoText[estado] || 'Desconocido';
    };
    
    // Obtener texto de vista previa
    const getPreviewText = (solicitud) => {
      if (solicitud.descripcion) {
        return solicitud.descripcion.length > 30 
          ? solicitud.descripcion.substring(0, 30) + '...' 
          : solicitud.descripcion;
      }
      
      return 'Sin descripción';
    };
    
    // Configurar suscripción en tiempo real
    const setupRealtimeSubscription = () => {
      // Suscribirse a nuevos mensajes
      const mensajesChannel = supabase
        .channel('usuario_mensajes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes',
            filter: `usuario_id=eq.${authStore.user.id}`
          },
          (payload) => {
            // Actualizar lista de mensajes no leídos
            loadMensajesNoLeidos();
          }
        )
        .subscribe();
      
      // Suscribirse a cambios en solicitudes
      const solicitudesChannel = supabase
        .channel('usuario_solicitudes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE o DELETE
            schema: 'public',
            table: 'solicitudes_asistencia',
            filter: `usuario_id=eq.${authStore.user.id}`
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
      await loadSolicitudes();
      
      // Configurar suscripción a cambios en tiempo real
      if (authStore.user) {
        unsubscribe.value = setupRealtimeSubscription();
      }
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
      selectedSolicitudId,
      isLoading,
      sidebarOpen,
      selectSolicitud,
      closeChatRoom,
      toggleSidebar,
      getInitials,
      formatDate,
      getPreviewText,
      getStatusText,
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
  background-color: #f8f9fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.container {
  max-width: 1400px;
  height: 100%;
  margin: 0 auto;
  display: flex;
  padding: 25px;
}

/* === SIDEBAR STYLES === */
.sidebar {
  width: 350px;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-right: 25px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eaedf3;
  background: linear-gradient(135deg, #3949ab, #1976d2);
  color: white;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-actions {
  display: flex;
  gap: 8px;
}

.refresh-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  width: 34px;
  height: 34px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.refresh-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.close-sidebar-button {
  display: none;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 34px;
  height: 34px;
  border-radius: 8px;
}

/* Lista de solicitudes */
.solicitudes-list {
  flex: 1;
  overflow-y: auto;
}

.solicitud-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eaedf3;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.solicitud-item:hover {
  background-color: #f5f7fa;
}

.solicitud-active {
  background-color: #edf3ff;
  border-left: 3px solid #1976d2;
}

.solicitud-active:hover {
  background-color: #e5eeff;
}

.solicitud-avatar {
  width: 45px;
  height: 45px;
  border-radius: 12px;
  background-color: #f44336; /* Color para solicitudes sin asistente */
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 600;
  font-size: 1rem;
  margin-right: 15px;
  flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.avatar-asistente {
  background: linear-gradient(135deg, #2196f3, #1976d2);
}

.solicitud-details {
  flex: 1;
  min-width: 0;
  padding-right: 10px;
}

.solicitud-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.solicitud-preview {
  font-size: 0.85rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.solicitud-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  gap: 8px;
}

.solicitud-time {
  font-size: 0.75rem;
  color: #888;
}

.solicitud-status {
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status-pendiente {
  background-color: #fff8e1;
  color: #ff9800;
}

.status-pendiente .status-dot {
  background-color: #ff9800;
}

.status-en_proceso {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-en_proceso .status-dot {
  background-color: #1976d2;
}

.status-finalizada {
  background-color: #e8f5e9;
  color: #4caf50;
}

.status-finalizada .status-dot {
  background-color: #4caf50;
}

.status-cancelada {
  background-color: #ffebee;
  color: #f44336;
}

.status-cancelada .status-dot {
  background-color: #f44336;
}

.badge {
  background-color: #f44336;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 500;
}

/* Estados de carga y vacío */
.solicitudes-loading, .solicitudes-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
  height: 100%;
}

.empty-icon-container {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #edf3ff;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.solicitudes-empty i {
  font-size: 2.5rem;
  color: #1976d2;
}

.solicitudes-empty h3 {
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #444;
}

.solicitudes-empty-subtitle {
  margin-top: 5px;
  font-size: 0.9rem;
  color: #888;
}

.spinner {
  border: 3px solid rgba(25, 118, 210, 0.1);
  border-radius: 50%;
  border-top: 3px solid #1976d2;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* === CHAT AREA STYLES === */
.chat-area {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}

.empty-chat-area {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-color: #f5f7fa;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50px;
  text-align: center;
}

.empty-state-icon {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #3949ab, #1976d2);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 25px;
  box-shadow: 0 10px 20px rgba(25, 118, 210, 0.2);
}

.empty-state i {
  font-size: 3rem;
  color: white;
}

.empty-state h3 {
  color: #333;
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.empty-state p {
  color: #666;
  max-width: 350px;
  margin-bottom: 25px;
  line-height: 1.5;
}

.empty-state-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.select-chat-button {
  display: none;
  background: linear-gradient(135deg, #3949ab, #1976d2);
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 10px rgba(25, 118, 210, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-chat-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(25, 118, 210, 0.3);
}

.mobile-only {
  display: none;
}

/* Adaptación para dispositivos móviles */
@media (max-width: 768px) {
  .container {
    padding: 15px;
    position: relative;
  }
  
  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    width: 85%;
    height: 100%;
    z-index: 100;
    margin-right: 0;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar-mobile-open {
    transform: translateX(0);
    box-shadow: 5px 0 25px rgba(0, 0, 0, 0.15);
  }
  
  .chat-area {
    width: 100%;
  }
  
  .mobile-only {
    display: flex;
  }
  
  .close-sidebar-button {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .select-chat-button {
    display: flex;
  }
}
</style>