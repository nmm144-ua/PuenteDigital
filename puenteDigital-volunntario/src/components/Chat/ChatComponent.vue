<!-- src/components/Chat/ChatComponent.vue -->
<template>
    <div class="chat-container">
      <!-- Encabezado del chat -->
      <div class="chat-header">
        <div class="user-info">
          <div v-if="solicitud && solicitud.usuario" class="avatar">
            {{ getInitials(solicitud.usuario.nombre) }}
          </div>
          <div class="user-details">
            <h3>{{ solicitud && solicitud.usuario ? solicitud.usuario.nombre : 'Usuario' }}</h3>
            <span class="status" :class="{'status-active': isActive}">
              {{ isActive ? 'En línea' : 'Desconectado' }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button 
            v-if="!isInCall && solicitud" 
            @click="iniciarLlamada" 
            class="call-button"
            title="Iniciar videollamada"
          >
            <i class="fas fa-video"></i>
          </button>
          <button 
            @click="$emit('close')" 
            class="close-button"
            title="Cerrar chat"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
  
      <!-- Cuerpo del chat (mensajes) -->
      <div class="chat-body" ref="chatBody">
        <div v-if="cargando" class="loading-messages">
          <div class="spinner"></div>
          <p>Cargando mensajes...</p>
        </div>
        
        <div v-else-if="mensajes.length === 0" class="empty-chat">
          <i class="fas fa-comments"></i>
          <p>No hay mensajes aún. Escribe para comenzar la conversación.</p>
        </div>
        
        <template v-else>
          <div 
            v-for="mensaje in mensajes" 
            :key="mensaje.id" 
            class="mensaje" 
            :class="{'mensaje-propio': esMensajePropio(mensaje)}"
          >
            <div class="mensaje-contenido">
              {{ mensaje.contenido }}
            </div>
            <div class="mensaje-info">
              <span class="mensaje-hora">{{ formatTime(mensaje.created_at) }}</span>
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
  </template>
  
  <script>
  import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import { mensajesService } from '../../services/mensajesService';
  import { solicitudesAsistenciaService } from '../../services/solicitudAsistenciaService';
  import { useAuthStore } from '../../stores/authStore';
  import { useCallStore } from '../../stores/call.store';
  
  export default {
    name: 'ChatComponent',
    props: {
      solicitudId: {
        type: [String, Number],
        required: true
      },
      isAsistente: {
        type: Boolean,
        default: false
      }
    },
    emits: ['close'],
    setup(props, { emit }) {
      const router = useRouter();
      const authStore = useAuthStore();
      const callStore = useCallStore();
      
      const mensajes = ref([]);
      const nuevoMensaje = ref('');
      const cargando = ref(true);
      const chatBody = ref(null);
      const messageInput = ref(null);
      const solicitud = ref(null);
      const isActive = ref(false);
      const unsubscribe = ref(null);
      
      // Verificar si estamos en una llamada activa
      const isInCall = ref(false);
      
      // Cargar los datos de la solicitud
      const cargarSolicitud = async () => {
        try {
          solicitud.value = await solicitudesAsistenciaService.getSolicitudById(props.solicitudId);
          if (solicitud.value) {
            // Aquí podríamos verificar el estado de conexión del usuario
            // (implementación pendiente, por ahora asumimos que está activo si hay solicitud)
            isActive.value = true;
          }
        } catch (error) {
          console.error('Error al cargar la solicitud:', error);
        }
      };
      
      // Cargar mensajes históricos
      const cargarMensajes = async () => {
        cargando.value = true;
        try {
          const data = await mensajesService.getMensajesBySolicitud(props.solicitudId);
          mensajes.value = data || [];
          
          // Marcar mensajes como leídos si somos destinatarios
          if (mensajes.value.length > 0) {
            if (props.isAsistente) {
              // Si somos asistente, marcar los mensajes del usuario como leídos
              await mensajesService.marcarComoLeidos(props.solicitudId, null);
            } else {
              // Si somos usuario, marcar los mensajes del asistente como leídos
              await mensajesService.marcarComoLeidos(props.solicitudId, authStore.user.id);
            }
          }
          
          // Desplazar al final del chat
          await scrollToBottom();
        } catch (error) {
          console.error('Error al cargar mensajes:', error);
        } finally {
          cargando.value = false;
        }
      };
      
      // Suscribirse a nuevos mensajes
      const suscribirseANuevosMensajes = () => {
        // Cancelar suscripción anterior si existe
        if (unsubscribe.value && typeof unsubscribe.value === 'function') {
          unsubscribe.value();
        }
        
        // Suscribirse a cambios en los mensajes
        unsubscribe.value = mensajesService.suscribirseAMensajes(
          props.solicitudId,
          async (nuevoMensaje) => {
            // Verificar si el mensaje ya está en la lista para evitar duplicados
            if (!mensajes.value.some(m => m.id === nuevoMensaje.id)) {
              // Obtener datos completos del mensaje (con información de usuario/asistente)
              try {
                const mensajesActualizados = await mensajesService.getMensajesBySolicitud(props.solicitudId);
                const mensajeCompleto = mensajesActualizados.find(m => m.id === nuevoMensaje.id);
                
                if (mensajeCompleto) {
                  mensajes.value.push(mensajeCompleto);
                  
                  // Si no somos el remitente, marcar como leído
                  if (!esMensajePropio(mensajeCompleto)) {
                    if (props.isAsistente) {
                      // Si somos asistente, marcar los mensajes del usuario como leídos
                      await mensajesService.marcarComoLeidos(props.solicitudId, null);
                    } else {
                      // Si somos usuario, marcar los mensajes del asistente como leídos
                      await mensajesService.marcarComoLeidos(props.solicitudId, authStore.user.id);
                    }
                  }
                  
                  // Desplazar al final del chat
                  await scrollToBottom();
                }
              } catch (error) {
                console.error('Error al procesar nuevo mensaje:', error);
              }
            }
          }
        );
      };
      
      // Enviar un mensaje
      const enviarMensaje = async () => {
        if (!nuevoMensaje.value.trim()) return;
        
        try {
          const mensaje = {
            solicitud_id: props.solicitudId,
            contenido: nuevoMensaje.value.trim(),
            tipo: 'texto'
          };
          
          // Agregar ID según el rol
          if (props.isAsistente) {
            mensaje.asistente_id = authStore.user.asistente_id || authStore.user.id;
          } else {
            mensaje.usuario_id = authStore.user.id;
          }
          
          // Enviar mensaje a Supabase
          await mensajesService.enviarMensaje(mensaje);
          
          // Limpiar campo de entrada
          nuevoMensaje.value = '';
          
          // Enfocar el campo de entrada
          if (messageInput.value) {
            messageInput.value.focus();
          }
        } catch (error) {
          console.error('Error al enviar mensaje:', error);
          alert('No se pudo enviar el mensaje. Inténtalo de nuevo.');
        }
      };
      
      // Formatear hora del mensaje
      const formatTime = (timestamp) => {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };
      
      // Verificar si un mensaje es propio
      const esMensajePropio = (mensaje) => {
        if (props.isAsistente) {
          return mensaje.asistente_id && 
            (mensaje.asistente_id === authStore.user.asistente_id || 
             mensaje.asistente_id === authStore.user.id);
        } else {
          return mensaje.usuario_id === authStore.user.id;
        }
      };
      
      // Obtener iniciales para el avatar
      const getInitials = (nombre) => {
        if (!nombre) return '?';
        
        return nombre
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
      };
      
      // Desplazar al final del chat
      const scrollToBottom = async () => {
        await nextTick();
        if (chatBody.value) {
          chatBody.value.scrollTop = chatBody.value.scrollHeight;
        }
      };
      
      // Iniciar una videollamada
      const iniciarLlamada = () => {
        if (!solicitud.value) return;
        
        callStore.setUserRole(props.isAsistente ? 'asistente' : 'usuario');
        callStore.userName = authStore.user.nombre || 'Usuario';
        callStore.setCurrentRequest(solicitud.value);
        
        router.push({
          name: 'VideollamadaView',
          params: { id: solicitud.value.room_id }
        });
      };
      
      // Lifecycle hooks
      onMounted(async () => {
        await cargarSolicitud();
        await cargarMensajes();
        suscribirseANuevosMensajes();
        
        // Enfocar el campo de entrada
        if (messageInput.value) {
          messageInput.value.focus();
        }
        
        // Verificar si estamos en una llamada
        isInCall.value = callStore.isInCall;
      });
      
      onUnmounted(() => {
        // Cancelar suscripción a mensajes
        if (unsubscribe.value && typeof unsubscribe.value === 'function') {
          unsubscribe.value();
        }
      });
      
      // Observar cambios en los mensajes para desplazar al final
      watch(mensajes, async () => {
        await scrollToBottom();
      });
      
      return {
        mensajes,
        nuevoMensaje,
        cargando,
        chatBody,
        messageInput,
        solicitud,
        isActive,
        isInCall,
        enviarMensaje,
        formatTime,
        esMensajePropio,
        getInitials,
        iniciarLlamada
      };
    }
  };
  </script>
  
  <style scoped>
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
  
  .call-button, .close-button {
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
  
  .call-button {
    color: #1976d2;
  }
  
  .call-button:hover {
    background-color: #e3f2fd;
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
  
  .spinner {
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 3px solid #1976d2;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }
  
  .empty-chat i {
    font-size: 2.5rem;
    color: #bdbdbd;
    margin-bottom: 15px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Adaptación para dispositivos móviles */
  @media (max-width: 768px) {
    .chat-container {
      border-radius: 0;
      border: none;
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
  }
  </style>