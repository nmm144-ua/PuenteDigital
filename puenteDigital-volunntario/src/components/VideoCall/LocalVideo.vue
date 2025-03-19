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
    }
  },
  watch: {
    stream: {
      immediate: true,
      handler(newStream) {
        this.$nextTick(() => {
          if (this.$refs.videoElement && newStream) {
            this.$refs.videoElement.srcObject = newStream;
            // Emitir el elemento de video para detectar su orientación
            this.$emit('video-ready', this.$refs.videoElement);
          }
        });
      }
    }
  },
  mounted() {
    // También emitir en mounted por si ya está disponible
    if (this.$refs.videoElement && this.stream) {
      this.$emit('video-ready', this.$refs.videoElement);
    }
  }
}
</script>

<style scoped>
.local-video-container {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  background-color: #1a1a1a;
  /* Eliminado el aspect-ratio fijo para adaptarse al contenido real */
}

.local-video {
  width: 100%;
  height: 100%;
  /* Cambiado de cover a contain para evitar recortar el video */
  object-fit: contain;
  background-color: #1a1a1a;
}

.video-muted {
  opacity: 0.5;
}

.video-off-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 24px;
  background-color: rgba(0, 0, 0, 0.6);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.audio-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 4px;
  background-color: rgba(25, 118, 210, 0.7);
  color: white;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.8rem;
}

.audio-off {
  background-color: rgba(244, 67, 54, 0.7);
}

.username-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 3px 6px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .video-off-indicator {
    font-size: 18px;
    width: 40px;
    height: 40px;
  }
  
  .audio-indicator {
    width: 20px;
    height: 20px;
    font-size: 0.7rem;
  }
}
</style>