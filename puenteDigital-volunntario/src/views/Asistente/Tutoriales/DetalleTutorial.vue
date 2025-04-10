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
              <span class="badge bg-info text-dark me-2 mb-2">
                <i class="bi bi-file-earmark me-1"></i> 
                {{ formatFileSize(tutorial.tamanio) }}
              </span>
            </div>
            
            <div class="mb-4">
              <h5>Descripción:</h5>
              <p>{{ tutorial.descripcion }}</p>
            </div>
            
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
      
      <!-- Sección de comentarios -->
      <div class="card shadow mt-4">
        <div class="card-header bg-light">
          <h4 class="mb-0 fs-5">Comentarios de los usuarios</h4>
        </div>
        <div class="card-body">
          <div v-if="comentarios.length === 0" class="text-center py-3">
            <p class="text-muted">No hay comentarios aún para este tutorial.</p>
          </div>
          
          <div v-else>
            <div v-for="comentario in comentarios" :key="comentario.id" class="border-bottom pb-3 mb-3">
              <div class="d-flex">
                <div class="flex-shrink-0">
                  <div class="bg-light rounded-circle p-2">
                    <i class="bi bi-person fs-4"></i>
                  </div>
                </div>
                <div class="flex-grow-1 ms-3">
                  <div class="d-flex justify-content-between">
                    <h6 class="mb-0">{{ comentario.nombre_usuario || 'Usuario' }}</h6>
                    <small class="text-muted">{{ formatDate(comentario.created_at) }}</small>
                  </div>
                  <p class="mb-0 mt-1">{{ comentario.texto }}</p>
                </div>
              </div>
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
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const tutorial = ref(null);
const comentarios = ref([]);
const loading = ref(true);
const error = ref(null);
const asistenteId = ref(null);

onMounted(async () => {
  // Primero, obtener el ID del asistente
  await obtenerAsistenteId();
  
  if (asistenteId.value) {
    await Promise.all([
      cargarTutorial(),
      cargarComentarios()
    ]);
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
    
    const { data, error: supabaseError } = await supabase
      .from('tutoriales')
      .select('*')
      .eq('id', route.params.id)
      .single();
    
    if (supabaseError) {
      console.error('Error al cargar tutorial:', supabaseError);
      throw supabaseError;
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

const cargarComentarios = async () => {
  try {
    const { data, error: comentariosError } = await supabase
      .from('comentarios_tutorial')
      .select(`
        *,
        usuarios:user_id (nombre, rol)
      `)
      .eq('tutorial_id', route.params.id)
      .order('created_at', { ascending: false });
    
    if (comentariosError) {
      console.error('Error al cargar comentarios:', comentariosError);
      return;
    }
    
    // Procesar los datos para incluir el nombre del usuario
    comentarios.value = data.map(comentario => ({
      ...comentario,
      nombre_usuario: comentario.usuarios?.nombre || 'Usuario'
    })) || [];
    
  } catch (err) {
    console.error('Error al cargar comentarios:', err);
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

const copyShareLink = async () => {
  try {
    // Crear URL para compartir
    const shareUrl = `${window.location.origin}/tutoriales/ver/${tutorial.value.id}`;
    
    await navigator.clipboard.writeText(shareUrl);
    
    // Incrementar contador de compartidos
    await supabase
      .from('tutoriales')
      .update({ 
        compartidos: (tutorial.value.compartidos || 0) + 1 
      })
      .eq('id', tutorial.value.id);
    
    // Actualizar valor local
    tutorial.value.compartidos = (tutorial.value.compartidos || 0) + 1;
    
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
    
    // Eliminar el archivo de storage
    if (tutorial.value.video_path) {
      console.log('Eliminando archivo:', tutorial.value.video_path);
      const { error: storageError } = await supabase.storage
        .from('tutoriales')
        .remove([tutorial.value.video_path]);
      
      if (storageError) {
        console.error('Error al eliminar archivo:', storageError);
        throw storageError;
      }
    }
    
    // Eliminar el registro de la base de datos
    const { error: deleteError } = await supabase
      .from('tutoriales')
      .delete()
      .eq('id', tutorial.value.id);
    
    if (deleteError) {
      console.error('Error al eliminar registro:', deleteError);
      throw deleteError;
    }
    
    toast.success('Tutorial eliminado correctamente');
    router.push('/asistente/mis-tutoriales');
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
</style>