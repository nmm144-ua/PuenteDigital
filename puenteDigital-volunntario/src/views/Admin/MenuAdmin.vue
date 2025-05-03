<template>
  <div class="dashboard-container">
    <div class="dashboard-background"></div>
    
    <div class="dashboard-content">
      <div class="dashboard-header">
        <h1 class="dashboard-title">Bienvenido, {{ nombreAdmin }}</h1>
        <p class="dashboard-subtitle">Panel de Administración de PuenteDigital</p>
      </div>
      
      <div class="widgets-grid">
        <!-- Columna izquierda -->
        <div class="widgets-column">
          <!-- Widget de Estadísticas Generales -->
          <div class="widget-container">
            <div class="widget-card">
              <div class="widget-header">
                <div class="icon-container">
                  <i class="fas fa-chart-line"></i>
                </div>
                <h3 class="widget-title">Estadísticas Generales</h3>
              </div>
              <div class="widget-body">
                <div class="stats-container">
                  <div class="stat-item">
                    <div class="stat-circle">
                      <span>{{ estadisticas.totalAsistentes }}</span>
                    </div>
                    <div class="stat-label">Asistentes Totales</div>
                  </div>
                  
                  <div class="stat-item">
                    <div class="stat-circle">
                      <span>{{ estadisticas.asistentesActivos }}</span>
                    </div>
                    <div class="stat-label">Asistentes Activos</div>
                  </div>
                  
                  <div class="stat-item">
                    <div class="stat-circle">
                      <span>{{ estadisticas.usuariosApp }}</span>
                    </div>
                    <div class="stat-label">Usuarios App</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Widget de Actividad Reciente -->
          <div class="widget-container">
            <div class="widget-card">
              <div class="widget-header">
                <div class="icon-container">
                  <i class="fas fa-history"></i>
                </div>
                <h3 class="widget-title">Actividad Reciente</h3>
              </div>
              <div class="widget-body">
                <div v-if="cargandoActividad" class="text-center py-4">
                  <div class="spinner"></div>
                  <p class="mt-2">Cargando actividad reciente...</p>
                </div>
                <div v-else-if="actividadReciente.length === 0" class="empty-activity">
                  <i class="fas fa-inbox"></i>
                  <p>No hay actividad reciente para mostrar</p>
                </div>
                <div v-else class="activity-list">
                  <div v-for="(actividad, index) in actividadReciente" :key="index" class="activity-item">
                    <div class="activity-icon" :class="actividad.tipo">
                      <i :class="getIconoActividad(actividad.tipo)"></i>
                    </div>
                    <div class="activity-content">
                      <p class="activity-text">{{ actividad.descripcion }}</p>
                      <span class="activity-time">{{ formatearTiempo(actividad.fecha) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Columna derecha -->
        <div class="widgets-column">
          <!-- Widget de Acciones Rápidas -->
          <div class="widget-container">
            <div class="widget-card">
              <div class="widget-header">
                <div class="icon-container">
                  <i class="fas fa-bolt"></i>
                </div>
                <h3 class="widget-title">Acciones Rápidas</h3>
              </div>
              <div class="widget-body">
                <div class="action-buttons">
                  <router-link to="/admin/activar-asistente" class="action-button">
                    <div class="action-icon">
                      <i class="fas fa-user-check"></i>
                    </div>
                    <span>Activar Asistentes</span>
                  </router-link>
                  
                  <router-link to="/admin/asistentes" class="action-button">
                    <div class="action-icon">
                      <i class="fas fa-users"></i>
                    </div>
                    <span>Gestionar Asistentes</span>
                  </router-link>
                  
                  <router-link to="/admin/suspendidos" class="action-button">
                    <div class="action-icon">
                      <i class="fas fa-user-slash"></i>
                    </div>
                    <span>Solicitudes Suspensión</span>
                  </router-link>
                  
                  <router-link to="/admin/usuariosAppMovil" class="action-button">
                    <div class="action-icon">
                      <i class="fas fa-mobile-alt"></i>
                    </div>
                    <span>Usuarios App</span>
                  </router-link>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Widget de Estado del Sistema -->
          <div class="widget-container">
            <div class="widget-card">
              <div class="widget-header">
                <div class="icon-container">
                  <i class="fas fa-server"></i>
                </div>
                <h3 class="widget-title">Estado del Sistema</h3>
              </div>
              <div class="widget-body">
                <div class="system-status">
                  <div class="status-item">
                    <div class="status-label">Base de Datos</div>
                    <div class="status-value">
                      <span class="status-badge online">
                        <i class="fas fa-circle"></i> Operativa
                      </span>
                    </div>
                  </div>
                  
                  <div class="status-item">
                    <div class="status-label">API</div>
                    <div class="status-value">
                      <span class="status-badge online">
                        <i class="fas fa-circle"></i> Operativa
                      </span>
                    </div>
                  </div>
                  
                  <div class="status-item">
                    <div class="status-label">Sesiones Activas</div>
                    <div class="status-value">{{ estadisticas.sesionesActivas || 0 }}</div>
                  </div>
                  
                  <div class="status-item">
                    <div class="status-label">Última Actualización</div>
                    <div class="status-value">{{ formatearFecha(new Date()) }}</div>
                  </div>
                </div>
                
                <button @click="actualizarEstadisticas" class="refresh-system-btn">
                  <i class="fas fa-sync-alt"></i> Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Script se mantiene igual que el original
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { asistenteService } from '@/services/asistenteService';
import { usuarioAppService } from '@/services/usuarioAppService';

const authStore = useAuthStore();
const nombreAdmin = ref('');
const cargandoActividad = ref(true);

// Datos de estadísticas 
const estadisticas = ref({
  totalAsistentes: 0,
  asistentesActivos: 0,
  usuariosApp: 0,
  sesionesActivas: 0
});

// Datos de actividad reciente (ejemplo)
const actividadReciente = ref([]);

// Cargar datos del administrador
const cargarDatosAdmin = async () => {
  try {
    const admin = await asistenteService.getAsistenteByUserId(authStore.user.id);
    nombreAdmin.value = admin.nombre || 'Administrador';
  } catch (err) {
    console.error('Error al cargar los datos del administrador:', err);
    nombreAdmin.value = 'Administrador';
  }
};

// Cargar estadísticas
const cargarEstadisticas = async () => {
  try {
    // Obtener todos los asistentes
    const asistentes = await asistenteService.getAllAsistentes();
    estadisticas.value.totalAsistentes = asistentes.length;
    
    // Contar asistentes activos
    estadisticas.value.asistentesActivos = asistentes.filter(a => a.activo).length;
    
    // Obtener usuarios de la app
    const usuarios = await usuarioAppService.getAllUsuarios();
    estadisticas.value.usuariosApp = usuarios.length;
    
    // Número de sesiones activas (ejemplo)
    estadisticas.value.sesionesActivas = Math.floor(Math.random() * 20) + 5;
    
    // Simular carga de actividad reciente
    cargarActividadReciente();
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
};

// Simular carga de actividad reciente
const cargarActividadReciente = async () => {
  cargandoActividad.value = true;
  
  try {
    // En un sistema real, aquí obtendrías datos de actividad reciente desde una API
    // Simulando datos de ejemplo
    setTimeout(() => {
      actividadReciente.value = [
        {
          tipo: 'nuevo-asistente',
          descripcion: 'Nuevo asistente registrado: María García',
          fecha: new Date(Date.now() - 3600000) // 1 hora atrás
        },
        {
          tipo: 'activacion',
          descripcion: 'Asistente activado: Juan Pérez',
          fecha: new Date(Date.now() - 7200000) // 2 horas atrás
        },
        {
          tipo: 'suspension',
          descripcion: 'Solicitud de suspensión: Carlos Rodríguez',
          fecha: new Date(Date.now() - 86400000) // 1 día atrás
        },
        {
          tipo: 'usuario-app',
          descripcion: 'Nuevo usuario de app registrado',
          fecha: new Date(Date.now() - 172800000) // 2 días atrás
        }
      ];
      cargandoActividad.value = false;
    }, 1000);
  } catch (error) {
    console.error('Error al cargar actividad reciente:', error);
    cargandoActividad.value = false;
  }
};

// Actualizar estadísticas
const actualizarEstadisticas = () => {
  cargarEstadisticas();
};

// Obtener icono según tipo de actividad
const getIconoActividad = (tipo) => {
  switch (tipo) {
    case 'nuevo-asistente': return 'fas fa-user-plus';
    case 'activacion': return 'fas fa-check-circle';
    case 'suspension': return 'fas fa-user-slash';
    case 'usuario-app': return 'fas fa-mobile-alt';
    default: return 'fas fa-info-circle';
  }
};

// Formatear fecha
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  
  return fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Formatear tiempo relativo
const formatearTiempo = (fecha) => {
  if (!fecha) return '';
  
  const ahora = new Date();
  const diff = ahora - fecha;
  
  // Menos de 1 minuto
  if (diff < 60000) {
    return 'Hace un momento';
  }
  
  // Menos de 1 hora
  if (diff < 3600000) {
    const minutos = Math.floor(diff / 60000);
    return `Hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  }
  
  // Menos de 1 día
  if (diff < 86400000) {
    const horas = Math.floor(diff / 3600000);
    return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }
  
  // Menos de 1 semana
  if (diff < 604800000) {
    const dias = Math.floor(diff / 86400000);
    return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  }
  
  // Formato de fecha para más de 1 semana
  return formatearFecha(fecha);
};

// Inicializar
onMounted(async () => {
  await cargarDatosAdmin();
  await cargarEstadisticas();
});
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

/* Nuevo estilo para la disposición en dos columnas */
.widgets-grid {
  display: flex;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.widgets-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.widget-container {
  height: 100%;
  display: flex;
  flex: 1;
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

/* Estilos para estadísticas */
.stats-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 100px;
}

.stat-circle {
  width: 80px;
  height: 80px;
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
  font-size: 1.5rem;
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

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
}

/* Estilos para acciones rápidas */
.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.25rem 0.5rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  text-decoration: none;
  color: #495057;
  transition: all 0.3s;
}

.action-button:hover {
  background-color: #e8f2ff;
  color: #266cee;
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(38, 108, 238, 0.1);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0.75rem;
  color: #266cee;
  font-size: 1.2rem;
}

.action-button:hover .action-icon {
  background-color: #266cee;
  color: white;
}

.action-button span {
  font-size: 0.85rem;
  font-weight: 500;
}

/* Estilos para actividad reciente */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.activity-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.activity-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  flex-shrink: 0;
}

.activity-icon.nuevo-asistente {
  background-color: #4caf50;
}

.activity-icon.activacion {
  background-color: #2196f3;
}

.activity-icon.suspension {
  background-color: #f44336;
}

.activity-icon.usuario-app {
  background-color: #ff9800;
}

.activity-content {
  flex: 1;
}

.activity-text {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  color: #333;
}

.activity-time {
  font-size: 0.8rem;
  color: #6c757d;
}

.empty-activity {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: #adb5bd;
}

.empty-activity i {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(38, 108, 238, 0.1);
  border-radius: 50%;
  border-top-color: #266cee;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Estilos para estado del sistema */
.system-status {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-weight: 500;
  color: #495057;
}

.status-value {
  font-weight: 600;
  color: #212529;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-badge.online {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.status-badge.online i {
  font-size: 0.7rem;
}

.status-badge.offline {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.refresh-system-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border: none;
  border-radius: 8px;
  color: #495057;
  font-weight: 500;
  transition: all 0.3s;
  cursor: pointer;
}

.refresh-system-btn:hover {
  background-color: #e9ecef;
  color: #212529;
}

/* Responsive */
@media (max-width: 992px) {
  .widgets-grid {
    flex-direction: column;
  }
  
  .widgets-column {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem;
  }
  
  .dashboard-title {
    font-size: 2rem;
  }
}

@media (max-width: 576px) {
  .action-buttons {
    grid-template-columns: 1fr;
  }
  
  .stats-container {
    flex-direction: column;
  }
  
  .stat-item {
    width: 100%;
    margin-bottom: 1.5rem;
  }
}
</style>