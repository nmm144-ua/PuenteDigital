<!-- components/VideoCall/WaitingRoom.vue (modificado) -->
<template>
  <div class="room-card">
    <div class="room-header">
      <h2>Sala de Espera</h2>
    </div>
    
    <div class="room-info">
      <div class="room-id-section">
        <h3>ID de Sala:</h3>
        <div class="room-id-value">{{ roomId }}</div>
        <button @click="copyRoomId" class="copy-button">
          <i class="fas fa-copy"></i>
        </button>
      </div>
      
      <div class="participants-info">
        <div class="participants-count">
          Participantes ({{ participants.length + 1 }})
        </div>
        <div class="user-status" v-if="isAsistente">
          Estás conectado como asistente
        </div>
        <div class="user-status" v-else>
          Estás conectado como usuario
        </div>
      </div>
      
      <!-- Muestra información diferente dependiendo del estado -->
      <div v-if="isAsistente && !solicitudAceptada" class="notification-box" :class="{ 'warning': participants.length === 0 }">
        <i :class="participants.length > 0 ? 'fas fa-info-circle' : 'fas fa-exclamation-triangle'"></i>
        <p v-if="participants.length > 0">
          Hay usuarios esperando asistencia. Debes aceptar la solicitud antes de iniciar la videollamada.
        </p>
        <p v-else>
          No hay otros participantes conectados en esta sala.
        </p>
      </div>
      
      <!-- Cuando el asistente ya aceptó la solicitud pero no inició la videollamada -->
      <div v-if="isAsistente && solicitudAceptada" class="notification-box success">
        <i class="fas fa-check-circle"></i>
        <p>
          Has aceptado la solicitud. Ahora puedes iniciar la videollamada cuando estés listo.
        </p>
      </div>
    </div>
    
    <div class="action-buttons">
      <!-- Si es asistente y aún no ha aceptado la solicitud -->
      <button 
        v-if="isAsistente && !solicitudAceptada"
        class="action-button primary" 
        @click="aceptarSolicitud"
        :disabled="participants.length === 0"
      >
        Aceptar Solicitud
      </button>
      
      <!-- Si es asistente y ya aceptó la solicitud -->
      <button 
        v-if="isAsistente && solicitudAceptada" 
        class="action-button success" 
        @click="iniciarVideollamada"
        :disabled="participants.length === 0"
      >
        Iniciar Videollamada
      </button>
      
      <button 
        class="action-button secondary" 
        @click="$emit('leave-room')"
      >
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
    },
    isAsistente: {
      type: Boolean,
      default: false
    },
    solicitudAceptada: {
      type: Boolean,
      default: false
    },
    watch: {
      solicitudAceptada(newValue) {
          console.log('🔔 WaitingRoom - solicitudAceptada cambió:', {
            newValue,
            isAsistente: this.isAsistente,
            participants: this.participants.length
          });
      }
    }  },
  methods: {
    copyRoomId() {
      navigator.clipboard.writeText(this.roomId)
        .then(() => {
          alert('ID de sala copiado al portapapeles');
        })
        .catch(err => {
          console.error('Error al copiar ID:', err);
        });
    },
    aceptarSolicitud() {
      console.log("*** BOTÓN ACEPTAR SOLICITUD PRESIONADO ***");
      this.$emit('accept-request');
    },
    iniciarVideollamada() {
      console.log('🚀 Intentando iniciar videollamada');
      this.$emit('start-call');
    }
  }
};
</script>

<style scoped>
.room-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
  overflow: hidden;
}

.room-header {
  background-color: #1976D2;
  color: white;
  padding: 15px 20px;
  text-align: center;
}

.room-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.room-info {
  padding: 20px;
}

.room-id-section {
  display: flex;
  align-items: center;
  background-color: #e3f2fd;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.room-id-section h3 {
  margin: 0;
  font-size: 1rem;
  margin-right: 10px;
  color: #0d47a1;
}

.room-id-value {
  font-weight: bold;
  color: #1976d2;
  font-family: monospace;
  font-size: 1.1rem;
  flex-grow: 1;
}

.copy-button {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  font-size: 1rem;
  padding: 5px 10px;
}

.copy-button:hover {
  color: #0d47a1;
}

.participants-info {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  margin-bottom: 20px;
}

.participants-count {
  font-weight: bold;
  color: #333;
}

.user-status {
  font-style: italic;
  color: #666;
}

.notification-box {
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: #fff8e1;
  border-left: 3px solid #ffc107;
  border-radius: 4px;
  margin-bottom: 20px;
}

.notification-box i {
  font-size: 1.5rem;
  color: #ffc107;
  margin-right: 15px;
}

.notification-box p {
  margin: 0;
  color: #5d4037;
}

.notification-box.warning {
  background-color: #ffebee;
  border-left-color: #f44336;
}

.notification-box.warning i {
  color: #f44336;
}

.notification-box.success {
  background-color: #e8f5e9;
  border-left-color: #4caf50;
}

.notification-box.success i {
  color: #4caf50;
}

.action-buttons {
  display: flex;
  padding: 20px;
  border-top: 1px solid #eee;
  gap: 15px;
}

.action-button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-button.primary {
  background-color: #1976d2;
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  background-color: #0d47a1;
}

.action-button.primary:disabled {
  background-color: #bdbdbd;
  cursor: not-allowed;
}

.action-button.success {
  background-color: #4caf50;
  color: white;
}

.action-button.success:hover:not(:disabled) {
  background-color: #388e3c;
}

.action-button.success:disabled {
  background-color: #bdbdbd;
  cursor: not-allowed;
}

.action-button.secondary {
  background-color: #f5f5f5;
  color: #d32f2f;
  border: 1px solid #ddd;
}

.action-button.secondary:hover {
  background-color: #e0e0e0;
}

@media (max-width: 768px) {
  .room-card {
    width: 95%;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>