<!-- src/components/VideoCall/VideoGrid.vue -->
<template>
  <div class="video-grid" :class="[gridClass]">
    <template v-if="Object.keys(remoteStreams).length > 0">
      <div 
        v-for="(stream, userId) in remoteStreams" 
        :key="userId" 
        class="grid-item"
      >
        <video 
          :ref="el => { if(el) videoRefs[userId] = el }" 
          autoplay 
          playsinline
          class="remote-video"
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
      videoRefs: {}
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
      deep: true,
      handler() {
        this.$nextTick(() => {
          this.attachStreams();
        });
      }
    }
  },
  methods: {
    attachStreams() {
      console.log("Ejecutando attachStreams con streams:", Object.keys(this.remoteStreams));
      
      Object.entries(this.remoteStreams).forEach(([userId, stream]) => {
        const videoElement = this.videoRefs[userId];
        if (videoElement) {
          // Limpiar cualquier stream anterior
          if (videoElement.srcObject) {
            videoElement.srcObject = null;
          }
          
          if (stream) {
            console.log(`Conectando stream para ${userId}`, typeof stream, stream);
            
            // Primero intentar con srcObject (estándar web)
            try {
              videoElement.srcObject = stream;
              videoElement.onloadedmetadata = () => {
                videoElement.play()
                  .then(() => console.log(`Video para ${userId} reproduciendo correctamente`))
                  .catch(e => {
                    console.error(`Error al reproducir video para ${userId}:`, e);
                    // Intento adicional de reproducción automática
                    document.addEventListener('click', function playVideoOnce() {
                      videoElement.play();
                      document.removeEventListener('click', playVideoOnce);
                    });
                  });
              };
              
              // Configurar listeners de eventos
              this.setupStreamEventListeners(userId, stream);
              
            } catch (error) {
              console.error(`Error principal al conectar stream para ${userId}:`, error);
              
              // Intentos alternativos para React Native
              try {
                if (typeof stream.toURL === 'function') {
                  console.log(`Usando método toURL() para ${userId}`);
                  videoElement.src = stream.toURL();
                } else if (stream._tracks || (stream.getTracks && stream.getTracks().length)) {
                  console.log(`Creando nuevo MediaStream para ${userId}`);
                  // Obtener pistas de diferentes maneras según la plataforma
                  const tracks = stream._tracks || (stream.getTracks && stream.getTracks());
                  if (tracks && tracks.length) {
                    const newStream = new MediaStream();
                    
                    // Añadir pistas una por una de forma segura
                    for (let i = 0; i < tracks.length; i++) {
                      try {
                        newStream.addTrack(tracks[i]);
                      } catch (trackError) {
                        console.warn(`No se pudo añadir pista ${i} para ${userId}:`, trackError);
                      }
                    }
                    
                    videoElement.srcObject = newStream;
                    videoElement.onloadedmetadata = () => {
                      videoElement.play().catch(e => console.error(`Error reproduciendo video alternativo para ${userId}:`, e));
                    };
                  } else {
                    console.warn(`No hay pistas disponibles en el stream para ${userId}`);
                  }
                } else {
                  console.warn(`No se pudo determinar formato de stream para ${userId}`);
                }
              } catch (secondError) {
                console.error(`Error en métodos alternativos para ${userId}:`, secondError);
              }
            }
          } else {
            console.warn(`Stream no disponible para ${userId}`);
          }
        } else {
          console.warn(`Elemento de video no encontrado para ${userId}`);
        }
      });
    },
    getParticipantName(userId) {
      const participant = this.participants.find(p => p.userId === userId);
      return participant ? participant.userName : 'Usuario';
    },
    checkStreamStatus() {
      const streamIds = Object.keys(this.remoteStreams);
      console.log(`Verificando estado de ${streamIds.length} streams remotos`, streamIds);
      
      if (streamIds.length === 0) {
        console.log("No hay streams remotos activos");
        return;
      }
      
      Object.entries(this.remoteStreams).forEach(([userId, stream]) => {
        if (!stream) {
          console.warn(`Stream indefinido para ${userId}`);
          return;
        }
        
        // Comprobar si el stream está activo
        const isActive = typeof stream.active !== 'undefined' ? stream.active : true;
        console.log(`Stream para ${userId} - activo: ${isActive}`);
        
        // Comprobar pistas
        let tracks = [];
        
        if (stream.getTracks && typeof stream.getTracks === 'function') {
          tracks = stream.getTracks();
        } else if (stream._tracks && Array.isArray(stream._tracks)) {
          tracks = stream._tracks;
        }
        
        if (tracks.length === 0) {
          console.warn(`No se encontraron pistas para el stream de ${userId}`);
        } else {
          console.log(`Stream ${userId} tiene ${tracks.length} pistas:`);
          tracks.forEach((track, index) => {
            const info = {
              tipo: track.kind || 'desconocido',
              habilitado: track.enabled !== false,
              muted: track.muted === true,
              readyState: track.readyState || 'desconocido',
              id: track.id || `pista-${index}`
            };
            console.log(`- Pista ${index}:`, info);
          });
        }
      });
    },
    setupStreamEventListeners(userId, stream) {
      if (!stream) return;
      
      const tracks = stream.getTracks ? stream.getTracks() : (stream._tracks || []);
      
      tracks.forEach(track => {
        track.onended = () => {
          console.log(`La pista ${track.kind} del usuario ${userId} ha terminado`);
          // Intentar reconectar o notificar al usuario
          this.$emit('track-ended', { userId, trackType: track.kind });
        };
        
        track.onmute = () => {
          console.log(`La pista ${track.kind} del usuario ${userId} ha sido silenciada`);
          this.$emit('track-muted', { userId, trackType: track.kind });
        };
        
        track.onunmute = () => {
          console.log(`La pista ${track.kind} del usuario ${userId} ha sido reactivada`);
          this.$emit('track-unmuted', { userId, trackType: track.kind });
        };
      });
    }
  },
  mounted() {
    this.attachStreams();
    this.streamCheckInterval = setInterval(() => this.checkStreamStatus(), 5000); 
  },
  beforeDestroy() {
    if (this.streamCheckInterval) {
      clearInterval(this.streamCheckInterval);
    }
  },
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

.grid-item {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  background-color: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.username-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 4px;
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