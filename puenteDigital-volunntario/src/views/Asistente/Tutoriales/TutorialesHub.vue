<template>
    <div class="container py-4">
      <div class="row mb-4">
        <div class="col">
          <h1 class="display-5 fw-bold">Tutoriales</h1>
          <p class="lead">Explora y gestiona tutoriales para ayudar a los usuarios.</p>
        </div>
      </div>
  
      <div class="row row-cols-1 row-cols-md-2 g-4">
        <!-- Opción: Mis Tutoriales -->
        <div class="col">
          <div class="card h-100 shadow-sm border-primary hover-card">
            <div class="card-body text-center p-5">
              <i class="bi bi-person-video3 text-primary fs-1 mb-3"></i>
              <h3 class="card-title">Mis Tutoriales</h3>
              <p class="card-text">Gestiona los tutoriales que has creado para compartir con usuarios.</p>
              <router-link to="/asistente/mis-tutoriales" class="btn btn-primary mt-3">
                <i class="bi bi-collection-play me-2"></i> Ver mis tutoriales
              </router-link>
            </div>
            <div class="card-footer bg-white border-top-0 text-center text-muted">
              <i class="bi bi-info-circle me-1"></i> Administra tus propios tutoriales
            </div>
          </div>
        </div>
  
        <!-- Opción: Todos los Tutoriales -->
        <div class="col">
          <div class="card h-100 shadow-sm border-success hover-card">
            <div class="card-body text-center p-5">
              <i class="bi bi-collection-play text-success fs-1 mb-3"></i>
              <h3 class="card-title">Todos los Tutoriales</h3>
              <p class="card-text">Explora todos los tutoriales creados por los asistentes de la plataforma.</p>
              <router-link to="/asistente/todos-tutoriales" class="btn btn-success mt-3">
                <i class="bi bi-search me-2"></i> Explorar tutoriales
              </router-link>
            </div>
            <div class="card-footer bg-white border-top-0 text-center text-muted">
              <i class="bi bi-info-circle me-1"></i> Descubre tutoriales de otros asistentes
            </div>
          </div>
        </div>
      </div>
  
      <!-- Sección de estadísticas generales -->
      <div class="card shadow mt-5">
        <div class="card-header bg-light">
          <h4 class="mb-0 fs-5">Estadísticas de tutoriales</h4>
        </div>
        <div class="card-body">
          <div class="row g-4">
            <div class="col-md-4">
              <div class="border rounded p-3 text-center">
                <i class="bi bi-collection fs-2 text-primary"></i>
                <h5 class="mt-2">{{ estadisticas.totalTutoriales || '--' }}</h5>
                <p class="text-muted mb-0">Total de tutoriales</p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded p-3 text-center">
                <i class="bi bi-eye fs-2 text-success"></i>
                <h5 class="mt-2">{{ estadisticas.totalVistas || '--' }}</h5>
                <p class="text-muted mb-0">Total de visualizaciones</p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded p-3 text-center">
                <i class="bi bi-hand-thumbs-up fs-2 text-info"></i>
                <h5 class="mt-2">{{ estadisticas.totalMeGusta || '--' }}</h5>
                <p class="text-muted mb-0">Total de me gusta</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useAuthStore } from '../../../stores/authStore';
  import tutorialService from '../../../services/tutorialService';
  
  const authStore = useAuthStore();
  const estadisticas = ref({
    totalTutoriales: 0,
    totalVistas: 0,
    totalMeGusta: 0
  });
  
  onMounted(async () => {
    await cargarEstadisticas();
  });
  
  const cargarEstadisticas = async () => {
    try {
      // Obtener estadísticas generales usando el servicio
      const { data, error } = await tutorialService.obtenerEstadisticasGenerales();
      
      if (error) {
        console.error('Error al obtener estadísticas:', error);
        return;
      }
      
      if (data) {
        estadisticas.value = data;
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };
  </script>
  
  <style scoped>
  .hover-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .hover-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
  }
  
  .card-footer {
    font-size: 0.9rem;
  }
  
  .bi {
    line-height: 1;
  }
  </style>