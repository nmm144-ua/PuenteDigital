<!-- src/components/VideoCall/CallControls.vue -->
<template>
    <div class="call-controls">
      <button 
        class="control-button"
        :class="{ 'control-off': !audioEnabled }"
        @click="$emit('toggle-audio')"
        title="Micrófono"
      >
        <i :class="audioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash'"></i>
      </button>
      
      <button 
        class="control-button"
        :class="{ 'control-off': !videoEnabled }"
        @click="$emit('toggle-video')"
        title="Cámara"
      >
        <i :class="videoEnabled ? 'fas fa-video' : 'fas fa-video-slash'"></i>
      </button>
      
      <button 
        class="control-button end-call"
        @click="$emit('end-call')"
        title="Finalizar llamada"
      >
        <i class="fas fa-phone-slash"></i>
      </button>

    </div>
  </template>
  
  <script>
  export default {
    name: 'CallControls',
    props: {
      audioEnabled: {
        type: Boolean,
        default: true
      },
      videoEnabled: {
        type: Boolean,
        default: true
      },
    },
    emits: ['toggle-audio', 'toggle-video', 'end-call']
  }
  </script>
  
  <style scoped>
  .call-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    padding: 12px;
    background-color: #FFFFFF;
    border-radius: 10px;
    margin: 10px auto 20px; /* Margen inferior más grande para no chocar con el footer */
    width: fit-content;
    max-width: 90%;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid #E0E0E0;
    position: relative;
    z-index: 11;
  }
  
  .control-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #F5F5F5;
    color: #1976D2;
    border: 1px solid #E0E0E0;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .control-button:hover {
    background-color: #E3F2FD;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .control-off {
    background-color: #FFEBEE;
    color: #F44336;
    border-color: #FFCDD2;
  }
  
  .control-off:hover {
    background-color: #FFCDD2;
  }
  
  .end-call {
    background-color: #F44336;
    color: white;
    border-color: #F44336;
    width: 58px;
    height: 58px;
  }
  
  .end-call:hover {
    background-color: #D32F2F;
  }
  
  .active {
    background-color: #1976D2;
    color: white;
    border-color: #1976D2;
  }
  
  .active:hover {
    background-color: #0D47A1;
  }
  
  /* Adaptación para móviles */
  @media (max-width: 768px) {
    .call-controls {
      padding: 10px;
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .control-button {
      width: 42px;
      height: 42px;
      font-size: 0.9rem;
    }
    
    .end-call {
      width: 48px;
      height: 48px;
    }
  }
  </style>