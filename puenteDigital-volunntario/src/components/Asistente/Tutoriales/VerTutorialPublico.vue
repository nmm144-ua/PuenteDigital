<template>
    <div class="container py-4">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2">Cargando tutorial...</p>
      </div>
  
      <div v-else-if="error" class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        {{ error }}
        <div class="mt-3">
          <a href="/" class="btn btn-outline-primary">
            <i class="bi bi-house me-1"></i> Ir al inicio
          </a>
        </div>
      </div>
  
      <div v-else-if="tutorial">
        <div class="card shadow">
          <div class="card-header bg-primary text-white">
            <h1 class="fs-4 mb-0">{{ tutorial.titulo }}</h1>
          </div>
          <div class="card-body">
            <div class="d-flex flex-wrap mb-3">
              <span class="badge bg-primary me-2 mb-2">{{ formatCategoria(tutorial.categoria) }}</span>
              <span class="badge bg-secondary me-2 mb-2">
                <i class="bi bi-calendar-event me-1"></i> 
                {{ formatDate(tutorial.created_at) }}
              </span>
              <span class="badge bg-success me-2 mb-2">
                <i class="bi bi-person me-1"></i> 
                {{ tutorial.nombre_asistente || 'Asistente' }}
              </span>
              <span class="badge" 
                :class="tipoRecursoBadgeClass" 
                me-2 mb-2>
                <i :class="tipoRecursoIconClass" me-1></i> 
                {{ formatTipoRecurso(tutorial.tipo_recurso || 'video') }}
              </span>
            </div>
            
            <div class="mb-4">
              <h5>Descripción:</h5>
              <p>{{ tutorial.descripcion }}</p>
            </div>
            
            <!-- Contenedor de video, mostrar si tiene video -->
            <div v-if="tieneVideo" class="mb-4">
              <h5>Video:</h5>
              <div class="video-container mb-4">
                <div class="ratio ratio-16x9">
                  <video 
                    controls 
                    class="rounded shadow-sm"
                    :src="tutorial.video_url" 
                    preload="metadata"
                    autoplay
                  >
                    Tu navegador no soporta la reproducción de videos.
                  </video>
                </div>
              </div>
            </div>
            
            <!-- Contenedor de PDF, mostrar si tiene PDF -->
            <div v-if="tienePdf" class="mb-4">
              <h5>Guía PDF:</h5>
              <div class="pdf-container mb-3 p-3 border rounded bg-light">
                <div class="d-flex align-items-center">
                  <i class="bi bi-file-pdf fs-1 text-danger me-3"></i>
                  <div class="flex-grow-1">
                    <h6 class="mb-1">Guía en formato PDF</h6>
                    <p class="mb-0 text-muted">{{ formatFileSize(tutorial.pdf_tamanio || 0) }}</p>
                  </div>
                  <a 
                    :href="tutorial.pdf_url" 
                    target="_blank" 
                    class="btn btn-primary"
                    download
                  >
                    <i class="bi bi-download me-1"></i> Descargar PDF
                  </a>
                </div>
              </div>
              
              <!-- Vista previa del PDF, si está disponible -->
              <div class="pdf-preview border rounded mb-4">
                <iframe 
                  :src="tutorial.pdf_url" 
                  width="100%" 
                  height="500" 
                  class="rounded"
                  v-if="tutorial.pdf_url"
                ></iframe>
              </div>
            </div>
            
            <div class="d-flex justify-content-between mt-4">
              <button 
                @click="darMeGusta" 
                class="btn" 
                :class="[dioMeGusta ? 'btn-success' : 'btn-outline-success']"
                :disabled="!isAuthenticated || procesandoMeGusta"
              >
                <i class="bi" :class="[dioMeGusta ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up']"></i>
                {{ dioMeGusta ? 'Me gusta' : 'Me gusta' }} ({{ tutorial.me_gusta || 0 }})
              </button>
              
              <button 
                @click="copyShareLink" 
                class="btn btn-outline-primary"
              >
                <i class="bi bi-share me-1"></i> Compartir
              </button>
            </div>
            
          </div>
        </div>
        
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  import { useAuthStore } from '../../stores/authStore';
  import { toast } from 'vue-sonner';
  import tutorialService from '../../../services/tutorialService';
  
  const route = useRoute();
  const authStore = useAuthStore();
  const tutorial = ref(null);
  const loading = ref(true);
  const error = ref(null);
  const dioMeGusta = ref(false);
  const procesandoMeGusta = ref(false);
  
  const isAuthenticated = computed(() => authStore.isAuthenticated);

  // Computed properties para determinar qué recursos mostrar
  const tieneVideo = computed(() => {
    if (!tutorial.value) return false;
    const tipoRecurso = tutorial.value.tipo_recurso || 'video';
    return tipoRecurso === 'video' || tipoRecurso === 'ambos';
  });

  const tienePdf = computed(() => {
    if (!tutorial.value) return false;
    const tipoRecurso = tutorial.value.tipo_recurso || 'video';
    return tipoRecurso === 'pdf' || tipoRecurso === 'ambos';
  });

  // Computed properties para estilos según tipo de recurso
  const tipoRecursoBadgeClass = computed(() => {
    if (!tutorial.value) return 'bg-secondary';
    
    const tipo = tutorial.value.tipo_recurso || 'video';
    switch (tipo) {
      case 'video': return 'bg-success';
      case 'pdf': return 'bg-danger';
      case 'ambos': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  });

  const tipoRecursoIconClass = computed(() => {
    if (!tutorial.value) return 'bi bi-question-circle';
    
    const tipo = tutorial.value.tipo_recurso || 'video';
    switch (tipo) {
      case 'video': return 'bi bi-camera-video';
      case 'pdf': return 'bi bi-file-pdf';
      case 'ambos': return 'bi bi-collection';
      default: return 'bi bi-question-circle';
    }
  });
  
  onMounted(async () => {
    await cargarTutorial();
  });
  
  const cargarTutorial = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const { data, error: supabaseError } = await tutorialService.obtenerTutorialConDetalles(route.params.id);
      
      if (supabaseError) {
        console.error('Error al cargar tutorial:', supabaseError);
        throw supabaseError;
      }
      
      if (!data) {
        error.value = 'No se encontró el tutorial solicitado.';
        return;
      }
      
      // Procesar los datos para incluir el nombre del asistente
      tutorial.value = {
        ...data,
        nombre_asistente: data.asistentes?.nombre || 'Asistente'
      };
      
      // Incrementar contador de vistas
      await tutorialService.incrementarVistas(route.params.id);
      
    } catch (err) {
      console.error('Error al cargar tutorial:', err);
      error.value = 'No se pudo cargar el tutorial. Por favor, intenta de nuevo más tarde.';
    } finally {
      loading.value = false;
    }
  };
  
  const darMeGusta = async () => {
    try {
      if (!authStore.user) {
        toast.error('Debes iniciar sesión para dar me gusta');
        return;
      }
      
      procesandoMeGusta.value = true;
      
      if (dioMeGusta.value) {
        // Quitar me gusta (decrementar contador)
        const { data, error: decrementarError } = await tutorialService.decrementarMeGusta(route.params.id);
        
        if (decrementarError) {
          console.error('Error al quitar me gusta:', decrementarError);
          throw decrementarError;
        }
        
        if (data && data.length > 0) {
          tutorial.value.me_gusta = data[0].me_gusta;
        }
        
        dioMeGusta.value = false;
        
      } else {
        // Dar me gusta (incrementar contador)
        const { data, error: incrementarError } = await tutorialService.incrementarMeGusta(route.params.id);
        
        if (incrementarError) {
          console.error('Error al dar me gusta:', incrementarError);
          throw incrementarError;
        }
        
        if (data && data.length > 0) {
          tutorial.value.me_gusta = data[0].me_gusta;
        }
        
        dioMeGusta.value = true;
      }
      
      toast.success(dioMeGusta.value ? '¡Gracias por tu me gusta!' : 'Has quitado tu me gusta');
      
    } catch (err) {
      console.error('Error al procesar me gusta:', err);
      toast.error('No se pudo procesar tu me gusta. Inténtalo de nuevo.');
    } finally {
      procesandoMeGusta.value = false;
    }
  };
  
  const copyShareLink = async () => {
    try {
      // Crear URL para compartir
      const shareUrl = `${window.location.origin}/tutoriales/ver/${tutorial.value.id}`;
      
      await navigator.clipboard.writeText(shareUrl);
      
      // Incrementar contador de compartidos
      await tutorialService.incrementarCompartidos(tutorial.value.id);
      
      // Actualizar el contador local
      const { data } = await tutorialService.obtenerTutorialPorId(tutorial.value.id);
      if (data) {
        tutorial.value.compartidos = data.compartidos;
      }
      
      toast.success('¡Enlace copiado al portapapeles!');
    } catch (err) {
      console.error('Error al copiar enlace:', err);
      toast.error('No se pudo copiar el enlace');
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
  
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      'ambos': 'Video y PDF'
    };
    
    return tipos[tipo] || tipo;
  };
  </script>
  
  <style scoped>
  .video-container {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 10px;
  }
  
  .pdf-container {
    transition: all 0.3s ease;
  }

  .pdf-container:hover {
    background-color: #e9ecef;
  }

  .pdf-preview {
    background-color: #f8f9fa;
    overflow: hidden;
  }
  
  .tutorial-description {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>