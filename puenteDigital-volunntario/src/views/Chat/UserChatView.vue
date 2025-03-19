<!-- src/views/Usuario/UserChatView.vue -->
<template>
    <div class="chat-view">
      <div class="container">
        <div class="sidebar" :class="{ 'sidebar-mobile-open': sidebarOpen }">
          <div class="sidebar-header">
            <h2>Mis Consultas</h2>
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
          
          <div class="nueva-solicitud">
            <button @click="mostrarFormularioSolicitud = true" class="nueva-solicitud-button">
              <i class="fas fa-plus"></i> Nueva consulta
            </button>
          </div>
          
          <div v-if="isLoading" class="solicitudes-loading">
            <div class="spinner"></div>
            <p>Cargando consultas...</p>
          </div>
          
          <div v-else-if="solicitudes.length === 0" class="solicitudes-empty">
            <i class="fas fa-comments"></i>
            <p>No tienes consultas activas</p>
            <p class="solicitudes-empty-subtitle">Crea una nueva consulta para recibir asistencia</p>
          </div>
          
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
        
        <div class="chat-area">
          <div v-if="!selectedSolicitudId" class="empty-chat-area">
            <div class="empty-state">
              <i class="fas fa-comments"></i>
              <h3>Bienvenido al chat de asistencia</h3>
              <p v-if="solicitudes.length > 0">Selecciona una consulta para continuar la conversación</p>
              <p v-else>Crea una nueva consulta para recibir asistencia</p>
              <div class="empty-state-actions">
                <button 
                  @click="toggleSidebar" 
                  class="select-chat-button mobile-only"
                >
                  Seleccionar consulta
                </button>
                <button 
                  @click="mostrarFormularioSolicitud = true" 
                  class="nueva-consulta-button"
                >
                  <i class="fas fa-plus-circle"></i> Nueva consulta
                </button>
              </div>
            </div>
          </div>
          
          <chat-component 
            v-else
            :solicitud-id="selectedSolicitudId"
            :is-asistente="false"
            @close="selectedSolicitudId = null"
          />
        </div>
      </div>
      
      <!-- Modal de nueva solicitud -->
      <div v-if="mostrarFormularioSolicitud" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Nueva consulta de asistencia</h3>
            <button @click="mostrarFormularioSolicitud = false" class="modal-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="crearSolicitud">
              <div class="form-group">
                <label for="descripcion">Describe tu problema:</label>
                <textarea 
                  id="descripcion" 
                  v-model="nuevaSolicitud.descripcion" 
                  rows="4" 
                  placeholder="Detalla el problema o la consulta para que podamos ayudarte mejor..."
                  required
                ></textarea>
              </div>
              <div class="form-actions">
                <button 
                  type="button"
                  @click="mostrarFormularioSolicitud = false" 
                  class="cancel-button"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  class="submit-button"
                  :disabled="creandoSolicitud"
                >
                  <span v-if="creandoSolicitud">
                    <i class="fas fa-spinner fa-spin"></i> Creando...
                  </span>
                  <span v-else>Crear consulta</span>
                </button>
              </div>
            </form>
          </div>
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
  import { supabase } from '../../../supabase';
  import { v4 as uuidv4 } from 'uuid';
  
  export default {
    name: 'UserChatView',
    components: {
      ChatComponent
    },
    setup() {
      const authStore = useAuthStore();
      const solicitudes = ref([]);
      const selectedSolicitudId = ref(null);
      const isLoading = ref(true);
      const mensajesNoLeidos = ref([]);
      const unsubscribe = ref(null);
      const sidebarOpen = ref(false); // Para vista móvil
      
      // Nueva solicitud
      const mostrarFormularioSolicitud = ref(false);
      const nuevaSolicitud = ref({
        descripcion: '',
      });
      const creandoSolicitud = ref(false);
      
      // Cargar solicitudes del usuario
      const loadSolicitudes = async () => {
        isLoading.value = true;
        try {
          if (authStore.user) {
            // Cargar solicitudes de este usuario
            const data = await solicitudesAsistenciaService.getSolicitudesByUsuario(authStore.user.id);
            
            // Ordenar por fecha
            solicitudes.value = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
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
      
      // Seleccionar una solicitud
      const selectSolicitud = (solicitud) => {
        selectedSolicitudId.value = solicitud.id;
        // Cerrar sidebar en modo móvil
        sidebarOpen.value = false;
      };
      
      // Crear una nueva solicitud
      const crearSolicitud = async () => {
        if (!nuevaSolicitud.value.descripcion.trim()) return;
        
        creandoSolicitud.value = true;
        try {
          // Generar ID de sala único
          const roomId = uuidv4();
          
          // Crear solicitud
          const solicitud = await solicitudesAsistenciaService.createSolicitud({
            usuario_id: authStore.user.id,
            descripcion: nuevaSolicitud.value.descripcion.trim(),
            room_id: roomId
          });
          
          // Cerrar modal
          mostrarFormularioSolicitud.value = false;
          
          // Reiniciar formulario
          nuevaSolicitud.value.descripcion = '';
          
          // Actualizar lista de solicitudes y seleccionar la nueva
          await loadSolicitudes();
          
          // Seleccionar la solicitud recién creada
          if (solicitud) {
            selectSolicitud(solicitud);
          }
        } catch (error) {
          console.error('Error al crear solicitud:', error);
          alert('No se pudo crear la solicitud. Inténtalo de nuevo.');
        } finally {
          creandoSolicitud.value = false;
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
      });
      
      return {
        solicitudes,
        selectedSolicitudId,
        isLoading,
        sidebarOpen,
        mostrarFormularioSolicitud,
        nuevaSolicitud,
        creandoSolicitud,
        selectSolicitud,
        toggleSidebar,
        getInitials,
        formatDate,
        getPreviewText,
        getStatusText,
        tieneNuevosMensajes,
        loadSolicitudes,
        crearSolicitud
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
  
  .nueva-solicitud {
    padding: 15px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .nueva-solicitud-button {
    width: 100%;
    padding: 10px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 500;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    transition: background-color 0.2s;
  }
  
  .nueva-solicitud-button:hover {
    background-color: #0d47a1;
  }
  
  .solicitudes-list {
    flex: 1;
    overflow-y: auto;
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
    background-color: #f44336; /* Color para solicitudes sin asistente */
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    margin-right: 10px;
    flex-shrink: 0;
  }
  
  .avatar-asistente {
    background-color: #1976d2; /* Color para asistentes */
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
  
  .solicitud-status {
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 0.7rem;
    padding: 2px 5px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }
  
  .status-pendiente {
    color: #ff9800;
  }
  
  .status-pendiente .status-dot {
    background-color: #ff9800;
  }
  
  .status-en_proceso {
    color: #1976d2;
  }
  
  .status-en_proceso .status-dot {
    background-color: #1976d2;
  }
  
  .status-finalizada {
    color: #4caf50;
  }
  
  .status-finalizada .status-dot {
    background-color: #4caf50;
  }
  
  .status-cancelada {
    color: #f44336;
  }
  
  .status-cancelada .status-dot {
    background-color: #f44336;
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
  
  .solicitudes-empty-subtitle {
    margin-top: 5px;
    font-size: 0.9rem;
    color: #9e9e9e;
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
  
  .empty-state-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .nueva-consulta-button {
    padding: 10px 20px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background-color 0.2s;
  }
  
  .nueva-consulta-button:hover {
    background-color: #0d47a1;
  }
  
  .select-chat-button {
    display: none;
  }
  
  .mobile-only {
    display: none;
  }
  
  /* Modal de nueva solicitud */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-container {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 90%;
    max-width: 500px;
    overflow: hidden;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #333;
  }
  
  .modal-close {
    background: none;
    border: none;
    color: #757575;
    cursor: pointer;
    font-size: 1.1rem;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
  }
  
  .form-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
  }
  
  .form-group textarea:focus {
    outline: none;
    border-color: #1976d2;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  
  .cancel-button {
    padding: 8px 15px;
    background-color: #f5f5f5;
    color: #757575;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .cancel-button:hover {
    background-color: #e0e0e0;
  }
  
  .submit-button {
    padding: 8px 15px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .submit-button:hover:not(:disabled) {
    background-color: #0d47a1;
  }
  
  .submit-button:disabled {
    background-color: #bdbdbd;
    cursor: not-allowed;
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
    
    .modal-container {
      width: 95%;
    }
  }
  </style>