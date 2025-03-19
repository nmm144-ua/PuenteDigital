<!-- src/components/VideoCall/VideoGrid.vue -->
<template>
  <div class="video-grid" :class="[gridClass, { 'mobile-layout': isMobileDevice }]">
    <!-- Mostrar videos remotos si hay -->
    <template v-if="Object.keys(remoteStreams).length > 0">
      <div 
        v-for="(stream, userId) in remoteStreams" 
        :key="userId" 
        class="grid-item"
        :class="{ 'no-video': !hasVideoTrack(userId) }"
      >
        <!-- Elemento de video con id y data-attribute -->
        <video 
          ref="videoElements"
          :id="`video-${userId}`"
          :data-user-id="userId"
          autoplay 
          playsinline
          muted
          class="remote-video"
        ></video>
        
        <!-- Indicador cuando no hay video -->
        <div v-if="!hasVideoTrack(userId)" class="no-video-indicator">
          <i class="fas fa-video-slash"></i>
        </div>
        
        <!-- Etiqueta con nombre de usuario -->
        <div class="username-label">
          {{ getParticipantName(userId) }}
          <span v-if="!hasAudioTrack(userId)" class="muted-indicator">
            <i class="fas fa-microphone-slash"></i>
          </span>
        </div>
      </div>
    </template>
    
    <!-- Mensaje cuando no hay participantes -->
    <div v-else class="empty-grid">
      <p>Esperando a que otros participantes se unan a la llamada...</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoGrid',
  props: {
    // Streams remotos recibidos
    remoteStreams: {
      type: Object,
      required: true
    },
    // Lista de participantes
    participants: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isMobileDevice: false,
      streamStatus: {},
      refreshTimer: null,
      
      // Para monitoreo de congelación de video
      videoMonitoringIntervals: {}
    };
  },
  computed: {
    // Determinar la clase de grid según el número de participantes
    gridClass() {
      const count = Object.keys(this.remoteStreams).length;
      if (count <= 1) return 'grid-1';
      if (count <= 2) return 'grid-2';
      if (count <= 4) return 'grid-4';
      if (count <= 9) return 'grid-9';
      return 'grid-16';
    }
  },
  watch: {
    // Vigilar cambios en streams remotos
    remoteStreams: {
      deep: true,
      handler() {
        // En el siguiente tick del DOM, intentar conectar los streams
        this.$nextTick(() => {
          this.attachStreams();
        });
      }
    }
  },
  created() {
    this.detectMobileDevice();
    window.addEventListener('resize', this.handleResize);
  },
  mounted() {
    // Primera conexión de streams
    this.attachStreams();
    
    // Programar un refresco periódico de los videos
    this.refreshTimer = setInterval(() => {
      this.refreshAllVideos();
    }, 5000);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    
    // Limpiar todos los temporizadores
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    // Limpiar los intervalos de monitoreo de video individuales
    Object.values(this.videoMonitoringIntervals).forEach(interval => {
      clearInterval(interval);
    });
  },
  methods: {
    // Detectar si es un dispositivo móvil
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
    
    // MÉTODO PRINCIPAL: Conectar streams a elementos de video
    attachStreams() {
      console.log("Ejecutando attachStreams con streams:", Object.keys(this.remoteStreams));
      
      if (Object.keys(this.remoteStreams).length === 0) {
        console.log("No hay streams remotos para conectar");
        return;
      }
      
      // IMPORTANTE: Crear elementos para cada userId
      Object.keys(this.remoteStreams).forEach(userId => {
        let videoElement = document.getElementById(`video-${userId}`);
        
        // Si no existe, crear uno nuevo dinámicamente
        if (!videoElement) {
          console.log(`Creando elemento de video para ${userId}`);
          const gridContainer = this.$el;
          
          // Crear grid item
          const gridItem = document.createElement('div');
          gridItem.className = 'grid-item';
          gridItem.setAttribute('data-user-id', userId);
          
          // Crear elemento de video
          videoElement = document.createElement('video');
          videoElement.id = `video-${userId}`;
          videoElement.setAttribute('data-user-id', userId);
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.className = 'remote-video';
          
          // Crear nombre de usuario
          const usernameLabel = document.createElement('div');
          usernameLabel.className = 'username-label';
          usernameLabel.textContent = this.getParticipantName(userId);
          
          // Añadir elementos al DOM
          gridItem.appendChild(videoElement);
          gridItem.appendChild(usernameLabel);
          gridContainer.appendChild(gridItem);
        }
        
        // Conectar stream al elemento
        const stream = this.remoteStreams[userId];
        if (stream) {
          console.log(`Conectando stream para ${userId}`);
          
          // Asignar stream y reproducir
          videoElement.srcObject = stream;
          
          // Intentar reproducir de inmediato
          videoElement.play()
            .then(() => {
              console.log(`Video para ${userId} reproduciendo correctamente`);
            })
            .catch(error => {
              console.warn(`Error al reproducir video para ${userId}:`, error);
              
              // Si falla, intentar reproducir como mudo
              videoElement.muted = true;
              videoElement.play()
                .then(() => console.log(`Video para ${userId} reproduciendo en mudo`))
                .catch(e => console.error(`No se pudo reproducir video para ${userId}:`, e));
            });
        }
      });
    },
    // Método para crear elementos de video faltantes
    createVideoElementFor(userId) {
      // Buscar el contenedor de la cuadrícula
      const gridContainer = this.$el;
      if (!gridContainer) return null;
      
      // Crear un nuevo elemento para el grid item
      const gridItem = document.createElement('div');
      gridItem.className = 'grid-item';
      gridItem.setAttribute('data-user-id', userId);
      
      // Crear el elemento de video
      const videoElement = document.createElement('video');
      videoElement.id = `video-${userId}`;
      videoElement.setAttribute('data-user-id', userId);
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.className = 'remote-video';
      
      // Añadir evento de error para monitoreo
      videoElement.onerror = (e) => {
        console.error(`Error en video de ${userId}:`, e);
      };
      
      // Añadir el video al item del grid
      gridItem.appendChild(videoElement);
      
      // Añadir etiqueta con nombre de usuario
      const nameLabel = document.createElement('div');
      nameLabel.className = 'username-label';
      nameLabel.textContent = this.getParticipantName(userId);
      gridItem.appendChild(nameLabel);
      
      // Añadir el grid item al contenedor
      gridContainer.appendChild(gridItem);
      
      return videoElement;
    },

    // Método mejorado para reproducir video
    playVideo(videoElement, userId) {
      // Asegurar que está muted para autoplay
      videoElement.muted = true;
      
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`Video para ${userId} reproduciendo correctamente`);
            // Iniciar monitoreo de calidad
            this.startVideoMonitoring(videoElement, userId);
          })
          .catch(error => {
            console.warn(`Error al reproducir video para ${userId}:`, error);
            
            // Forzar un reintento rápido
            setTimeout(() => {
              videoElement.play()
                .catch(e => {
                  console.error(`Error en segundo intento: ${e.message}`);
                  
                  // Implementar reconexión agresiva después de múltiples fallos
                  setTimeout(() => {
                    this.refreshVideo(videoElement, userId);
                  }, 1000);
                });
            }, 200);
          });
      }
    },
    
    // Monitorear un video específico para detectar congelaciones
    startVideoMonitoring(videoElement, userId) {
      // Limpiar intervalo anterior si existe
      if (this.videoMonitoringIntervals[userId]) {
        clearInterval(this.videoMonitoringIntervals[userId]);
      }
      
      // Inicializar datos de monitoreo
      videoElement._monitorData = {
        lastTime: videoElement.currentTime,
        lastCheck: Date.now(),
        freezeCount: 0
      };
      
      // Crear nuevo intervalo de monitoreo
      this.videoMonitoringIntervals[userId] = setInterval(() => {
        // Si el video está reproduciendo y tiene datos cargados
        if (!videoElement.paused && videoElement.readyState >= 3) {
          const now = Date.now();
          
          // Verificar si el tiempo actual ha cambiado desde la última verificación
          const currentTime = videoElement.currentTime;
          const timeDiff = Math.abs(currentTime - videoElement._monitorData.lastTime);
          
          // Si han pasado al menos 2 segundos desde el último check
          if (now - videoElement._monitorData.lastCheck >= 2000) {
            // Si el tiempo no ha avanzado significativamente (menos de 0.1 segundos)
            if (timeDiff < 0.1) {
              videoElement._monitorData.freezeCount++;
              
              // Si está congelado por 2 o más verificaciones consecutivas
              if (videoElement._monitorData.freezeCount >= 2) {
                console.warn(`Video congelado detectado para ${userId}, refrescando...`);
                this.refreshVideo(videoElement, userId);
                videoElement._monitorData.freezeCount = 0;
              }
            } else {
              // El video está avanzando correctamente, reiniciar contador
              videoElement._monitorData.freezeCount = 0;
            }
            
            // Actualizar datos para la próxima verificación
            videoElement._monitorData.lastTime = currentTime;
            videoElement._monitorData.lastCheck = now;
          }
        }
      }, 2000); // Verificar cada 2 segundos
    },
    
    // Refrescar todos los videos cada cierto tiempo
    refreshAllVideos() {
      if (!this.$refs.videoElements) return;
      
      const elements = Array.isArray(this.$refs.videoElements) 
        ? this.$refs.videoElements 
        : [this.$refs.videoElements];
      
      elements.forEach(videoElement => {
        const userId = videoElement.getAttribute('data-user-id');
        if (!userId || !this.remoteStreams[userId]) return;
        
        // Verificar si el video está detenido o en estado de carga
        if (videoElement.paused || videoElement.readyState < 3) {
          console.log(`Refrescando video para ${userId} (estado: ${videoElement.paused ? 'pausado' : 'buffering'})`);
          this.refreshVideo(videoElement, userId);
        }
      });
    },
    
    // MÉTODO CLAVE: Refrescar un video específico
    refreshVideo(videoElement, userId) {
      const stream = this.remoteStreams[userId];
      if (!stream) return;
      
      try {
        // Método simple pero efectivo: desconectar y reconectar el stream
        videoElement.pause();
        
        // 1. Guardar referencia al stream actual
        const currentStream = videoElement.srcObject;
        
        // 2. Desconectar stream
        videoElement.srcObject = null;
        
        // 3. Pequeño delay para asegurar desconexión completa
        setTimeout(() => {
          // 4. Reconectar el mismo stream u otro actualizado
          videoElement.srcObject = stream === currentStream ? stream : this.remoteStreams[userId];
          
          // 5. Forzar recarga de datos multimedia
          videoElement.load();
          
          // 6. Intentar reproducir
          videoElement.play().catch(() => {
            // Si falla, forzar muted y reintentar
            videoElement.muted = true;
            videoElement.play().catch(() => {
              console.error(`No se pudo reproducir video para ${userId} después de refrescar`);
            });
          });
        }, 200);
      } catch (error) {
        console.error(`Error al refrescar video para ${userId}:`, error);
      }
    },
    
    // Actualizar estado del stream
    updateStreamStatus(userId, stream) {
      if (!stream) return;
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      const hasVideo = videoTracks.length > 0 && 
                       videoTracks[0].enabled && 
                       !videoTracks[0].muted;
      
      const hasAudio = audioTracks.length > 0 && 
                       audioTracks[0].enabled && 
                       !audioTracks[0].muted;
      
      // Actualizar estado
      this.streamStatus[userId] = { hasVideo, hasAudio };
    },
    
    // Verificar si un stream tiene track de video activo
    hasVideoTrack(userId) {
      if (this.streamStatus[userId]) {
        return this.streamStatus[userId].hasVideo;
      }
      
      const stream = this.remoteStreams[userId];
      if (!stream) return false;
      
      const videoTracks = stream.getVideoTracks();
      return videoTracks.length > 0 && videoTracks[0].enabled && !videoTracks[0].muted;
    },
    
    // Verificar si un stream tiene track de audio activo
    hasAudioTrack(userId) {
      if (this.streamStatus[userId]) {
        return this.streamStatus[userId].hasAudio;
      }
      
      const stream = this.remoteStreams[userId];
      if (!stream) return false;
      
      const audioTracks = stream.getAudioTracks();
      return audioTracks.length > 0 && audioTracks[0].enabled && !audioTracks[0].muted;
    },
    
    // Obtener el nombre del participante
    getParticipantName(userId) {
      const participant = this.participants.find(p => p.userId === userId);
      return participant ? participant.userName : 'Usuario';
    }
  }
}
</script>

<style scoped>
.video-grid {
  display: grid;
  gap: 10px;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.grid-1 {
  grid-template-columns: 1fr;
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.grid-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.grid-16 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
}

.mobile-layout.grid-1 {
  grid-template-columns: 1fr;
}

.mobile-layout.grid-2 {
  grid-template-columns: 1fr;
  grid-template-rows: repeat(2, 1fr);
}

.mobile-layout.grid-4,
.mobile-layout.grid-9,
.mobile-layout.grid-16 {
  grid-template-columns: 1fr;
  grid-auto-rows: minmax(200px, 1fr);
}

.grid-item {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  background-color: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.grid-item.no-video {
  background-color: #263238;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: #000000;
}

.no-video-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 3rem;
  background-color: rgba(0, 0, 0, 0.5);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.username-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 6px 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  z-index: 2;
}

.muted-indicator {
  margin-left: 8px;
  color: #ff5252;
}

.empty-grid {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: white;
  text-align: center;
  background-color: #1a1a1a;
  border-radius: 8px;
  padding: 20px;
}
</style>