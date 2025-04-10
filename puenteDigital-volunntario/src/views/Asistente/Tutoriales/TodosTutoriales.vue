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
  
      <!-- Filtros -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label for="categoriaFiltro" class="form-label">Categoría</label>
              <select class="form-select" id="categoriaFiltro" v-model="filtros.categoria">
                <option value="">Todas las categorías</option>
                <option value="tecnologia">Tecnología</option>
                <option value="educacion">Educación</option>
                <option value="salud">Salud</option>
                <option value="tramites">Trámites</option>
                <option value="comunicacion">Comunicación</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div class="col-md-4">
              <label for="ordenFiltro" class="form-label">Ordenar por</label>
              <select class="form-select" id="ordenFiltro" v-model="filtros.orden">
                <option value="recientes">Más recientes</option>
                <option value="populares">Más populares</option>
                <option value="vistos">Más vistos</option>
              </select>
            </div>
            <div class="col-md-4">
              <label for="busqueda" class="form-label">Buscar</label>
              <div class="input-group">
                <input 
                  type="text" 
                  class="form-control" 
                  id="busqueda" 
                  placeholder="Buscar por título..."
                  v-model="filtros.busqueda"
                >
                <button class="btn btn-primary" type="button" @click="aplicarFiltros">
                  <i class="bi bi-search"></i>
                </button>
              </div>
            </div>
          </div>
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
                <img src="/video-placeholder.png" 
                  class="card-img-top" 
                  alt="Miniatura del tutorial"
                  style="object-fit: cover;">
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
  import { supabase } from '../../../../supabase';
  
  const tutoriales = ref([]);
  const loading = ref(true);
  const error = ref(null);
  const totalTutoriales = ref(0);
  const paginaActual = ref(1);
  const tutorialesPorPagina = 9;
  
  const filtros = reactive({
    categoria: '',
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
      
      // Construir la consulta base
      let query = supabase
        .from('tutoriales')
        .select(`
          *,
          asistentes:asistente_id (nombre)
        `, { count: 'exact' });
      
      // Aplicar filtros
      if (filtros.categoria) {
        query = query.eq('categoria', filtros.categoria);
      }
      
      if (filtros.busqueda) {
        query = query.ilike('titulo', `%${filtros.busqueda}%`);
      }
      
      // Ordenar resultados
      switch (filtros.orden) {
        case 'recientes':
          query = query.order('created_at', { ascending: false });
          break;
        case 'populares':
          query = query.order('me_gusta', { ascending: false });
          break;
        case 'vistos':
          query = query.order('vistas', { ascending: false });
          break;
      }
      
      // Paginación
      const desde = (paginaActual.value - 1) * tutorialesPorPagina;
      query = query.range(desde, desde + tutorialesPorPagina - 1);
      
      // Ejecutar consulta
      const { data, error: supabaseError, count } = await query;
      
      if (supabaseError) {
        console.error('Error al cargar tutoriales:', supabaseError);
        throw supabaseError;
      }
      
      // Procesar los datos para incluir el nombre del asistente
      tutoriales.value = data.map(tutorial => ({
        ...tutorial,
        nombre_asistente: tutorial.asistentes?.nombre || 'Asistente'
      }));
      
      totalTutoriales.value = count || 0;
      
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