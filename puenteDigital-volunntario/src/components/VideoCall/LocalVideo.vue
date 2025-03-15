<!-- src/components/VideoCall/LocalVideo.vue -->
<template>
  <div class="local-video-container">
    <video
      ref="videoElement"
      class="local-video"
      :class="{ 'video-muted': !videoEnabled }"
      autoplay
      muted
      playsinline
    ></video>
    <div v-if="!videoEnabled" class="video-off-indicator">
      <i class="fas fa-video-slash"></i>
    </div>
    <div class="audio-indicator" :class="{ 'audio-off': !audioEnabled }">
      <i :class="audioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash'"></i>
    </div>
    <div class="username-label">Tú</div>
    
    <!-- Indicador de Estado -->
    <div v-if="showDebugInfo" class="debug-info">
      <div>Video: {{ videoTracks }}</div>
      <div>Audio: {{ audioTracks }}</div>
      <div>Estado: {{ streamStatus }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LocalVideo',
  props: {
    stream: {
      type: Object,
      default: null
    },
    videoEnabled: {
      type: Boolean,
      default: true
    },
    audioEnabled: {
      type: Boolean,
      default: true
    },
    showDebugInfo: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      videoTracks: 0,
      audioTracks: 0,
      streamStatus: 'No hay stream',
      connectionAttempts: 0
    };
  },
  watch: {
    stream: {
      immediate: true,
      handler(newStream) {
        this.updateStreamInfo(newStream);
        this.$nextTick(() => {
          if (this.$refs.videoElement && newStream) {
            this.connectStream(newStream);
          }
        });
      }
    },
    videoEnabled(newValue) {
      this.updateStreamInfo(this.stream);
      // Asegurar que el video se muestre correctamente al activarlo
      if (newValue && this.$refs.videoElement && this.stream) {
        this.$refs.videoElement.play().catch(e => {
          console.error("Error al reactivar video local:", e);
          this.handlePlaybackError(e);
        });
      }
    },
    audioEnabled() {
      this.updateStreamInfo(this.stream);
    }
  },
  mounted() {
    // Si ya tenemos un stream al montar el componente, conectarlo
    if (this.stream) {
      this.updateStreamInfo(this.stream);
      this.connectStream(this.stream);
    }
    
    // Verificar periódicamente el estado del stream
    this.checkInterval = setInterval(() => {
      this.updateStreamInfo(this.stream);
    }, 5000);
  },
  beforeDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  },
  methods: {
    // Actualizar información del stream
    updateStreamInfo(stream) {
      if (!stream) {
        this.videoTracks = 0;
        this.audioTracks = 0;
        this.streamStatus = 'No hay stream';
        return;
      }
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      this.videoTracks = videoTracks.length;
      this.audioTracks = audioTracks.length;
      
      // Verificar si los tracks están activos
      const videoActive = videoTracks.length > 0 && videoTracks[0].enabled && !videoTracks[0].muted;
      const audioActive = audioTracks.length > 0 && audioTracks[0].enabled && !audioTracks[0].muted;
      
      this.streamStatus = `Video: ${videoActive ? 'Activo' : 'Inactivo'}, Audio: ${audioActive ? 'Activo' : 'Inactivo'}`;
    },
    
    // Conectar stream al elemento de video
    connectStream(stream) {
      if (!this.$refs.videoElement) {
        console.error("Elemento de video local no disponible");
        return;
      }
      
      this.connectionAttempts++;
      console.log(`Conectando stream local (intento #${this.connectionAttempts})`);
      
      // Desconectar cualquier stream existente
      if (this.$refs.videoElement.srcObject) {
        this.$refs.videoElement.srcObject = null;
      }
      
      try {
        console.log("Conectando stream local con srcObject");
        this.$refs.videoElement.srcObject = stream;
        
        this.$refs.videoElement.onloadedmetadata = () => {
          console.log("Stream local cargado correctamente");
          this.playVideo();
        };
        
        // Configurar listeners para eventos
        this.setupVideoEventListeners();
      } catch (error) {
        console.error("Error al conectar stream local:", error);
        this.tryFallbackMethods(stream);
      }
    },
    
    // Intentar métodos alternativos si el principal falla
    tryFallbackMethods(stream) {
      const videoElement = this.$refs.videoElement;
      
      // Método 1: Intentar con URL.createObjectURL (obsoleto pero útil para compatibilidad)
      try {
        if (typeof URL !== 'undefined' && URL.createObjectURL) {
          console.log("Intentando conectar con URL.createObjectURL");
          const objectUrl = URL.createObjectURL(stream);
          videoElement.src = objectUrl;
          
          videoElement.onloadedmetadata = () => {
            console.log("Stream local cargado con objectURL");
            this.playVideo();
          };
          
          // Liberar URL al terminar
          videoElement.onended = () => {
            URL.revokeObjectURL(objectUrl);
          };
          
          return;
        }
      } catch (error) {
        console.warn("Método createObjectURL falló:", error);
      }
      
      // Método 2: Para React Native
      try {
        if (stream.toURL) {
          console.log("Intentando conectar con método toURL()");
          videoElement.src = stream.toURL();
          this.playVideo();
          return;
        }
      } catch (error) {
        console.warn("Método toURL falló:", error);
      }
      
      // Método 3: Crear nuevo MediaStream
      try {
        console.log("Intentando crear nuevo MediaStream con los tracks existentes");
        const newStream = new MediaStream();
        
        stream.getTracks().forEach(track => {
          try {
            newStream.addTrack(track);
          } catch (e) {
            console.warn(`No se pudo añadir track ${track.kind} al nuevo stream:`, e);
          }
        });
        
        videoElement.srcObject = newStream;
        this.playVideo();
      } catch (error) {
        console.error("Todos los métodos para conectar el stream local fallaron:", error);
        this.$emit('stream-error', error);
      }
    },
    
    // Iniciar reproducción del video
    playVideo() {
      if (!this.$refs.videoElement) return;
      
      this.$refs.videoElement.play()
        .then(() => {
          console.log("Video local reproduciendo correctamente");
        })
        .catch(error => {
          console.error("Error al reproducir video local:", error);
          this.handlePlaybackError(error);
        });
    },
    
    // Manejar errores de reproducción
    handlePlaybackError(error) {
      console.warn("Error de reproducción local:", error);
      
      // Si es un error de autoplay, esperar interacción del usuario
      if (error.name === 'NotAllowedError') {
        console.log('Error debido a políticas de reproducción automática, esperando interacción');
        
        // Crear listener global para reproducir con la primera interacción
        const startPlayback = () => {
          if (this.$refs.videoElement) {
            this.$refs.videoElement.play()
              .then(() => {
                console.log("Video local reproduciendo después de interacción");
                document.removeEventListener('click', startPlayback);
                document.removeEventListener('touchend', startPlayback);
              })
              .catch(e => {
                console.error("Sigue fallando la reproducción local:", e);
              });
          }
        };
        
        document.addEventListener('click', startPlayback, { once: true });
        document.addEventListener('touchend', startPlayback, { once: true });
      }
    },
    
    // Configurar listeners para el elemento de video
    setupVideoEventListeners() {
      if (!this.$refs.videoElement) return;
      
      const videoElement = this.$refs.videoElement;
      
      videoElement.onerror = (event) => {
        console.error("Error en elemento de video local:", event);
      };
      
      videoElement.onwaiting = () => {
        console.log("Video local en espera (buffering)");
      };
      
      videoElement.onstalled = () => {
        console.log("Video local detenido por falta de datos");
      };
      
      videoElement.onpause = () => {
        console.log("Video local pausado");
      };
      
      videoElement.onplay = () => {
        console.log("Video local iniciando reproducción");
      };
      
      videoElement.onplaying = () => {
        console.log("Video local reproduciendo correctamente");
      };
    }
  }
}
</script>

<style scoped>
.local-video-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #263238; /* Azul oscuro */
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-muted {
  opacity: 0.5;
}

.video-off-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  color: white;
  background-color: rgba(0, 0, 0, 0.6);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 6px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.audio-off {
  background-color: rgba(244, 67, 54, 0.8); /* Rojo */
}

.username-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 6px 10px;
  background-color: rgba(25, 118, 210, 0.8); /* Azul primario */
  color: white;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  z-index: 2;
}

.debug-info {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 6px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  font-size: 0.7rem;
  max-width: 80%;
  word-break: break-word;
}

/* Estilos para dispositivos móviles */
@media (max-width: 768px) {
  .local-video-container {
    border-width: 1px;
  }
  
  .video-off-indicator {
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
  }
  
  .audio-indicator {
    width: 24px;
    height: 24px;
    font-size: 0.8rem;
  }
  
  .username-label {
    font-size: 0.75rem;
    padding: 4px 8px;
  }
}
</style>