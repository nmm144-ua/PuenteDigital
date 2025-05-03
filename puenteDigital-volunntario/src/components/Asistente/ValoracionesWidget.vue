<!-- src/components/Asistente/ValoracionesWidget.vue -->
<template>
    <div class="widget-card">
      <div class="widget-header">
        <div class="icon-container">
          <i class="fas fa-star"></i>
        </div>
        <h3 class="widget-title">Valoraciones Recibidas</h3>
      </div>
      
      <div class="widget-body">
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <span>Cargando valoraciones...</span>
        </div>
        
        <div v-else-if="error" class="error-container">
          <i class="fas fa-exclamation-circle"></i>
          <p>{{ error }}</p>
        </div>
        
        <div v-else>
          <div class="rating-summary">
            <div class="rating-value">{{ valoracionMedia.toFixed(1) }}</div>
            <div class="rating-stars">
              <div class="star-container">
                <div class="stars-background">
                  <i v-for="i in 5" :key="`bg-${i}`" class="fas fa-star"></i>
                </div>
                <div class="stars-filled" :style="{ width: `${(valoracionMedia / 5) * 100}%` }">
                  <i v-for="i in 5" :key="`fill-${i}`" class="fas fa-star"></i>
                </div>
              </div>
              <div class="rating-text">{{ valoracionMedia.toFixed(1) }} de 5</div>
            </div>
          </div>
          
          <div class="rating-details">
            <div v-for="n in 5" :key="`bar-${n}`" class="rating-bar-item">
              <div class="bar-label">{{ 6 - n }}</div>
              <div class="bar-container">
                <div class="bar-background"></div>
                <div class="bar-filled" :style="{ width: `${getValoracionPorcentaje(6 - n)}%` }"></div>
              </div>
              <div class="bar-count">{{ getValoracionCount(6 - n) }}</div>
            </div>
          </div>
          
          <div class="rating-info">
            <div class="info-item">
              <i class="fas fa-clipboard-check"></i>
              <div class="info-content">
                <div class="info-value">{{ totalValoraciones }}</div>
                <div class="info-label">Valoraciones totales</div>
              </div>
            </div>
            <div class="info-item">
              <i class="fas fa-check-circle"></i>
              <div class="info-content">
                <div class="info-value">{{ totalAsistencias }}</div>
                <div class="info-label">Asistencias completadas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { solicitudesAsistenciaService } from '@/services/solicitudAsistenciaService';
  
  const props = defineProps({
    asistenteId: {
      type: [Number, String],
      required: true
    }
  });
  
  const loading = ref(true);
  const error = ref('');
  const valoraciones = ref([]);
  const totalAsistencias = ref(0);
  
  // Cargar datos de valoraciones
  const cargarValoraciones = async () => {
    // CORRECCIÓN: Verificar que tenemos un ID válido antes de hacer la consulta
    if (!props.asistenteId) {
      error.value = 'No se pudo identificar el ID del asistente';
      loading.value = false;
      return;
    }
    
    loading.value = true;
    error.value = '';
    
    try {
      // Obtener solicitudes del asistente
      const solicitudes = await solicitudesAsistenciaService.getSolicitudesByAsistente(props.asistenteId);
      
      // Filtrar solo las solicitudes finalizadas (completadas)
      const solicitudesCompletadas = solicitudes.filter(s => s.estado === 'finalizada');
      totalAsistencias.value = solicitudesCompletadas.length;
      
      // Filtrar solo las solicitudes con valoración (mayor que cero)
      valoraciones.value = solicitudesCompletadas
        .filter(s => s.valoracion > 0)
        .map(s => ({
          id: s.id,
          valoracion: s.valoracion,
          fecha: s.finalizado_timestamp,
          usuarioNombre: s.usuario?.nombre || 'Usuario'
        }));
        
    } catch (err) {
      console.error('Error al cargar valoraciones:', err);
      error.value = 'No se pudieron cargar las valoraciones';
    } finally {
      loading.value = false;
    }
  };
  
  // Calcular valoración media
  const valoracionMedia = computed(() => {
    if (valoraciones.value.length === 0) return 0;
    
    const suma = valoraciones.value.reduce((acc, val) => acc + val.valoracion, 0);
    return suma / valoraciones.value.length;
  });
  
  // Total de valoraciones
  const totalValoraciones = computed(() => valoraciones.value.length);
  
  // Obtener conteo de valoraciones por número
  const getValoracionCount = (num) => {
    return valoraciones.value.filter(v => v.valoracion === num).length;
  };
  
  // Calcular porcentaje para cada barra de valoración
  const getValoracionPorcentaje = (num) => {
    if (valoraciones.value.length === 0) return 0;
    
    const count = getValoracionCount(num);
    return (count / valoraciones.value.length) * 100;
  };
  
  // NUEVO: Observar cambios en el ID del asistente
  watch(() => props.asistenteId, (newId) => {
    if (newId) {
      cargarValoraciones();
    }
  });
  
  onMounted(() => {
    // CORRECCIÓN: Solo cargar si tenemos un ID válido
    if (props.asistenteId) {
      cargarValoraciones();
    }
  });
  </script>
  
  <style scoped>
  /* Los estilos se mantienen igual */
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
    background: linear-gradient(135deg, #FFA726, #FF7043);
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
  
  /* Estilos para la carga y errores */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1rem;
    color: #6c757d;
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: #FFA726;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: #dc3545;
    text-align: center;
  }
  
  .error-container i {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
  
  /* Estilos para el resumen de valoración */
  .rating-summary {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .rating-value {
    font-size: 3rem;
    font-weight: 700;
    color: #FF7043;
    min-width: 80px;
    text-align: center;
  }
  
  .rating-stars {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .star-container {
    position: relative;
    height: 30px;
  }
  
  .stars-background, .stars-filled {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
  }
  
  .stars-background i {
    color: #e0e0e0;
    font-size: 1.8rem;
  }
  
  .stars-filled {
    overflow: hidden;
  }
  
  .stars-filled i {
    color: #FFA726;
    font-size: 1.8rem;
  }
  
  .rating-text {
    font-size: 0.9rem;
    color: #6c757d;
  }
  
  /* Estilos para las barras de valoración */
  .rating-details {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .rating-bar-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .bar-label {
    min-width: 30px;
    color: #6c757d;
    font-weight: 600;
    text-align: center;
  }
  
  .bar-container {
    flex: 1;
    position: relative;
    height: 12px;
  }
  
  .bar-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #f0f0f0;
    border-radius: 6px;
  }
  
  .bar-filled {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    background: linear-gradient(to right, #FFA726, #FF7043);
    border-radius: 6px;
    transition: width 0.5s ease;
  }
  
  .bar-count {
    min-width: 40px;
    font-size: 0.9rem;
    color: #6c757d;
    text-align: right;
  }
  
  /* Estilos para información adicional */
  .rating-info {
    display: flex;
    justify-content: space-between;
    margin-top: auto;
  }
  
  .info-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: #f9f9f9;
    border-radius: 12px;
    flex: 1;
    margin: 0 0.5rem;
  }
  
  .info-item i {
    font-size: 1.5rem;
    color: #FF7043;
  }
  
  .info-content {
    display: flex;
    flex-direction: column;
  }
  
  .info-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
  }
  
  .info-label {
    font-size: 0.85rem;
    color: #6c757d;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .rating-summary {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
    }
    
    .rating-value {
      min-width: auto;
    }
    
    .rating-info {
      flex-direction: column;
      gap: 1rem;
    }
    
    .info-item {
      margin: 0;
    }
  }
  </style>