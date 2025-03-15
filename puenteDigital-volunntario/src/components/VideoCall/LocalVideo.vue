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
            // Desconectar cualquier stream existente
            if (this.$refs.videoElement.srcObject) {
              this.$refs.videoElement.srcObject = null;
            }
            
            try {
              console.log("Conectando stream local", newStream);
              this.$refs.videoElement.srcObject = newStream;
              this.$refs.videoElement.onloadedmetadata = () => {
                this.$refs.videoElement.play().catch(e => console.error("Error reproduciendo video local:", e));
              };
            } catch (error) {
              console.error("Error al conectar stream local:", error);
              // Intento alternativo para streams de React Native
              if (newStream.toURL) {
                this.$refs.videoElement.src = newStream.toURL();
              } else if (newStream._tracks) {
                const newMediaStream = new MediaStream();
                newStream._tracks.forEach(track => newMediaStream.addTrack(track));
                this.$refs.videoElement.srcObject = newMediaStream;
              }
            }
          }
        });
      }
    },
    videoEnabled(newValue) {
      // Asegurar que el video se muestre correctamente al activarlo
      if (newValue && this.$refs.videoElement && this.stream) {
        this.$refs.videoElement.play().catch(e => console.error("Error al reactivar video:", e));
      }
    }
  },
}
</script>

<style scoped>
.local-video-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #000;
  border-radius: 8px;
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
  padding: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-off {
  background-color: rgba(244, 67, 54, 0.8);
}

.username-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 8px;
  background-color: rgba(25, 118, 210, 0.8);
  color: white;
  border-radius: 4px;
  font-size: 0.85rem;
}
</style>