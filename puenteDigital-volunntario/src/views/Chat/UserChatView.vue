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

              <!-- Nuevo botón para finalizar solicitud -->
              <button 
                v-if="selectedSolicitud && selectedSolicitud.asistente_id && selectedSolicitud.estado !== 'finalizada'" 
                @click="finalizarSolicitud(selectedSolicitud)" 
                class="finish-button"
                title="Finalizar solicitud"
              >
                <i class="fas fa-check"></i>
              </button>
              
              <!-- Nuevo botón para eliminar solicitud -->
              <button 
                v-if="selectedSolicitud && selectedSolicitud.estado === 'finalizada'" 
                @click="eliminarSolicitud(selectedSolicitud)" 
                class="delete-button"
                title="Eliminar solicitud"
              >
                <i class="fas fa-trash"></i>
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
                :key="mensaje.id || `${mensaje.created_at}_${mensaje.contenido}`" 
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
            <div v-if="selectedSolicitud && !selectedSolicitud.asistente_id" class="asignacion-requerida">
              <div class="asignacion-mensaje">
                <i class="fas fa-info-circle"></i>
                Debes asignar esta solicitud antes de iniciar la conversación
              </div>
              <button 
                @click="asignarSolicitud(selectedSolicitud)" 
                class="asignar-button"
              >
                <i class="fas fa-user-check"></i> Asignarme esta solicitud
              </button>
            </div>
            <div v-else class="message-input-container">
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
    const processedMessages = ref(new Set()); // Set para rastrear mensajes procesados
    
    // Filtrar solicitudes por estado para mis conversaciones (con asistente asignado)
    const misConversaciones = computed(() => {
      return solicitudes.value.filter(s => s.asistente_id || s.estado === 'en_proceso');
    });
    
    // Inicializar chat store
    onMounted(() => {
      chatStore.initialize();
      // Limpiar el set de mensajes procesados al iniciar
      processedMessages.value.clear();
    });
    
    // Verificar si un mensaje es duplicado (basado en la implementación de React Native)
    const isMessageDuplicate = (message) => {
      // Generar una clave única basada en el contenido
      const messageKey = message.id 
        ? `id_${message.id}` 
        : `${message.timestamp || message.created_at}_${message.sender || message.tipo}_${message.message || message.contenido}`;
      
      // Si ya tenemos exactamente este mensaje, es duplicado
      if (processedMessages.value.has(messageKey)) {
        console.log('Mensaje ya procesado, ignorando duplicado exacto', messageKey);
        return true;
      }
      
      // Buscar contenido similar dentro de una ventana de tiempo
      const messageContent = message.message || message.contenido;
      const messageTime = new Date(message.timestamp || message.created_at).getTime();
      
      // Verificar similitud con mensajes recientes
      for (const existingKey of processedMessages.value.values()) {
        // Si la clave incluye el mismo contenido, verificar ventana de tiempo
        if (existingKey.includes(messageContent)) {
          // Extraer timestamp aproximado
          const keyParts = existingKey.split('_');
          if (keyParts.length > 0) {
            try {
              const existingTime = new Date(keyParts[0]).getTime();
              const timeDiff = Math.abs(existingTime - messageTime);
              
              if (timeDiff < 5000) { // 5 segundos de tolerancia
                console.log('Mensaje similar detectado dentro de ventana de tiempo', messageContent);
                return true;
              }
            } catch (error) {
              // Continuar si hay error en el parsing
            }
          }
        }
      }
      
      // Verificar si ya existe en el arreglo actual de mensajes
      const duplicateInMessages = chatMessages.value.some(m => {
        // Coincidencia por ID
        if (m.id && m.id === message.id) {
          return true;
        }
        
        // Coincidencia por contenido
        const mContent = m.contenido || m.message;
        if (mContent === messageContent) {
          // Verificar proximidad temporal
          const mTime = new Date(m.created_at || m.timestamp).getTime();
          const timeDiff = Math.abs(mTime - messageTime);
          return timeDiff < 5000; // 5 segundos
        }
        
        return false;
      });
      
      if (duplicateInMessages) {
        console.log('Mensaje ya existe en la lista actual', messageContent);
        return true;
      }
      
      // No es duplicado, registrarlo como procesado
      processedMessages.value.add(messageKey);
      
      // Limitar tamaño del conjunto para evitar crecimiento excesivo
      if (processedMessages.value.size > 100) {
        // Eliminar el más antiguo (el primero del conjunto)
        const firstKey = processedMessages.value.values().next().value;
        processedMessages.value.delete(firstKey);
      }
      
      return false;
    };
    
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
          // En lugar de usar getMensajesNoLeidos, haz una consulta directa a Supabase
          const { data, error } = await supabase
            .from('mensajes')
            .select('id, solicitud_id, leido')
            .eq('leido', false);
          
          if (error) {
            console.error('Error al cargar mensajes no leídos:', error);
            return;
          }
          
          // Actualizar mensajesNoLeidos.value con los resultados
          mensajesNoLeidos.value = data || [];
          console.log('Mensajes no leídos actualizados:', mensajesNoLeidos.value.length);
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
        console.log('Cargando mensajes para solicitud:', solicitudId);
        const mensajes = await mensajesService.getMensajesBySolicitud(solicitudId);
        console.log('Mensajes cargados:', mensajes);
        
        // Asignar mensajes al estado
        chatMessages.value = mensajes;
        
        // Registrar los mensajes existentes en el set de procesados
        mensajes.forEach(mensaje => {
          const key = mensaje.id 
            ? `id_${mensaje.id}` 
            : `${mensaje.created_at}_${mensaje.tipo}_${mensaje.contenido}`;
          
          processedMessages.value.add(key);
        });
        
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
      try {
        console.log('Seleccionando solicitud:', solicitud.id);
        
        // Si ya hay una sala activa, salir primero
        if (chatStore.isInRoom && chatStore.roomId !== solicitud.room_id) {
          chatStore.leaveRoom();
        }
        
        // Establecer la solicitud seleccionada
        selectedSolicitudId.value = solicitud.id;
        
        // Limpiar mensajes anteriores y mostrar estado de carga
        chatMessages.value = [];
        cargandoMensajes.value = true;
        
        // Cargar datos de la solicitud
        await cargarSolicitud(solicitud.id);
        
        // Dos enfoques: 1) Usar supabase directamente o 2) usar chatStore
        // Enfoque 1: Cargar mensajes directamente desde Supabase
        try {
          console.log('Cargando mensajes directamente desde Supabase');
          
          const { data: mensajesData, error } = await supabase
            .from('mensajes')
            .select('*')
            .eq('solicitud_id', solicitud.id)
            .order('created_at', { ascending: true });
          
          if (error) throw error;
          
          if (mensajesData && mensajesData.length > 0) {
            // Formatear mensajes antes de asignarlos
            chatMessages.value = mensajesData.map(msg => ({
              id: msg.id,
              contenido: msg.contenido,
              created_at: msg.created_at,
              tipo: msg.tipo,
              leido: msg.leido || false,
              asistente_id: msg.asistente_id,
              usuario_id: msg.usuario_id
            }));
            
            console.log(`${chatMessages.value.length} mensajes cargados desde Supabase`);
          } else {
            console.log('No hay mensajes en Supabase para esta solicitud');
            chatMessages.value = [];
          }
          
          // Marcar mensajes como leídos (solo los mensajes de tipo usuario)
          const { error: updateError } = await supabase
            .from('mensajes')
            .update({ leido: true })
            .eq('solicitud_id', solicitud.id)
            .eq('tipo', 'usuario')
            .eq('leido', false);
          
          if (updateError) {
            console.error('Error al marcar mensajes como leídos:', updateError);
          } else {
            console.log('Mensajes del usuario marcados como leídos');
            // Actualizar contador de no leídos
            loadMensajesNoLeidos();
          }
        } catch (supabaseError) {
          console.error('Error al cargar mensajes desde Supabase:', supabaseError);
          
          // Enfoque 2: Fallback al método anterior si falla Supabase directo
          console.log('Intentando cargar mensajes con método de respaldo');
          await cargarMensajes(solicitud.id);
        }
        
        // Configurar chatStore (mantener por compatibilidad)
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
        
        // Limpiar el set de mensajes procesados al cambiar de sala
        processedMessages.value.clear();
        
        // Configurar nuevas suscripciones en tiempo real
        unsubscribe.value = setupRealtimeSubscription();
        
        // Desplazar al final del chat
        await nextTick(() => {
          scrollToBottom();
        });
        
        // Cerrar sidebar en modo móvil
        sidebarOpen.value = false;
      } catch (error) {
        console.error('Error al seleccionar solicitud:', error);
        cargandoMensajes.value = false;
        alert('Error al cargar la conversación. Intente nuevamente.');
      } finally {
        // Asegurar que el estado de carga se desactive
        cargandoMensajes.value = false;
      }
    };
    
    // Cerrar chat actual
    const closeChatRoom = () => {
      if (chatStore.isInRoom) {
        chatStore.leaveRoom();
      }
      selectedSolicitudId.value = null;
      selectedSolicitud.value = null;
      chatMessages.value = [];
      processedMessages.value.clear();
    };
    
    // Alternar visibilidad del sidebar en móvil
    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
    };
    
    // Enviar un mensaje
    const enviarMensaje = async () => {
      if (!nuevoMensaje.value.trim() || !selectedSolicitudId.value) return;
      
      // Verificar si la solicitud tiene asistente asignado
      if (selectedSolicitud.value && !selectedSolicitud.value.asistente_id) {
        alert('Debes asignar la solicitud antes de enviar mensajes');
        return;
      }
      
      try {
        // Obtener información del asistente
        const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
        if (!asistente) {
          console.error('No se pudo obtener información del asistente');
          return;
        }
        
        // Guardar y limpiar mensaje antes de enviarlo
        const mensajeTexto = nuevoMensaje.value.trim();
        nuevoMensaje.value = '';
        
        // Crear mensaje temporal para UI inmediata
        const mensajeTemporal = {
          id: `temp-${Date.now()}`,
          contenido: mensajeTexto,
          created_at: new Date().toISOString(),
          tipo: 'asistente',
          leido: false,
          temporal: true
        };
        
        // Añadir mensaje temporal a la lista local
        chatMessages.value.push(mensajeTemporal);
        
        // Scroll inmediato
        nextTick(() => {
          scrollToBottom();
        });
        
        // ENFOQUE 1: Insertar directamente en Supabase
        try {
          console.log('Enviando mensaje directo a Supabase');
          
          // Datos para inserción
          const mensajeData = {
            solicitud_id: selectedSolicitudId.value,
            contenido: mensajeTexto,
            tipo: 'asistente',
            leido: false,
            asistente_id: asistente.id,
            created_at: new Date().toISOString()
          };
          
          // Insertar en la tabla mensajes
          const { data, error } = await supabase
            .from('mensajes')
            .insert(mensajeData)
            .select();
          
          if (error) throw error;
          
          if (data && data[0]) {
            console.log('Mensaje guardado exitosamente en Supabase:', data[0]);
            
            // Reemplazar mensaje temporal con el real si no lo ha hecho la suscripción
            setTimeout(() => {
              const index = chatMessages.value.findIndex(m => m.id === mensajeTemporal.id);
              if (index !== -1) {
                chatMessages.value[index] = {
                  ...data[0],
                  contenido: data[0].contenido // Asegurar contenido correcto
                };
              }
            }, 500);
          }
        } catch (supabaseError) {
          console.error('Error enviando mensaje a Supabase:', supabaseError);
          
          // ENFOQUE 2: Fallback a método anterior
          console.log('Intentando enviar mensaje con método de respaldo');
          
          // Preparar datos del mensaje para el servicio
          const mensaje = {
            solicitud_id: selectedSolicitudId.value,
            contenido: mensajeTexto,
            tipo: 'asistente',
            leido: false,
            _esAsistente: true,
            _asistenteId: asistente.id,
            _usuarioId: null
          };
          
          // Enviar mensaje usando el servicio
          const mensajeGuardado = await mensajesService.enviarMensaje(mensaje);
          
          // Reemplazar mensaje temporal con real
          if (mensajeGuardado) {
            const index = chatMessages.value.findIndex(m => m.id === mensajeTemporal.id);
            if (index !== -1) {
              chatMessages.value[index] = {
                ...mensajeGuardado,
                contenido: mensajeGuardado.contenido
              };
            }
          }
        }
      } catch (error) {
        console.error('Error general al enviar mensaje:', error);
        alert('No se pudo enviar el mensaje. Inténtalo de nuevo.');
        
        // Eliminar mensaje temporal en caso de error
        chatMessages.value = chatMessages.value.filter(m => !m.temporal);
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
      // Si el mensaje tiene campo isLocal explícito, usarlo
      if (mensaje.isLocal !== undefined) {
        return mensaje.isLocal;
      }
      
      // Por propiedad sender si coincide con el nombre del usuario
      if (mensaje.sender && authStore.user && authStore.user.nombre) {
        return mensaje.sender === authStore.user.nombre;
      }
      
      // Por tipo explícito
      if (mensaje.tipo === 'asistente') {
        return true; // En UserChatView somos el asistente
      }
      
      // Verificar si es un mensaje del propio asistente por ID
      return mensaje.asistente_id && mensaje.asistente_id === authStore.user.id;
    };
    
    // Determinar tipo de mensaje de forma más inteligente
    const determinarTipoMensaje = (mensaje) => {
      // Usar tipo explícito si existe
      if (mensaje.tipo) {
        return mensaje.tipo;
      }
      
      // Por propiedad isLocal (indica si es del usuario actual)
      if (mensaje.isLocal !== undefined) {
        return mensaje.isLocal ? 'asistente' : 'usuario';
      }
      
      // Por sender
      if (mensaje.sender) {
        // Si el sender es el nombre del usuario actual y el rol es asistente, es mensaje de asistente
        const nombreUsuario = authStore.user.nombre?.toLowerCase() || '';
        const esAsistente = mensaje.sender.toLowerCase().includes('asist') || 
                           (nombreUsuario && mensaje.sender.toLowerCase().includes(nombreUsuario) && 
                            chatStore.userRole === 'asistente');
        
        return esAsistente ? 'asistente' : 'usuario';
      }
      
      // Fallback basado en el rol actual
      return chatStore.userRole === 'asistente' ? 'asistente' : 'usuario';
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
          
          // Recargar la lista de solicitudes
          await loadSolicitudes();
          
          // Cambiar a la pestaña "Mis Conversaciones"
          activeTab.value = 'conversaciones';
          
          // Seleccionar automáticamente la solicitud recién asignada
          setTimeout(() => {
            const solicitudAsignada = misConversaciones.value.find(s => s.id === solicitudActualizada.id);
            if (solicitudAsignada) {
              selectSolicitud(solicitudAsignada);
            }
          }, 300); // Pequeño delay para que misConversaciones se actualice
          
          // Mostrar notificación de éxito
          alert('Solicitud asignada correctamente');
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
      console.log('Configurando suscripción en tiempo real a Supabase');
      
      // Limpiar cualquier suscripción anterior
      if (unsubscribe.value && typeof unsubscribe.value === 'function') {
        unsubscribe.value();
      }
      
      // Suscripción específica para mensajes de la solicitud actual
      let specificChannel = null;
      if (selectedSolicitudId.value) {
        console.log(`Creando canal específico para solicitud ${selectedSolicitudId.value}`);
        specificChannel = supabase
          .channel(`messages-${selectedSolicitudId.value}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'mensajes',
              filter: `solicitud_id=eq.${selectedSolicitudId.value}`
            },
            async (payload) => {
              console.log('Nuevo mensaje específico detectado:', payload.new);
              
              // Verificar si este mensaje ya existe en la lista
              const yaExiste = chatMessages.value.some(m => 
                (m.id && m.id === payload.new.id) || 
                (m.contenido === payload.new.contenido && 
                  m.created_at && new Date(m.created_at).getTime() === new Date(payload.new.created_at).getTime())
              );
              
              if (!yaExiste) {
                // Crear objeto normalizado con todos los campos necesarios
                const nuevoMensaje = {
                  id: payload.new.id || Date.now() + Math.floor(Math.random() * 1000),
                  contenido: payload.new.contenido,
                  created_at: payload.new.created_at || new Date().toISOString(),
                  tipo: payload.new.tipo || 'usuario',
                  leido: payload.new.leido || false,
                  asistente_id: payload.new.asistente_id,
                  usuario_id: payload.new.usuario_id,
                  source: 'supabase_specific_channel' // Para debugging
                };
                
                console.log('Añadiendo mensaje a chatMessages:', nuevoMensaje);
                
                // Añadir mensaje a la lista usando spread para garantizar reactividad
                chatMessages.value = [...chatMessages.value, nuevoMensaje];
                
                // Si el mensaje no es del asistente (no es nuestro), marcarlo como leído
                if (payload.new.tipo === 'usuario') {
                  // Marcar como leído mediante Supabase directamente
                  const { error } = await supabase
                    .from('mensajes')
                    .update({ leido: true })
                    .eq('id', payload.new.id);
                    
                  if (error) {
                    console.error('Error al marcar mensaje como leído:', error);
                  }
                }
                
                // Actualizar contador de mensajes no leídos
                loadMensajesNoLeidos();
                
                // Desplazar al final
                nextTick(() => {
                  scrollToBottom();
                });
              } else {
                console.log('Mensaje ya existe en la lista, ignorando');
              }
            }
          )
          .subscribe((status) => {
            console.log(`Estado de suscripción de canal específico: ${status}`);
          });
      }
      
      // Canal general para mensajes (cualquier mensaje nuevo en la tabla)
      const generalChannel = supabase
        .channel('general_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes'
          },
          (payload) => {
            console.log('Mensaje general detectado:', payload.new);
            
            // Solo procesar mensajes que no son para la solicitud actual
            // (la solicitud actual ya está siendo manejada por specificChannel)
            if (payload.new.solicitud_id !== selectedSolicitudId.value) {
              // Actualizar contador de mensajes no leídos
              loadMensajesNoLeidos();
            }
          }
        )
        .subscribe((status) => {
          console.log(`Estado de suscripción de canal general: ${status}`);
        });
      
      // Canal para cambios en solicitudes
      const solicitudesChannel = supabase
        .channel('solicitudes_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE o DELETE
            schema: 'public',
            table: 'solicitudes_asistencia'
          },
          (payload) => {
            console.log('Cambio en solicitudes detectado:', payload);
            
            // Actualizar la lista de solicitudes
            loadSolicitudes();
            
            // Si hay una solicitud actual seleccionada y cambió, actualizar sus datos
            if (selectedSolicitudId.value && payload.new && payload.new.id === selectedSolicitudId.value) {
              cargarSolicitud(selectedSolicitudId.value);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Estado de suscripción de canal solicitudes: ${status}`);
        });
      
      // Devolver función para limpiar todas las suscripciones
      return () => {
        console.log('Limpiando suscripciones de Supabase');
        if (specificChannel) {
          supabase.removeChannel(specificChannel);
        }
        supabase.removeChannel(generalChannel);
        supabase.removeChannel(solicitudesChannel);
      };
    };


    // Finalizar una solicitud
    const finalizarSolicitud = async (solicitud) => {
      if (!solicitud || !solicitud.id) return;
      
      // Confirmar con el usuario
      if (!confirm('¿Estás seguro de que deseas finalizar esta solicitud? Esta acción marcará la asistencia como completada.')) {
        return;
      }
      
      try {
        const solicitudActualizada = await solicitudesAsistenciaService.finalizarSolicitud(solicitud.id);
        
        // Actualizar el objeto de solicitud local
        if (solicitudActualizada) {
          console.log('Solicitud finalizada correctamente', solicitudActualizada);
          
          // Actualizar solicitud seleccionada
          if (selectedSolicitudId.value === solicitud.id) {
            selectedSolicitud.value = solicitudActualizada;
          }
          
          // Recargar la lista de solicitudes
          await loadSolicitudes();
          
          // Mostrar notificación de éxito
          alert('Solicitud finalizada correctamente');
        }
      } catch (error) {
        console.error('Error al finalizar solicitud:', error);
        alert('No se pudo finalizar la solicitud: ' + error.message);
      }
    };

    // Eliminar una solicitud
    const eliminarSolicitud = async (solicitud) => {
      if (!solicitud || !solicitud.id) return;
      
      // Confirmar con el usuario (confirmación más estricta para eliminar)
      if (!confirm('¿Estás COMPLETAMENTE SEGURO de que deseas ELIMINAR esta solicitud? Esta acción eliminará permanentemente todos los mensajes y la solicitud. Esta acción no se puede deshacer.')) {
        return;
      }
      
      try {
        // Primero eliminar todos los mensajes asociados
        await mensajesService.eliminarMensajesPorSolicitud(solicitud.id);
        
        // Luego eliminar la solicitud
        await solicitudesAsistenciaService.eliminarSolicitud(solicitud.id);
        
        console.log('Solicitud y mensajes eliminados correctamente');
        
        // Si era la solicitud seleccionada, cerrar la vista
        if (selectedSolicitudId.value === solicitud.id) {
          closeChatRoom();
        }
        
        // Recargar la lista de solicitudes
        await loadSolicitudes();
        
        // Mostrar notificación de éxito
        alert('Solicitud eliminada correctamente');
      } catch (error) {
        console.error('Error al eliminar solicitud:', error);
        alert('No se pudo eliminar la solicitud: ' + error.message);
      }
    };

    
    watch(chatMessages, async () => {
      await scrollToBottom();
      console.log('Mensajes actualizados, desplazando al final');
    }, { deep: true });

    // Crear un contador para mensaje - más eficiente que observar todo el array
    const messageCount = computed(() => chatMessages.value.length);
    watch(messageCount, (newCount, oldCount) => {
      console.log(`Contador de mensajes cambió: ${oldCount} → ${newCount}`);
      if (newCount > oldCount) {
        // Hay nuevos mensajes
        nextTick(() => scrollToBottom());
      }
    });

    // Mantener el watch del chat store, pero solo para compatibilidad
    watch(() => chatStore.messages, (newMessages, oldMessages) => {
      if (!Array.isArray(newMessages) || !Array.isArray(oldMessages)) return;
      
      if (newMessages.length > 0 && selectedSolicitudId.value) {
        console.log('Mensajes actualizados desde store:', newMessages.length);
        
        // Si hay nuevos mensajes
        if (newMessages.length > oldMessages.length) {
          const nuevosMensajes = newMessages.slice(oldMessages.length);
          
          for (const mensaje of nuevosMensajes) {
            console.log('Procesando nuevo mensaje del store:', mensaje);
            
            // Verificar si ya existe (evitar duplicados)
            const yaExiste = chatMessages.value.some(m => 
              (m.id && m.id === mensaje.id) || 
              (m.created_at === mensaje.timestamp && m.contenido === mensaje.message) ||
              (m.contenido === mensaje.message && 
                new Date(m.created_at).getTime() > Date.now() - 10000)
            );
            
            if (!yaExiste) {
              // Añadir mensaje a chatMessages
              chatMessages.value.push({
                id: mensaje.id || `store-${Date.now()}`,
                contenido: mensaje.message || mensaje.contenido,
                created_at: mensaje.timestamp || mensaje.created_at || new Date().toISOString(),
                tipo: determinarTipoMensaje(mensaje),
                leido: false,
                source: 'chatstore'
              });
            } else {
              console.log('Mensaje del store ya existe, ignorando');
            }
          }
        }
      }
    }, { deep: true });
    
    // Eventos del ciclo de vida
    onMounted(async () => {
      console.log('Montando componente UserChatView');
      
      // Inicializar chat store (mantener por compatibilidad)
      chatStore.initialize();
      
      // Limpiar el set de mensajes procesados
      processedMessages.value.clear();
      
      // Cargar solicitudes iniciales
      await loadSolicitudes();
      
      // Configurar suscripción global a cambios en tiempo real
      if (authStore.user) {
        unsubscribe.value = setupRealtimeSubscription();
      }
      
      // Registrar cambios manuales cada 5 segundos (respaldo adicional)
      const intervalId = setInterval(async () => {
        if (selectedSolicitudId.value && !cargandoMensajes.value) {
          try {
            // Comprobar si hay nuevos mensajes no visualizados
            const { data, error } = await supabase
              .from('mensajes')
              .select('id')
              .eq('solicitud_id', selectedSolicitudId.value)
              .eq('leido', false)
              .eq('tipo', 'usuario');
              
            if (error) throw error;
            
            if (data && data.length > 0) {
              console.log(`${data.length} mensajes no leídos detectados, actualizando...`);
              
              // Recargar mensajes
              const { data: newMensajes, error: mensajesError } = await supabase
                .from('mensajes')
                .select('*')
                .eq('solicitud_id', selectedSolicitudId.value)
                .order('created_at', { ascending: true });
                
              if (mensajesError) throw mensajesError;
              
              if (newMensajes) {
                // Verificar si hay mensajes nuevos que no están en la lista actual
                const mensajesNuevos = newMensajes.filter(nuevoMsg => 
                  !chatMessages.value.some(msg => msg.id === nuevoMsg.id)
                );
                
                if (mensajesNuevos.length > 0) {
                  console.log(`Añadiendo ${mensajesNuevos.length} mensajes nuevos desde intervalo`);
                  
                  // Añadir solo los mensajes nuevos
                  mensajesNuevos.forEach(msg => {
                    chatMessages.value.push({
                      id: msg.id,
                      contenido: msg.contenido,
                      created_at: msg.created_at,
                      tipo: msg.tipo,
                      leido: msg.leido,
                      source: 'interval_check'
                    });
                  });
                  
                  // Marcar como leídos
                  await supabase
                    .from('mensajes')
                    .update({ leido: true })
                    .eq('solicitud_id', selectedSolicitudId.value)
                    .eq('tipo', 'usuario')
                    .eq('leido', false);
                }
              }
            }
          } catch (error) {
            console.error('Error en verificación periódica:', error);
          }
        }
      }, 5000); // Comprobar cada 5 segundos
      
      // Eliminar intervalo al desmontar
      onUnmounted(() => {
        clearInterval(intervalId);
      });
    });
    
    onUnmounted(() => {
      console.log('Desmontando componente UserChatView');
      
      // Cancelar suscripciones Realtime
      if (unsubscribe.value && typeof unsubscribe.value === 'function') {
        unsubscribe.value();
      }
      
      // Limpiar sala de chat activa
      if (chatStore.isInRoom) {
        chatStore.cleanup();
      }
      
      // Limpiar timeout de escritura
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }
      
      // Limpiar el set de mensajes procesados
      processedMessages.value.clear();
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
      loadSolicitudes,
      finalizarSolicitud,
      eliminarSolicitud
    };
  }
};
</script>

<style>
/* Estilos para UserChatView.vue */

.chat-view {
  height: 15%;
  min-height: calc(100vh - 80px);
  background-color: #f8f9fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.finish-button, .delete-button {
  background: none;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.finish-button {
  color: #4caf50; /* Verde */
}

.finish-button:hover {
  background-color: #e8f5e9; /* Verde claro */
  transform: scale(1.1);
}

.delete-button {
  color: #f44336; /* Rojo */
}

.delete-button:hover {
  background-color: #ffebee; /* Rojo claro */
  transform: scale(1.1);
}

/* También añadir efectos de escala a los botones existentes */
.assign-button:hover, .close-button:hover {
  transform: scale(1.1);
}

.asignar-button {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
  box-shadow: 0 3px 6px rgba(76, 175, 80, 0.25);
  width: auto;
  margin: 0 auto;
}

.asignar-button i {
  font-size: 1.1rem;
  transition: transform 0.3s ease;
}

.asignar-button:hover {
  background: linear-gradient(135deg, #43a047, #2e7d32);
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(76, 175, 80, 0.35);
}

.asignar-button:hover i {
  transform: scale(1.1);
}

.asignar-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
}

.asignacion-requerida {
  background-color: #f8fcf8;
  padding: 15px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.asignacion-mensaje {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #555;
  font-size: 0.9rem;
  background-color: #f1f8e9;
  padding: 10px 14px;
  border-radius: 6px;
  border-left: 3px solid #4caf50;
}

.asignacion-mensaje i {
  color: #4caf50;
  font-size: 1.1rem;
}


/* MODIFICADO: Asegurar que el contenedor tenga altura completa */
.container {
  max-width: 170;
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
/* MODIFICADO: Asegurar que .chat-area tenga altura completa y use flexbox */
.chat-area {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  min-height: 0; /* Importante para flex en Firefox */
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
/* MODIFICADO: Asegurar que el contenedor de chat use todo el espacio disponible */
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

/* MODIFICADO: Área de mensajes con altura flexible */
.chat-body {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Necesario para flexbox en algunos navegadores */
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

/* MODIFICADO: Footer de chat con altura automática */
.chat-footer {
  padding: 10px 15px;
  background-color: #ffffff;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
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
  max-height: 100px; /* Limitar altura del input */
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
  
  /* MODIFICADO: Adaptación móvil para .chat-body */
  .chat-body {
    height: auto;
    flex: 1;
  }
}
</style>