<!-- src/components/VideoCall/CallControls.vue -->
<template>
  <div class="call-controls" :class="{ 'mobile-layout': isMobileDevice }">
    <button 
      class="control-button"
      :class="{ 'control-off': !audioEnabled }"
      @click="$emit('toggle-audio')"
      title="Micrófono"
    >
      <i :class="audioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash'"></i>
      <span class="button-label" v-if="!isMobileDevice">{{ audioEnabled ? 'Silenciar' : 'Activar' }}</span>
    </button>
    
    <button 
      class="control-button"
      :class="{ 'control-off': !videoEnabled }"
      @click="$emit('toggle-video')"
      title="Cámara"
    >
      <i :class="videoEnabled ? 'fas fa-video' : 'fas fa-video-slash'"></i>
      <span class="button-label" v-if="!isMobileDevice">{{ videoEnabled ? 'Apagar cámara' : 'Encender cámara' }}</span>
    </button>
    
    <button 
      class="control-button end-call"
      @click="$emit('end-call')"
      title="Finalizar llamada"
    >
      <i class="fas fa-phone-slash"></i>
      <span class="button-label" v-if="!isMobileDevice">Finalizar</span>
    </button>
    
    <button 
      class="control-button"
      :class="{ 'active': chatOpen }"
      @click="$emit('toggle-chat')"
      title="Chat"
    >
      <i class="fas fa-comment"></i>
      <span class="button-label" v-if="!isMobileDevice">Chat</span>
    </button>
    
    <button 
      v-if="showDeviceOptions"
      class="control-button"
      @click="$emit('toggle-device-options')"
      title="Configuración de dispositivos"
    >
      <i class="fas fa-cog"></i>
      <span class="button-label" v-if="!isMobileDevice">Dispositivos</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'CallControls',
  props: {
    audioEnabled: {
      type: Boolean,
      default: true
    },
    videoEnabled: {
      type: Boolean,
      default: true
    },
    chatOpen: {
      type: Boolean,
      default: false
    },
    showDeviceOptions: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      isMobileDevice: false
    };
  },
  created() {
    this.detectMobileDevice();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    detectMobileDevice() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      this.isMobileDevice = mobileRegex.test(userAgent) || window.innerWidth < 768;
    },
    handleResize() {
      this.detectMobileDevice();
    }
  },
  emits: ['toggle-audio', 'toggle-video', 'end-call', 'toggle-chat', 'toggle-device-options']
}
</script>

<style scoped>
.call-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: #FFFFFF;
  border-radius: 12px;
  margin: 16px auto;
  width: fit-content;
  max-width: 90%;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid #E0E0E0;
  position: relative;
  z-index: 11;
  transition: all 0.3s ease;
}

.control-button {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-width: 60px;
  height: 60px;
  border-radius: 8px;
  background-color: #F5F5F5;
  color: #1976D2;
  border: 1px solid #E0E0E0;
  cursor: pointer;
  transition: all 0.3s;
  padding: 8px 12px;
}

.button-label {
  margin-top: 5px;
  font-size: 0.75rem;
  text-align: center;
  white-space: nowrap;
}

.control-button:hover {
  background-color: #E3F2FD;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.control-button i {
  font-size: 1.2rem;
  margin-bottom: 4px;
}

.control-off {
  background-color: #FFEBEE;
  color: #F44336;
  border-color: #FFCDD2;
}

.control-off:hover {
  background-color: #FFCDD2;
}

.end-call {
  background-color: #F44336;
  color: white;
  border-color: #F44336;
  min-width: 70px;
  height: 70px;
}

.end-call:hover {
  background-color: #D32F2F;
}

.active {
  background-color: #1976D2;
  color: white;
  border-color: #1976D2;
}

.active:hover {
  background-color: #0D47A1;
}

/* Versión móvil */
.mobile-layout {
  padding: 10px;
  gap: 10px;
  border-radius: 8px;
}

.mobile-layout .control-button {
  min-width: 46px;
  height: 46px;
  border-radius: 46px;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.mobile-layout .control-button i {
  font-size: 1.1rem;
  margin: 0;
}

.mobile-layout .end-call {
  min-width: 54px;
  height: 54px;
}

.mobile-layout .button-label {
  display: none;
}

/* Para pantallas muy pequeñas */
@media (max-width: 360px) {
  .call-controls {
    padding: 8px;
    gap: 8px;
  }
  
  .mobile-layout .control-button {
    min-width: 40px;
    height: 40px;
  }
  
  .mobile-layout .end-call {
    min-width: 48px;
    height: 48px;
  }
  
  .mobile-layout .control-button i {
    font-size: 1rem;
  }
}
</style>