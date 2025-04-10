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
                  autoplay
                >
                  Tu navegador no soporta la reproducción de videos.
                </video>
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
            
            <div v-if="!isAuthenticated" class="alert alert-info mt-3">
              <i class="bi bi-info-circle-fill me-2"></i>
              <router-link to="/login" class="alert-link">Inicia sesión</router-link> para dar me gusta o comentar en este tutorial.
            </div>
          </div>
        </div>
        
        <!-- Sección de comentarios -->
        <div class="card shadow mt-4">
          <div class="card-header bg-light">
            <h4 class="mb-0 fs-5">Comentarios</h4>
          </div>
          <div class="card-body">
            <form v-if="isAuthenticated" @submit.prevent="agregarComentario" class="mb-4">
              <div class="mb-3">
                <textarea 
                  v-model="nuevoComentario" 
                  class="form-control" 
                  rows="3" 
                  placeholder="Deja tu comentario sobre este tutorial..."
                  required
                ></textarea>
              </div>
              <div class="text-end">
                <button 
                  type="submit" 
                  class="btn btn-primary" 
                  :disabled="procesandoComentario"
                >
                  <i class="bi bi-send me-1"></i> Enviar comentario
                </button>
              </div>
            </form>
            
            <div v-if="comentarios.length === 0" class="text-center py-3">
              <p class="text-muted">No hay comentarios aún. ¡Sé el primero en comentar!</p>
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
        
        <!-- Sección de tutoriales relacionados -->
        <div class="card shadow mt-4">
          <div class="card-header bg-light">
            <h4 class="mb-0 fs-5">Tutoriales relacionados</h4>
          </div>
          <div class="card-body">
            <div v-if="tutorialesRelacionados.length === 0" class="text-center py-3">
              <p class="text-muted">No hay tutoriales relacionados disponibles.</p>
            </div>
            
            <div v-else class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              <div v-for="tutorialRelacionado in tutorialesRelacionados" :key="tutorialRelacionado.id" class="col">
                <div class="card h-100 shadow-sm">
                  <div class="ratio ratio-16x9">
                    <img src="/video-placeholder.png" 
                      class="card-img-top" 
                      alt="Miniatura del tutorial"
                      style="object-fit: cover;">
                  </div>
                  <div class="card-body">
                    <h6 class="card-title">{{ tutorialRelacionado.titulo }}</h6>
                    <p class="card-text tutorial-description">{{ tutorialRelacionado.descripcion }}</p>
                  </div>
                  <div class="card-footer bg-white border-top-0">
                    <a :href="`/tutoriales/ver/${tutorialRelacionado.id}`" class="btn btn-sm btn-outline-primary w-100">
                      Ver tutorial
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Sección de registro/login -->
        <div v-if="!isAuthenticated" class="card shadow mt-4">
          <div class="card-body text-center py-4">
            <h5 class="card-title">¿Te ha resultado útil este tutorial?</h5>
            <p class="card-text">Regístrate para acceder a más tutoriales y recursos.</p>
            <div class="d-flex justify-content-center gap-3">
              <router-link to="/register" class="btn btn-primary">
                <i class="bi bi-person-plus me-1"></i> Registrarse
              </router-link>
              <router-link to="/login" class="btn btn-outline-primary">
                <i class="bi bi-box-arrow-in-right me-1"></i> Iniciar sesión
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import { supabase } from '../../../supabase';
  import { useRoute } from 'vue-router';
  import { useAuthStore } from '../../stores/authStore';
  import { toast } from 'vue-sonner';
  
  const route = useRoute();
  const authStore = useAuthStore();
  const tutorial = ref(null);
  const comentarios = ref([]);
  const tutorialesRelacionados = ref([]);
  const loading = ref(true);
  const error = ref(null);
  const dioMeGusta = ref(false);
  const procesandoMeGusta = ref(false);
  const procesandoComentario = ref(false);
  const nuevoComentario = ref('');
  
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  
  onMounted(async () => {
    await cargarTutorial();
    await cargarComentarios();
    
    if (isAuthenticated.value) {
      await verificarMeGusta();
    }
  });
  
  const cargarTutorial = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const { data, error: supabaseError } = await supabase
        .from('tutoriales')
        .select(`
          *,
          asistentes:asistente_id (nombre)
        `)
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
      
      // Procesar los datos para incluir el nombre del asistente
      tutorial.value = {
        ...data,
        nombre_asistente: data.asistentes?.nombre || 'Asistente'
      };
      
      // Incrementar contador de vistas
      await supabase
        .from('tutoriales')
        .update({ vistas: (data.vistas || 0) + 1 })
        .eq('id', route.params.id);
      
      // Cargar tutoriales relacionados (misma categoría)
      await cargarTutorialesRelacionados(data.categoria, data.id);
      
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
  
  const cargarTutorialesRelacionados = async (categoria, tutorialId) => {
    try {
      const { data, error: relacionadosError } = await supabase
        .from('tutoriales')
        .select('*')
        .eq('categoria', categoria)
        .neq('id', tutorialId)
        .limit(3);
      
      if (relacionadosError) {
        console.error('Error al cargar tutoriales relacionados:', relacionadosError);
        return;
      }
      
      tutorialesRelacionados.value = data || [];
      
    } catch (err) {
      console.error('Error al cargar tutoriales relacionados:', err);
    }
  };
  
  const verificarMeGusta = async () => {
    try {
      if (!authStore.user) return;
      
      const { data, error: megustasError } = await supabase
        .from('me_gustas_tutorial')
        .select('*')
        .eq('tutorial_id', route.params.id)
        .eq('user_id', authStore.user.id)
        .single();
      
      if (megustasError && megustasError.code !== 'PGRST116') {
        // PGRST116 significa que no se encontró ningún registro, lo cual es normal
        console.error('Error al verificar me gusta:', megustasError);
        return;
      }
      
      dioMeGusta.value = !!data;
      
    } catch (err) {
      console.error('Error al verificar me gusta:', err);
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
        // Quitar me gusta
        const { error: eliminarError } = await supabase
          .from('me_gustas_tutorial')
          .delete()
          .eq('tutorial_id', route.params.id)
          .eq('user_id', authStore.user.id);
        
        if (eliminarError) {
          console.error('Error al quitar me gusta:', eliminarError);
          throw eliminarError;
        }
        
        // Actualizar contador en el tutorial
        await supabase
          .from('tutoriales')
          .update({ 
            me_gusta: Math.max((tutorial.value.me_gusta || 0) - 1, 0)
          })
          .eq('id', route.params.id);
        
        tutorial.value.me_gusta = Math.max((tutorial.value.me_gusta || 0) - 1, 0);
        dioMeGusta.value = false;
        
      } else {
        // Dar me gusta
        const { error: insertarError } = await supabase
          .from('me_gustas_tutorial')
          .insert({
            tutorial_id: route.params.id,
            user_id: authStore.user.id
          });
        
        if (insertarError) {
          console.error('Error al dar me gusta:', insertarError);
          throw insertarError;
        }
        
        // Actualizar contador en el tutorial
        await supabase
          .from('tutoriales')
          .update({ 
            me_gusta: (tutorial.value.me_gusta || 0) + 1
          })
          .eq('id', route.params.id);
        
        tutorial.value.me_gusta = (tutorial.value.me_gusta || 0) + 1;
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
  
  const agregarComentario = async () => {
    try {
      if (!authStore.user) {
        toast.error('Debes iniciar sesión para comentar');
        return;
      }
      
      if (!nuevoComentario.value.trim()) {
        toast.error('El comentario no puede estar vacío');
        return;
      }
      
      procesandoComentario.value = true;
      
      const { data, error: comentarioError } = await supabase
        .from('comentarios_tutorial')
        .insert({
          tutorial_id: route.params.id,
          user_id: authStore.user.id,
          texto: nuevoComentario.value.trim()
        })
        .select()
        .single();
      
      if (comentarioError) {
        console.error('Error al agregar comentario:', comentarioError);
        throw comentarioError;
      }
      
      // Agregamos el comentario al inicio de la lista
      comentarios.value.unshift({
        ...data,
        nombre_usuario: authStore.user.nombre || 'Usuario'
      });
      
      nuevoComentario.value = '';
      toast.success('Comentario agregado correctamente');
      
    } catch (err) {
      console.error('Error al agregar comentario:', err);
      toast.error('No se pudo agregar tu comentario. Inténtalo de nuevo.');
    } finally {
      procesandoComentario.value = false;
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
  </script>
  
  <style scoped>
  .video-container {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 10px;
  }
  
  .tutorial-description {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  </style>