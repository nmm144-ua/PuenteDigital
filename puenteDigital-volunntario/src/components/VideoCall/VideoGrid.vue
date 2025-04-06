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
            muted
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
        // Detectar nuevos streams o cambios en streams existentes
        Object.keys(newStreams).forEach(userId => {
          if (!oldStreams || !oldStreams[userId] || oldStreams[userId] !== newStreams[userId]) {
            // Stream nuevo o cambiado
            console.log(`Stream nuevo o cambiado para usuario ${userId}`);
            
            // Verificar si el stream es válido
            if (this.isValidMediaStream(newStreams[userId])) {
              // Si tenemos un temporizador activo para este usuario, limpiarlo
              if (this.streamTimers[userId]) {
                clearTimeout(this.streamTimers[userId]);
              }
              
              // Configurar un temporizador para asegurarnos de que el stream se procese
              this.streamTimers[userId] = setTimeout(() => {
                this.updateVideoStreamForUser(userId);
              }, 100);
            } else {
              console.warn(`Stream inválido recibido para usuario ${userId}`);
            }
          }
        });
        
        // Eliminar streams que ya no existen
        Object.keys(this.videoOrientations).forEach(userId => {
          if (!newStreams[userId]) {
            this.cleanupUserResources(userId);
          }
        });
        
        this.$nextTick(() => {
          this.updateVideoStreams();
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
    updateVideoStreamForUser(userId) {
      // Obtener todos los elementos de video
      const videoElements = this.$refs.videoElements;
      if (!videoElements) return;
      
      // Convertir a array si no lo es
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      
      // Buscar el video correspondiente a este usuario
      const video = videos.find(v => v.getAttribute('data-user-id') === userId);
      if (!video) {
        console.warn(`No se encontró elemento de video para usuario ${userId}`);
        return;
      }
      
      const stream = this.remoteStreams[userId];
      if (stream) {
        console.log(`Verificando stream para usuario ${userId}`, {
          streamId: stream.id,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          active: stream.active
        });
        
        // Asegurar que el stream se asigne incluso si parece inactivo
        // (esto es importante para compatibilidad con React Native)
        if (video.srcObject !== stream) {
          console.log(`Asignando stream al video de ${userId} (forzado)`);
          video.srcObject = stream;
          
          // Intentar reproducir inmediatamente
          this.playVideo(video, userId);
        }
      }
    },
    
    // Reproducir video con manejo de errores
    playVideo(video, userId) {
      if (!video) return;
      
      // Intentar reproducir el video
      video.play().then(() => {
        console.log(`Video para ${userId} comenzó a reproducirse correctamente`);
        
        // Configurar un intervalo para verificar que el video sigue reproduciéndose
        if (this.streamPlayIntervals[userId]) {
          clearInterval(this.streamPlayIntervals[userId]);
        }
        
        // Monitorear estado de reproducción cada 5 segundos
        this.streamPlayIntervals[userId] = setInterval(() => {
          if (video.paused || video.ended) {
            console.log(`Video para ${userId} detenido, intentando reanudar...`);
            video.play().catch(e => console.warn(`No se pudo reanudar video: ${e.message}`));
          }
        }, 5000);
        
      }).catch(err => {
        console.warn(`Fallo al reproducir video de ${userId}, intentando con muted:`, err);
        
        // Si falla, intentar con muted
        video.muted = true;
        
        // Darle un pequeño tiempo antes de intentar reproducir de nuevo
        setTimeout(() => {
          video.play().catch(e => {
            console.error(`Fallo incluso con muted para ${userId}:`, e);
            
            // Si sigue fallando, tal vez hay un problema con el stream
            // Intentar una última vez después de un tiempo más largo
            setTimeout(() => {
              console.log(`Último intento de reproducir video para ${userId}`);
              video.play().catch(() => {
                // Ya no hacemos nada más, para evitar errores en cascada
              });
            }, 2000);
          });
        }, 500);
      });
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
    }
  },
  mounted() {
    // Iniciar con los streams actuales
    this.updateVideoStreams();
  },
  beforeDestroy() {
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