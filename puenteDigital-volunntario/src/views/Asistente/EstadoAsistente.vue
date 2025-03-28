<!-- EstadoAsistente.vue -->
<template>
  <div class="dashboard-container">
    <div class="dashboard-background"></div>
    
    <div class="dashboard-content">
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
              <div class="icon-container">
                <i class="fas fa-business-time"></i>
              </div>
              <h3 class="widget-title">Resumen de Jornada</h3>
            </div>
            <div class="widget-body">
              <div v-if="jornadaActual" class="jornada-info">
                <div class="jornada-item">
                  <div class="jornada-icon">
                    <i class="fas fa-clock"></i>
                  </div>
                  <div class="jornada-content">
                    <div class="jornada-label">Inicio</div>
                    <div class="jornada-value">{{ formatearFecha(jornadaActual.inicio) }}</div>
                  </div>
                </div>
                
                <div class="jornada-item highlight">
                  <div class="jornada-icon">
                    <i class="fas fa-hourglass-half"></i>
                  </div>
                  <div class="jornada-content">
                    <div class="jornada-label">Tiempo activo</div>
                    <div class="jornada-value">{{ tiempoActivo }}</div>
                  </div>
                </div>
                
                <div class="jornada-item">
                  <div class="jornada-icon">
                    <i class="fas fa-headset"></i>
                  </div>
                  <div class="jornada-content">
                    <div class="jornada-label">Solicitudes atendidas</div>
                    <div class="jornada-value">
                      <span class="counter">{{ jornadaActual.solicitudesAtendidas || 0 }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="jornada-empty">
                <i class="fas fa-hourglass-start"></i>
                <p>No hay una jornada activa en este momento</p>
                <span>Actívate para comenzar a registrar tu actividad</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Widget de Estadísticas -->
        <div class="widget-container">
          <div class="widget-card">
            <div class="widget-header">
              <div class="icon-container">
                <i class="fas fa-chart-line"></i>
              </div>
              <h3 class="widget-title">Estadísticas Semanales</h3>
            </div>
            <div class="widget-body">
              <div class="stats-container">
                <div class="stat-item">
                  <div class="stat-circle">
                    <span>{{ estadisticas.horasActivas }}</span>
                    <small>h</small>
                  </div>
                  <div class="stat-label">Horas activas</div>
                </div>
                
                <div class="stat-item">
                  <div class="stat-circle">
                    <span>{{ estadisticas.solicitudesCompletadas }}</span>
                  </div>
                  <div class="stat-label">Solicitudes completadas</div>
                </div>
                
                <div class="stat-item">
                  <div class="stat-circle">
                    <span>{{ estadisticas.tiempoMedioRespuesta }}</span>
                    <small>min</small>
                  </div>
                  <div class="stat-label">Tiempo medio de respuesta</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Últimas Jornadas -->
      <div class="history-section">
        <div class="widget-card">
          <div class="widget-header">
            <div class="header-left">
              <div class="icon-container">
                <i class="fas fa-history"></i>
              </div>
              <h3 class="widget-title">Historial de Jornadas</h3>
            </div>
            <button class="action-button" @click="cargarMasJornadas">
              <i class="fas fa-sync-alt"></i> Cargar más
            </button>
          </div>
          <div class="widget-body">
            <div class="responsive-table">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Duración</th>
                    <th>Solicitudes</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="jornada in ultimasJornadas" :key="jornada.id" class="table-row">
                    <td>
                      <div class="cell-content">
                        <i class="fas fa-calendar-day cell-icon"></i>
                        {{ formatearFechaSolo(jornada.inicio) }}
                      </div>
                    </td>
                    <td>
                      <div class="cell-content">
                        <i class="fas fa-clock cell-icon"></i>
                        {{ calcularDuracion(jornada.inicio, jornada.fin) }}
                      </div>
                    </td>
                    <td>
                      <div class="cell-content">
                        <i class="fas fa-headset cell-icon"></i>
                        {{ jornada.solicitudesAtendidas || 0 }}
                      </div>
                    </td>
                    <td>
                      <span :class="['status-badge', jornada.fin ? 'status-completed' : 'status-active']">
                        <i :class="['fas', jornada.fin ? 'fa-check-circle' : 'fa-spinner fa-spin']"></i>
                        {{ jornada.fin ? 'Completada' : 'En curso' }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="ultimasJornadas.length === 0">
                    <td colspan="4" class="empty-table">
                      <i class="fas fa-info-circle"></i>
                      No hay jornadas registradas
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
import ToggleActivacionWidget from '@/components/Asistente/ToggleActivacion.vue';

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
  if (!fecha) return "";
  const date = new Date(fecha);
  return date.toLocaleString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatearFechaSolo = (fecha) => {
  if (!fecha) return "";
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric'
  });
};

const calcularDuracion = (inicio, fin) => {
  if (!inicio) return '0h 0m';
  
  const fechaInicio = new Date(inicio);
  const fechaFin = fin ? new Date(fin) : new Date();
  
  const duracion = fechaFin - fechaInicio;
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
  // Aquí implementarías la lógica para cargar más jornadas
  // Por ejemplo:
  try {
    const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
    const jornadas = await jornadasService.getJornadasByAsistenteId(asistente.id);
    ultimasJornadas.value = jornadas.slice(0, ultimasJornadas.value.length + 5);
  } catch (err) {
    console.error('Error al cargar más jornadas:', err);
  }
};

onMounted(cargarDatos);
</script>

<style scoped>
.dashboard-container {
  position: relative;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  color: #333;
  overflow: hidden;
}

.dashboard-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 260px;
  background: linear-gradient(135deg, #266cee, #0a4bb3);
  border-bottom-right-radius: 30% 50px;
  border-bottom-left-radius: 30% 50px;
  z-index: -1;
}

.dashboard-content {
  position: relative;
  z-index: 1;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 3rem;
  position: relative;
  color: white;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dashboard-subtitle {
  font-size: 1.25rem;
  font-weight: 400;
  opacity: 0.9;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.widget-container {
  height: 100%;
  display: flex;
}

.widget-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.widget-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
}

.widget-header {
  background: linear-gradient(135deg, #266cee, #0a4bb3);
  color: white;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.icon-container {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon-container i {
  font-size: 20px;
}

.widget-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.widget-body {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Estilos para el resumen de jornada */
.jornada-info {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.jornada-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid #f0f0f0;
}

.jornada-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.jornada-item.highlight {
  background-color: rgba(38, 108, 238, 0.05);
  border-radius: 10px;
  padding: 1rem;
  margin: 0 -1rem;
  border-bottom: none;
}

.jornada-icon {
  width: 45px;
  height: 45px;
  border-radius: 10px;
  background-color: #e8f2ff;
  color: #266cee;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
}

.jornada-content {
  flex: 1;
}

.jornada-label {
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.jornada-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
}

.jornada-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  min-height: 200px;
  color: #a0aec0;
}

.jornada-empty i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.jornada-empty p {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.jornada-empty span {
  font-size: 0.9rem;
}

.counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0 0.75rem;
  background: linear-gradient(135deg, #266cee, #0a4bb3);
  color: white;
  border-radius: 1.25rem;
  font-weight: 600;
}

/* Estilos para estadísticas */
.stats-container {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  height: 100%;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.stat-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f8f9fa, #e8f2ff);
  color: #266cee;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
  position: relative;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.stat-circle::before {
  content: '';
  position: absolute;
  top: 5px;
  left: 5px;
  right: 5px;
  bottom: 5px;
  border-radius: 50%;
  border: 2px solid rgba(38, 108, 238, 0.2);
}

.stat-circle span {
  font-size: 1.75rem;
  line-height: 1;
}

.stat-circle small {
  font-size: 0.9rem;
  opacity: 0.7;
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
}

/* Estilos para la tabla de historial */
.history-section {
  margin-top: 2rem;
}

.action-button {
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.responsive-table {
  overflow-x: auto;
  width: 100%;
}

.custom-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.custom-table thead {
  background-color: #f8f9fa;
}

.custom-table th {
  padding: 1rem;
  font-weight: 600;
  color: #495057;
  text-align: left;
  border-bottom: 2px solid #e9ecef;
}

.table-row {
  transition: background-color 0.2s;
}

.table-row:hover {
  background-color: #f8f9fa;
}

.custom-table td {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  color: #495057;
}

.cell-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cell-icon {
  color: #266cee;
  font-size: 0.9rem;
  width: 20px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-active {
  background-color: rgba(38, 108, 238, 0.1);
  color: #0a4bb3;
}

.status-completed {
  background-color: rgba(108, 117, 125, 0.1);
  color: #495057;
}

.empty-table {
  text-align: center;
  padding: 2rem !important;
  color: #a0aec0 !important;
}

.empty-table i {
  margin-right: 0.5rem;
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
  
  .stats-container {
    flex-direction: column;
    gap: 2rem;
  }
  
  .stat-item {
    flex-direction: row;
    justify-content: flex-start;
    gap: 1.5rem;
    text-align: left;
  }
  
  .stat-circle {
    margin-bottom: 0;
  }
}
</style>