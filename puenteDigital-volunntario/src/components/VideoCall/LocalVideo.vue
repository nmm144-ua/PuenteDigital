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
            }
          });
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .video-grid {
    display: grid;
    gap: 16px;
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
    background-color: #E0E0E0; /* Gris claro */
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #BBDEFB; /* Borde azul claro */
  }
  
  .remote-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .username-label {
    position: absolute;
    bottom: 12px;
    left: 12px;
    padding: 6px 12px;
    background-color: #1976D2; /* Azul primario */
    color: white;
    border-radius: 4px;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .empty-grid {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #9E9E9E; /* Gris medio */
    text-align: center;
    background-color: #F5F5F5; /* Gris muy claro */
    border-radius: 8px;
    padding: 30px;
    border: 2px dashed #E0E0E0; /* Borde gris claro discontinuo */
  }
  
  .empty-grid p {
    font-size: 1.1rem;
    margin-bottom: 20px;
  }
  
  /* Añadir icono visual */
  .empty-grid::before {
    content: "";
    display: block;
    width: 80px;
    height: 80px;
    margin-bottom: 20px;
    background-color: #1976D2; /* Azul primario */
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z'/%3E%3C/svg%3E");
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z'/%3E%3C/svg%3E");
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  
  /* Añadir animación de pulso */
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  .empty-grid p {
    animation: pulse 2s infinite ease-in-out;
  }
  </style>