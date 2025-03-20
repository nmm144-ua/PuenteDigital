<!-- ToggleActivacionWidget.vue -->
<template>
  <div class="widget-card">
    <div class="widget-header">
      <div class="icon-container">
        <i :class="['fas', estaActivo ? 'fa-toggle-on' : 'fa-toggle-off']"></i>
      </div>
      <h3 class="widget-title">Estado de Disponibilidad</h3>
    </div>
    
    <div class="widget-body">
      <div class="status-indicator">
        <div class="status-circle" :class="{ 'active': estaActivo }">
          <i :class="['fas', estaActivo ? 'fa-check' : 'fa-times']"></i>
        </div>
        <div class="status-info">
          <div class="status-label">Estado actual:</div>
          <div class="status-value" :class="estaActivo ? 'status-active' : 'status-inactive'">
            {{ estaActivo ? 'Activo' : 'Inactivo' }}
          </div>
        </div>
      </div>
      
      <div class="status-description">
        <p v-if="estaActivo">
          Estás <strong>disponible</strong> para recibir solicitudes de asistencia. Los usuarios pueden contactarte a través de chat o videollamada.
        </p>
        <p v-else>
          Estás <strong>desconectado</strong>. No recibirás nuevas solicitudes de asistencia hasta que te actives.
        </p>
      </div>
      
      <div class="action-area">
        <button
          @click="toggleActivacion"
          class="toggle-button"
          :class="estaActivo ? 'toggle-deactivate' : 'toggle-activate'"
          :disabled="loading"
        >
          <div class="button-content">
            <div v-if="loading" class="loading-spinner"></div>
            <span v-else :class="['fas', estaActivo ? 'fa-power-off' : 'fa-power-off']"></span>
            <span class="button-text">{{ textoBoton }}</span>
          </div>
        </button>
      </div>
      
      <transition name="fade">
        <div v-if="error" class="notification notification-error">
          <i class="fas fa-exclamation-triangle"></i>
          <span>{{ error }}</span>
        </div>
      </transition>
      
      <transition name="fade">
        <div v-if="mensajeExito" class="notification notification-success">
          <i class="fas fa-check-circle"></i>
          <span>{{ mensajeExito }}</span>
        </div>
      </transition>
      
      <div class="session-info" v-if="estaActivo && jornada">
        <div class="session-timer">
          <i class="fas fa-clock"></i>
          <span>{{ tiempoTranscurrido }}</span>
        </div>
        <div class="session-label">Tiempo de actividad</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { asistenteService } from '../../services/asistenteService';
import { jornadasService } from '@/services/jornadasService';

const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  estadoInicial: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['estadoCambiado']);
const estaActivo = ref(props.estadoInicial);
const loading = ref(false);
const error = ref('');
const mensajeExito = ref('');
const jornada = ref(null);
const startTime = ref(null);
const tiempoTranscurrido = ref('00:00:00');
let timerInterval = null;

// Cargar jornada actual si el asistente está activo
const cargarJornadaActual = async () => {
  if (!estaActivo.value) return;
  
  try {
    const asistente = await asistenteService.getAsistenteByUserId(props.userId);
    const jornadaActual = await jornadasService.getJornadaActiva(asistente.id);
    
    if (jornadaActual) {
      jornada.value = jornadaActual;
      startTime.value = new Date(jornadaActual.inicio);
      iniciarTemporizador();
    }
  } catch (err) {
    console.error('Error al cargar jornada actual:', err);
  }
};

// Formatear tiempo transcurrido
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
};

// Actualizar temporizador
const actualizarTemporizador = () => {
  if (!startTime.value) return;
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - startTime.value) / 1000);
  tiempoTranscurrido.value = formatTime(diffInSeconds);
};

// Iniciar temporizador
const iniciarTemporizador = () => {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(actualizarTemporizador, 1000);
  actualizarTemporizador(); // Actualizar inmediatamente
};

// Detener temporizador
const detenerTemporizador = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const toggleActivacion = async () => {
  try {
    loading.value = true;
    error.value = '';
    mensajeExito.value = '';
    
    const nuevoEstado = !estaActivo.value;
    await asistenteService.actualizarEstadoAsistente(props.userId, nuevoEstado);
    estaActivo.value = nuevoEstado;
    
    // Mostrar mensaje de éxito temporalmente
    mensajeExito.value = nuevoEstado
      ? 'Te has activado correctamente. Ya puedes recibir solicitudes de ayuda.'
      : 'Te has desactivado correctamente. No recibirás solicitudes de ayuda.';
    
    setTimeout(() => {
      mensajeExito.value = '';
    }, 5000);
    
    // Gestionar jornada
    if (nuevoEstado) {
      // Iniciar nueva jornada
      const asistente = await asistenteService.getAsistenteByUserId(props.userId);
      const nuevaJornada = await jornadasService.createJornada({
        asistente_id: asistente.id,
        inicio: new Date().toISOString(),
      });
      jornada.value = nuevaJornada;
      startTime.value = new Date();
      iniciarTemporizador();
    } else {
      // Terminar jornada actual
      if (jornada.value) {
        await jornadasService.terminarJornada(jornada.value.id, {
          fin: new Date().toISOString(),
        });
        jornada.value = null;
        detenerTemporizador();
      }
    }
    
    emit('estadoCambiado', nuevoEstado);
  } catch (err) {
    error.value = 'Error al cambiar el estado. Inténtalo de nuevo.';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const textoBoton = computed(() => {
  if (loading.value) return 'Procesando...';
  return estaActivo.value ? 'Desactivar' : 'Activar';
});

onMounted(() => {
  cargarJornadaActual();
});

onUnmounted(() => {
  detenerTemporizador();
});
</script>

<style scoped>
.widget-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s, box-shadow 0.3s;
}

.widget-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);
}

.widget-header {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-container {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon-container i {
  font-size: 24px;
}

.widget-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.widget-body {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.status-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.status-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #f44336;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(244, 67, 54, 0.3);
  transition: all 0.3s ease;
}

.status-circle.active {
  background-color: #4caf50;
  box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
}

.status-circle i {
  font-size: 20px;
}

.status-info {
  margin-left: 1rem;
}

.status-label {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.status-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.status-active {
  color: #4caf50;
}

.status-inactive {
  color: #f44336;
}

.status-description {
  background-color: #f9fafb;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.status-description p {
  color: #4b5563;
  margin: 0;
  line-height: 1.5;
}

.action-area {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.toggle-button {
  width: 100%;
  padding: 0;
  border: none;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  height: 60px;
  position: relative;
}

.toggle-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.toggle-activate {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.toggle-deactivate {
  background: linear-gradient(135deg, #f44336, #c62828);
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
}

.toggle-activate:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

.toggle-deactivate:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  width: 100%;
  height: 100%;
  padding: 0 1.5rem;
  gap: 0.75rem;
}

.button-text {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.notification {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.notification-success {
  background-color: rgba(76, 175, 80, 0.1);
  border-left: 4px solid #4caf50;
  color: #2e7d32;
}

.notification-error {
  background-color: rgba(244, 67, 54, 0.1);
  border-left: 4px solid #f44336;
  color: #c62828;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.session-info {
  text-align: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.session-timer {
  font-size: 1.25rem;
  font-weight: 600;
  color: #6366f1;
  margin-bottom: 0.25rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.session-label {
  font-size: 0.9rem;
  color: #6b7280;
}
</style>