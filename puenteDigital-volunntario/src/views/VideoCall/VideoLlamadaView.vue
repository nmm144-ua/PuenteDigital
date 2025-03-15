<!-- src/views/VideollamadaView.vue -->
<template>
    <div class="videollamada-container" :class="{ 'in-call': isInCall }">
      <!-- Sala de espera -->
      <div v-if="!isInCall" class="waiting-room">
        <waiting-room
          :room-id="roomId"
          :participants="participants"
          :user-name="userName"
          :is-asistente="isAsistente"
          @start-call="startCall"
          @leave-room="leaveRoom"
        />
      </div>
      
      <!-- Interfaz de videollamada -->
      <div v-else class="call-interface">
        <div class="videos-area" :class="{ 'with-chat': chatOpen }">
          <!-- Videos remotos -->
          <video-grid :remote-streams="remoteStreams" :participants="participants" />
          
          <!-- Video local -->
          <div class="local-video-wrapper">
            <local-video :stream="localStream" :video-enabled="videoEnabled" :audio-enabled="audioEnabled" />
          </div>
        </div>
        
        <!-- Controles de llamada -->
        <call-controls
          :audio-enabled="audioEnabled"
          :video-enabled="videoEnabled"
          :chat-open="chatOpen"
          @toggle-audio="toggleAudio"
          @toggle-video="toggleVideo"
          @end-call="endCall"
          @toggle-chat="toggleChat"
        />
        
        <!-- Panel de chat -->
        <div v-if="chatOpen" class="chat-sidebar">
          <chat-box 
            :messages="messages" 
            @send-message="sendMessage" 
            @close="chatOpen = false"
          />
        </div>
      </div>
      
      <!-- Pantalla de carga -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Conectando a la sala...</p>
      </div>
      
      <!-- Modal de error -->
      <div v-if="error" class="error-modal">
        <div class="error-content">
          <h3>Error</h3>
          <p>{{ error }}</p>
          <button @click="error = null" class="close-button">Cerrar</button>
          <button @click="leaveRoom" class="leave-button">Volver al inicio</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { useCallStore } from '../../stores/call.store';
  import WaitingRoom from '../../components/VideoCall/WaitingRoom.vue';
  import VideoGrid from '../../components/VideoCall/VideoGrid.vue';
  import LocalVideo from '../../components/VideoCall/LocalVideo.vue';
  import CallControls from '../../components/VideoCall/CallControls.vue';
  import ChatBox from '../../components/VideoCall/ChatBox.vue';
  
  export default {
    name: 'VideollamadaView',
    components: {
      WaitingRoom,
      VideoGrid,
      LocalVideo,
      CallControls,
      ChatBox
    },
    props: {
      roomId: {
        type: String,
        required: true
      },
      role: {
        type: String,
        default: 'usuario'
      },
      userName: {
        type: String,
        default: 'Usuario'
      }
    },
    data() {
      return {
        chatOpen: false,
        loading: false,
        error: null
      };
    },
    computed: {
      callStore() {
        return useCallStore();
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
      },
      isAsistente() {
        return this.callStore.userRole === 'asistente';
      }
    },
    async created() {
      this.loading = true;
      
      // Inicializar store
      this.callStore.initialize();
      
      // Establecer configuración inicial
      this.callStore.setUserRole(this.role);
      
      // Unirse a la sala
      try {
        await this.callStore.joinRoom(this.roomId, this.userName, this.role);
      } catch (error) {
        this.error = `Error al unirse a la sala: ${error.message}`;
      } finally {
        this.loading = false;
      }
      
      // Capturar error de cierre de página
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
          
          // Filtrar participantes según rol
          const targetParticipants = this.isAsistente
            ? this.participants.filter(p => p.userRole !== 'asistente')
            : this.participants.filter(p => p.userRole === 'asistente');
          
          // Iniciar llamadas con los participantes adecuados
          if (targetParticipants.length > 0) {
            for (const participant of targetParticipants) {
              await this.callStore.callUser(participant.userId);
            }
          } else {
            this.error = this.isAsistente
              ? 'No hay usuarios para llamar en esta sala.'
              : 'No hay asistentes disponibles para llamar en esta sala.';
          }
        } catch (error) {
          this.error = `Error al iniciar llamada: ${error.message}`;
        }
      },
      
      toggleAudio() {
        this.callStore.toggleAudio();
      },
      
      toggleVideo() {
        this.callStore.toggleVideo();
      },
      
      toggleChat() {
        this.chatOpen = !this.chatOpen;
      },
      
      sendMessage(message) {
        this.callStore.sendMessage(message);
      },
      
      endCall() {
        this.callStore.endCall();
        this.chatOpen = false;
      },
      
      leaveRoom() {
        this.callStore.cleanup();
        this.$router.push('/');
      },
      
      cleanupBeforeUnload() {
        this.callStore.cleanup();
      }
    }
  }
  </script>
  
  <style scoped>
.videollamada-container {
  width: 100%;
  height: calc(100vh - 100px);
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.waiting-room {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: #f5f5f5;
}

.call-interface {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.videos-area {
  flex: 1;
  display: flex;
  position: relative;
  background-color: #1A1A1A;
  padding: 10px;
  transition: width 0.3s ease-in-out;
  border-radius: 8px;
  margin: 10px;
}

.videos-area.with-chat {
  width: calc(100% - 320px);
}

.local-video-wrapper {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 180px;
  height: 135px;
  z-index: 10;
  border: 2px solid #1976D2; /* Azul principal del tema PuenteDigital */
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.chat-sidebar {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 300px;
  height: calc(100% - 20px);
  background-color: #FFFFFF;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  z-index: 5;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 20;
  color: #FFFFFF;
}

.loading-spinner {
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 5px solid #1976D2; /* Azul principal del tema PuenteDigital */
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-modal {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20;
}

.error-content {
  background-color: #FFFFFF;
  border-radius: 8px;
  padding: 25px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.error-content h3 {
  color: #F44336;
  margin-top: 0;
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.error-content p {
  margin-bottom: 20px;
  color: #555;
}

.close-button, .leave-button {
  padding: 10px 20px;
  margin: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.close-button {
  background-color: #757575; /* Gris neutro */
  color: #FFFFFF;
}

.close-button:hover {
  background-color: #616161;
}

.leave-button {
  background-color: #1976D2; /* Azul principal para consistencia con tu interfaz */
  color: #FFFFFF;
}

.leave-button:hover {
  background-color: #0D47A1;
}

/* Ajustes responsivos */
@media (max-width: 768px) {
  .videos-area.with-chat {
    width: 100%;
    height: calc(100% - 300px);
  }

  .chat-sidebar {
    top: auto;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 300px;
    border-radius: 8px 8px 0 0;
  }

  .local-video-wrapper {
    width: 100px;
    height: 75px;
    bottom: 10px;
    right: 10px;
  }
}
  </style>