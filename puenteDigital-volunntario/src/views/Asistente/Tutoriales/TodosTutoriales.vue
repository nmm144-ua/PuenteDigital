<template>
    <div class="container py-4">
      <div class="row mb-4">
        <div class="col-md-8">
          <h1 class="display-5 fw-bold">Todos los Tutoriales</h1>
          <p class="lead">Explora los tutoriales creados por todos los asistentes de la plataforma.</p>
        </div>
        <div class="col-md-4 d-flex justify-content-md-end align-items-center">
          <router-link to="/asistente/tutoriales" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left me-2"></i> Volver
          </router-link>
        </div>
      </div>
  
      <!-- Estado de carga -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2">Cargando tutoriales...</p>
      </div>
  
      <!-- Mensaje de error -->
      <div v-else-if="error" class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        {{ error }}
      </div>
  
      <!-- Sin resultados -->
      <div v-else-if="tutoriales.length === 0" class="text-center py-5">
        <i class="bi bi-camera-video-off fs-1 text-muted"></i>
        <h4 class="mt-3">No se encontraron tutoriales</h4>
        <p class="text-muted">Prueba a cambiar los filtros de búsqueda o vuelve más tarde.</p>
      </div>
  
      <!-- Lista de tutoriales -->
      <div v-else>
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          <div v-for="tutorial in tutoriales" :key="tutorial.id" class="col">
            <div class="card h-100 shadow-sm">
              <div class="ratio ratio-16x9">
                <!-- Imagen de placeholder según el tipo de recurso -->
                <img 
                  :src="getPlaceholderImage(tutorial.tipo_recurso || 'video')" 
                  class="card-img-top" 
                  :alt="`Miniatura de ${formatTipoRecurso(tutorial.tipo_recurso || 'video')}`"
                  style="object-fit: cover;">
                <!-- Indicador de tipo de recurso -->
                <div class="position-absolute top-0 end-0 m-2">
                  <span class="badge" :class="getBadgeClass(tutorial.tipo_recurso || 'video')">
                    <i :class="getIconClass(tutorial.tipo_recurso || 'video')" class="me-1"></i>
                    {{ formatTipoRecurso(tutorial.tipo_recurso || 'video') }}
                  </span>
                </div>
              </div>
              <div class="card-body">
                <h5 class="card-title">{{ tutorial.titulo }}</h5>
                <p class="badge bg-primary me-2">{{ formatCategoria(tutorial.categoria) }}</p>
                <p class="card-text text-muted">
                  <small>
                    <i class="bi bi-person me-1"></i> 
                    {{ tutorial.nombre_asistente || 'Asistente' }}
                  </small>
                </p>
                <p class="card-text text-muted">
                  <small>
                    <i class="bi bi-calendar-event me-1"></i> 
                    {{ formatDate(tutorial.created_at) }}
                  </small>
                </p>
                <p class="card-text tutorial-description">{{ tutorial.descripcion }}</p>
              </div>
              <div class="card-footer bg-white border-top-0">
                <div class="d-flex justify-content-between align-items-center">
                  <router-link :to="`/asistente/tutorial-detalle/${tutorial.id}`" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-play-fill me-1"></i> Ver tutorial
                  </router-link>
                  <div class="text-muted">
                    <span class="me-2" title="Visualizaciones">
                      <i class="bi bi-eye"></i> {{ tutorial.vistas || 0 }}
                    </span>
                    <span title="Me gusta">
                      <i class="bi bi-hand-thumbs-up"></i> {{ tutorial.me_gusta || 0 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Paginación -->
        <nav v-if="totalPaginas > 1" class="mt-4">
          <ul class="pagination justify-content-center">
            <li class="page-item" :class="{ disabled: paginaActual === 1 }">
              <a class="page-link" href="#" @click.prevent="cambiarPagina(paginaActual - 1)">Anterior</a>
            </li>
            <li v-for="pagina in paginasVisibles" :key="pagina" class="page-item" :class="{ active: pagina === paginaActual }">
              <a class="page-link" href="#" @click.prevent="cambiarPagina(pagina)">{{ pagina }}</a>
            </li>
            <li class="page-item" :class="{ disabled: paginaActual === totalPaginas }">
              <a class="page-link" href="#" @click.prevent="cambiarPagina(paginaActual + 1)">Siguiente</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, onMounted, watch } from 'vue';
  import tutorialService from '../../../services/tutorialService';
  
  const tutoriales = ref([]);
  const loading = ref(true);
  const error = ref(null);
  const totalTutoriales = ref(0);
  const paginaActual = ref(1);
  const tutorialesPorPagina = 9;
  
  const filtros = reactive({
    categoria: '',
    tipoRecurso: 'todos',
    orden: 'recientes',
    busqueda: ''
  });
  
  // Calculamos el total de páginas
  const totalPaginas = computed(() => {
    return Math.ceil(totalTutoriales.value / tutorialesPorPagina);
  });
  
  // Calculamos qué páginas mostrar (para no mostrar todas si hay muchas)
  const paginasVisibles = computed(() => {
    const paginas = [];
    const mostrarMax = 5; // Número máximo de páginas a mostrar
    
    let inicio = Math.max(1, paginaActual.value - Math.floor(mostrarMax / 2));
    let fin = Math.min(totalPaginas.value, inicio + mostrarMax - 1);
    
    // Ajustar el inicio si estamos cerca del final
    if (fin === totalPaginas.value) {
      inicio = Math.max(1, fin - mostrarMax + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  });
  
  // Observar cambios en filtros para reiniciar paginación
  watch(filtros, () => {
    paginaActual.value = 1;
  }, { deep: true });
  
  onMounted(async () => {
    await cargarTutoriales();
  });
  
  const cargarTutoriales = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      // Usar el servicio para obtener tutoriales con filtros
      const { data, total, error: tutorialesError } = await tutorialService.obtenerTutorialesConFiltros({
        categoria: filtros.categoria,
        orden: filtros.orden,
        busqueda: filtros.busqueda,
        tipoRecurso: filtros.tipoRecurso,
        pagina: paginaActual.value,
        porPagina: tutorialesPorPagina
      });
      
      if (tutorialesError) {
        console.error('Error al cargar tutoriales:', tutorialesError);
        throw tutorialesError;
      }
      
      tutoriales.value = data;
      totalTutoriales.value = total;
      
    } catch (err) {
      console.error('Error al cargar tutoriales:', err);
      error.value = 'No se pudieron cargar los tutoriales. Por favor, intenta de nuevo más tarde.';
    } finally {
      loading.value = false;
    }
  };
  
  const aplicarFiltros = async () => {
    paginaActual.value = 1;
    await cargarTutoriales();
  };
  
  const cambiarPagina = async (pagina) => {
    if (pagina < 1 || pagina > totalPaginas.value) return;
    
    paginaActual.value = pagina;
    await cargarTutoriales();
    
    // Scroll al inicio de la lista
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Función para obtener la imagen de placeholder según el tipo de recurso
  const getPlaceholderImage = (tipo) => {
    switch (tipo) {
      case 'video': return '/video-placeholder.png';
      case 'pdf': return '/pdf-placeholder.png';
      default: return '/video-placeholder.png';
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  const formatCategoria = (categoria) => {
    const categorias = {
      'tecnologia': 'Tecnología',
      'educacion': 'Educación',
      'salud': 'Salud',
      'tramites': 'Trámites',
      'comunicacion': 'Comunicación',
      'otro': 'Otro'
    };
    
    return categorias[categoria] || categoria;
  };

  const formatTipoRecurso = (tipo) => {
    const tipos = {
      'video': 'Video',
      'pdf': 'Guía PDF',
    };
    
    return tipos[tipo] || tipo;
  };

  const getBadgeClass = (tipo) => {
    switch (tipo) {
      case 'video': return 'bg-success';
      case 'pdf': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getIconClass = (tipo) => {
    switch (tipo) {
      case 'video': return 'bi bi-camera-video';
      case 'pdf': return 'bi bi-file-pdf';
      default: return 'bi bi-question-circle';
    }
  };
  </script>
  
  <style scoped>
  .tutorial-description {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .badge {
    font-weight: normal;
  }
  </style>