<!-- src/components/VideoCall/VideoGrid.vue -->
<template>
  <div class="video-grid-container">
    <div class="video-grid" :class="[gridClass]">
      <template v-if="Object.keys(remoteStreams).length > 0">
        <div 
          v-for="(stream, userId) in remoteStreams" 
          :key="userId" 
          class="grid-item"
          :class="{ 'portrait-video': videoOrientations[userId] && videoOrientations[userId].isPortrait }"
        >
        <video 
          ref="videoElements" 
          autoplay 
          playsinline
          muted="false"
          preload="auto"
          class="remote-video"
          :data-user-id="userId"
        ></video>
          <div class="username-label">
            {{ getParticipantName(userId) }}
          </div>
        </div>
      </template>
      <div v-else class="empty-grid">
        <p>Esperando a que otros participantes se unan a la llamada...</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoGrid',
  props: {
    remoteStreams: {
      type: Object,
      required: true
    },
    participants: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      videoOrientations: {},
      streamPlayIntervals: {},
      streamTimers: {}
    };
  },
  computed: {
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
    remoteStreams: {
      handler(newStreams, oldStreams) {
        console.log('🔄 Cambio detectado en remoteStreams');
        
        // Limpiar timeout previo
        if (this._streamUpdateTimeout) {
          clearTimeout(this._streamUpdateTimeout);
        }
        
        // Procesar inmediatamente los streams nuevos/cambiados
        Object.keys(newStreams).forEach(userId => {
          if (!oldStreams || !oldStreams[userId] || oldStreams[userId] !== newStreams[userId]) {
            console.log(`🆕 Stream nuevo o cambiado para usuario ${userId}`);
            
            if (this.isValidMediaStream(newStreams[userId])) {
              // ASIGNAR INMEDIATAMENTE sin delays
              this.$nextTick(() => {
                this.updateVideoStreamForUser(userId);
              });
            } else {
              console.warn(`❌ Stream inválido para usuario ${userId}`);
            }
          }
        });
        
        // Limpiar streams eliminados
        Object.keys(this.videoOrientations).forEach(userId => {
          if (!newStreams[userId]) {
            this.cleanupUserResources(userId);
          }
        });
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    // Verificar que un objeto MediaStream es válido
    isValidMediaStream(stream) {
      if (!stream || typeof stream !== 'object') return false;
      
      // Verificar que el stream tiene al menos algunas propiedades esperadas
      return (
        // Verificamos por la propiedad 'id' que debería estar en cualquier MediaStream
        (stream.id && typeof stream.id === 'string') ||
        // O verificamos si tiene algún método típico de MediaStream
        (typeof stream.getTracks === 'function') ||
        (typeof stream.getVideoTracks === 'function') ||
        (typeof stream.getAudioTracks === 'function')
      );
    },
    
    // Verificar si un MediaStream está activo
    isMediaStreamActive(stream) {
      if (!stream) return false;
      
      try {
        // Primero intentamos usar la propiedad 'active' nativa
        if (typeof stream.active === 'boolean') {
          return stream.active;
        }
        
        // Si no hay propiedad 'active', verificamos los tracks
        if (typeof stream.getTracks === 'function') {
          const tracks = stream.getTracks();
          return tracks.length > 0 && tracks.some(track => track.enabled);
        }
        
        // Intentamos con video y audio tracks por separado
        const videoTracks = typeof stream.getVideoTracks === 'function' ? stream.getVideoTracks() : [];
        const audioTracks = typeof stream.getAudioTracks === 'function' ? stream.getAudioTracks() : [];
        
        return (videoTracks.length > 0 || audioTracks.length > 0);
      } catch (error) {
        console.warn('Error al verificar si el stream está activo:', error);
        // Asumimos que está activo como último recurso
        return true;
      }
    },
    
    // Limpiar recursos para un usuario específico
    cleanupUserResources(userId) {
      // Eliminar orientación guardada
      if (this.videoOrientations[userId]) {
        delete this.videoOrientations[userId];
      }
      
      // Limpiar cualquier intervalo de monitoreo
      if (this.streamPlayIntervals[userId]) {
        clearInterval(this.streamPlayIntervals[userId]);
        delete this.streamPlayIntervals[userId];
      }
      
      // Limpiar temporizadores
      if (this.streamTimers[userId]) {
        clearTimeout(this.streamTimers[userId]);
        delete this.streamTimers[userId];
      }
      
      console.log(`Recursos limpiados para usuario ${userId}`);
    },
    
    // Actualizar stream para un usuario específico
    async updateVideoStreamForUser(userId) {
      const videoElements = this.$refs.videoElements;
      if (!videoElements) return;
      
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      const video = videos.find(v => v.getAttribute('data-user-id') === userId);
      
      if (!video) {
        console.warn(`No se encontró elemento de video para usuario ${userId}`);
        return;
      }
      
      const stream = this.remoteStreams[userId];
      if (!stream) {
        console.warn(`No hay stream para usuario ${userId}`);
        return;
      }
      
      console.log(`🔧 ASIGNANDO STREAM a video de ${userId}`, {
        streamId: stream.id,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        active: stream.active
      });
      
      // ASIGNACIÓN DIRECTA Y SEGURA
      try {
        // Primero pausar cualquier reproducción existente
        video.pause();
        
        // Limpiar srcObject anterior
        video.srcObject = null;
        
        // Esperar un frame para que se limpie
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Asignar el nuevo stream
        video.srcObject = stream;
        
        // Configurar propiedades ANTES de cargar
        video.muted = false;
        video.autoplay = true;
        video.playsInline = true; // ¡IMPORTANTE para navegadores móviles!
        
        // FORZAR CARGA DEL VIDEO
        video.load();
        
        console.log(`✅ Stream asignado correctamente a ${userId}`);
        
        // Intentar reproducir después de un breve delay
        setTimeout(() => {
          this.playVideo(video, userId);
        }, 300);
        
      } catch (error) {
        console.error(`❌ Error asignando stream a ${userId}:`, error);
      }
    },
    
    // Reproducir video con manejo de errores
    playVideo(video, userId) {
      if (!video || video._isPlaying) return;
      
      // Verificar si ya hay un intento de reproducción en curso
      if (video._playAttemptInProgress) {
        console.log(`Ya hay un intento de reproducción en curso para ${userId}`);
        return;
      }
      
      // Asegurarnos de que haya un stream
      if (!video.srcObject) {
        console.warn(`Video para ${userId} no tiene srcObject`);
        return;
      }
      
      console.log(`Intentando reproducir video para ${userId}...`);
      
      // Marcar que hay un intento en progreso
      video._playAttemptInProgress = true;
      
      // Configurar propiedades básicas
      video.muted = false;
      video.volume = 1.0;
      
      // Reproducir con manejo de errores robusto
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`✅ Video para ${userId} comenzó a reproducirse correctamente`);
          console.log(`📊 Estado del video:`, {
            paused: video.paused,
            currentTime: video.currentTime,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          });
          video._playAttemptInProgress = false;
          video._isPlaying = true;
          
        }).catch(err => {
          console.warn(`❌ Fallo al reproducir video de ${userId}:`, err.message);
          video._playAttemptInProgress = false;
          
          // Solo un reintento con muted si no se ha intentado antes
          if (!video._mutedRetryAttempted) {
            video._mutedRetryAttempted = true;
            video.muted = true;
            
            setTimeout(() => {
              const retryPromise = video.play();
              if (retryPromise !== undefined) {
                retryPromise.then(() => {
                  console.log(`✅ Video para ${userId} funcionó con muted`);
                  video._isPlaying = true;
                  // Intentar quitar muted después de 2 segundos
                  setTimeout(() => {
                    video.muted = false;
                  }, 2000);
                }).catch(e => {
                  console.error(`❌ Falló último intento para ${userId}:`, e.message);
                });
              }
            }, 1000);
          }
        });
      } else {
        video._playAttemptInProgress = false;
      }
    },
        
    // Actualizar todos los streams de video
    updateVideoStreams() {
      const videoElements = this.$refs.videoElements;
      if (!videoElements) return;
      
      // Convertir a array si no lo es
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      
      // Para cada video, verificar su stream
      videos.forEach(video => {
        if (!video) return;
        
        const userId = video.getAttribute('data-user-id');
        if (!userId || !this.remoteStreams[userId]) return;
        
        // Si el video no tiene un stream asignado o es diferente, actualizarlo
        if (!video.srcObject || video.srcObject !== this.remoteStreams[userId]) {
          this.updateVideoStreamForUser(userId);
        }
      });
    },
    
    getParticipantName(userId) {
      const participant = this.participants.find(p => p.userId === userId);
      return participant ? participant.userName : 'Usuario';
    },

    checkAndRestartVideos() {
      console.log('🔍 Verificación única de videos...');
      
      const videoElements = this.$refs.videoElements;
      if (!videoElements) return;
      
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      
      videos.forEach(video => {
        if (!video) return;
        
        const userId = video.getAttribute('data-user-id');
        if (!userId || !this.remoteStreams[userId]) return;

        
        // ✅ VERIFICAR que el video tenga srcObject antes de intentar reproducir
        if (!video.srcObject) {
          console.log(`⚠️ Video para ${userId} no tiene srcObject, asignando...`);
          this.updateVideoStreamForUser(userId);
          return; // No intentar reproducir aún
        }
        
        // Solo intentar reproducir si tiene srcObject y está pausado
        if (video.paused && !video._playAttemptInProgress) {
          console.log(`▶️ Video para ${userId} pausado, intento de reproducción`);
          this.playVideo(video, userId);
        }
      });
    },

    // Método para detener todos los videos antes de la limpieza
    stopAllVideoPlayback() {
      console.log('Deteniendo todos los videos antes de la limpieza...');
      
      const videoElements = this.$refs.videoElements;
      if (!videoElements) return;
      
      // Convertir a array si no lo es
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      
      // Para cada video, detener reproducción
      videos.forEach(video => {
        if (!video) return;
        
        try {
          video.pause();
          video.srcObject = null;
        } catch (e) {
          console.warn('Error al detener video:', e);
        }
      });
      
      // Limpiar intervalos
      Object.keys(this.streamPlayIntervals).forEach(userId => {
        clearInterval(this.streamPlayIntervals[userId]);
      });
      this.streamPlayIntervals = {};
    },

    // Método para diagnóstico completo de videos
    diagnoseVideos() {
      console.log('===== DIAGNÓSTICO DE VIDEOS EN VIDEOGRID =====');
      
      const videoElements = this.$refs.videoElements;
      if (!videoElements) {
        console.log('No hay elementos de video para diagnosticar');
        return;
      }
      
      // Convertir a array si no lo es
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      
      console.log(`Encontrados ${videos.length} elementos de video`);
      
      // Para cada video, verificar su estado
      videos.forEach(video => {
        if (!video) return;
        
        const userId = video.getAttribute('data-user-id');
        if (!userId) {
          console.log('Video sin userId');
          return;
        }
        
        console.log(`VIDEO PARA ${userId}:`);
        console.log('- Pausado:', video.paused);
        console.log('- Terminado:', video.ended);
        console.log('- Tiempo actual:', video.currentTime);
        console.log('- Muted:', video.muted);
        console.log('- Volumen:', video.volume);
        console.log('- Ancho/Alto:', video.videoWidth, 'x', video.videoHeight);
        
        // Verificar srcObject
        if (video.srcObject) {
          const stream = video.srcObject;
          console.log('- Stream asignado:', stream.id);
          console.log('- Audio tracks:', stream.getAudioTracks().length);
          console.log('- Video tracks:', stream.getVideoTracks().length);
          
          // Verificar la conexión entre el stream asignado y el stream en remoteStreams
          const storedStream = this.remoteStreams[userId];
          console.log('- ¿Coincide con remoteStreams?', storedStream === stream);
        } else {
          console.log('- NO TIENE STREAM ASIGNADO');
        }
      });
      
      console.log('============================================');
    },

    // Método para detener todos los videos antes de la limpieza
    stopAllVideoPlayback() {
      console.log('Pausando todos los videos antes de la limpieza...');
      
      const videoElements = this.$refs.videoElements;
      if (!videoElements) return;
      
      // Convertir a array si no lo es
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      
      // Para cada video, detener reproducción PERO NO eliminar srcObject
      videos.forEach(video => {
        if (!video) return;
        
        try {
          // Solo pausar, no eliminar srcObject
          video.pause();
        } catch (e) {
          console.warn('Error al pausar video:', e);
        }
      });
      
      // Limpiar intervalos
      Object.keys(this.streamPlayIntervals).forEach(userId => {
        clearInterval(this.streamPlayIntervals[userId]);
        delete this.streamPlayIntervals[userId];
      });
    },

    // Método para diagnóstico completo de videos
    diagnoseVideos() {
      console.log('===== DIAGNÓSTICO DE VIDEOS EN VIDEOGRID =====');
      
      const videoElements = this.$refs.videoElements;
      if (!videoElements) {
        console.log('No hay elementos de video para diagnosticar');
        return;
      }
      
      // Convertir a array si no lo es
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      
      console.log(`Encontrados ${videos.length} elementos de video`);
      
      // Para cada video, verificar su estado
      videos.forEach(video => {
        if (!video) return;
        
        const userId = video.getAttribute('data-user-id');
        if (!userId) {
          console.log('Video sin userId');
          return;
        }
        
        console.log(`VIDEO PARA ${userId}:`);
        console.log('- Pausado:', video.paused);
        console.log('- Terminado:', video.ended);
        console.log('- Tiempo actual:', video.currentTime);
        console.log('- Muted:', video.muted);
        console.log('- Volumen:', video.volume);
        console.log('- Ancho/Alto:', video.videoWidth, 'x', video.videoHeight);
        console.log('- Ready State:', video.readyState);
        
        // Verificar srcObject
        if (video.srcObject) {
          const stream = video.srcObject;
          console.log('- Stream asignado:', stream.id);
          console.log('- Stream activo:', stream.active);
          console.log('- Audio tracks:', stream.getAudioTracks().length);
          console.log('- Video tracks:', stream.getVideoTracks().length);
          
          // Verificar tracks
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            console.log('- Video track principal:', {
              enabled: videoTracks[0].enabled,
              readyState: videoTracks[0].readyState
            });
          }
          
          // Verificar la conexión entre el stream asignado y el stream en remoteStreams
          const storedStream = this.remoteStreams[userId];
          console.log('- ¿Coincide con remoteStreams?', storedStream === stream);
          
          // Verificar si hay problemas de congelamiento
          if (video.currentTime === 0 && !video.paused) {
            console.log('- POSIBLE CONGELAMIENTO: currentTime=0 pero video no pausado');
          }
        } else {
          console.log('- NO TIENE STREAM ASIGNADO');
        }
      });
      
      console.log('============================================');
    },

  },
  mounted() {
    // Iniciar con los streams actuales
    this.updateVideoStreams();
  },
  beforeDestroy() {
    // Limpiar timeout de debounce
    if (this._streamUpdateTimeout) {
      clearTimeout(this._streamUpdateTimeout);
    }
    
    // Limpiar todos los intervalos y temporizadores
    Object.keys(this.streamPlayIntervals).forEach(userId => {
      clearInterval(this.streamPlayIntervals[userId]);
    });
    
    Object.keys(this.streamTimers).forEach(userId => {
      clearTimeout(this.streamTimers[userId]);
    });
  }
}
</script>

<style scoped>
.video-grid-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px;
  box-sizing: border-box;
  overflow: hidden;
}

.video-grid {
  display: grid;
  gap: 10px;
  width: 100%;
  height: 100%;
  min-height: 300px;
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

/* Manejo de videos en modo portrait directamente en el grid */
.grid-item.portrait-video .remote-video {
  width: auto !important;
  height: 100% !important;
  max-height: 100%;
}

/* Videos landscape (por defecto) */
.remote-video {
  width: 100% !important;
  height: auto !important;
  max-width: 100%;
  object-fit: contain;
  background-color: #000;
}

.username-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 4px;
  font-size: 0.9rem;
  z-index: 2;
}

.empty-grid {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #ffffff;
  text-align: center;
  background-color: #1a1a1a;
  border-radius: 8px;
  padding: 20px;
}

/* Media queries para adaptarse a diferentes pantallas */
@media (min-width: 1200px) {
  .grid-item {
    min-height: 250px;
  }
}

@media (max-width: 768px) {
  .video-grid-container {
    padding: 10px;
  }
  
  .grid-item {
    min-height: 150px;
  }
  
  .username-label {
    font-size: 0.8rem;
    padding: 3px 6px;
  }
}
</style>