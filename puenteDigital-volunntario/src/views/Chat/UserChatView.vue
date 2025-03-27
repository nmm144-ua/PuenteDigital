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
        
        <!-- Pestañas de navegación -->
        <div class="sidebar-tabs">
          <button 
            @click="activeTab = 'conversaciones'" 
            class="tab-button" 
            :class="{ 'active': activeTab === 'conversaciones' }"
          >
            <i class="fas fa-comments"></i> Mis Conversaciones
          </button>
          <button 
            @click="activeTab = 'solicitudes'" 
            class="tab-button" 
            :class="{ 'active': activeTab === 'solicitudes' }"
          >
            <i class="fas fa-list-alt"></i> Ver Solicitudes
          </button>
        </div>
        
        <!-- Estado de carga -->
        <div v-if="isLoading" class="solicitudes-loading">
          <div class="spinner"></div>
          <p>Cargando conversaciones...</p>
        </div>
        
        <!-- Estado vacío (Mis Conversaciones) -->
        <div v-else-if="activeTab === 'conversaciones' && misConversaciones.length === 0" class="solicitudes-empty">
          <div class="empty-icon-container">
            <i class="fas fa-comments"></i>
          </div>
          <h3>No hay conversaciones</h3>
          <p class="solicitudes-empty-subtitle">Las conversaciones en las que participas aparecerán aquí</p>
        </div>
        
        <!-- Estado vacío (Ver Solicitudes) -->
        <div v-else-if="activeTab === 'solicitudes' && solicitudesPendientes.length === 0" class="solicitudes-empty">
          <div class="empty-icon-container">
            <i class="fas fa-list-alt"></i>
          </div>
          <h3>No hay solicitudes pendientes</h3>
          <p class="solicitudes-empty-subtitle">Las solicitudes pendientes de asignación aparecerán aquí</p>
        </div>
        
        <!-- Lista de mis conversaciones -->
        <div v-else-if="activeTab === 'conversaciones'" class="solicitudes-list">
          <div 
            v-for="solicitud in misConversaciones" 
            :key="solicitud.id" 
            @click="selectSolicitud(solicitud)" 
            class="solicitud-item"
            :class="{ 'solicitud-active': selectedSolicitudId === solicitud.id }"
          >
            <div 
              class="solicitud-avatar"
              :class="{ 'avatar-asistente': solicitud.asistente, 'avatar-usuario': !solicitud.asistente }"
            >
              {{ solicitud.usuario ? 
                getInitials(solicitud.usuario.nombre || 'Usuario') : 
                'U' }}
            </div>
            <div class="solicitud-details">
              <div class="solicitud-name">
                {{ solicitud.usuario ? solicitud.usuario.nombre : 'Usuario' }}
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
        
        <!-- Lista de solicitudes pendientes -->
        <div v-else-if="activeTab === 'solicitudes'" class="solicitudes-list">
          <div 
            v-for="solicitud in solicitudesPendientes" 
            :key="solicitud.id" 
            @click="selectSolicitud(solicitud)" 
            class="solicitud-item"
            :class="{ 'solicitud-active': selectedSolicitudId === solicitud.id }"
          >
            <div class="solicitud-avatar solicitud-pendiente">
              {{ solicitud.usuario ? getInitials(solicitud.usuario.nombre || 'Usuario') : 'U' }}
            </div>
            <div class="solicitud-details">
              <div class="solicitud-name">
                {{ solicitud.usuario ? solicitud.usuario.nombre : 'Usuario' }}
                <span class="badge badge-new">Nueva</span>
              </div>
              <div class="solicitud-preview">
                {{ getPreviewText(solicitud) }}
              </div>
            </div>
            <div class="solicitud-meta">
              <div class="solicitud-time">
                {{ formatDate(solicitud.created_at) }}
              </div>
              <div class="solicitud-status status-pendiente">
                <span class="status-dot"></span>
                Pendiente
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
            <p v-if="activeTab === 'conversaciones' && misConversaciones.length > 0">
              Selecciona una conversación para continuar
            </p>
            <p v-else-if="activeTab === 'solicitudes' && solicitudesPendientes.length > 0">
              Selecciona una solicitud para atenderla
            </p>
            <p v-else>No hay conversaciones o solicitudes disponibles</p>
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
        
        <!-- Componente de chat modificado para visualización correcta -->
        <div v-else class="chat-container">
          <!-- Encabezado del chat -->
          <div class="chat-header">
            <div class="user-info">
              <div v-if="selectedSolicitud && selectedSolicitud.usuario" class="avatar">
                {{ getInitials(selectedSolicitud.usuario.nombre) }}
              </div>
              <div class="user-details">
                <h3>{{ selectedSolicitud && selectedSolicitud.usuario ? selectedSolicitud.usuario.nombre : 'Usuario' }}</h3>
                <div class="status-container">
                  <span class="status" :class="{'status-active': isActive}">
                    {{ isActive ? 'En línea' : 'Desconectado' }}
                  </span>
                  <span v-if="selectedSolicitud && selectedSolicitud.asistente_id" class="status-atendido">
                    <i class="fas fa-check-circle"></i> Atendido
                  </span>
                </div>
              </div>
            </div>
            <div class="header-actions">
              <button 
                v-if="selectedSolicitud && !selectedSolicitud.asistente_id" 
                @click="asignarSolicitud(selectedSolicitud)" 
                class="assign-button"
                title="Asignarme esta solicitud"
              >
                <i class="fas fa-user-check"></i>
              </button>
              <button 
                @click="closeChatRoom" 
                class="close-button"
                title="Cerrar chat"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <!-- Cuerpo del chat (mensajes) -->
          <div class="chat-body" ref="chatBody">
            <div v-if="cargandoMensajes" class="loading-messages">
              <div class="spinner"></div>
              <p>Cargando mensajes...</p>
            </div>
            
            <div v-else-if="chatMessages.length === 0" class="empty-chat">
              <i class="fas fa-comments"></i>
              <p>No hay mensajes aún. Escribe para comenzar la conversación.</p>
            </div>
            
            <template v-else>
              <div 
                v-for="mensaje in chatMessages" 
                :key="mensaje.id" 
                class="mensaje" 
                :class="{'mensaje-propio': esMensajePropio(mensaje), 'mensaje-usuario': !esMensajePropio(mensaje)}"
              >
                <div class="mensaje-contenido">
                  {{ mensaje.contenido || mensaje.message }}
                </div>
                <div class="mensaje-info">
                  <span class="mensaje-hora">{{ formatTime(mensaje.created_at || mensaje.timestamp) }}</span>
                  <span v-if="esMensajePropio(mensaje)" class="mensaje-estado">
                    <i class="fas fa-check" :class="{'leido': mensaje.leido}"></i>
                  </span>
                </div>
              </div>
            </template>
          </div>

          <!-- Pie de página del chat (entrada de mensaje) -->
          <div class="chat-footer">
            <div class="message-input-container">
              <textarea 
                v-model="nuevoMensaje" 
                class="message-input" 
                placeholder="Escribe un mensaje..." 
                @keydown.enter.prevent="enviarMensaje"
                @input="handleTyping"
                ref="messageInput"
              ></textarea>
              <button 
                @click="enviarMensaje" 
                class="send-button" 
                :disabled="!nuevoMensaje.trim()"
                title="Enviar mensaje"
              >
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import { solicitudesAsistenciaService } from '../../services/solicitudAsistenciaService';
import { mensajesService } from '../../services/mensajesService';
import { asistenteService } from '../../services/asistenteService';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chat.store';
import { supabase } from '../../../supabase';

export default {
  name: 'UserChatView',
  setup() {
    const authStore = useAuthStore();
    const chatStore = useChatStore();
    const solicitudes = ref([]);
    const solicitudesPendientes = ref([]);
    const selectedSolicitudId = ref(null);
    const selectedSolicitud = ref(null);
    const isLoading = ref(true);
    const cargandoMensajes = ref(false);
    const mensajesNoLeidos = ref([]);
    const unsubscribe = ref(null);
    const sidebarOpen = ref(false); // Para vista móvil
    const activeTab = ref('conversaciones'); // Pestaña activa por defecto
    const chatMessages = ref([]); // Mensajes del chat actual
    const nuevoMensaje = ref(''); // Nuevo mensaje a enviar
    const isActive = ref(false); // Estado de conexión del usuario
    const chatBody = ref(null); // Referencia al cuerpo del chat para scroll
    const messageInput = ref(null); // Referencia al input de mensaje
    const typingTimeout = ref(null); // Timeout para evento de escritura
    
    // Filtrar solicitudes por estado para mis conversaciones (con asistente asignado)
    const misConversaciones = computed(() => {
      return solicitudes.value.filter(s => s.asistente_id || s.estado === 'en_proceso');
    });
    
    // Inicializar chat store
    onMounted(() => {
      chatStore.initialize();
    });
    
    // Cargar solicitudes del usuario y solicitudes pendientes
    const loadSolicitudes = async () => {
      isLoading.value = true;
      try {
        if (authStore.user) {
          // Primero verificar si el usuario es asistente
          const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
          
          if (asistente) {
            // Cargar mis conversaciones (solicitudes asignadas al asistente actual)
            let misSolicitudes = await mensajesService.getChatsAtendidosByAsistente(asistente.id);
            solicitudes.value = misSolicitudes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Cargar solicitudes pendientes sin asignar
            let pendientes = await solicitudesAsistenciaService.getPendienteSolicitudes();
            solicitudesPendientes.value = pendientes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          } else {
            // Usuario no es asistente, mostrar mensaje o redirigir
            console.warn('El usuario actual no es un asistente');
            solicitudes.value = [];
            solicitudesPendientes.value = [];
          }
          
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
    
    // Cargar los datos de la solicitud seleccionada
    const cargarSolicitud = async (solicitudId) => {
      try {
        const solicitudData = await solicitudesAsistenciaService.getSolicitudById(solicitudId);
        selectedSolicitud.value = solicitudData;
        
        // Verificar estado de conexión basado en participantes
        if (chatStore.participants) {
          isActive.value = chatStore.participants.some(p => p.userRole === 'usuario');
        }
        
        return solicitudData;
      } catch (error) {
        console.error('Error al cargar datos de la solicitud:', error);
        return null;
      }
    };
    
    // Cargar mensajes de la solicitud seleccionada
    const cargarMensajes = async (solicitudId) => {
      cargandoMensajes.value = true;
      try {
        const mensajes = await mensajesService.getMensajesBySolicitud(solicitudId);
        chatMessages.value = mensajes;
        
        // Marcar mensajes como leídos
        await mensajesService.marcarComoLeidos(solicitudId);
        
        // Desplazar al final del chat
        await scrollToBottom();
        
        return mensajes;
      } catch (error) {
        console.error('Error al cargar mensajes:', error);
        return [];
      } finally {
        cargandoMensajes.value = false;
      }
    };
    
    // Seleccionar una solicitud
    const selectSolicitud = async (solicitud) => {
      // Si ya hay una sala activa, salir primero
      if (chatStore.isInRoom && chatStore.roomId !== solicitud.room_id) {
        chatStore.leaveRoom();
      }
      
      // Establecer la solicitud seleccionada
      selectedSolicitudId.value = solicitud.id;
      
      // Cargar datos de la solicitud
      await cargarSolicitud(solicitud.id);
      
      // Configurar chatStore
      chatStore.setUserRole('asistente');
      
      // Unirse a la sala de chat
      const userId = authStore.user.id;
      const userName = authStore.user.nombre || 'Asistente';
      
      if (!chatStore.isInRoom || chatStore.roomId !== solicitud.room_id) {
        await chatStore.joinRoom(
          solicitud.room_id,
          userName,
          'asistente',
          solicitud.id
        );
      }
      
      // Cargar mensajes de la solicitud
      await cargarMensajes(solicitud.id);
      
      // Cerrar sidebar en modo móvil
      sidebarOpen.value = false;
    };
    
    // Cerrar chat actual
    const closeChatRoom = () => {
      if (chatStore.isInRoom) {
        chatStore.leaveRoom();
      }
      selectedSolicitudId.value = null;
      selectedSolicitud.value = null;
      chatMessages.value = [];
    };
    
    // Alternar visibilidad del sidebar en móvil
    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
    };
    
    // Enviar un mensaje
    const enviarMensaje = async () => {
      if (!nuevoMensaje.value.trim() || !selectedSolicitudId.value) return;
      
      try {
        // Obtener el asistente actual
        const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
        if (!asistente) {
          console.error('No se pudo obtener información del asistente');
          return;
        }
        
        // Preparar datos del mensaje
        const mensaje = {
          solicitud_id: selectedSolicitudId.value,
          contenido: nuevoMensaje.value.trim(),
          tipo: 'asistente', // Tipo asistente para mensajes enviados desde la web
          leido: false,
          _esAsistente: true,
          _asistenteId: asistente.id,
          _usuarioId: null
        };
        
        // Enviar mensaje usando el servicio
        const mensajeGuardado = await mensajesService.enviarMensaje(mensaje);
        
        // Agregar el mensaje a la lista
        if (mensajeGuardado) {
          // Formatear el mensaje para mostrar
          const mensajeFormateado = {
            ...mensajeGuardado,
            remitente: authStore.user.nombre || 'Asistente',
            esDeAsistente: true,
            isLocal: true
          };
          
          chatMessages.value.push(mensajeFormateado);
        }
        
        // Limpiar campo de entrada
        nuevoMensaje.value = '';
        
        // Desplazar al final del chat
        await scrollToBottom();
        
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        alert('No se pudo enviar el mensaje. Inténtalo de nuevo.');
      }
    };
    
    // Manejar eventos de escritura
    const handleTyping = () => {
      // Si hay texto, indicar que está escribiendo
      const isTyping = nuevoMensaje.value.trim().length > 0;
      
      // Limpiar timeout previo
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }
      
      // Establecer estado de escritura
      if (selectedSolicitudId.value) {
        mensajesService.enviarEscribiendo(
          selectedSolicitudId.value,
          authStore.user.id,
          isTyping
        );
      }
      
      // Si está escribiendo, configurar timeout para desactivar después de 3 segundos
      if (isTyping) {
        typingTimeout.value = setTimeout(() => {
          if (selectedSolicitudId.value) {
            mensajesService.enviarEscribiendo(
              selectedSolicitudId.value,
              authStore.user.id,
              false
            );
          }
        }, 3000);
      }
    };
    
    // Desplazar al final del chat
    const scrollToBottom = async () => {
      await nextTick();
      if (chatBody.value) {
        chatBody.value.scrollTop = chatBody.value.scrollHeight;
      }
    };
    
    // Verificar si un mensaje es propio (del asistente)
    const esMensajePropio = (mensaje) => {
      // Si el mensaje tiene campo isLocal, usarlo
      if (mensaje.isLocal !== undefined) {
        return mensaje.isLocal;
      }
      
      // Verificar si el mensaje es del asistente
      return mensaje.tipo === 'asistente' || mensaje.esDeAsistente === true;
    };
    
    // Asignar solicitud a sí mismo
    const asignarSolicitud = async (solicitud) => {
      if (!solicitud) return;
      
      try {
        // Obtener ID del asistente
        const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
        
        if (!asistente) {
          console.error('No se encontró ID de asistente');
          alert('No se pudo asignar: ID de asistente no disponible');
          return;
        }
        
        console.log('Asignando solicitud', solicitud.id, 'al asistente', asistente.id);
        
        // Llamar al servicio para asignar el asistente
        const solicitudActualizada = await solicitudesAsistenciaService.asignarAsistente(
          solicitud.id,
          asistente.id
        );
        
        // Actualizar el objeto de solicitud local
        if (solicitudActualizada) {
          console.log('Solicitud asignada correctamente', solicitudActualizada);
          selectedSolicitud.value = solicitudActualizada;
          
          // Actualizar el estado en chatStore
          chatStore.setCurrentRequest(solicitudActualizada);
          
          // Mostrar notificación de éxito
          alert('Solicitud asignada correctamente');
          
          // Recargar la lista de solicitudes
          await loadSolicitudes();
        }
      } catch (error) {
        console.error('Error al asignar solicitud:', error);
        alert('No se pudo asignar la solicitud: ' + error.message);
      }
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
    
    // Formatear hora del mensaje
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            table: 'mensajes'
          },
          (payload) => {
            // Si hay una solicitud seleccionada y el mensaje es para esta solicitud
            if (selectedSolicitudId.value && payload.new && 
                payload.new.solicitud_id === selectedSolicitudId.value) {
              // Obtener los detalles del mensaje
              mensajesService.getMensajesBySolicitud(selectedSolicitudId.value)
                .then(mensajes => {
                  // Actualizar solo si hay mensaje nuevo
                  if (mensajes.length > chatMessages.value.length) {
                    chatMessages.value = mensajes;
                    scrollToBottom();
                  }
                });
            }
            
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
            table: 'solicitudes_asistencia'
          },
          (payload) => {
            // Actualizar lista de solicitudes
            loadSolicitudes();
            
            // Si la solicitud actual cambió, actualizar los datos
            if (selectedSolicitudId.value && payload.new && 
                payload.new.id === selectedSolicitudId.value) {
              cargarSolicitud(selectedSolicitudId.value);
            }
          }
        )
        .subscribe();
      
      // Devolver función para cancelar suscripciones
      return () => {
        supabase.removeChannel(mensajesChannel);
        supabase.removeChannel(solicitudesChannel);
      };
    };
    
    // Observar cambios en los mensajes para desplazar al final
    watch(chatMessages, async () => {
      await scrollToBottom();
    });
    
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
      
      // Limpiar timeout de escritura
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }
    });
    
    return {
      solicitudes,
      solicitudesPendientes,
      misConversaciones,
      selectedSolicitudId,
      selectedSolicitud,
      isLoading,
      cargandoMensajes,
      sidebarOpen,
      activeTab,
      chatMessages,
      nuevoMensaje,
      isActive,
      chatBody,
      messageInput,
      selectSolicitud,
      closeChatRoom,
      toggleSidebar,
      enviarMensaje,
      handleTyping,
      esMensajePropio,
      asignarSolicitud,
      getInitials,
      formatDate,
      formatTime,
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

/* Pestañas de navegación */
.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #eaedf3;
}

.tab-button {
  flex: 1;
  padding: 15px 10px;
  text-align: center;
  background: none;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  position: relative;
}

.tab-button.active {
  color: #1976d2;
  background-color: #f5f7fa;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: #1976d2;
}

.tab-button:hover:not(.active) {
  background-color: #f8f9fa;
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

.solicitud-pendiente {
  background: linear-gradient(135deg, #ff9800, #f57c00);
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

.badge-new {
  background-color: #ff9800;
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

/* Estilos para el componente de chat incorporado */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f8f9fa;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
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
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-details h3 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.status {
  font-size: 0.8rem;
  color: #888;
}

.status-active {
  color: #4caf50;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.assign-button, .close-button {
  background: none;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.assign-button {
  color: #4caf50;
}

.assign-button:hover {
  background-color: #e8f5e9;
}

.close-button {
  color: #757575;
}

.close-button:hover {
  background-color: #f5f5f5;
}

.chat-body {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.mensaje {
  max-width: 75%;
  margin-bottom: 10px;
  align-self: flex-start;
}

.mensaje-propio {
  align-self: flex-end;
}

.mensaje-usuario {
  align-self: flex-start;
}

.mensaje-contenido {
  padding: 10px 15px;
  border-radius: 18px;
  background-color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  word-break: break-word;
}

.mensaje-propio .mensaje-contenido {
  background-color: #e3f2fd;
  color: #0d47a1;
}

.mensaje-usuario .mensaje-contenido {
  background-color: #f5f5f5;
  color: #333333;
}

.mensaje-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  margin-top: 2px;
  padding: 0 5px;
  color: #757575;
}

.mensaje-hora {
  margin-right: 5px;
}

.mensaje-estado i {
  font-size: 0.8rem;
  color: #bdbdbd;
}

.mensaje-estado i.leido {
  color: #4caf50;
}

.chat-footer {
  padding: 10px 15px;
  background-color: #ffffff;
  border-top: 1px solid #e0e0e0;
}

.message-input-container {
  display: flex;
  align-items: center;
}

.message-input {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  padding: 10px 15px;
  resize: none;
  font-family: inherit;
  font-size: 0.9rem;
  min-height: 20px;
  max-height: 100px;
  overflow-y: auto;
}

.message-input:focus {
  outline: none;
  border-color: #1976d2;
}

.send-button {
  margin-left: 10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #1976d2;
  color: white;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background-color: #0d47a1;
}

.send-button:disabled {
  background-color: #bdbdbd;
  cursor: not-allowed;
}

.loading-messages, .empty-chat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #757575;
  text-align: center;
}

.empty-chat i {
  font-size: 2.5rem;
  color: #bdbdbd;
  margin-bottom: 15px;
}

.status-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-atendido {
  font-size: 0.8rem;
  color: #4caf50;
  display: flex;
  align-items: center;
  gap: 3px;
}

.status-atendido i {
  font-size: 0.9rem;
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
  
  .tab-button {
    padding: 12px 8px;
    font-size: 0.8rem;
  }
  
  .mensaje {
    max-width: 85%;
  }
  
  .avatar {
    width: 35px;
    height: 35px;
    font-size: 0.8rem;
  }
  
  .user-details h3 {
    font-size: 0.9rem;
  }

  .avatar-usuario {
    background: linear-gradient(135deg, #ff9800, #f57c00);
  }
}
</style>