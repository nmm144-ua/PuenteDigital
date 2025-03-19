<!-- src/views/Asistente/ChatView.vue -->
<template>
  <div class="chat-view">
    <div class="container">
      <div class="sidebar" :class="{ 'sidebar-mobile-open': sidebarOpen }">
        <div class="sidebar-header">
          <h2>Conversaciones</h2>
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
          <p>No hay conversaciones activas</p>
        </div>
        
        <div v-else class="solicitudes-list">
          <div 
            v-for="solicitud in solicitudes" 
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
      
      <div class="chat-area">
        <div v-if="!selectedSolicitudId" class="empty-chat-area">
          <div class="empty-state">
            <i class="fas fa-comments"></i>
            <h3>Selecciona una conversación</h3>
            <p>Elige una conversación de la lista para comenzar a chatear</p>
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
          @close="selectedSolicitudId = null"
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
import { asistenteService } from '../../services/asistenteService';
import { supabase } from '../../../supabase';

export default {
  name: 'ChatView',
  components: {
    ChatComponent
  },
  setup() {
    const authStore = useAuthStore();
    const solicitudes = ref([]);
    const selectedSolicitudId = ref(null);
    const isLoading = ref(true);
    const mensajesNoLeidos = ref([]);
    const asistenteInfo = ref(null);
    const unsubscribe = ref(null);
    const sidebarOpen = ref(false); // Para vista móvil
    
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
        
        if (asistenteInfo.value) {
          // Cargar solicitudes asignadas a este asistente o pendientes
          const data = await solicitudesAsistenciaService.getSolicitudesByAsistente(asistenteInfo.value.id);
          
          // También podemos incluir las pendientes si queremos
          const pendientes = await solicitudesAsistenciaService.getPendienteSolicitudes();
          
          // Combinar y ordenar por fecha
          solicitudes.value = [...data, ...pendientes]
            .filter((item, index, self) => 
              index === self.findIndex((t) => t.id === item.id)
            )
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          // Cargar mensajes no leídos
          loadMensajesNoLeidos();
        }
      } catch (error) {
        console.error('Error al cargar solicitudes:', error);
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
    
    // Seleccionar una solicitud
    const selectSolicitud = (solicitud) => {
      selectedSolicitudId.value = solicitud.id;
      // Cerrar sidebar en modo móvil
      sidebarOpen.value = false;
      
      // Si la solicitud está pendiente y somos asistente, asignarla automáticamente
      if (solicitud.estado === 'pendiente' && asistenteInfo.value) {
        solicitudesAsistenciaService.asignarAsistente(
          solicitud.id, 
          asistenteInfo.value.id
        ).catch(error => {
          console.error('Error al asignar solicitud:', error);
        });
      }
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
            event: 'INSERT',
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
    });
    
    return {
      solicitudes,
      selectedSolicitudId,
      isLoading,
      sidebarOpen,
      selectSolicitud,
      toggleSidebar,
      getInitials,
      formatDate,
      getPreviewText,
      tieneNuevosMensajes,
      loadSolicitudes
    };
  }
}
  </script>