<!-- src/components/VideoCall/VideoGrid.vue -->
<template>
  <div class="video-grid-container">
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
      Object.entries(this.remoteStreams).forEach(([userId, stream]) => {
        const videoElement = this.videoRefs[userId];
        if (videoElement && videoElement.srcObject !== stream) {
          videoElement.srcObject = stream;
          
          // Detectar cuando el video se carga para analizar sus dimensiones
          videoElement.onloadedmetadata = () => {
            // Emitir evento con las dimensiones del video para facilitar la detección de orientación
            this.$emit('video-loaded', {
              userId,
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
              isPortrait: videoElement.videoHeight > videoElement.videoWidth
            });
          };
        }
      });
    },
    getParticipantName(userId) {
      const participant = this.participants.find(p => p.userId === userId);
      return participant ? participant.userName : 'Usuario';
    }
  },
  mounted() {
    this.attachStreams();
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
  /* Eliminado el aspect-ratio fijo */
}

.remote-video {
  width: 100%;
  height: 100%;
  /* Cambiado a contain para mostrar todo el contenido */
  object-fit: contain;
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