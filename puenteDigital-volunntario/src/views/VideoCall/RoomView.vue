<!-- src/views/RoomView.vue -->
<!-- Modificaciones para RoomView.vue -->

<template>
  <div class="room-container" :class="{ 'in-call': isInCall }">
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
        @start-call="startCall"
        @leave-room="leaveRoom"
      />
    </div>
  </div>
</template>
  
  <script>
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
    data() {
      return {
        chatOpen: false
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
    setup() {
      const callStore = useCallStore();
      return { callStore };
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
      this.callStore.joinRoom(roomId, this.callStore.userName);
      
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
          
          // Comenzar llamada con todos los participantes
          for (const participant of this.participants) {
            this.callStore.callUser(participant.userId);
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
  }
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