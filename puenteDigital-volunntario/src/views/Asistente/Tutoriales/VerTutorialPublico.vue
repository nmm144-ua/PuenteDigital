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
            <i class="bi bi-house me-1"></i> Ir a la página principal
          </a>
        </div>
      </div>
  
      <div v-else-if="tutorial" class="row justify-content-center">
        <div class="col-lg-10">
          <div class="card shadow mb-4">
            <div class="card-body">
              <h1 class="card-title fs-3 mb-3">{{ tutorial.titulo }}</h1>
              <div class="d-flex flex-wrap mb-3">
                <span class="badge bg-primary me-2 mb-2">{{ formatCategoria(tutorial.categoria) }}</span>
                <span class="badge bg-secondary me-2 mb-2">
                  <i class="bi bi-calendar-event me-1"></i> 
                  {{ formatDate(tutorial.created_at) }}
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
                    @play="registrarReproduccion"
                  >
                    Tu navegador no soporta la reproducción de videos.
                  </video>
                </div>
              </div>
              
              <div class="d-flex justify-content-between align-items-center mt-4">
                <div class="d-flex align-items-center">
                  <button 
                    @click="megusta" 
                    class="btn me-3"
                    :class="{ 'text-success': dioLike, 'text-secondary': !dioLike }"
                    aria-label="Me gusta"
                  >
                    <i class="bi bi-hand-thumbs-up fs-4"></i>
                    <span class="ms-1">{{ tutorial.me_gusta || 0 }}</span>
                  </button>
                  
                  <button 
                    @click="copyShareLink" 
                    class="btn text-primary"
                    aria-label="Compartir"
                  >
                    <i class="bi bi-share fs-4"></i>
                  </button>
                </div>
                
                <div class="text-muted">
                  <i class="bi bi-eye me-1"></i> {{ tutorial.vistas || 0 }} visualizaciones
                </div>
              </div>
            </div>
          </div>
          
          <!-- Información del asistente -->
          <div class="card shadow" v-if="asistente">
            <div class="card-header bg-light">
              <h4 class="mb-0 fs-5">Acerca del asistente</h4>
            </div>
            <div class="card-body d-flex">
              <img 
                :src="asistente.foto_url || '/src/assets/avatar.png'" 
                alt="Foto del asistente" 
                class="rounded-circle me-3"
                style="width: 64px; height: 64px; object-fit: cover;"
              >
              <div>
                <h5>{{ asistente.nombre }} {{ asistente.apellido }}</h5>
                <p class="text-muted mb-2">{{ asistente.especialidad || 'Asistente Digital' }}</p>
                <p v-if="asistente.descripcion">{{ asistente.descripcion }}</p>
                <a href="#" class="btn btn-sm btn-outline-primary mt-2">
                  Ver más tutoriales de este asistente
                </a>
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
  import { useRoute } from 'vue-router';
  import { toast } from 'vue-sonner';
  
  const route = useRoute();
  const tutorial = ref(null);
  const asistente = ref(null);
  const loading = ref(true);
  const error = ref(null);
  const dioLike = ref(false);
  const reproduccionRegistrada = ref(false);
  
  onMounted(async () => {
    await cargarTutorial();
  });
  
  const cargarTutorial = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const { data, error: supabaseError } = await supabase
        .from('tutoriales')
        .select('*')
        .eq('id', route.params.id)
        .single();
      
      if (supabaseError) throw supabaseError;
      
      if (!data) {
        error.value = 'No se encontró el tutorial solicitado.';
        return;
      }
      
      tutorial.value = data;
      
      // Cargar información del asistente
      if (data.asistente_id) {
        const { data: asistenteData, error: asistenteError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', data.asistente_id)
          .single();
        
        if (!asistenteError) {
          asistente.value = asistenteData;
        }
      }
      
      // Incrementar contador de vistas
      await supabase
        .from('tutoriales')
        .update({ vistas: (data.vistas || 0) + 1 })
        .eq('id', route.params.id);
      
      // Actualizar valor local
      tutorial.value.vistas = (tutorial.value.vistas || 0) + 1;
      
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
  
  const megusta = async () => {
    try {
      if (dioLike.value) {
        // Si ya dio like, no hacer nada
        return;
      }
      
      dioLike.value = true;
      
      // Incrementar contador de me gusta
      const nuevoMeGusta = (tutorial.value.me_gusta || 0) + 1;
      
      await supabase
        .from('tutoriales')
        .update({ me_gusta: nuevoMeGusta })
        .eq('id', tutorial.value.id);
      
      // Actualizar valor local
      tutorial.value.me_gusta = nuevoMeGusta;
      
      // Guardar en localStorage para recordar que ya dio like
      localStorage.setItem(`tutorial_like_${tutorial.value.id}`, 'true');
      
    } catch (err) {
      console.error('Error al registrar me gusta:', err);
      toast.error('No se pudo registrar tu me gusta');
      dioLike.value = false;
    }
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
      toast.error('No se pudo copiar el enlace');
    }
  };
  
  const registrarReproduccion = () => {
    // Sólo registrar la reproducción una vez por visita
    if (!reproduccionRegistrada.value) {
      reproduccionRegistrada.value = true;
      
      // Aquí podrías registrar estadísticas adicionales de reproducción si lo necesitas
      console.log('Reproducción iniciada');
    }
  };
  </script>
  
  <style scoped>
  .video-container {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 10px;
  }
  
  .btn:focus {
    box-shadow: none;
  }
  </style>