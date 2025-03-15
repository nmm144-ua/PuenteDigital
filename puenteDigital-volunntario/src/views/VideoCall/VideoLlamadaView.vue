<!-- src/views/VideollamadaView.vue -->
<template>
  <div class="videollamada-container" :class="{ 'in-call': isInCall, 'is-mobile': isMobileDevice }">
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
      <div class="call-header">
        <h2>Videollamada en curso</h2>
        <div class="call-info">
          <span>Sala: {{ roomId }}</span>
          <span>Participantes: {{ participants.length + 1 }}</span>
        </div>
      </div>
      
      <div class="videos-area" :class="{ 'with-chat': chatOpen, 'mobile-layout': isMobileDevice }">
        <!-- Videos remotos -->
        <video-grid 
          :remote-streams="remoteStreams" 
          :participants="participants"
          :connection-states="connectionStates"
          @track-state-changed="handleTrackStateChange"
          @stream-connection-failed="handleStreamConnectionFailed"
        />
        
        <!-- Video local -->
        <div class="local-video-wrapper">
          <local-video 
            :stream="localStream" 
            :video-enabled="videoEnabled" 
            :audio-enabled="audioEnabled"
            :show-debug-info="showDebugInfo"
            @stream-error="handleLocalStreamError"
          />
        </div>
      </div>
      
      <!-- Controles de llamada -->
      <call-controls
        :audio-enabled="audioEnabled"
        :video-enabled="videoEnabled"
        :chat-open="chatOpen"
        :show-device-options="true"
        @toggle-audio="toggleAudio"
        @toggle-video="toggleVideo"
        @end-call="endCall"
        @toggle-chat="toggleChat"
        @toggle-device-options="toggleDeviceOptions"
      />
      
      <!-- Panel de chat -->
      <div v-if="chatOpen" class="chat-sidebar" :class="{ 'mobile-chat': isMobileDevice }">
        <chat-box 
          :messages="messages" 
          @send-message="sendMessage" 
          @close="chatOpen = false"
        />
      </div>
      
      <!-- Panel de configuración de dispositivos -->
      <div v-if="deviceOptionsOpen" class="device-options-panel">
        <div class="panel-header">
          <h3>Configuración de dispositivos</h3>
          <button class="close-button" @click="deviceOptionsOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="panel-content">
          <!-- Selector de micrófono -->
          <div class="device-selector">
            <label for="audio-input">Micrófono</label>
            <select id="audio-input" v-model="selectedAudioInput" @change="changeAudioDevice">
              <option v-for="device in audioInputDevices" :key="device.deviceId" :value="device.deviceId">
                {{ device.label || `Micrófono ${audioInputDevices.indexOf(device) + 1}` }}
              </option>
            </select>
          </div>
          
          <!-- Selector de cámara -->
          <div class="device-selector">
            <label for="video-input">Cámara</label>
            <select id="video-input" v-model="selectedVideoInput" @change="changeVideoDevice">
              <option v-for="device in videoInputDevices" :key="device.deviceId" :value="device.deviceId">
                {{ device.label || `Cámara ${videoInputDevices.indexOf(device) + 1}` }}
              </option>
            </select>
          </div>
          
          <!-- Selector de altavoz (solo funciona en algunos navegadores) -->
          <div class="device-selector" v-if="audioOutputSupported">
            <label for="audio-output">Altavoz</label>
            <select id="audio-output" v-model="selectedAudioOutput" @change="changeAudioOutput">
              <option v-for="device in audioOutputDevices" :key="device.deviceId" :value="device.deviceId">
                {{ device.label || `Altavoz ${audioOutputDevices.indexOf(device) + 1}` }}
              </option>
            </select>
          </div>
          
          <!-- Opción para cambiar cámara en móviles -->
          <div class="device-selector" v-if="isMobileDevice">
            <button class="switch-camera-button" @click="switchCamera">
              <i class="fas fa-sync"></i> Cambiar cámara
            </button>
          </div>
          
          <!-- Configuración de depuración para desarrollo -->
          <div class="device-selector debug-options" v-if="isDevelopment">
            <label>
              <input type="checkbox" v-model="showDebugInfo"> Mostrar información de depuración
            </label>
          </div>
          
          <div class="device-actions">
            <button class="apply-button" @click="applyDeviceSettings">
              <i class="fas fa-check"></i> Aplicar
            </button>
            <button class="cancel-button" @click="deviceOptionsOpen = false">
              <i class="fas fa-times"></i> Cancelar
            </button>
          </div>
        </div>
      </div>
      
      <!-- Notificaciones -->
      <div v-if="notification" class="notification" :class="notification.type">
        <i :class="getNotificationIcon()"></i>
        <div class="notification-text">{{ notification.message }}</div>
        <button class="close-notification" @click="notification = null">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    
    <!-- Pantalla de carga -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage || 'Conectando a la sala...' }}</p>
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
import webrtcService from '../../services/webrtc.service';
import socketService from '../../services/socket.service';

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
      deviceOptionsOpen: false,
      loading: false,
      loadingMessage: '',
      error: null,
      notification: null,
      isMobileDevice: false,
      connectionStates: {},
      
      // Dispositivos de audio y video
      audioInputDevices: [],
      videoInputDevices: [],
      audioOutputDevices: [],
      selectedAudioInput: '',
      selectedVideoInput: '',
      selectedAudioOutput: '',
      audioOutputSupported: false,
      
      // Opciones de depuración
      isDevelopment: process.env.NODE_ENV === 'development',
      showDebugInfo: false,
      
      // Intervalo para verificar la conexión
      connectionCheckInterval: null,
      connectionStates: {},
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
  watch: {
    isInCall(newValue) {
      if (newValue) {
        // Si entramos en llamada, iniciar la verificación periódica de conexión
        this.startConnectionCheck();
        
        // Mostrar notificación
        this.showNotification('Llamada iniciada correctamente', 'success');
        
        // En móviles, cerrar el chat automáticamente al iniciar la llamada
        if (this.isMobileDevice && this.chatOpen) {
          this.chatOpen = false;
        }
      } else {
        // Si salimos de la llamada, detener verificación
        this.stopConnectionCheck();
      }
    }
  },
  async created() {
    // Detectar si es un dispositivo móvil
    this.detectMobileDevice();
    
    // Escuchar cambios en el tamaño de la ventana
    window.addEventListener('resize', this.handleResize);
    
    this.loading = true;
    this.loadingMessage = 'Inicializando conexión...';
    
    // Inicializar store
    this.callStore.initialize();
    
    // Establecer configuración inicial
    this.callStore.setUserRole(this.role);
    
    // Verificar soporte de audioOutput
    this.checkAudioOutputSupport();
    
    // Enumerar dispositivos
    await this.enumerateDevices();
    
    // Unirse a la sala
    try {
      this.loadingMessage = 'Conectando a la sala...';
      await this.callStore.joinRoom(this.roomId, this.userName, this.role);
      
      // Si el usuario es asistente, cargar el stream de cámara automáticamente
      if (this.isAsistente) {
        this.loadingMessage = 'Activando cámara y micrófono...';
        await this.callStore.startLocalStream();
      }
    } catch (error) {
      this.error = `Error al unirse a la sala: ${error.message}`;
    } finally {
      this.loading = false;
    }
    
    // Capturar error de cierre de página
    window.addEventListener('beforeunload', this.cleanupBeforeUnload);
  },
  beforeDestroy() {
    window.removeEventListener('beforeunload', this.cleanupBeforeUnload);
    window.removeEventListener('resize', this.handleResize);
    this.stopConnectionCheck();
    this.callStore.cleanup();
  },
  methods: {
    // Detección de dispositivo móvil
    detectMobileDevice() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      
      this.isMobileDevice = mobileRegex.test(userAgent) || window.innerWidth < 768;
      console.log("Detectado como dispositivo móvil:", this.isMobileDevice);
    },
    
    // Manejar cambio de tamaño de ventana
    handleResize() {
      this.detectMobileDevice();
    },
    
    // Obtener los dispositivos disponibles
    async enumerateDevices() {
      try {
        // Solicitar permisos primero para obtener etiquetas
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .catch(err => {
            console.warn('No se obtuvo permiso completo para dispositivos:', err);
            // Intentar con solo audio
            return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          })
          .catch(err => {
            console.warn('No se obtuvo permiso para audio:', err);
            // Último intento solo con video
            return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          })
          .catch(err => {
            console.warn('No se pudo obtener ningún permiso:', err);
            // Continuar sin permisos explícitos
          });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        this.audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        this.videoInputDevices = devices.filter(device => device.kind === 'videoinput');
        this.audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
        
        console.log('Dispositivos de audio disponibles:', this.audioInputDevices.length);
        console.log('Dispositivos de video disponibles:', this.videoInputDevices.length);
        console.log('Salidas de audio disponibles:', this.audioOutputDevices.length);
        
        // Seleccionar los dispositivos por defecto
        if (this.audioInputDevices.length > 0) {
          this.selectedAudioInput = this.audioInputDevices[0].deviceId;
        }
        
        if (this.videoInputDevices.length > 0) {
          this.selectedVideoInput = this.videoInputDevices[0].deviceId;
        }
        
        if (this.audioOutputDevices.length > 0 && this.audioOutputSupported) {
          this.selectedAudioOutput = this.audioOutputDevices[0].deviceId;
        }
      } catch (error) {
        console.error('Error al enumerar dispositivos:', error);
      }
    },
    
    // Verificar si el navegador soporta selección de salida de audio
    checkAudioOutputSupport() {
      const audioElement = document.createElement('audio');
      this.audioOutputSupported = typeof audioElement.setSinkId === 'function';
      console.log('Soporte para selección de salida de audio:', this.audioOutputSupported);
    },
    
    // Aplicar configuración de dispositivos seleccionados
    async applyDeviceSettings() {
      this.loading = true;
      this.loadingMessage = 'Aplicando configuración de dispositivos...';
      
      try {
        // Detener stream actual
        if (this.localStream) {
          this.callStore.stopLocalStream();
        }
        
        // Obtener nuevos streams con los dispositivos seleccionados
        const constraints = {
          audio: this.selectedAudioInput ? { deviceId: { exact: this.selectedAudioInput } } : true,
          video: this.selectedVideoInput ? { deviceId: { exact: this.selectedVideoInput } } : true
        };
        
        // Iniciar nuevo stream con los dispositivos seleccionados
        await webrtcService.getLocalStream(true, true, constraints);
        
        // Actualizar stream en el store
        this.callStore.localStream = webrtcService.localStream;
        
        // Cerrar panel de opciones
        this.deviceOptionsOpen = false;
        
        // Mostrar notificación
        this.showNotification('Dispositivos configurados correctamente', 'success');
      } catch (error) {
        console.error('Error al aplicar configuración de dispositivos:', error);
        this.showNotification('Error al configurar dispositivos: ' + error.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    
    // Cambiar dispositivo de audio
    async changeAudioDevice() {
      // Se aplica al hacer clic en Aplicar
    },
    
    // Cambiar dispositivo de video
    async changeVideoDevice() {
      // Se aplica al hacer clic en Aplicar
    },
    
    // Cambiar salida de audio
    async changeAudioOutput() {
      if (!this.audioOutputSupported) return;
      
      try {
        // Aplicar a todos los elementos de audio y video en la página
        const mediaElements = document.querySelectorAll('audio, video');
        
        for (const element of mediaElements) {
          if (typeof element.setSinkId === 'function') {
            await element.setSinkId(this.selectedAudioOutput);
          }
        }
        
        console.log('Salida de audio cambiada a:', this.selectedAudioOutput);
      } catch (error) {
        console.error('Error al cambiar salida de audio:', error);
        this.showNotification('Error al cambiar salida de audio', 'error');
      }
    },
    
    // Cambiar entre cámara frontal y trasera (para móviles)
    async switchCamera() {
      this.loading = true;
      this.loadingMessage = 'Cambiando cámara...';
      
      try {
        await webrtcService.switchCamera();
        this.showNotification('Cámara cambiada correctamente', 'success');
      } catch (error) {
        console.error('Error al cambiar cámara:', error);
        this.showNotification('Error al cambiar cámara: ' + error.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    
    // Iniciar verificación periódica de conexión
    startConnectionCheck() {
      // Detener verificación anterior si existe
      this.stopConnectionCheck();
      
      // Iniciar nueva verificación cada 10 segundos
      this.connectionCheckInterval = setInterval(() => {
        // Verificar estado de los streams remotos activos
        const streamIds = Object.keys(this.remoteStreams);
        console.log(`Verificando ${streamIds.length} streams remotos activos`);
        
        // Actualizar estados de conexión (usar asignación directa, no $set)
        this.participants.forEach(participant => {
          const userId = participant.userId;
          // Actualizar directamente en Vue 3
          const hasStream = Boolean(this.remoteStreams[userId]);
          this.connectionStates[userId] = hasStream ? 'connected' : 'disconnected';
          
          // Intentar reconectar si soy asistente y no hay stream
          if (this.isAsistente && !hasStream && participant.userRole !== 'asistente') {
            console.log(`No hay stream para ${userId}, intentando reconectar`);
            this.reconnectWithParticipant(userId);
          }
        });
      }, 10000);
    },
        
    // Detener verificación de conexión
    stopConnectionCheck() {
      if (this.connectionCheckInterval) {
        clearInterval(this.connectionCheckInterval);
        this.connectionCheckInterval = null;
      }
    },
    
    // Reconectar con un participante específico
    async reconnectWithParticipant(userId) {
      console.log(`Intentando reconectar con ${userId}`);
      
      try {
        // Cerrar conexión actual
        webrtcService.closeConnection(userId);
        
        // Esperar un momento antes de reconectar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Iniciar nueva conexión
        await webrtcService.initConnection(userId, true);
        
        // Notificar al otro usuario
        socketService.callUser(userId);
        
        console.log(`Reconexión con ${userId} iniciada`);
      } catch (error) {
        console.error(`Error al reconectar con ${userId}:`, error);
      }
    },
    
    // Mostrar notificación
    showNotification(message, type = 'info', duration = 5000) {
        // Crear objeto de notificación
        this.notification = {
          message,
          type
        };
        
        // Auto cerrar después de la duración especificada
        if (duration > 0) {
          setTimeout(() => {
            // Usar una comparación segura
            if (this.notification && this.notification.message === message) {
              this.notification = null;
            }
          }, duration);
        }
    },
    
    // Obtener icono para el tipo de notificación
    getNotificationIcon() {
      const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
      };
      
      return iconMap[this.notification?.type] || iconMap.info;
    },
    
    // Iniciar llamada
    async startCall() {
      this.loading = true;
      this.loadingMessage = 'Iniciando videollamada...';
      
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
      } finally {
        this.loading = false;
      }
    },
    
    // Alternar micrófono
    toggleAudio() {
      this.callStore.toggleAudio();
      this.showNotification(
        this.audioEnabled ? 'Micrófono activado' : 'Micrófono desactivado',
        'info',
        2000
      );
    },
    
    // Alternar cámara
    toggleVideo() {
      this.callStore.toggleVideo();
      this.showNotification(
        this.videoEnabled ? 'Cámara activada' : 'Cámara desactivada',
        'info',
        2000
      );
    },
    
    // Alternar chat
    toggleChat() {
      this.chatOpen = !this.chatOpen;
      
      // En móvil, cerrar panel de opciones de dispositivos si está abierto
      if (this.isMobileDevice && this.deviceOptionsOpen && this.chatOpen) {
        this.deviceOptionsOpen = false;
      }
    },
    
    // Alternar panel de opciones de dispositivos
    toggleDeviceOptions() {
      this.deviceOptionsOpen = !this.deviceOptionsOpen;
      
      // Si abrimos el panel, refrescar la lista de dispositivos
      if (this.deviceOptionsOpen) {
        this.enumerateDevices();
      }
      
      // En móvil, cerrar chat si está abierto
      if (this.isMobileDevice && this.chatOpen && this.deviceOptionsOpen) {
        this.chatOpen = false;
      }
    },
    
    // Enviar mensaje
    sendMessage(message) {
      this.callStore.sendMessage(message);
    },
    
    // Manejar cambio de estado de tracks
    handleTrackStateChange({ userId, trackType, state }) {
      console.log(`Track ${trackType} de ${userId} cambió a ${state}`);
      
      // Actualizar UI según sea necesario
      if (trackType === 'video' && state === 'muted') {
        // El video del usuario se apagó
        this.showNotification(`El participante ha desactivado su cámara`, 'info', 3000);
      } else if (trackType === 'video' && state === 'unmuted') {
        // El video del usuario se encendió
        this.showNotification(`El participante ha activado su cámara`, 'info', 3000);
      }
    },
    
    // Manejar error de conexión de stream
    handleStreamConnectionFailed(userId) {
      const participantName = this.participants.find(p => p.userId === userId)?.userName || 'Participante';
      this.showNotification(`Problema de conexión con ${participantName}`, 'warning');
      
      // Intentar reconectar si somos asistente
      if (this.isAsistente) {
        this.reconnectWithParticipant(userId);
      }
    },
    
    // Manejar error de stream local
    handleLocalStreamError(error) {
      console.error('Error en stream local:', error);
      this.showNotification('Error en tu cámara o micrófono', 'error');
    },
    
    // Finalizar llamada
    endCall() {
      this.callStore.endCall();
      this.chatOpen = false;
      this.deviceOptionsOpen = false;
      this.showNotification('Llamada finalizada', 'info');
    },
    
    // Salir de la sala
    leaveRoom() {
      this.callStore.cleanup();
      this.$router.push('/');
    },
    
    // Limpiar antes de cerrar página
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
  overflow: hidden;
}

.call-header {
  background-color: #1976D2;
  color: white;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 5;
}

.call-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
}

.call-info {
  font-size: 0.9rem;
  display: flex;
  gap: 20px;
}

.videos-area {
  flex: 1;
  display: flex;
  position: relative;
  background-color: #1A1A1A;
  padding: 10px;
  transition: all 0.3s ease-in-out;
  border-radius: 8px;
  margin: 10px;
  overflow: hidden;
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
  border: 2px solid #1976D2;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.chat-sidebar {
  position: absolute;
  top: 60px;
  right: 10px;
  width: 300px;
  height: calc(100% - 150px);
  background-color: #FFFFFF;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  z-index: 5;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.device-options-panel {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  max-width: 90%;
  background-color: #FFFFFF;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  z-index: 20;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  background-color: #1976D2;
  color: white;
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
}

.panel-content {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.device-selector {
  margin-bottom: 20px;
}

.device-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.device-selector select {
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
  font-size: 0.9rem;
}

.switch-camera-button {
  width: 100%;
  padding: 10px;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.switch-camera-button:hover {
  background-color: #e3f2fd;
}

.device-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.apply-button, .cancel-button {
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
}

.apply-button {
  background-color: #1976D2;
  color: white;
}

.apply-button:hover {
  background-color: #1565C0;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.close-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.1rem;
}

.debug-options {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.notification {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  background-color: #323232;
  color: white;
  max-width: 90%;
  z-index: 25;
  animation: fadeIn 0.3s;
}

.notification i {
  margin-right: 12px;
  font-size: 1.2rem;
}

.notification.success {
  background-color: #43A047;
}

.notification.error {
  background-color: #E53935;
}

.notification.warning {
  background-color: #FB8C00;
}

.notification.info {
  background-color: #1E88E5;
}

.close-notification {
  background: none;
  border: none;
  color: white;
  margin-left: 12px;
  opacity: 0.7;
  cursor: pointer;
}

.close-notification:hover {
  opacity: 1;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
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
  z-index: 100;
  color: #FFFFFF;
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
  z-index: 100;
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

.error-content .close-button, .error-content .leave-button {
  padding: 10px 20px;
  margin: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.error-content .close-button {
  background-color: #757575; /* Gris neutro */
  color: #FFFFFF;
}

.error-content .close-button:hover {
  background-color: #616161;
}

.error-content .leave-button {
  background-color: #1976D2; /* Azul principal */
  color: #FFFFFF;
}

.error-content .leave-button:hover {
  background-color: #0D47A1;
}

/* Estilos para modo móvil */
.is-mobile .videos-area {
  width: 100% !important;
  padding: 5px;
  margin: 5px;
}

.is-mobile .call-header {
  padding: 8px 10px;
}

.is-mobile .call-header h2 {
  font-size: 1rem;
}

.is-mobile .call-info {
  font-size: 0.8rem;
  gap: 10px;
}

.is-mobile .local-video-wrapper {
  width: 120px;
  height: 90px;
  bottom: 10px;
  right: 10px;
}

.mobile-layout {
  flex-direction: column;
}

.mobile-chat {
  position: fixed !important;
  top: auto !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 300px !important;
  border-radius: 12px 12px 0 0 !important;
  z-index: 50 !important;
}

.is-mobile .notification {
  bottom: 80px;
}

@media (max-width: 768px) {
  .videos-area.with-chat {
    width: 100%;
    height: calc(100% - 300px);
  }

  .chat-sidebar:not(.mobile-chat) {
    width: 100%;
    right: 0;
    height: 300px;
    top: auto;
    bottom: 0;
  }

  .device-options-panel {
    width: 95%;
    top: 50%;
    transform: translate(-50%, -50%);
    max-height: 90vh;
  }
  
  .videos-area {
    margin: 5px;
    padding: 5px;
  }
  
  .call-header {
    padding: 8px 10px;
  }
  
  .call-header h2 {
    font-size: 1rem;
  }
  
  .call-info {
    font-size: 0.8rem;
  }
  
  /* Ajuste de altura para dejar espacio a los controles */
  .videollamada-container {
    height: calc(100vh - 80px);
  }
}

/* Para dispositivos muy pequeños */
@media (max-width: 360px) {
  .is-mobile .local-video-wrapper {
    width: 100px;
    height: 75px;
  }
  
  .call-info {
    display: none;
  }
}
</style>