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
          <div class="status-container">
            <span class="status" :class="{'status-active': isActive}">
              {{ isActive ? 'En línea' : 'Desconectado' }}
            </span>
            <span v-if="solicitud && solicitud.asistente_id" class="status-atendido">
              <i class="fas fa-check-circle"></i> Atendido
            </span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button 
          v-if="solicitud && !solicitud.asistente_id" 
          @click="asignarSolicitud" 
          class="assign-button"
          title="Asignarme esta solicitud"
        >
          <i class="fas fa-user-check"></i>
        </button>
        <!-- Finalizar solicitud-->
        <button 
          v-if="solicitud && solicitud.asistente_id && solicitud.estado !== 'finalizada'" 
          @click="finalizarSolicitud" 
          class="finish-button"
          title="Finalizar solicitud"
        >
          <i class="fas fa-check"></i>
        </button>
        
        <!-- Eliminar solicitud (visible solo si está finalizada) -->
        <button 
          v-if="solicitud && solicitud.estado === 'finalizada'" 
          @click="eliminarSolicitud" 
          class="delete-button"
          title="Eliminar solicitud"
        >
          <i class="fas fa-trash"></i>
        </button>
        <button 
          v-if="!chatStore.isInCall && solicitud" 
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

    <!-- Modal de informe -->
    <informe-modal 
      v-if="mostrarInformeModal" 
      :solicitud-id="solicitudId" 
      @close="mostrarInformeModal = false" 
      @saved="onInformeGuardado"
    />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { solicitudesAsistenciaService } from '../../services/solicitudAsistenciaService';
import { useAuthStore } from '../../stores/authStore';
import { useCallStore } from '../../stores/call.store';
import { useChatStore } from '../../stores/chat.store';
import { asistenteService } from '@/services/asistenteService';
import { supabase } from '../../../supabase';
import InformeModal from '../Asistente/InformeModal.vue';

export default {
  name: 'ChatComponent',
  components: {
    InformeModal
  },
  props: {
    solicitudId: {
      type: [String, Number],
      required: true
    },
    isAsistente: {
      type: Boolean,
      default: true
    }
  },
  emits: ['close', 'solicitud-actualizada', 'solicitud-eliminada'],  
  setup(props, { emit }) {
    const router = useRouter();
    const authStore = useAuthStore();
    const callStore = useCallStore();
    const chatStore = useChatStore();
    
    const nuevoMensaje = ref('');
    const cargando = ref(true);
    const chatBody = ref(null);
    const messageInput = ref(null);
    const solicitud = ref(null);
    const isActive = ref(false);
    const typingTimeout = ref(null);
    const mostrarInformeModal = ref(false);
    
    // Computar mensajes del chat store
    const mensajes = ref([]);

    // Verificar si estamos en una llamada activa
    const isInCall = computed(() => callStore.isInCall);
    
    // Cargar los datos de la solicitud
    const cargarSolicitud = async () => {
      try {
        solicitud.value = await solicitudesAsistenciaService.getSolicitudById(props.solicitudId);
        if (solicitud.value) {
          // Verificar estado de conexión basado en participantes
          isActive.value = chatStore.participants.some(p => 
            p.userRole !== props.isAsistente ? 'asistente' : 'usuario'
          );
          
          // Establecer la solicitud actual en el chat store
          chatStore.setCurrentRequest(solicitud.value);
        }
      } catch (error) {
        console.error('Error al cargar la solicitud:', error);
      }
    };

    // Dentro de ChatComponent.vue, reemplaza esta función:
    const actualizarMensajesDesdeStore = () => {
      const storeMessages = chatStore.messages;
      
      // Verificar si hay nuevos mensajes
      if (storeMessages.length > 0) {
        console.log('ChatComponent: Mensajes desde store detectados', storeMessages);
        
        // Reemplazar la lógica de actualización por una que verifique duplicados cuidadosamente
        const procesados = new Set(); // Para rastrear los mensajes ya procesados
        
        // Procesamos primero los mensajes existentes
        mensajes.value.forEach(m => {
          const key = m.id || 
                    `${m.created_at || m.timestamp}_${m.tipo || m.sender}_${m.contenido || m.message}`;
          procesados.add(key);
        });
        
        // Solo añadir mensajes nuevos que no existan
        const mensajesNuevos = [];
        for (const message of storeMessages) {
          const messageKey = message.id || 
                        `${message.timestamp || message.created_at}_${message.sender || message.tipo}_${message.message || message.contenido}`;
          
          // Si ya fue procesado, omitirlo
          if (procesados.has(messageKey)) continue;
          
          // Marcar como procesado
          procesados.add(messageKey);
          
          // Formatear el mensaje para la vista
          const formattedMessage = {
            id: message.id || Date.now() + Math.floor(Math.random() * 1000),
            contenido: message.message || message.contenido,
            created_at: message.timestamp || message.created_at || new Date().toISOString(),
            tipo: message.sender === authStore.user.nombre ? 'asistente' : 'usuario',
            leido: message.leido || false,
            isLocal: message.isLocal
          };
          
          mensajesNuevos.push(formattedMessage);
        }
        
        // Si hay mensajes nuevos, añadirlos todos juntos (más eficiente que uno por uno)
        if (mensajesNuevos.length > 0) {
          console.log(`Añadiendo ${mensajesNuevos.length} mensajes nuevos desde store`);
          mensajes.value = [...mensajes.value, ...mensajesNuevos];
        }
      }
    };

    // Inicializar chat
    const inicializarChat = async () => {
      cargando.value = true;
      try {
        await cargarSolicitud();
        
        if (solicitud.value) {
          // Configurar store según el rol
          chatStore.setUserRole(props.isAsistente ? 'asistente' : 'usuario');
          
          // Unirse a la sala de chat
          const userId = authStore.user.id;
          const userName = authStore.user.nombre || (props.isAsistente ? 'Asistente' : 'Usuario');
          
          // Inicializar el store
          chatStore.initialize();
          
          // Si no estamos en la sala, unirnos
          if (!chatStore.isInRoom || chatStore.roomId !== solicitud.value.room_id) {
            await chatStore.joinRoom(
              solicitud.value.room_id,
              userName,
              props.isAsistente ? 'asistente' : 'usuario',
              props.solicitudId
            );
          }
                    
          // Desplazar al final del chat
          await scrollToBottom();
        }
      } catch (error) {
        console.error('Error al inicializar chat:', error);
      } finally {
        cargando.value = false;
      }
    };

    // Añadir después de iniciarLlamada() o donde prefieras en el setup
    const asignarSolicitud = async () => {
      if (!solicitud.value) return;
      
      try {
        // Obtener ID del asistente
        const asistenteId = authStore.user.id;        
        
        if (!asistenteId) {
          console.error('No se encontró ID de asistente');
          alert('No se pudo asignar: ID de asistente no disponible');
          return;
        }
        const asistente = await asistenteService.getAsistenteByUserId(asistenteId);

        if (!asistente) {
          console.error('No se encontró ID de asistente');
          alert('No se pudo asignar: ID de asistente no disponible');
          return;
        }
        
        console.log('Asignando solicitud', solicitud.value.id, 'al asistente', asistente.id);
        
        // Llamar al servicio para asignar el asistente
        const solicitudActualizada = await solicitudesAsistenciaService.asignarAsistente(
          solicitud.value.id,
          asistente.id
        );
        
        // Actualizar el objeto de solicitud local
        if (solicitudActualizada) {
          console.log('Solicitud asignada correctamente', solicitudActualizada);
          solicitud.value = solicitudActualizada;
          
          // Actualizar el estado en chatStore
          chatStore.setCurrentRequest(solicitudActualizada);
          
          // Mostrar notificación de éxito
          alert('Solicitud asignada correctamente');
        }
      } catch (error) {
        console.error('Error al asignar solicitud:', error);
        alert('No se pudo asignar la solicitud: ' + error.message);
      }
    };
        
    // Enviar un mensaje
    const enviarMensaje = async () => {
      if (!nuevoMensaje.value.trim()) return;
      
      try {
        // Obtener información del asistente si somos asistente
        let asistenteId = null;
        if (props.isAsistente) {
          const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
          if (!asistente) {
            console.error('No se pudo obtener información del asistente');
            return;
          }
          asistenteId = asistente.id;
        }
        
        // Guardar mensaje original y limpiar input
        const mensajeTexto = nuevoMensaje.value.trim();
        nuevoMensaje.value = '';
        
        // Generar ID único temporal
        const tempId = `temp-${Date.now()}`;
        
        // Añadir mensaje temporal
        const mensajeTemporal = {
          id: tempId,
          contenido: mensajeTexto,
          created_at: new Date().toISOString(),
          tipo: props.isAsistente ? 'asistente' : 'usuario',
          leido: false,
          _enviado: true
        };
        
        // Añadir a lista local
        mensajes.value.push(mensajeTemporal);
        
        // Desplazar al final
        await scrollToBottom();
        
        // Crear objeto para el mensaje real
        const mensaje = {
          solicitud_id: props.solicitudId,
          contenido: mensajeTexto,
          tipo: props.isAsistente ? 'asistente' : 'usuario',
          leido: false,
          _esAsistente: props.isAsistente,
          _asistenteId: props.isAsistente ? asistenteId : null
        };
        
        // Enviar usando el servicio de mensajes (un solo método)
        const mensajeGuardado = await mensajesService.enviarMensaje(mensaje);
        
        if (mensajeGuardado) {
          console.log('Mensaje guardado con éxito:', mensajeGuardado);
          
          // Reemplazar mensaje temporal con el real
          const index = mensajes.value.findIndex(m => m.id === tempId);
          if (index !== -1) {
            mensajes.value[index] = {
              ...mensajeGuardado,
              contenido: mensajeGuardado.contenido,
              _enviado: true 
            };
          }
        }
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        alert('No se pudo enviar el mensaje. Inténtalo de nuevo.');
        
        // Eliminar mensaje temporal en caso de error
        mensajes.value = mensajes.value.filter(m => m.id !== tempId);
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
      chatStore.setTypingStatus(isTyping);
      
      // Si está escribiendo, configurar timeout para desactivar después de 3 segundos
      if (isTyping) {
        typingTimeout.value = setTimeout(() => {
          chatStore.setTypingStatus(false);
        }, 3000);
      }
    };
    
    // Formatear hora del mensaje
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    // Mejora de la función esMensajePropio en ambos componentes
    const esMensajePropio = (mensaje) => {
      // Si el mensaje tiene campo isLocal, usarlo
      if (mensaje.isLocal !== undefined) {
        return mensaje.isLocal;
      }
      
      // Si el mensaje tiene sender y coincide con el nombre del usuario
      if (mensaje.sender && authStore.user && authStore.user.nombre) {
        return mensaje.sender === authStore.user.nombre;
      }
      
      // Verificar si el mensaje es del asistente basado en tipo
      if (mensaje.tipo) {
        if (props.isAsistente) {
          return mensaje.tipo === 'asistente';
        } else {
          return mensaje.tipo === 'usuario';
        }
      }
      
      // Verificar por IDs si están disponibles
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

    // Finalizar una solicitud
    const finalizarSolicitud = async () => {
      if (!solicitud.value || !solicitud.value.id) return;
      
      // Confirmar con el usuario
      if (!confirm('¿Estás seguro de que deseas finalizar esta solicitud? Esta acción marcará la asistencia como completada.')) {
        return;
      }
      
      // Si es un asistente, mostrar el modal para el informe
      if (props.isAsistente) {
        mostrarInformeModal.value = true;
      } else {
        // Si es un usuario, finalizar directamente
        try {
          const solicitudActualizada = await solicitudesAsistenciaService.finalizarSolicitud(solicitud.value.id);
          
          // Actualizar el objeto de solicitud local
          if (solicitudActualizada) {
            console.log('Solicitud finalizada correctamente', solicitudActualizada);
            solicitud.value = solicitudActualizada;
            
            // Actualizar el estado en chatStore
            chatStore.setCurrentRequest(solicitudActualizada);
            
            // Mostrar notificación de éxito
            alert('Solicitud finalizada correctamente');
            
            // Emitir evento para actualizar lista de solicitudes en el componente padre
            emit('solicitud-actualizada');
          }
        } catch (error) {
          console.error('Error al finalizar solicitud:', error);
          alert('No se pudo finalizar la solicitud: ' + error.message);
        }
      }
    };

    // Método para manejar cuando se guarda el informe
    const onInformeGuardado = async () => {
      try {
        const solicitudActualizada = await solicitudesAsistenciaService.finalizarSolicitud(solicitud.value.id);
        
        // Actualizar el objeto de solicitud local
        if (solicitudActualizada) {
          console.log('Solicitud finalizada correctamente con informe', solicitudActualizada);
          solicitud.value = solicitudActualizada;
          
          // Actualizar el estado en chatStore
          chatStore.setCurrentRequest(solicitudActualizada);
          
          // Mostrar notificación de éxito
          alert('Informe guardado y solicitud finalizada correctamente');
          
          // Emitir evento para actualizar lista de solicitudes en el componente padre
          emit('solicitud-actualizada');
        }
      } catch (error) {
        console.error('Error al finalizar solicitud:', error);
        alert('No se pudo finalizar la solicitud: ' + error.message);
      }
      
      // Cerrar el modal
      mostrarInformeModal.value = false;
    };

    // Eliminar una solicitud
    const eliminarSolicitud = async () => {
      if (!solicitud.value || !solicitud.value.id) return;
      
      // Confirmar con el usuario (confirmación más estricta para eliminar)
      if (!confirm('¿Estás COMPLETAMENTE SEGURO de que deseas ELIMINAR esta solicitud? Esta acción eliminará permanentemente todos los mensajes y la solicitud. Esta acción no se puede deshacer.')) {
        return;
      }
      
      try {
        // Primero eliminar todos los mensajes asociados
        await mensajesService.eliminarMensajesPorSolicitud(solicitud.value.id);
        
        // Luego eliminar la solicitud
        await solicitudesAsistenciaService.eliminarSolicitud(solicitud.value.id);
        
        console.log('Solicitud y mensajes eliminados correctamente');
        
        // Mostrar notificación de éxito
        alert('Solicitud eliminada correctamente');
        
        // Emitir evento para cerrar el chat y actualizar lista de solicitudes
        emit('solicitud-eliminada');
        emit('close');
      } catch (error) {
        console.error('Error al eliminar solicitud:', error);
        alert('No se pudo eliminar la solicitud: ' + error.message);
      }
    };
        
    onMounted(async () => {
      await inicializarChat();
      
      // Inicializar mensajes desde el store
      actualizarMensajesDesdeStore();
      
      // Enfocar el campo de entrada
      if (messageInput.value) {
        messageInput.value.focus();
      }
    });

    // Añade esto en onUnmounted para limpieza
    onUnmounted(() => {
      // Limpiar timeout de escritura
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }
      
      // Limpiar canal de Supabase
      if (supabaseChannel.value) {
        supabase.removeChannel(supabaseChannel.value);
      }
    });
        
    // Observar cambios en los mensajes para desplazar al final
    watch(mensajes, async () => {
      await scrollToBottom();
    });

    watch(() => chatStore.messages, (newMessages) => {
      console.log('ChatComponent: Cambio detectado en chatStore.messages', newMessages);
      actualizarMensajesDesdeStore();
    }, { deep: true });

    
    return {
      mensajes,
      nuevoMensaje,
      cargando,
      chatBody,
      messageInput,
      solicitud,
      isActive,
      isInCall,
      chatStore,
      enviarMensaje,
      formatTime,
      esMensajePropio,
      getInitials,
      handleTyping,
      iniciarLlamada,
      asignarSolicitud,
      finalizarSolicitud,
      eliminarSolicitud,
      mostrarInformeModal,
      onInformeGuardado,
      solicitudId: props.solicitudId
    };
  }
};
</script>

<style scoped>
.assign-button {
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
  color: #4caf50; /* Color verde para asignación */
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

/* Modificar estilos existentes para mantener la consistencia */
.call-button:hover, .close-button:hover, .assign-button:hover {
  transform: scale(1.1);
}

.assign-button:hover {
  background-color: #e8f5e9; /* Fondo verde claro al hover */
}

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
  height: 70px; /* Altura fija para el encabezado */
  flex-shrink: 0; /* Evita que se encoja */
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
  /* Aplicar tamaño fijo al cuerpo del chat */
  height: 500px; /* Altura fija, ajusta según necesites */
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  flex: 0 0 auto; /* Evitar que crezca o se encoja */
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
  flex-shrink: 0; /* Evita que se encoja */
  height: 70px; /* Altura fija para el pie de página */
}

.message-input-container {
  display: flex;
  align-items: center;
  height: 100%;
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
  max-height: 50px; /* Limitar altura del input */
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
  height: 100%;
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
  
  /* Ajustar altura para móviles */
  .chat-body {
    height: calc(100vh - 180px); /* Altura dinámica en móviles */
  }
}
</style>