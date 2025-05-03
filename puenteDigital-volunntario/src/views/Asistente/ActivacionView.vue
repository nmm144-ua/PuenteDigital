// src/views/Asistente/ActivacionView.vue
<template>
  <div class="activacion-container">
    <div class="activacion-card">
      <div class="card-header">
        <i class="fas fa-power-off"></i>
        <h1>Activación de Asistente</h1>
      </div>
      
      <div class="card-body">
        <p class="status-message">
          <template v-if="authStore.asistenteBloqueado">
            No estás activo actualmente. Debes activarte para comenzar a ofrecer asistencia.
          </template>
          <template v-else>
            ¡Estás activo! Puedes comenzar a ofrecer asistencia.
          </template>
        </p>
        
        <div class="activation-toggle">
          <button 
            @click="toggleActivacion" 
            :class="['toggle-button', authStore.asistenteBloqueado ? 'activate-button' : 'deactivate-button']"
            :disabled="loading"
          >
            <div class="button-content">
              <div v-if="loading" class="loading-spinner"></div>
              <span v-else :class="['fas', authStore.asistenteBloqueado ? 'fa-play' : 'fa-stop']"></span>
              <span class="button-text">{{ buttonText }}</span>
            </div>
          </button>
        </div>
        
        <div v-if="error" class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          {{ error }}
        </div>
        
        <div v-if="successMessage" class="success-message">
          <i class="fas fa-check-circle"></i>
          {{ successMessage }}
        </div>
        
        <div class="navigation-links">
          <router-link v-if="!authStore.asistenteBloqueado" to="/asistente" class="dashboard-link">
            <i class="fas fa-tachometer-alt"></i>
            Ir al Panel de Control
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const error = ref('');
const successMessage = ref('');

const buttonText = computed(() => {
  if (loading.value) return 'Procesando...';
  return authStore.asistenteBloqueado ? 'Activar Asistente' : 'Desactivar Asistente';
});

const toggleActivacion = async () => {
  loading.value = true;
  error.value = '';
  successMessage.value = '';
  
  try {
    if (authStore.asistenteBloqueado) {
      // Iniciar jornada
      const success = await authStore.iniciarJornada();
      if (success) {
        successMessage.value = '¡Te has activado correctamente! Ya puedes comenzar a ofrecer asistencia.';
        setTimeout(() => {
          router.push('/asistente');
        }, 2000);
      } else {
        throw new Error('No se pudo activar el asistente');
      }
    } else {
      // Finalizar jornada
      const success = await authStore.finalizarJornada();
      if (success) {
        successMessage.value = 'Te has desactivado correctamente. Ya no recibirás solicitudes de asistencia.';
      } else {
        throw new Error('No se pudo desactivar el asistente');
      }
    }
  } catch (err) {
    console.error(err);
    error.value = err.message || 'Error al cambiar el estado de activación';
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  // Verificar estado de jornada al cargar la página
  await authStore.verificarJornadaActiva();
});
</script>

<style scoped>
.activacion-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
  padding: 20px;
}

.activacion-card {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.card-header {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  padding: 30px;
  text-align: center;
}

.card-header i {
  font-size: 50px;
  margin-bottom: 15px;
}

.card-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.card-body {
  padding: 30px;
}

.status-message {
  text-align: center;
  font-size: 18px;
  margin-bottom: 30px;
  line-height: 1.5;
  color: #4b5563;
}

.activation-toggle {
  margin-bottom: 30px;
}

.toggle-button {
  width: 100%;
  border: none;
  border-radius: 10px;
  height: 60px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.activate-button {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.deactivate-button {
  background: linear-gradient(135deg, #f44336, #c62828);
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 600;
  gap: 10px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 3px solid white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message, .success-message {
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-message {
  background-color: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.success-message {
  background-color: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
}

.navigation-links {
  margin-top: 20px;
  text-align: center;
}

.dashboard-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s;
}

.dashboard-link:hover {
  color: #4f46e5;
  text-decoration: underline;
}
</style>