<!-- EstadoAsistente.vue -->
<template>
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1 class="dashboard-title">Estado del Asistente</h1>
        <p class="dashboard-subtitle">Gestiona tu disponibilidad y revisa tu actividad</p>
      </div>
      
      <div class="widgets-grid">
        <!-- Widget de Control de Estado -->
        <div class="widget-container">
          <ToggleActivacionWidget
            :userId="authStore.user.id"
            :estadoInicial="estadoInicial"
            @estadoCambiado="onEstadoCambiado"
          />
        </div>
  
        <!-- Widget de Resumen de Jornada -->
        <div class="widget-container">
          <div class="widget-card">
            <div class="widget-header">
              <h3 class="widget-title">Resumen de Jornada Actual</h3>
            </div>
            <div class="widget-body">
              <div v-if="jornadaActual" class="p-4">
                <div class="mb-3">
                  <i class="bi bi-clock me-2"></i>
                  <strong>Inicio de jornada:</strong>
                  <div class="text-muted">{{ formatearFecha(jornadaActual.inicio) }}</div>
                </div>
                <div class="mb-3">
                  <i class="bi bi-hourglass-split me-2"></i>
                  <strong>Tiempo activo:</strong>
                  <div class="text-success">{{ tiempoActivo }}</div>
                </div>
                <div class="mb-3">
                  <i class="bi bi-person-workspace me-2"></i>
                  <strong>Solicitudes atendidas:</strong>
                  <div class="badge bg-primary">{{ jornadaActual.solicitudesAtendidas || 0 }}</div>
                </div>
              </div>
              <div v-else class="text-center p-4 text-muted">
                No hay una jornada activa en este momento
              </div>
            </div>
          </div>
        </div>
  
        <!-- Widget de Estadísticas -->
        <div class="widget-container">
          <div class="widget-card">
            <div class="widget-header">
              <h3 class="widget-title">Estadísticas de la Semana</h3>
            </div>
            <div class="widget-body p-4">
              <div class="stat-item">
                <div class="stat-label">Horas activas</div>
                <div class="stat-value">{{ estadisticas.horasActivas }}h</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Solicitudes completadas</div>
                <div class="stat-value">{{ estadisticas.solicitudesCompletadas }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Tiempo medio de respuesta</div>
                <div class="stat-value">{{ estadisticas.tiempoMedioRespuesta }}min</div>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Tabla de Últimas Jornadas -->
      <div class="mt-5">
        <div class="widget-card">
          <div class="widget-header d-flex justify-content-between align-items-center">
            <h3 class="widget-title">Historial de Jornadas</h3>
            <button class="btn btn-sm btn-outline-primary" @click="cargarMasJornadas">
              Ver más
            </button>
          </div>
          <div class="widget-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Duración</th>
                    <th>Solicitudes</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="jornada in ultimasJornadas" :key="jornada.id">
                    <td>{{ formatearFecha(jornada.inicio) }}</td>
                    <td>{{ calcularDuracion(jornada.inicio, jornada.fin) }}</td>
                    <td>{{ jornada.solicitudesAtendidas }}</td>
                    <td>
                      <span :class="['badge', jornada.fin ? 'bg-secondary' : 'bg-success']">
                        {{ jornada.fin ? 'Completada' : 'En curso' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { useAuthStore } from '@/stores/authStore';
  import { asistenteService } from '@/services/asistenteService';
  import { jornadasService } from '@/services/jornadasService';
  import ToggleActivacionWidget from '@/components/ToggleActivacion.vue';
  
  const authStore = useAuthStore();
  const estadoInicial = ref(false);
  const jornadaActual = ref(null);
  const ultimasJornadas = ref([]);
  const estadisticas = ref({
    horasActivas: 0,
    solicitudesCompletadas: 0,
    tiempoMedioRespuesta: 0
  });
  
  // Cargar datos iniciales
  const cargarDatos = async () => {
    try {
      const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
      estadoInicial.value = asistente.activo;
      
      // Cargar jornada actual si está activo
      if (asistente.activo) {
        const jornadas = await jornadasService.getJornadasByAsistenteId(asistente.id);
        jornadaActual.value = jornadas.find(j => !j.fin);
      }
      
      // Cargar últimas jornadas
      await cargarUltimasJornadas();
      
      // Cargar estadísticas
      await cargarEstadisticas();
    } catch (err) {
      console.error('Error al cargar los datos:', err);
    }
  };
  
  const cargarUltimasJornadas = async () => {
    try {
      const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
      const jornadas = await jornadasService.getJornadasByAsistenteId(asistente.id);
      ultimasJornadas.value = jornadas.slice(0, 5); // Mostrar últimas 5 jornadas
    } catch (err) {
      console.error('Error al cargar jornadas:', err);
    }
  };
  
  const cargarEstadisticas = async () => {
    try {
      const stats = await asistenteService.getEstadisticasSemana(authStore.user.id);
      estadisticas.value = stats;
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };
  
  // Utilidades
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString();
  };
  
  const calcularDuracion = (inicio, fin) => {
    if (!fin) return 'En curso';
    const duracion = new Date(fin) - new Date(inicio);
    const horas = Math.floor(duracion / (1000 * 60 * 60));
    const minutos = Math.floor((duracion % (1000 * 60 * 60)) / (1000 * 60));
    return `${horas}h ${minutos}m`;
  };
  
  const tiempoActivo = computed(() => {
    if (!jornadaActual.value) return '0h 0m';
    return calcularDuracion(jornadaActual.value.inicio, new Date());
  });
  
  const onEstadoCambiado = async (nuevoEstado) => {
    await cargarDatos(); // Recargar datos cuando cambie el estado
  };
  
  const cargarMasJornadas = async () => {
    // Implementar lógica para cargar más jornadas
    // Podrías usar paginación o cargar un número específico más
  };
  
  onMounted(cargarDatos);
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
  
  .stat-item {
    padding: 1rem 0;
    border-bottom: 1px solid #eee;
  }
  
  .stat-item:last-child {
    border-bottom: none;
  }
  
  .stat-label {
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #2c3e50;
  }
  
  .table {
    margin-bottom: 0;
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