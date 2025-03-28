<!-- src/views/VideoCall/RoomView.vue -->
<template>
  <div class="room-container" :class="{ 'in-call': isInCall }">
    <!-- Panel de estado y depuración -->
    <div v-if="showDebug" class="debug-panel">
      <div class="debug-header">
        <h3>Panel de depuración</h3>
        <button @click="showDebug = false" class="close-button">Cerrar</button>
      </div>
      <div class="debug-content">
        <p><strong>Sala:</strong> {{ roomId }}</p>
        <p><strong>Usuario:</strong> {{ userName }} ({{ isAsistente ? 'Asistente' : 'Usuario' }})</p>
        <p><strong>Estado:</strong> {{ isInCall ? 'En llamada' : 'En sala de espera' }}</p>
        <p><strong>Participantes:</strong> {{ participants.length }}</p>
        <ul class="debug-participants">
          <li v-for="p in participants" :key="p.userId">
            {{ p.userName }} ({{ p.userId }})
          </li>
        </ul>
        <div class="debug-actions">
          <button @click="startCall" class="debug-button">Forzar inicio de llamada</button>
        </div>
      </div>
    </div>
    <button v-if="!showDebug" @click="showDebug = true" class="debug-toggle">
      <i class="fas fa-bug"></i>
    </button>

    <!-- Interfaz de videollamada -->
    <div v-if="isInCall" class="call-container">
      <div class="videos-area">
        <video-grid :remote-streams="remoteStreams" :participants="participants" />
        
        <div class="local-video-wrapper">
          <local-video :stream="localStream" :video-enabled="videoEnabled" :audio-enabled="audioEnabled" />
        </div>
      </div>
      
      <call-controls
        :audio-enabled="audioEnabled"
        :video-enabled="videoEnabled"
        :chat-open="chatOpen"
        @toggle-audio="toggleAudio"
        @toggle-video="toggleVideo"
        @end-call="endCall"
        @toggle-chat="toggleChat"
      />
      
      <div v-if="chatOpen" class="chat-sidebar">
        <chat-box 
          :messages="messages" 
          @send-message="sendMessage" 
          @close="chatOpen = false"
        />
      </div>
    </div>
    
    <!-- Sala de espera -->
    <div v-else class="waiting-room-container">
      <waiting-room
        :room-id="roomId"
        :participants="participants"
        :user-name="userName"
        :is-asistente="isAsistente"
        @start-call="startCall"
        @leave-room="leaveRoom"
      />
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { useCallStore } from '../../stores/call.store';
import LocalVideo from '../../components/VideoCall/LocalVideo.vue';
import VideoGrid from '../../components/VideoCall/VideoGrid.vue';
import CallControls from '../../components/VideoCall/CallControls.vue';
import WaitingRoom from '../../components/VideoCall/WaitingRoom.vue';
import ChatBox from '../../components/VideoCall/ChatBox.vue';

export default {
  name: 'RoomView',
  components: {
    LocalVideo,
    VideoGrid,
    CallControls,
    WaitingRoom,
    ChatBox
  },
  setup() {
    const callStore = useCallStore();
    const showDebug = ref(false);
    const chatOpen = ref(false);
    
    // Rol de usuario
    const isAsistente = computed(() => callStore.userRole === 'asistente');
    
    return {
      callStore,
      showDebug,
      chatOpen,
      isAsistente
    };
  },
  computed: {
    roomId() {
      return this.callStore.roomId;
    },
    userName() {
      return this.callStore.userName;
    },
    isInCall() {
      return this.callStore.isInCall;
    },
    localStream() {
      return this.callStore.localStream;
    },
    remoteStreams() {
      return this.callStore.remoteStreams;
    },
    participants() {
      return this.callStore.participants;
    },
    messages() {
      return this.callStore.messages;
    },
    audioEnabled() {
      return this.callStore.audioEnabled;
    },
    videoEnabled() {
      return this.callStore.videoEnabled;
    }
  },
  created() {
    // Verificar si tenemos un ID de sala
    const roomId = this.$route.params.id;
    if (!roomId) {
      console.error('No se proporcionó ID de sala en la URL');
      this.$router.push('/asistente/call');
      return;
    }
    
    // Si no hay nombre de usuario, pedirlo antes de continuar
    if (!this.callStore.userName || this.callStore.userName.trim() === '') {
      const userName = prompt('Por favor, ingresa tu nombre para unirte a la sala:', 'Usuario');
      if (!userName || userName.trim() === '') {
        alert('Se requiere un nombre para unirse a la sala');
        this.$router.push('/asistente/call');
        return;
      }
      this.callStore.userName = userName;
    }
    
    console.log(`Intentando unirse a sala ${roomId} como ${this.callStore.userName}`);
    
    // Actualizar roomId en el store y unirse a la sala
    this.callStore.joinRoom(roomId, this.callStore.userName, this.isAsistente ? 'asistente' : 'usuario');
    
    // Configurar limpieza al salir
    window.addEventListener('beforeunload', this.cleanupBeforeUnload);
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.cleanupBeforeUnload);
    this.callStore.cleanup();
  },
  methods: {
    async startCall() {
      try {
        // Iniciar stream local
        await this.callStore.startLocalStream();
        
        // Si eres asistente, llama a todos los usuarios normales
        if (this.isAsistente) {
          const regularUsers = this.participants.filter(p => p.userRole !== 'asistente');
          console.log('Llamando a usuarios regulares:', regularUsers);
          
          for (const participant of regularUsers) {
            this.callStore.callUser(participant.userId);
          }
        } else {
          // Si eres usuario normal, probablemente no inicies llamadas
          // pero dejamos el código por si acaso
          const assistants = this.participants.filter(p => p.userRole === 'asistente');
          console.log('Llamando a asistentes:', assistants);
          
          for (const assistant of assistants) {
            this.callStore.callUser(assistant.userId);
          }
        }
      } catch (error) {
        console.error('Error al iniciar la llamada:', error);
      }
    },
    
    toggleAudio() {
      this.callStore.toggleAudio();
    },
    
    toggleVideo() {
      this.callStore.toggleVideo();
    },
    
    endCall() {
      this.callStore.endCall();
      this.chatOpen = false;
    },
    
    toggleChat() {
      this.chatOpen = !this.chatOpen;
    },
    
    sendMessage(message) {
      this.callStore.sendMessage(message);
    },
    
    leaveRoom() {
      this.callStore.cleanup();
      this.$router.push('/asistente');
    },
    
    cleanupBeforeUnload() {
      this.callStore.cleanup();
    }
  }
};
</script>

<style scoped>
/* Contenedor principal que respeta el espacio para navbar y footer */
.room-container {
  width: 100%;
  height: calc(100vh - 160px); /* Ajustar para navbar y footer grandes */
  background-color: #F5F5F5; /* Fondo coherente */
  color: #424242;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.call-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
  background-color: #F5F5F5;
}

.videos-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  padding: 1rem;
  background-color: #F5F5F5;
  overflow: hidden; /* Prevenir desbordamiento */
}

.local-video-wrapper {
  position: absolute;
  bottom: 5rem; /* Espacio para los controles */
  right: 1rem;
  z-index: 10;
  border: 2px solid #1976D2;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.waiting-room-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 1rem;
  background-color: #F5F5F5;
  overflow: auto; /* Permitir scroll si es necesario */
}

.chat-sidebar {
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  z-index: 20;
  background-color: #FFFFFF;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  border-left: 1px solid #E0E0E0;
}

/* Panel de depuración */
.debug-panel {
  position: fixed;
  top: 10px;
  left: 10px;
  width: 350px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #1976D2;
  border-radius: 8px;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1976D2;
  color: white;
  padding: 8px 12px;
}

.call-controls {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 16px !important;
  padding: 12px !important;
  background-color: rgba(255, 255, 255, 0.9) !important;
  border-radius: 10px !important;
  margin: 10px auto 20px !important;
  width: fit-content !important;
  max-width: 90% !important;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2) !important;
  position: relative !important;
  z-index: 1000 !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.control-button {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  width: 50px !important;
  height: 50px !important;
  border-radius: 50% !important;
  background-color: #F5F5F5 !important;
  color: #1976D2 !important;
  border: 1px solid #E0E0E0 !important;
  cursor: pointer !important;
  transition: all 0.3s !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.debug-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.debug-content {
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.debug-content p {
  margin: 5px 0;
  font-size: 14px;
}

.debug-participants {
  margin: 5px 0;
  padding-left: 20px;
  font-size: 12px;
}

.debug-actions {
  margin-top: 10px;
}

.debug-button {
  background-color: #1976D2;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.debug-toggle {
  position: fixed;
  top: 10px;
  left: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #1976D2;
  color: white;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 999;
}

/* Responsividad */
@media (max-width: 768px) {
  .room-container {
    height: calc(100vh - 140px); /* Ajustar para dispositivos móviles */
  }
  
  .local-video-wrapper {
    width: 120px;
    bottom: 6rem;
  }
  
  .chat-sidebar {
    width: 100%;
  }
  
  .debug-panel {
    width: 300px;
  }
}

/* Indicador de carga */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #1976D2;
  z-index: 30;
}

.loading-spinner {
  border: 5px solid #E0E0E0;
  border-top: 5px solid #1976D2;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Modal de error */
.error-modal {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 30;
}

.error-content {
  background-color: #FFFFFF;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #E0E0E0;
}
</style>