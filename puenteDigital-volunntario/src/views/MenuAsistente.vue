<!-- MenuAsistente.vue -->
<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1 class="dashboard-title">
        Hola {{ nombreAsistente }}
      </h1>
      <p class="dashboard-subtitle">Bienvenid@ a PuenteDigital</p>
    </div>
    
    <div class="widgets-grid">
      <!-- Widget de Activación -->
      <div class="widget-container">
        <ToggleActivacionWidget
          :userId="authStore.user.id"
          :estadoInicial="estadoInicial"
          @estadoCambiado="onEstadoCambiado"
        />
      </div>
      
      <!-- Aquí puedes añadir más widgets en el futuro -->
      <!-- Ejemplo:
      <div class="widget-container">
        <EstadisticasWidget />
      </div>
      <div class="widget-container">
        <UltimasActividadesWidget />
      </div>
      -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { asistenteService } from '../services/asistenteService';
import ToggleActivacionWidget from '../components/ToggleActivacion.vue';

const authStore = useAuthStore();
const nombreAsistente = ref('');
const estadoInicial = ref(false);

const cargarDatosAsistente = async () => {
  try {
    const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
    nombreAsistente.value = asistente.nombre;
    estadoInicial.value = asistente.activo;
  } catch (err) {
    console.error('Error al cargar los datos del asistente:', err);
  }
};

const onEstadoCambiado = (nuevoEstado) => {
  console.log('Estado cambiado:', nuevoEstado);
  // Aquí puedes agregar cualquier lógica adicional que necesites cuando cambie el estado
};

onMounted(cargarDatosAsistente);
</script>

<style scoped>
.dashboard-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 3rem;
}

.dashboard-title {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.dashboard-subtitle {
  font-size: 1.25rem;
  color: #6c757d;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin: 0 auto;
}

.widget-container {
  min-width: 0; /* Evita que los widgets se desborden */
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem;
  }
  
  .dashboard-title {
    font-size: 2rem;
  }
  
  .widgets-grid {
    grid-template-columns: 1fr;
  }
}
</style>