<!-- MenuAsistente.vue -->
<template>
  <div class="dashboard-container">
    <div class="dashboard-background"></div>
    
    <div class="dashboard-content">
      <div class="dashboard-header">
        <div class="header-content">
          <div class="welcome-icon">
            <i class="fas fa-hands-helping"></i>
          </div>
          <div class="welcome-text">
            <h1 class="dashboard-title">
              ¡Hola, {{ nombreAsistente }}!
            </h1>
            <p class="dashboard-subtitle">Bienvenid@ a <span class="brand-text">PuenteDigital</span></p>
          </div>
        </div>
        
        <div class="date-display">
          <div class="date-box">
            <i class="fas fa-calendar-alt"></i>
            <span>{{ currentDate }}</span>
          </div>
        </div>
      </div>
      
      <div class="action-bar">
        <div class="quick-stats">
          <div class="stat-pill">
            <i class="fas fa-users"></i>
            <span>{{ estadisticas.usuariosConectados }} usuarios conectados</span>
          </div>
          <div class="stat-pill">
            <i class="fas fa-headset"></i>
            <span>{{ estadisticas.asistentesActivos }} asistentes disponibles</span>
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="action-button" @click="navegarA('estado')">
            <i class="fas fa-chart-line"></i>
            <span>Ver estadísticas</span>
          </button>
        </div>
      </div>
      
      <div class="widgets-grid">
        <!-- Widget de Activación -->
        <div class="widget-container widget-activation">
          <ToggleActivacionWidget
            :userId="authStore.user.id"
            :estadoInicial="estadoInicial"
            @estadoCambiado="onEstadoCambiado"
          />
        </div>
        
        <!-- Widget de Chat -->
        <div class="widget-container widget-chat">
          <ChatWidget />
        </div>
        
        <!-- Widget de Videollamada -->
        <div class="widget-container widget-videollamada">
          <VideoLlamadaWidget />
        </div>
      </div>
      
      <div class="quick-access-section">
        <h2 class="section-title">Acceso Rápido</h2>
        
        <div class="quick-access-grid">
          <div class="quick-access-item" @click="navegarA('perfil')">
            <div class="quick-icon">
              <i class="fas fa-user-circle"></i>
            </div>
            <span>Mi Perfil</span>
          </div>
          
          <div class="quick-access-item" @click="navegarA('chat')">
            <div class="quick-icon">
              <i class="fas fa-comments"></i>
            </div>
            <span>Chat</span>
          </div>
          
          <div class="quick-access-item" @click="navegarA('videollamadas')">
            <div class="quick-icon">
              <i class="fas fa-video"></i>
            </div>
            <span>Videollamadas</span>
          </div>
          
          <div class="quick-access-item" @click="navegarA('historial')">
            <div class="quick-icon">
              <i class="fas fa-history"></i>
            </div>
            <span>Historial</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { asistenteService } from '@/services/asistenteService';
import ToggleActivacionWidget from '@/components/Asistente/ToggleActivacion.vue';
import ChatWidget from '@/components/Asistente/ChatWidget.vue';
import VideoLlamadaWidget from '@/components/Asistente/VideoLlamadaWidget.vue';

const router = useRouter();
const authStore = useAuthStore();
const nombreAsistente = ref('');
const estadoInicial = ref(false);
const estadisticas = ref({
  usuariosConectados: 0,
  asistentesActivos: 0
});

// Obtener fecha actual formateada
const currentDate = computed(() => {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return now.toLocaleDateString('es-ES', options);
});

// Método para cargar datos del asistente
const cargarDatosAsistente = async () => {
  try {
    const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
    nombreAsistente.value = asistente.nombre;
    estadoInicial.value = asistente.activo;
    
    // Simulación de datos de estadísticas (reemplazar con datos reales cuando estén disponibles)
    cargarEstadisticas();
  } catch (err) {
    console.error('Error al cargar los datos del asistente:', err);
  }
};

// Simulación de carga de estadísticas
const cargarEstadisticas = async () => {
  try {
    // Simulación - reemplazar con llamada a API real
    estadisticas.value = {
      usuariosConectados: Math.floor(Math.random() * 50) + 10,
      asistentesActivos: Math.floor(Math.random() * 10) + 2
    };
  } catch (err) {
    console.error('Error al cargar estadísticas:', err);
  }
};

// Evento de cambio de estado
const onEstadoCambiado = (nuevoEstado) => {
  console.log('Estado cambiado:', nuevoEstado);
  // Recarga de estadísticas cuando cambia el estado
  cargarEstadisticas();
};

// Navegación a diferentes secciones
const navegarA = (ruta) => {
  switch (ruta) {
    case 'estado':
      router.push('/asistente/estado');
      break;
    case 'perfil':
      router.push('/asistente/perfil');
      break;
    case 'chat':
      router.push('/chat');
      break;
    case 'videollamadas':
      router.push('/videollamadas');
      break;
    case 'historial':
      router.push('/asistente/historial');
      break;
    default:
      console.log('Ruta no definida');
  }
};

onMounted(cargarDatosAsistente);
</script>

<style scoped>
/* Configuración general */
.dashboard-container {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  color: #2d3748;
  background-color: #f7fafc;
}

.dashboard-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300px;
  background: linear-gradient(135deg, #266cee, #266cee);
  border-bottom-right-radius: 30% 50px;
  border-bottom-left-radius: 30% 50px;
  z-index: 0;
}

.dashboard-content {
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Estilos de cabecera */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.welcome-icon {
  width: 70px;
  height: 70px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.welcome-icon i {
  font-size: 32px;
}

.welcome-text {
  text-align: left;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dashboard-subtitle {
  font-size: 1.25rem;
  font-weight: 400;
  margin: 0;
  opacity: 0.9;
}

.brand-text {
  font-weight: 700;
  background: linear-gradient(to right, #f6e05e, #ed8936);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.date-display {
  display: flex;
  align-items: center;
}

.date-box {
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(5px);
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.date-box i {
  font-size: 1.1rem;
}

/* Barra de acción y estadísticas rápidas */
.action-bar {
  background-color: white;
  border-radius: 16px;
  padding: 1rem 1.5rem;
  margin-bottom: 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.quick-stats {
  display: flex;
  gap: 1rem;
}

.stat-pill {
  background-color: #f7fafc;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #4a5568;
}

.stat-pill i {
  color: #6366f1;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.action-button {
  background-color: #266cee;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}

.action-button:hover {
  background-color: #4f46e5;
  transform: translateY(-2px);
}

/* Grid de widgets */
.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.widget-container {
  min-width: 0;
  min-height: 350px;
  display: flex;
  transform: translateY(0);
  transition: transform 0.3s ease;
}

.widget-container:hover {
  transform: translateY(-5px);
}

/* Sección de acceso rápido */
.quick-access-section {
  background-color: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 1.5rem;
  color: #2d3748;
  margin-bottom: 1.5rem;
  font-weight: 600;
  position: relative;
  padding-bottom: 0.75rem;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 50px;
  height: 4px;
  background: linear-gradient(135deg, #266cee, #266cee);
  border-radius: 2px;
}

.quick-access-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.quick-access-item {
  background-color: #f7fafc;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quick-access-item:hover {
  background-color: #edf2f7;
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
}

.quick-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #266cee, #266cee);
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 24px;
  margin-bottom: 0.5rem;
}

.quick-access-item span {
  font-weight: 500;
  color: #4a5568;
}

/* Responsive */
@media (max-width: 1024px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .date-display {
    align-self: flex-start;
  }
  
  .action-bar {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .quick-stats {
    flex-direction: column;
    width: 100%;
  }
  
  .stat-pill {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .dashboard-content {
    padding: 1.5rem 1rem;
  }
  
  .dashboard-title {
    font-size: 2rem;
  }
  
  .widgets-grid {
    grid-template-columns: 1fr;
  }
  
  .welcome-icon {
    width: 60px;
    height: 60px;
  }
  
  .welcome-icon i {
    font-size: 28px;
  }
  
  .quick-access-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .quick-access-grid {
    grid-template-columns: 1fr;
  }
  
  .header-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }
  
  .welcome-text {
    text-align: center;
  }
}
</style>