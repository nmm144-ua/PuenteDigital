<template>
  <div class="container py-4">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2">Cargando detalles del tutorial...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      {{ error }}
      <div class="mt-3">
        <router-link to="/asistente/mis-tutoriales" class="btn btn-outline-primary">
          <i class="bi bi-arrow-left me-1"></i> Volver a mis tutoriales
        </router-link>
      </div>
    </div>

    <div v-else-if="tutorial">
      <div class="mb-4">
        <router-link to="/asistente/mis-tutoriales" class="btn btn-outline-secondary mb-3">
          <i class="bi bi-arrow-left me-1"></i> Volver a mis tutoriales
        </router-link>
        <div class="card shadow">
          <div class="card-body">
            <h1 class="card-title fs-3 mb-3">{{ tutorial.titulo }}</h1>
            <div class="d-flex flex-wrap mb-3">
              <span class="badge bg-primary me-2 mb-2">{{ formatCategoria(tutorial.categoria) }}</span>
              <span class="badge bg-secondary me-2 mb-2">
                <i class="bi bi-calendar-event me-1"></i> 
                {{ formatDate(tutorial.created_at) }}
              </span>
              <span class="badge" 
                :class="tipoRecursoBadgeClass" 
                me-2 mb-2>
                <i :class="tipoRecursoIconClass" me-1></i> 
                {{ formatTipoRecurso(tutorial.tipo_recurso || 'video') }}
              </span>
              <span class="badge bg-info text-dark me-2 mb-2">
                <i class="bi bi-file-earmark me-1"></i> 
                {{ formatFileSize(tutorial.tamanio) }}
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
                @click="copyShareLink" 
                class="btn btn-outline-primary"
              >
                <i class="bi bi-share me-1"></i> Compartir enlace
              </button>
              <button 
                @click="eliminarTutorial" 
                class="btn btn-outline-danger"
              >
                <i class="bi bi-trash me-1"></i> Eliminar tutorial
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card shadow mt-4">
        <div class="card-header bg-light">
          <h4 class="mb-0 fs-5">Estadísticas del tutorial</h4>
        </div>
        <div class="card-body">
          <div class="row g-4">
            <div class="col-md-4">
              <div class="border rounded p-3 text-center">
                <i class="bi bi-eye fs-2 text-primary"></i>
                <h5 class="mt-2">{{ tutorial.vistas || 0 }}</h5>
                <p class="text-muted mb-0">Visualizaciones</p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded p-3 text-center">
                <i class="bi bi-hand-thumbs-up fs-2 text-success"></i>
                <h5 class="mt-2">{{ tutorial.me_gusta || 0 }}</h5>
                <p class="text-muted mb-0">Me gusta</p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded p-3 text-center">
                <i class="bi bi-share fs-2 text-info"></i>
                <h5 class="mt-2">{{ tutorial.compartidos || 0 }}</h5>
                <p class="text-muted mb-0">Compartidos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '../../../../supabase';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'vue-sonner';
import tutorialService from '../../../services/tutorialService';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const tutorial = ref(null);
const loading = ref(true);
const error = ref(null);
const asistenteId = ref(null);

// Computed properties para determinar qué recursos mostrar
const tieneVideo = computed(() => {
  if (!tutorial.value) return false;
  const tipoRecurso = tutorial.value.tipo_recurso || 'video';
  return tipoRecurso === 'video';
});

const tienePdf = computed(() => {
  if (!tutorial.value) return false;
  const tipoRecurso = tutorial.value.tipo_recurso || 'video';
  return tipoRecurso === 'pdf';
});

// Computed properties para estilos según tipo de recurso
const tipoRecursoBadgeClass = computed(() => {
  if (!tutorial.value) return 'bg-secondary';
  
  const tipo = tutorial.value.tipo_recurso || 'video';
  switch (tipo) {
    case 'video': return 'bg-success';
    case 'pdf': return 'bg-danger';
    default: return 'bg-secondary';
  }
});

const tipoRecursoIconClass = computed(() => {
  if (!tutorial.value) return 'bi bi-question-circle';
  
  const tipo = tutorial.value.tipo_recurso || 'video';
  switch (tipo) {
    case 'video': return 'bi bi-camera-video';
    case 'pdf': return 'bi bi-file-pdf';
    default: return 'bi bi-question-circle';
  }
});

onMounted(async () => {
  // Primero, obtener el ID del asistente
  await obtenerAsistenteId();
  
  if (asistenteId.value) {
    await cargarTutorial();
  }
});

const obtenerAsistenteId = async () => {
  try {
    // Obtener el ID del asistente a partir del user_id
    const { data: asistenteData, error: asistenteError } = await supabase
      .from('asistentes')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single();
    
    if (asistenteError) {
      console.error('Error al obtener asistente:', asistenteError);
      throw new Error('No se pudo obtener la información del asistente');
    }
    
    if (!asistenteData) {
      throw new Error('No se encontró un registro de asistente asociado a tu cuenta');
    }
    
    asistenteId.value = asistenteData.id;
    console.log('ID del asistente:', asistenteId.value);
  } catch (err) {
    console.error('Error al obtener ID de asistente:', err);
    error.value = err.message;
  }
};

const cargarTutorial = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const { data, error: tutorialError } = await tutorialService.obtenerTutorialPorId(route.params.id);
    
    if (tutorialError) {
      console.error('Error al cargar tutorial:', tutorialError);
      throw tutorialError;
    }
    
    if (!data) {
      error.value = 'No se encontró el tutorial solicitado.';
      return;
    }
    
    // Verificar que el tutorial pertenece al asistente actual
    if (data.asistente_id !== asistenteId.value) {
      error.value = 'No tienes permiso para ver este tutorial.';
      return;
    }
    
    tutorial.value = data;
    
  } catch (err) {
    console.error('Error al cargar tutorial:', err);
    error.value = 'No se pudo cargar el tutorial. Por favor, intenta de nuevo más tarde.';
  } finally {
    loading.value = false;
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
  };
  
  return tipos[tipo] || tipo;
};

const copyShareLink = async () => {
  try {
    // Crear URL para compartir
    const shareUrl = `${window.location.origin}/tutoriales/ver/${tutorial.value.id}`;
    
    await navigator.clipboard.writeText(shareUrl);
    
    // Incrementar contador de compartidos usando el servicio
    const { data } = await tutorialService.incrementarCompartidos(tutorial.value.id);
    
    // Actualizar valor local
    if (data && data.length > 0) {
      tutorial.value.compartidos = data[0].compartidos;
    } else {
      tutorial.value.compartidos = (tutorial.value.compartidos || 0) + 1;
    }
    
    toast.success('¡Enlace copiado al portapapeles!');
  } catch (err) {
    console.error('Error al copiar enlace:', err);
    toast.error('No se pudo copiar el enlace');
  }
};

const eliminarTutorial = async () => {
  if (!confirm('¿Estás seguro de que deseas eliminar este tutorial? Esta acción no se puede deshacer.')) {
    return;
  }
  
  try {
    loading.value = true;
    
    // Verificar que el tutorial pertenece al asistente actual
    if (tutorial.value.asistente_id !== asistenteId.value) {
      throw new Error('No tienes permiso para eliminar este tutorial');
    }
    
    // Utilizar el servicio para eliminar el tutorial
    const { success, error: eliminarError } = await tutorialService.eliminarTutorial(tutorial.value.id);
    
    if (eliminarError) {
      console.error('Error al eliminar tutorial:', eliminarError);
      throw eliminarError;
    }
    
    if (success) {
      toast.success('Tutorial eliminado correctamente');
      router.push('/asistente/mis-tutoriales');
    } else {
      throw new Error('No se pudo eliminar el tutorial');
    }
  } catch (err) {
    console.error('Error al eliminar tutorial:', err);
    toast.error('Error al eliminar el tutorial: ' + (err.message || 'Inténtalo de nuevo.'));
  } finally {
    loading.value = false;
  }
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
</style>