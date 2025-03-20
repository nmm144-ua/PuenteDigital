<!-- src/views/Chat/ChatAsistenteView.vue -->
<template>
  <div class="chat-container">
    <!-- Cabecera -->
    <div class="chat-header">
      <div class="user-info">
        <div class="user-avatar">
          <img v-if="solicitud && solicitud.usuario && solicitud.usuario.avatar_url" 
              :src="solicitud.usuario.avatar_url" 
              alt="Avatar del usuario">
          <div v-else class="avatar-placeholder">{{ usuarioInitials }}</div>
        </div>
        <div class="user-details">
          <h2>{{ usuarioNombre }}</h2>
          <span class="status-badge" :class="{ 'online': isUsuarioOnline }">
            {{ isUsuarioOnline ? 'En línea' : 'Desconectado' }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-button" title="Iniciar videollamada" @click="iniciarVideollamada">
          <i class="fas fa-video"></i>
        </button>
        <button class="icon-button" title="Finalizar chat" @click="finalizarChat">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <!-- Contenido principal del chat -->
    <div class="chat-main">
      <!-- Panel de información de la solicitud -->
      <div class="solicitud-panel" v-if="solicitud">
        <div class="panel-header" @click="toggleSolicitudPanel">
          <h3>Detalles de la solicitud</h3>
          <i class="fas" :class="solicitudPanelOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        </div>
        <div class="panel-content" v-if="solicitudPanelOpen">
          <div class="solicitud-info">
            <p><strong>Fecha:</strong> {{ formatDate(solicitud.created_at) }}</p>
            <p><strong>Descripción:</strong> {{ solicitud.descripcion }}</p>
            <p v-if="solicitud.categoria">
              <strong>Categoría:</strong> {{ solicitud.categoria.nombre }}
            </p>
          </div>
        </div>
      </div>

      <!-- Mensajes del chat -->
      <div class="messages-container" ref="messagesContainer">
        <div class="messages-list">
          <div v-if="loading" class="loading-messages">
            <div class="spinner"></div>
            <p>Cargando mensajes...</p>
          </div>
          
          <div v-else-if="messages.length === 0" class="empty-messages">
            <i class="fas fa-comment-dots"></i>
            <p>No hay mensajes. Comienza la conversación escribiendo un mensaje.</p>
          </div>

          <template v-else>
            <div v-for="(msg, index) in groupedMessages" :key="index" class="message-group">
              <div class="date-separator" v-if="msg.isDateSeparator">
                <span>{{ msg.date }}</span>
              </div>
              <div v-else 
                class="message" 
                :class="{ 
                  'own-message': msg.isFromAsistente, 
                  'user-message': !msg.isFromAsistente
                }">
                <div class="message-content">
                  <div class="message-bubble">
                    <p>{{ msg.contenido }}</p>
                  </div>
                  <div class="message-info">
                    <span class="message-time">{{ formatTime(msg.created_at) }}</span>
                    <i v-if="msg.isFromAsistente" class="fas fa-check" :class="{ 'read': msg.leido }"></i>
                  </div>
                </div>
              </div>
            </div>
          </template>
          
          <div v-if="isTyping" class="typing-indicator">
            <div class="typing-bubble">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
            <span class="typing-text">{{ usuarioNombre }} está escribiendo...</span>
          </div>
        </div>
      </div>

      <!-- Área de entrada de mensajes -->
      <div class="message-input-area">
        <textarea 
          ref="messageInput"
          v-model="newMessage" 
          placeholder="Escribe un mensaje..." 
          @keyup.enter="submitIfNotShift"
          @input="handleTyping"></textarea>
        <div class="input-actions">
          <button class="send-button" :disabled="!newMessage.trim()" @click="sendMessage">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
  import { useRouter } from 'vue-router';
  import socketService from '../../services/socket.service';
  import { useCallStore } from '../../stores/call.store';
  import { useSolicitudesStore } from '../../stores/solicitudes.store';
  import { format, isSameDay, isToday, isYesterday } from 'date-fns';
  import { solicitudesAsistenciaService } from '../../services/solicitudAsistenciaService';
  import { supabase } from '../../../supabase'; // Asegúrate de que esta ruta sea correcta
  import { es } from 'date-fns/locale';
  import { useAuthStore } from '@/stores/authStore';
  import { asistenteService } from '../../services/asistenteService';

  export default {
  name: 'ChatAsistenteView',
  props: {
      roomId: {
      type: String,
      required: true
      },
      solicitudId: {
      type: String,
      required: true
      }
  },
  
  setup(props) {
      const router = useRouter();
      const callStore = useCallStore();
      const solicitudesStore = useSolicitudesStore();
      const authStore = useAuthStore();
      
      // Estado del chat
      const messages = ref([]);
      const loading = ref(true);
      const newMessage = ref('');
      const isTyping = ref(false);
      const messagesContainer = ref(null);
      const messageInput = ref(null);
      const typingTimeout = ref(null);
      const isSendingTypingEvent = ref(false);
      const isUsuarioOnline = ref(false);
      const solicitudPanelOpen = ref(true);
      const subscription = ref(null);
      
      // Estado de la solicitud
      const solicitud = ref(null);
      
      // Información del asistente y usuario
      const asistenteInfo = ref(null);
      
      // Cargar información del asistente actual
      const loadAsistenteInfo = async () => {
        try {
          if (authStore.user) {
            asistenteInfo.value = await asistenteService.getAsistenteByUserId(authStore.user.id);
            console.log('Información del asistente en chat:', asistenteInfo.value);
            
            // Actualizar callStore con la información real del asistente
            if (asistenteInfo.value) {
              callStore.userId = asistenteInfo.value.id;
              callStore.userName = asistenteInfo.value.nombre || 'Asistente';
            }
          } else {
            console.error('No hay usuario autenticado');
          }
        } catch (error) {
          console.error('Error al cargar información del asistente:', error);
        }
      };
      
      const asistenteId = computed(() => 
        asistenteInfo.value?.id || callStore.userId
      );
      
      const asistenteName = computed(() => 
        asistenteInfo.value?.nombre || callStore.userName || 'Asistente'
      );
      
      const usuarioId = computed(() => 
      solicitud.value?.usuario_id || 
      messages.value.find(m => !m.isFromAsistente)?.usuario_id
      );
      
      const usuarioNombre = computed(() => 
      solicitud.value?.usuario?.nombre || 
      'Usuario'
      );
      
      const usuarioInitials = computed(() => {
      const nombre = usuarioNombre.value;
      if (!nombre) return '?';
      return nombre.split(' ')
          .map(n => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
      });
      
      // Agrupar mensajes por fecha
      const groupedMessages = computed(() => {
      if (!messages.value.length) return [];
      
      const result = [];
      let lastDate = null;
      
      messages.value.forEach(msg => {
          const msgDate = new Date(msg.created_at);
          
          // Añadir separador de fecha si cambia el día
          if (!lastDate || !isSameDay(lastDate, msgDate)) {
          let dateText;
          if (isToday(msgDate)) {
              dateText = 'Hoy';
          } else if (isYesterday(msgDate)) {
              dateText = 'Ayer';
          } else {
              dateText = format(msgDate, 'EEEE, d MMMM yyyy', { locale: es });
          }
          
          result.push({
              isDateSeparator: true,
              date: dateText
          });
          
          lastDate = msgDate;
          }
          
          result.push(msg);
      });
      
      return result;
      });
      
      // Cargar mensajes iniciales
      const loadMessages = async () => {
      try {
          loading.value = true;
          
          // Obtener la solicitud
          await loadSolicitud();
          
          // Cargar mensajes desde el servicio
          const mensajes = await solicitudesAsistenciaService.getMensajesBySolicitud(props.solicitudId);
          
          console.log('Mensajes cargados:', mensajes);
          
          // Procesar mensajes
          messages.value = mensajes.map(msg => ({
            ...msg,
            isFromAsistente: msg.asistente_id === asistenteId.value
          }));
          
          // Marcar mensajes como leídos
          await markUnreadMessagesAsRead();
          
          // Scrollear al final
          await nextTick();
          scrollToBottom();
      } catch (error) {
          console.error('Error al cargar mensajes:', error);
      } finally {
          loading.value = false;
      }
      };
      
      // Cargar información de la solicitud
      const loadSolicitud = async () => {
      try {
          const data = await solicitudesStore.getSolicitudById(props.solicitudId);
          solicitud.value = data;
          console.log('Solicitud cargada en chat:', data);
      } catch (error) {
          console.error('Error al cargar solicitud:', error);
      }
      };
      
      // Marcar mensajes como leídos
      const markUnreadMessagesAsRead = async () => {
      try {
          // Identificar mensajes no leídos
          const unreadMessages = messages.value.filter(
            msg => !msg.isFromAsistente && !msg.leido
          );
          
          if (unreadMessages.length === 0) return;
          
          console.log('Marcando mensajes como leídos:', unreadMessages.length);
          
          // Actualizar en Supabase
          await solicitudesAsistenciaService.markMensajesAsRead(
            props.solicitudId,
            asistenteId.value,
            true
          );
          
          // Actualizar estado local
          messages.value = messages.value.map(msg => {
            if (!msg.isFromAsistente) {
              return { ...msg, leido: true };
            }
            return msg;
          });
      } catch (error) {
          console.error('Error al marcar mensajes como leídos:', error);
      }
      };
      
      // Enviar mensaje
      const sendMessage = async () => {
      if (!newMessage.value.trim()) return;
      
      try {
          const messageContent = newMessage.value.trim();
          newMessage.value = '';
          
          // Notificar que ya no estamos escribiendo
          sendTypingNotification(false);
          
          // Verificar que tenemos el ID del asistente
          if (!asistenteId.value) {
            console.error('No se ha podido obtener el ID del asistente para enviar mensaje');
            return;
          }
          
          console.log('Enviando mensaje como asistente:', asistenteId.value, 'a usuario:', usuarioId.value);
          
          // Crear objeto de mensaje
          const mensaje = {
            solicitud_id: props.solicitudId,
            asistente_id: asistenteId.value,
            usuario_id: usuarioId.value,
            contenido: messageContent,
            tipo: 'texto',
            leido: false,
            created_at: new Date().toISOString(),
            isFromAsistente: true
          };
          
          // Añadir a la lista local
          messages.value.push(mensaje);
          scrollToBottom();
          
          // Guardar mensaje usando el servicio
          const nuevoMensaje = await solicitudesAsistenciaService.sendMensaje({
            solicitud_id: props.solicitudId,
            asistente_id: asistenteId.value,
            usuario_id: usuarioId.value,
            contenido: messageContent
          });
          
          console.log('Mensaje guardado:', nuevoMensaje);
          
          // Actualizar mensaje en la lista con el ID real
          const index = messages.value.findIndex(
            msg => msg.created_at === mensaje.created_at
          );
          
          if (index !== -1) {
            messages.value[index] = {
              ...nuevoMensaje,
              isFromAsistente: true
            };
          }
          
          // Enviar a través de Socket.io para actualización en tiempo real
          socketService.socket.emit('chat-message', {
            roomId: props.roomId,
            message: messageContent,
            senderId: asistenteId.value,
            senderName: asistenteName.value,
            receiverId: usuarioId.value,
            timestamp: nuevoMensaje.created_at
          });
      } catch (error) {
          console.error('Error al enviar mensaje:', error);
      }
      };
      
      // Enviar al presionar Enter (pero no con Shift+Enter)
      const submitIfNotShift = (event) => {
      if (event.shiftKey) return;
      event.preventDefault();
      sendMessage();
      };
      
      // Manejar evento de escritura
      const handleTyping = () => {
      if (typingTimeout.value) {
          clearTimeout(typingTimeout.value);
      }
      
      // Si no está enviando evento y hay texto, enviar notificación de que está escribiendo
      if (!isSendingTypingEvent.value && newMessage.value.trim()) {
          isSendingTypingEvent.value = true;
          sendTypingNotification(true);
      }
      
      // Establecer timeout para enviar notificación de que ya no está escribiendo
      typingTimeout.value = setTimeout(() => {
          if (isSendingTypingEvent.value) {
          sendTypingNotification(false);
          isSendingTypingEvent.value = false;
          }
      }, 2000);
      };
      
      // Enviar notificación de escritura
      const sendTypingNotification = (isTypingNow) => {
        if (!socketService.socket || !socketService.isConnected) {
          console.log('Socket no conectado, no se puede enviar notificación de escritura');
          return;
        }
        
        socketService.socket.emit('user-typing', {
          roomId: props.roomId,
          userId: asistenteId.value,
          userName: asistenteName.value,
          receiverId: usuarioId.value,
          isTyping: isTypingNow
        });
      };
      
      // Scrollear al final de los mensajes
      const scrollToBottom = () => {
      if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
      };
      
      // Formatear fecha
      const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
      };
      
      // Formatear hora
      const formatTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return format(date, 'HH:mm', { locale: es });
      };
      
      // Mostrar/ocultar panel de solicitud
      const toggleSolicitudPanel = () => {
      solicitudPanelOpen.value = !solicitudPanelOpen.value;
      };
      
      // Iniciar videollamada
      const iniciarVideollamada = async () => {
      if (!usuarioId.value) return;
      
      try {
          // Iniciar stream local
          await callStore.startLocalStream();
          
          // Llamar al usuario
          await callStore.callUser(usuarioId.value);
      } catch (error) {
          console.error('Error al iniciar videollamada:', error);
      }
      };
      
      // Finalizar chat
      const finalizarChat = () => {
      if (confirm('¿Estás seguro que deseas finalizar esta conversación?')) {
          // Notificar a través de Socket.io
          socketService.socket.emit('end-chat', {
            roomId: props.roomId,
            solicitudId: props.solicitudId,
            userId: asistenteId.value,
            motivo: 'Asistencia finalizada'
          });
          
          // Actualizar estado de la solicitud
          solicitudesAsistenciaService.finalizarSolicitud(props.solicitudId)
          .then(() => {
              // Navegar a la lista de solicitudes
              router.push('/asistente');
          })
          .catch(error => {
              console.error('Error al actualizar solicitud:', error);
          });
      }
      };
      
      // Escuchar eventos de Socket.io
      const setupSocketListeners = () => {
        console.log('Configurando escuchas de socket para el chat...');
        
        // Escuchar mensajes nuevos
        socketService.on('chat-message', handleIncomingMessage);
        
        // Escuchar notificaciones de escritura
        socketService.on('user-typing', handleTypingNotification);
        
        // Escuchar cuando un usuario se une o sale
        socketService.on('user-joined', handleUserJoined);
        socketService.on('user-left', handleUserLeft);
        
        // Escuchar finalización de chat
        socketService.on('chat-ended', handleChatEnded);
      };
      
      // Manejar mensaje entrante
      const handleIncomingMessage = (data) => {
        console.log('Mensaje recibido por socket:', data);
        
        // Verificar que el mensaje sea para esta sala y no sea propio
        if (data.roomId !== props.roomId || data.senderId === asistenteId.value) return;
        
        // Crear objeto de mensaje
        const mensaje = {
            id: data.id || Date.now(),
            solicitud_id: props.solicitudId,
            asistente_id: asistenteId.value,
            usuario_id: data.senderId,
            contenido: data.message,
            tipo: 'texto',
            leido: false,
            created_at: data.timestamp || new Date().toISOString(),
            isFromAsistente: false
        };
        
        // Añadir a la lista
        messages.value.push(mensaje);
        
        // Scrollear al final
        nextTick(() => {
            scrollToBottom();
        });
        
        // Marcar como leído
        solicitudesAsistenciaService.markMensajesAsRead(props.solicitudId, asistenteId.value, true);
      };
      
      // Manejar notificación de escritura
      const handleTypingNotification = (data) => {
        // Verificar que la notificación sea de esta sala y del usuario
        if (data.roomId !== props.roomId || 
            data.userId === asistenteId.value || 
            data.userId !== usuarioId.value) return;
        
        // Actualizar estado
        isTyping.value = data.isTyping;
      };
      
      // Manejar cuando un usuario se une
      const handleUserJoined = (participant) => {
        console.log('Usuario unido:', participant);
        if (participant.userId === usuarioId.value) {
            isUsuarioOnline.value = true;
        }
      };
      
      // Manejar cuando un usuario sale
      const handleUserLeft = (data) => {
        console.log('Usuario ha dejado la sala:', data);
        if (data.userId === usuarioId.value) {
            isUsuarioOnline.value = false;
        }
      };
      
      // Manejar finalización de chat
      const handleChatEnded = (data) => {
        alert(`El chat ha sido finalizado${data.userId === usuarioId.value ? ' por el usuario' : ''}.`);
        router.push('/asistente');
      };
      
      // Unirse a la sala
      const joinRoom = async () => {
        try {
          // Primero cargar la información del asistente
          await loadAsistenteInfo();
          
          // Conectar al socket
          await socketService.connect();
          
          console.log('Intentando unirse a sala como:', {
            roomId: props.roomId,
            userId: asistenteId.value,
            userName: asistenteName.value
          });
          
          // Comprobar que tenemos ID de asistente
          if (!asistenteId.value) {
            console.error('No se ha podido obtener el ID del asistente');
            return;
          }
          
          // Unirse a la sala
          socketService.joinRoom(
            props.roomId, 
            asistenteId.value, 
            asistenteName.value, 
            { userRole: 'asistente' }
          );
          
          console.log('Unido a la sala:', props.roomId);
        } catch (error) {
          console.error('Error al unirse a la sala:', error);
        }
      };
      
      // ===== CICLO DE VIDA =====
      
      onMounted(async () => {
        console.log('Montando componente ChatAsistenteView...');
        console.log('roomId:', props.roomId, 'solicitudId:', props.solicitudId);
        
        // Inicializar
        await joinRoom();
        
        // Configurar listeners
        setupSocketListeners();
        
        // Cargar mensajes iniciales
        await loadMessages();
        
        // Enfocar campo de mensaje
        if (messageInput.value) {
            messageInput.value.focus();
        }
        
        // Suscribirse a cambios en mensajes (Supabase Realtime)
        subscription.value = supabase
          .channel('chat_messages')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'mensajes',
              filter: `solicitud_id=eq.${props.solicitudId}`
            },
            (payload) => {
              console.log('Nuevo mensaje por Supabase Realtime:', payload);
              
              // No añadir mensajes propios (ya los añadimos al enviar)
              if (payload.new.asistente_id === asistenteId.value) return;
              
              // Añadir mensaje a la lista
              const mensaje = {
                ...payload.new,
                isFromAsistente: false
              };
              
              // Evitar duplicados
              if (!messages.value.some(m => m.id === mensaje.id)) {
                messages.value.push(mensaje);
                
                // Scrollear al final
                nextTick(() => {
                  scrollToBottom();
                });
                
                // Marcar como leído
                solicitudesAsistenciaService.markMensajesAsRead(props.solicitudId, asistenteId.value, true);
              }
            }
          )
          .subscribe();
        
        console.log('Suscripción a Supabase configurada');
      });
      
      onBeforeUnmount(() => {
        console.log('Desmontando componente ChatAsistenteView...');
        
        // Limpiar listeners
        socketService.off('chat-message');
        socketService.off('user-typing');
        socketService.off('user-joined');
        socketService.off('user-left');
        socketService.off('chat-ended');
        
        // Cancelar suscripción a Supabase
        if (subscription.value) {
          supabase.removeChannel(subscription.value);
        }
        
        // Limpiar timeout
        if (typingTimeout.value) {
          clearTimeout(typingTimeout.value);
        }
      });
      
      // Observar cambios en mensajes para scrollear al final
      watch(messages, () => {
        nextTick(() => {
          scrollToBottom();
        });
      });
      
      return {
        messages,
        loading,
        newMessage,
        isTyping,
        messagesContainer,
        messageInput,
        solicitud,
        usuarioNombre,
        usuarioInitials,
        isUsuarioOnline,
        solicitudPanelOpen,
        groupedMessages,
        
        // Métodos
        sendMessage,
        submitIfNotShift,
        handleTyping,
        scrollToBottom,
        formatDate,
        formatTime,
        toggleSolicitudPanel,
        iniciarVideollamada,
        finalizarChat
      };
  }
  };
</script>
  
  <style scoped>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #f5f7fb;
  }
  
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background-color: #fff;
    border-bottom: 1px solid #e0e0e0;
    height: 70px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .user-info {
    display: flex;
    align-items: center;
  }
  
  .user-avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    overflow: hidden;
    margin-right: 12px;
    background-color: #e0e0e0;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .avatar-placeholder {
    font-size: 18px;
    font-weight: bold;
    color: #fff;
    background-color: #1976D2;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .user-details {
    display: flex;
    flex-direction: column;
  }
  
  .user-details h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
  
  .status-badge {
    font-size: 12px;
    color: #777;
  }
  
  .status-badge.online {
    color: #4CAF50;
  }
  
  .header-actions {
    display: flex;
    gap: 10px;
  }
  
  .icon-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #f0f0f0;
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .icon-button:hover {
    background-color: #e0e0e0;
  }
  
  .icon-button i {
    font-size: 18px;
    color: #555;
  }
  
  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .solicitud-panel {
    background-color: #fff;
    margin: 10px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .panel-header {
    padding: 10px 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #f5f5f5;
    cursor: pointer;
  }
  
  .panel-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #444;
  }
  
  .panel-content {
    padding: 15px;
    border-top: 1px solid #eee;
  }
  
  .solicitud-info p {
    margin: 5px 0;
    font-size: 14px;
    color: #555;
  }
  
  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 10px 20px;
  }
  
  .messages-list {
    display: flex;
    flex-direction: column;
  }
  
  .loading-messages, .empty-messages {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px;
    color: #777;
  }
  
  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #1976D2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .empty-messages i {
    font-size: 40px;
    color: #ccc;
    margin-bottom: 10px;
  }
  
  .date-separator {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 15px 0;
    position: relative;
  }
  
  .date-separator span {
    background-color: #f5f7fb;
    padding: 0 10px;
    font-size: 12px;
    color: #777;
    z-index: 1;
  }
  
  .date-separator:before {
    content: '';
    position: absolute;
    width: 100%;
    height: 1px;
    background-color: #e0e0e0;
    z-index: 0;
  }
  
  .message {
    display: flex;
    margin-bottom: 10px;
    max-width: 70%;
  }
  
  .own-message {
    align-self: flex-end;
  }
  
  .user-message {
    align-self: flex-start;
  }
  
  .message-content {
    display: flex;
    flex-direction: column;
  }
  
  .message-bubble {
    padding: 10px 15px;
    border-radius: 18px;
    position: relative;
  }
  
  .own-message .message-bubble {
    background-color: #1976D2;
    color: white;
    border-bottom-right-radius: 4px;
  }
  
  .user-message .message-bubble {
    background-color: white;
    color: #333;
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  .message-bubble p {
    margin: 0;
    word-break: break-word;
    line-height: 1.4;
  }
  
  .message-info {
    display: flex;
    align-items: center;
    margin-top: 2px;
    font-size: 11px;
  }
  
  .own-message .message-info {
    justify-content: flex-end;
  }
  
  .message-time {
    color: #999;
    margin-right: 5px;
  }
  
  .own-message .message-time {
    color: #ccc;
  }
  
  .own-message .message-info i {
    font-size: 12px;
    color: #aaa;
  }
  
  .own-message .message-info i.read {
    color: #4CAF50;
  }
  
  .typing-indicator {
    display: flex;
    align-items: center;
    margin-top: 5px;
    margin-bottom: 10px;
  }
  
  .typing-bubble {
    background-color: #f1f1f1;
    padding: 6px 12px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    margin-right: 8px;
  }
  
  .typing-bubble .dot {
    width: 6px;
    height: 6px;
    background-color: #999;
    border-radius: 50%;
    margin: 0 2px;
    animation: typingAnimation 1.5s infinite ease-in-out;
  }
  
  .typing-bubble .dot:nth-child(1) {
    animation-delay: 0s;
  }
  
  .typing-bubble .dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-bubble .dot:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes typingAnimation {
    0% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0); }
  }
  
  .typing-text {
    font-size: 12px;
    color: #999;
  }
  
  .message-input-area {
    padding: 15px;
    background-color: #fff;
    border-top: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
  }
  
  textarea {
    flex: 1;
    border: 1px solid #e0e0e0;
    border-radius: 20px;
    padding: 10px 15px;
    resize: none;
    outline: none;
    max-height: 100px;
    min-height: 24px;
    line-height: 1.4;
    font-family: inherit;
    font-size: 14px;
  }
  
  .input-actions {
    margin-left: 10px;
  }
  
  .send-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #1976D2;
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .send-button:hover {
    background-color: #1565C0;
  }
  
  .send-button:disabled {
    background-color: #ccc;
    cursor: default;
  }
  
  .send-button i {
    color: white;
    font-size: 16px;
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .message {
      max-width: 85%;
    }
    
    .chat-header {
      padding: 8px 12px;
      height: 60px;
    }
    
    .user-avatar {
      width: 36px;
      height: 36px;
    }
    
    .icon-button {
      width: 35px;
      height: 35px;
    }
  }
  </style>a