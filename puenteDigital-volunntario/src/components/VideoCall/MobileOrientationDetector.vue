<!-- src/components/VideoCall/MobileOrientationDetector.vue -->
<template>
    <div 
      class="video-container" 
      :class="{ 'portrait-mode': isPortrait, 'landscape-mode': !isPortrait }"
    >
      <slot></slot>
      <div v-if="showOrientationHint" class="orientation-hint">
        <i class="fas fa-mobile-alt"></i>
        <span>Video en modo vertical</span>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'MobileOrientationDetector',
    props: {
      videoElement: {
        type: HTMLVideoElement,
        default: null
      },
      showHint: {
        type: Boolean,
        default: true
      }
    },
    data() {
      return {
        isPortrait: true,
        videoWidth: 0,
        videoHeight: 0,
        showOrientationHint: false
      };
    },
    watch: {
      videoElement: {
        immediate: true,
        handler(video) {
          if (video) {
            this.setupVideoListener(video);
          }
        }
      }
    },
    methods: {
      setupVideoListener(video) {
        // Detectar tamaño del video una vez cargado
        video.addEventListener('loadedmetadata', () => {
          this.updateVideoDimensions(video);
        });
        
        // También verificar después de un tiempo para streams en vivo
        setTimeout(() => {
          this.updateVideoDimensions(video);
        }, 1000);
      },
      
      updateVideoDimensions(video) {
        if (video) {
          this.videoWidth = video.videoWidth;
          this.videoHeight = video.videoHeight;
          this.isPortrait = this.videoHeight > this.videoWidth;
          
          // Mostrar pista de orientación solo si está en modo retrato
          this.showOrientationHint = this.showHint && this.isPortrait;
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .video-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  /* Modo retrato - ajustes para videos verticales */
  .portrait-mode {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .portrait-mode ::v-deep .remote-video,
  .portrait-mode ::v-deep .local-video {
    width: auto !important;
    height: 100% !important;
    max-height: 100%;
    object-fit: contain !important;
  }
  
  /* Modo paisaje - comportamiento normal */
  .landscape-mode ::v-deep .remote-video,
  .landscape-mode ::v-deep .local-video {
    width: 100% !important;
    height: auto !important;
    max-width: 100%;
    object-fit: contain !important;
  }
  
  .orientation-hint {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .orientation-hint i {
    transform: rotate(90deg);
  }
  </style>