<!-- src/components/VideoCall/VideoLlamadaControls.vue -->
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
      <!-- Videos remotos -->
      <div class="remote-videos-container">
        <video-grid 
          :remote-streams="remoteStreams" 
          :participants="participants" 
          @video-dimension="handleVideoDimension"
        />
      </div>
      
      <!-- Video local -->
      <div class="local-video-wrapper" :class="{ 'portrait-mode': localVideoIsPortrait }">
        <local-video 
          :stream="localStream" 
          :video-enabled="videoEnabled" 
          :audio-enabled="audioEnabled" 
          @video-ready="handleLocalVideoReady"
        />
      </div>
    </div>
    
    <!-- Controles de llamada siempre visibles cuando está en llamada -->
    <div v-if="isInCall" class="controls-container">
      <call-controls
        :audio-enabled="audioEnabled"
        :video-enabled="videoEnabled"
        @toggle-audio="toggleAudio"
        @toggle-video="toggleVideo"
        @end-call="endCall"
      />
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

    <!-- Modal de reconexión (opcional) -->
    <div v-if="isReconnecting" class="reconnecting-overlay">
      <div class="loading-spinner"></div>
      <p>Reconectando la llamada...</p>
    </div>
  </div>
</template>
  
<script>
import { useCallStore } from '../../stores/call.store';
import WaitingRoom from './WaitingRoom.vue';
import VideoGrid from './VideoGrid.vue';
import LocalVideo from './LocalVideo.vue';
import CallControls from './CallControls.vue';
  
export default {
  name: 'VideollamadaControls',
  components: {
    WaitingRoom,
    VideoGrid,
    LocalVideo,
    CallControls
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
      loading: false,
      error: null,
      localVideoElement: null,
      localVideoIsPortrait: false,
      remoteVideoInfo: {},
      isReconnecting: false,
      // Control de intentos de reconexión
      reconnectionAttempts: {},
      // Monitor de conexión
      connectionCheckInterval: null
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
  mounted() {
    // Iniciar monitoreo de conexiones
    this.startConnectionMonitoring();
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.cleanupBeforeUnload);
    this.callStore.cleanup();
    
    // Limpiar intervalos
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
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
    
    endCall() {
      this.callStore.endCall();
    },
    
    leaveRoom() {
      this.callStore.cleanup();
      this.$router.push('/');
    },
    
    cleanupBeforeUnload() {
      this.callStore.cleanup();
    },
    
    handleLocalVideoReady(videoElement) {
      this.localVideoElement = videoElement;
      
      // Detectar orientación del video local
      if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
        this.localVideoIsPortrait = videoElement.videoHeight > videoElement.videoWidth;
      }
    },
    
    // Manejar información de dimensiones del video desde VideoGrid
    handleVideoDimension(info) {
      this.remoteVideoInfo[info.userId] = info;
    },
    
    // Iniciar monitoreo de conexiones
    startConnectionMonitoring() {
      this.connectionCheckInterval = setInterval(() => {
        if (this.isInCall && Object.keys(this.remoteStreams).length > 0) {
          // Verificar estado de conexiones
          const connectionStates = this.callStore.connectionStates || {};
          
          // Para cada conexión, verificar su estado
          Object.entries(connectionStates).forEach(([userId, state]) => {
            if (['disconnected', 'failed', 'closed'].includes(state)) {
              console.log(`Detectada conexión en mal estado para ${userId}: ${state}`);
              // Intentar reconectar
              this.handleConnectionIssue(userId);
            }
          });
        }
      }, 5000); // Verificar cada 5 segundos
    },
    
    // Manejar problemas de conexión
    async handleConnectionIssue(userId) {
      // Controlar intentos de reconexión
      this.reconnectionAttempts[userId] = (this.reconnectionAttempts[userId] || 0) + 1;
      
      // Limitar intentos de reconexión
      if (this.reconnectionAttempts[userId] > 3) {
        console.warn(`Demasiados intentos de reconexión para ${userId}`);
        // Mostrar mensaje al usuario
        this.error = `No se pudo reconectar con ${this.getParticipantName(userId)}. Por favor, intente nuevamente.`;
        return;
      }
      
      console.log(`Intentando reconectar con ${userId}, intento ${this.reconnectionAttempts[userId]}/3`);
      
      try {
        // Mostrar estado de reconexión
        this.isReconnecting = true;
        
        // Intentar cerrar y volver a establecer la conexión
        await this.callStore.reconnectWithUser(userId);
        
        // Conexión restablecida
        console.log(`Reconexión exitosa con ${userId}`);
      } catch (error) {
        console.error('Error al reconectar:', error);
        this.error = `Error al reconectar: ${error.message}`;
      } finally {
        this.isReconnecting = false;
      }
    },
    
    // Método auxiliar para obtener nombre del participante
    getParticipantName(userId) {
      const participant = this.participants.find(p => p.userId === userId);
      return participant ? participant.userName : 'Usuario';
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
  overflow: hidden;
}

.remote-videos-container {
  width: 100%;
  height: 100%;
}
  
.local-video-wrapper {
  position: absolute;
  bottom: 80px; /* Espacio para controles */
  right: 20px;
  width: 180px;
  height: 135px;
  z-index: 10;
  border: 2px solid #1976D2;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  background-color: #1a1a1a;
}
  
/* Clases para manejar orientación vertical */
.local-video-wrapper.portrait-mode {
  width: 100px;
  height: 180px;
}
  
.controls-container {
  position: relative;
  z-index: 15;
  padding: 10px 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.8);
  border-top: 1px solid #E0E0E0;
}
  
.loading-overlay, .reconnecting-overlay {
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

.reconnecting-overlay {
  background-color: rgba(0, 0, 0, 0.5);
}
  
.loading-spinner {
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 5px solid #1976D2;
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
  background-color: #757575;
  color: #FFFFFF;
}
  
.close-button:hover {
  background-color: #616161;
}
  
.leave-button {
  background-color: #1976D2;
  color: #FFFFFF;
}
  
.leave-button:hover {
  background-color: #0D47A1;
}
  
/* Media queries para adaptarse a diferentes tamaños de pantalla */
@media (min-width: 769px) {
  /* Estilos específicos para escritorio */
  .videollamada-container {
    height: calc(100vh - 100px);
  }
    
  .local-video-wrapper {
    width: 180px;
    height: 135px;
  }
}
  
@media (max-width: 768px) {
  /* Estilos específicos para móvil */
  .videollamada-container {
    height: calc(100vh - 80px);
  }
    
  .local-video-wrapper {
    width: 120px;
    height: 90px;
    bottom: 70px;
    right: 10px;
  }
}
</style>