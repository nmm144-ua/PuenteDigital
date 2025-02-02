<!-- ToggleActivacionWidget.vue -->
<template>
  <div class="widget-card">
    <div class="widget-header">
      <h3 class="widget-title">Gestiona tu Estado</h3>
    </div>
    <div class="widget-body">
      <div class="text-center py-4">
        <p class="estado-actual mb-4">
          Estado actual: 
          <span :class="{'text-success': estaActivo, 'text-danger': !estaActivo}">
            {{ estaActivo ? 'Activo' : 'Inactivo' }}
          </span>
        </p>
        <button
          @click="toggleActivacion"
          class="btn btn-lg"
          :class="estadoClaseBoton"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
          {{ textoBoton }}
        </button>
        <div v-if="error" class="alert alert-danger mt-3">
          {{ error }}
        </div>
        <div v-if="mensajeExito" class="alert alert-success mt-3">
          {{ mensajeExito }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { asistenteService } from '../services/asistenteService';
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

const toggleActivacion = async () => {
  try {
    loading.value = true;
    error.value = '';
    mensajeExito.value = '';
    
    const nuevoEstado = !estaActivo.value;
    await asistenteService.actualizarEstadoAsistente(props.userId, nuevoEstado);
    estaActivo.value = nuevoEstado;
    
    mensajeExito.value = nuevoEstado
      ? 'Te has activado correctamente. Ya puedes recibir solicitudes de ayuda.'
      : 'Te has desactivado correctamente. No recibirás solicitudes de ayuda.';

    if (nuevoEstado) {
      const asistente = await asistenteService.getAsistenteByUserId(props.userId);
      const nuevaJornada = await jornadasService.createJornada({
        asistente_id: asistente.id,
        inicio: new Date().toISOString(),
      });
      jornada.value = nuevaJornada;
    } else {
      await jornadasService.terminarJornada(jornada.value.id, {
        fin: new Date().toISOString(),
      });
    }

    emit('estadoCambiado', nuevoEstado);
  } catch (err) {
    error.value = 'Error al cambiar el estado';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const textoBoton = computed(() => {
  if (loading.value) return 'Procesando...';
  return estaActivo.value ? 'Desactivarse' : 'Activarse';
});

const estadoClaseBoton = computed(() => ({
  'btn-success': !estaActivo.value,
  'btn-danger': estaActivo.value
}));
</script>

<style scoped>
.widget-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.widget-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 1rem;
}

.widget-title {
  margin: 0;
  font-size: 1.25rem;
  color: #495057;
}

.widget-body {
  padding: 1rem;
}

.estado-actual {
  font-size: 1.1rem;
  color: #6c757d;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.25rem;
  transition: all 0.3s ease;
}

.btn-lg:hover {
  transform: scale(1.05);
}
</style>