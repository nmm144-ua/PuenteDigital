<!-- src/components/VideoCall/WaitingRoom.vue -->
<template>
    <div class="waiting-room">
      <h2>Sala de Espera</h2>
      
      <div class="room-info" v-if="roomId">
        <p>ID de Sala: <span class="room-id">{{ roomId }}</span></p>
        <button class="copy-button" @click="copyRoomId" title="Copiar ID">
          <i class="fas fa-copy"></i>
        </button>
      </div>
      
      <div class="participants-list">
        <h3>Participantes ({{ participants.length + 1 }})</h3>
        <ul>
          <li class="participant you">
            <span class="participant-name">Tú ({{ userName }})</span>
            <span class="participant-status">Presente</span>
          </li>
          <li class="participant" v-for="participant in participants" :key="participant.userId">
            <span class="participant-name">{{ participant.userName }}</span>
            <span class="participant-status">Presente</span>
          </li>
        </ul>
      </div>
      
      <div class="actions">
        <button class="start-button" @click="$emit('start-call')" :disabled="participants.length === 0">
          Iniciar Videollamada
        </button>
        <button class="leave-button" @click="$emit('leave-room')">
          Salir de la Sala
        </button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'WaitingRoom',
    props: {
      roomId: {
        type: String,
        required: true
      },
      participants: {
        type: Array,
        default: () => []
      },
      userName: {
        type: String,
        default: 'Usuario'
      }
    },
    methods: {
      copyRoomId() {
        // Verificar si el API Clipboard está disponible
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(this.roomId)
            .then(() => {
              alert('ID de sala copiado al portapapeles');
            })
            .catch(err => {
              console.error('Error al copiar ID:', err);
              this.fallbackCopyToClipboard(this.roomId);
            });
        } else {
          // Fallback si el API Clipboard no está disponible
          this.fallbackCopyToClipboard(this.roomId);
        }
      },

      // Método alternativo para copiar al portapapeles
      fallbackCopyToClipboard(text) {
        try {
          // Crear un elemento temporal
          const textArea = document.createElement('textarea');
          textArea.value = text;
          
          // Hacer que el elemento no sea visible
          textArea.style.position = 'fixed';
          textArea.style.top = '0';
          textArea.style.left = '0';
          textArea.style.width = '2em';
          textArea.style.height = '2em';
          textArea.style.padding = '0';
          textArea.style.border = 'none';
          textArea.style.outline = 'none';
          textArea.style.boxShadow = 'none';
          textArea.style.background = 'transparent';
          
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            alert('ID de sala copiado al portapapeles');
          } else {
            // Si también falla, mostrar el ID para que el usuario lo pueda copiar manualmente
            alert('No se pudo copiar automáticamente. ID de sala: ' + text);
          }
        } catch (err) {
          console.error('Error en el fallback de copiado:', err);
          alert('No se pudo copiar. Por favor, copia manualmente este ID: ' + text);
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .waiting-room {
    max-width: 600px;
    width: 90%;
    margin: 20px auto; /* Margen para separar de navbar y footer */
    padding: 25px;
    background-color: #FFFFFF;
    border-radius: 12px;
    color: #424242;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
    border: 1px solid #E0E0E0;
    position: relative;
  }
  
  h2 {
    text-align: center;
    margin-bottom: 20px;
    color: #1976D2;
    font-size: 1.8rem;
  }
  
  .room-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding: 12px;
    background-color: #E3F2FD;
    border-radius: 8px;
    border: 1px solid #BBDEFB;
  }
  
  .room-id {
    font-weight: bold;
    color: #1976D2;
    word-break: break-all;
  }
  
  .copy-button {
    background: none;
    border: none;
    color: #1976D2;
    cursor: pointer;
    font-size: 1.2rem;
    flex-shrink: 0;
    transition: color 0.3s;
    padding: 6px;
  }
  
  .copy-button:hover {
    color: #0D47A1;
  }
  
  .participants-list {
    margin-bottom: 20px;
    max-height: 200px; /* Altura máxima reducida para encajar mejor */
    overflow-y: auto;
    padding-right: 5px;
  }
  
  .participants-list h3 {
    margin-bottom: 12px;
    font-size: 1.1rem;
    color: #424242;
    position: sticky;
    top: 0;
    background-color: #FFFFFF;
    padding: 5px 0;
    z-index: 1;
  }
  
  .participants-list ul {
    list-style: none;
    padding: 0;
  }
  
  .participant {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    margin-bottom: 8px;
    background-color: #F5F5F5;
    border-radius: 8px;
    border: 1px solid #E0E0E0;
  }
  
  .participant.you {
    background-color: #E3F2FD;
    border-color: #BBDEFB;
  }
  
  .participant-name {
    font-weight: 500;
  }
  
  .participant-status {
    color: #4CAF50;
    font-weight: 500;
  }
  
  .actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 20px;
  }
  
  .start-button, .leave-button {
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    font-size: 1rem;
    transition: all 0.3s;
  }
  
  .start-button:hover:not(:disabled),
  .leave-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .start-button {
    background-color: #1976D2;
    color: white;
  }
  
  .start-button:hover:not(:disabled) {
    background-color: #0D47A1;
  }
  
  .start-button:disabled {
    background-color: #BDBDBD;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  .leave-button {
    background-color: #F5F5F5;
    color: #F44336;
    border: 1px solid #E0E0E0;
  }
  
  .leave-button:hover {
    background-color: #FFEBEE;
    border-color: #FFCDD2;
  }
  
  /* Diseño responsive para pantallas pequeñas */
  @media (max-width: 768px) {
    .waiting-room {
      padding: 15px;
      width: 95%;
      margin: 15px auto;
    }
    
    .actions {
      flex-direction: column;
      gap: 10px;
    }
    
    .start-button, .leave-button {
      width: 100%;
    }
  }
  </style>