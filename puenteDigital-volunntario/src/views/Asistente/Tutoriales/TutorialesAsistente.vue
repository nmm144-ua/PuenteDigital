<template>
  <div class="container py-4">
    <div class="row mb-4">
      <div class="col-md-8">
        <h1 class="display-5 fw-bold">Mis Tutoriales</h1>
        <p class="lead">Aquí puedes gestionar los tutoriales que has subido para compartir con los usuarios.</p>
      </div>
      <div class="col-md-4 d-flex justify-content-md-end align-items-center">
        <router-link to="/asistente/tutoriales" class="btn btn-outline-secondary me-2">
          <i class="bi bi-arrow-left me-1"></i> Volver
        </router-link>
        <router-link to="/asistente/tutoriales/nuevo" class="btn btn-primary">
          <i class="bi bi-plus-circle me-2"></i> Nuevo tutorial
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2">Cargando tutoriales...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      {{ error }}
    </div>

    <div v-else-if="tutoriales.length === 0" class="text-center py-5">
      <i class="bi bi-camera-video-off fs-1 text-muted"></i>
      <h4 class="mt-3">No tienes tutoriales subidos</h4>
      <p class="text-muted">Comienza a compartir tu conocimiento subiendo un nuevo tutorial.</p>
      <router-link to="/asistente/tutoriales/nuevo" class="btn btn-outline-primary mt-3">
        Subir mi primer tutorial
      </router-link>
    </div>

    <div v-else class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      <div v-for="tutorial in tutoriales" :key="tutorial.id" class="col">
        <div class="card h-100 shadow-sm">
          <div class="ratio ratio-16x9">
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
              <router-link :to="`/asistente/tutoriales/${tutorial.id}`" class="btn btn-sm btn-outline-primary">
                <i class="bi bi-eye me-1"></i> Ver detalles
              </router-link>
              <button @click="eliminarTutorial(tutorial.id)" class="btn btn-sm btn-outline-danger">
                <i class="bi bi-trash me-1"></i> Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../../../../supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'vue-sonner';
import tutorialService from '../../../services/tutorialService';

const tutoriales = ref([]);
const loading = ref(true);
const error = ref(null);
const authStore = useAuthStore();

onMounted(async () => {
  await cargarTutoriales();
});

const cargarTutoriales = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    // Primero, obtener el ID del asistente a partir del user_id
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
    
    const asistenteId = asistenteData.id;
    console.log('ID del asistente para cargar tutoriales:', asistenteId);
    
    // Usar el servicio para obtener los tutoriales del asistente
    const { data, error: tutorialesError } = await tutorialService.obtenerTutorialesPorAsistente(asistenteId);
    
    if (tutorialesError) {
      console.error('Error al consultar tutoriales:', tutorialesError);
      throw tutorialesError;
    }
    
    console.log('Tutoriales cargados:', data?.length || 0);
    tutoriales.value = data || [];
  } catch (err) {
    console.error('Error al cargar tutoriales:', err);
    error.value = err.message || 'No se pudieron cargar los tutoriales. Por favor, intenta de nuevo más tarde.';
  } finally {
    loading.value = false;
  }
};

const eliminarTutorial = async (id) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este tutorial? Esta acción no se puede deshacer.')) {
    return;
  }
  
  try {
    loading.value = true;
    
    // Primero obtener la info del tutorial para verificar permisos
    const { data: tutorial, error: getTutorialError } = await tutorialService.obtenerTutorialPorId(id);
    
    if (getTutorialError) {
      console.error('Error al obtener información del tutorial:', getTutorialError);
      throw getTutorialError;
    }
    
    // Obtener ID del asistente actual
    const { data: asistenteData } = await supabase
      .from('asistentes')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single();
      
    // Verificar que el asistente actual es el propietario del tutorial
    if (asistenteData.id !== tutorial.asistente_id) {
      throw new Error('No tienes permiso para eliminar este tutorial');
    }
    
    // Usar el servicio para eliminar el tutorial
    const { success, error: eliminarError } = await tutorialService.eliminarTutorial(id);
    
    if (eliminarError) {
      console.error('Error al eliminar tutorial:', eliminarError);
      throw eliminarError;
    }
    
    if (!success) {
      throw new Error('No se pudo eliminar el tutorial');
    }
    
    // Actualizar la lista
    tutoriales.value = tutoriales.value.filter(tutorial => tutorial.id !== id);
    
    toast.success('Tutorial eliminado correctamente');
  } catch (err) {
    console.error('Error al eliminar tutorial:', err);
    toast.error('Error al eliminar el tutorial: ' + (err.message || 'Inténtalo de nuevo.'));
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

const formatTipoRecurso = (tipo) => {
    const tipos = {
      'video': 'Video',
      'pdf': 'Guía PDF',
      'ambos': 'Video y PDF'
    };
    
    return tipos[tipo] || tipo;
  };

  const getBadgeClass = (tipo) => {
    switch (tipo) {
      case 'video': return 'bg-success';
      case 'pdf': return 'bg-danger';
      case 'ambos': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  };
  const getIconClass = (tipo) => {
    switch (tipo) {
      case 'video': return 'bi bi-camera-video';
      case 'pdf': return 'bi bi-file-pdf';
      case 'ambos': return 'bi bi-collection';
      default: return 'bi bi-question-circle';
    }
  };
  // Función para obtener la imagen de placeholder según el tipo de recurso
  const getPlaceholderImage = (tipo) => {
    switch (tipo) {
      case 'video': return '/video-placeholder.png';
      case 'pdf': return '/pdf-placeholder.png';
      case 'ambos': return '/video-pdf-placeholder.png';
      default: return '/video-placeholder.png';
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
</style>