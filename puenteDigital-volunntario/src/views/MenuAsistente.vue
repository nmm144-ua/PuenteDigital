<template>
  <div class="container">
    <div class="row min-vh-100 justify-content-center align-items-center">
      <div class="col-md-8 text-center">
        <h1 class="display-4 mb-4">
          Hola {{ nombreAsistente }}
          <br>
          Bienvenid@ a PuenteDigital
        </h1>
        
        <div class="mt-5">
          <button 
            @click="toggleActivacion" 
            class="btn btn-lg"
            :class="estadoClaseBoton"
            :disabled="loading"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            {{ textoBoton }}
          </button>
        </div>

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
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { asistenteService } from '../services/asistenteService';
import { jornadasService } from '@/services/jornadasService';

const authStore = useAuthStore();
const nombreAsistente = ref('');
const estaActivo = ref(false);
const loading = ref(false);
const error = ref('');
const mensajeExito = ref('');
const jornada = ref(null);

const cargarDatosAsistente = async () => {
  try {
    loading.value = true;
    const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
    nombreAsistente.value = asistente.nombre;
    estaActivo.value = asistente.activo;
  } catch (err) {
    error.value = 'Error al cargar los datos del asistente';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const toggleActivacion = async () => {
  try {
    loading.value = true;
    error.value = '';
    mensajeExito.value = '';
    
    const nuevoEstado = !estaActivo.value;
    await asistenteService.actualizarEstadoAsistente(authStore.user.id, nuevoEstado);
    
    estaActivo.value = nuevoEstado;
    mensajeExito.value = nuevoEstado 
      ? 'Te has activado correctamente. Ya puedes recibir solicitudes de ayuda.' 
      : 'Te has desactivado correctamente. No recibirás solicitudes de ayuda.';
    if (nuevoEstado){
      const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
      const nuevaJornada = await jornadasService.createJornada({
        asistente_id: asistente.id,
        inicio: new Date().toISOString(),
      });
      jornada.value = nuevaJornada;
    }else{
      await jornadasService.terminarJornada(jornada.value.id, {
        fin: new Date().toISOString(),
      });
    }
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

onMounted(cargarDatosAsistente);
</script>

<style scoped>
.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.25rem;
  transition: all 0.3s ease;
}

.btn-lg:hover {
  transform: scale(1.05);
}
</style>