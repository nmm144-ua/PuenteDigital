<template>
  <div class="container py-4">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <div class="card shadow">
          <div class="card-header bg-primary text-white">
            <h2 class="mb-0 fs-4">Subir nuevo tutorial</h2>
          </div>
          <div class="card-body">
            <form @submit.prevent="handleSubmit" enctype="multipart/form-data">
              <!-- Título del tutorial -->
              <div class="mb-3">
                <label for="titulo" class="form-label">Título <span class="text-danger">*</span></label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="titulo" 
                  v-model="form.titulo" 
                  required
                  :class="{ 'is-invalid': errors.titulo }"
                >
                <div class="invalid-feedback" v-if="errors.titulo">{{ errors.titulo }}</div>
              </div>

              <!-- Descripción del tutorial -->
              <div class="mb-3">
                <label for="descripcion" class="form-label">Descripción <span class="text-danger">*</span></label>
                <textarea 
                  class="form-control" 
                  id="descripcion" 
                  v-model="form.descripcion" 
                  rows="4" 
                  required
                  :class="{ 'is-invalid': errors.descripcion }"
                ></textarea>
                <div class="invalid-feedback" v-if="errors.descripcion">{{ errors.descripcion }}</div>
                <div class="form-text">Describe brevemente de qué trata este tutorial.</div>
              </div>

              <!-- Categoría -->
              <div class="mb-3">
                <label for="categoria" class="form-label">Categoría <span class="text-danger">*</span></label>
                <select 
                  class="form-select" 
                  id="categoria" 
                  v-model="form.categoria" 
                  required
                  :class="{ 'is-invalid': errors.categoria }"
                >
                  <option value="" disabled selected>Selecciona una categoría</option>
                  <option value="tecnologia">Tecnología</option>
                  <option value="educacion">Educación</option>
                  <option value="salud">Salud</option>
                  <option value="tramites">Trámites</option>
                  <option value="comunicacion">Comunicación</option>
                  <option value="otro">Otro</option>
                </select>
                <div class="invalid-feedback" v-if="errors.categoria">{{ errors.categoria }}</div>
              </div>

              <!-- Tipo de recurso -->
              <div class="mb-3">
                <label class="form-label">Tipo de recurso <span class="text-danger">*</span></label>
                <div class="border rounded p-3">
                  <div class="form-check">
                    <input 
                      class="form-check-input" 
                      type="radio" 
                      id="tipo-video" 
                      v-model="form.tipoRecurso" 
                      value="video"
                      :class="{ 'is-invalid': errors.tipoRecurso }"
                    >
                    <label class="form-check-label" for="tipo-video">
                      <i class="bi bi-camera-video me-1"></i> Solo video
                    </label>
                  </div>
                  <div class="form-check">
                    <input 
                      class="form-check-input" 
                      type="radio" 
                      id="tipo-pdf" 
                      v-model="form.tipoRecurso" 
                      value="pdf"
                    >
                    <label class="form-check-label" for="tipo-pdf">
                      <i class="bi bi-file-pdf me-1"></i> Solo guía PDF
                    </label>
                  </div>
                  <div class="form-check">
                    <input 
                      class="form-check-input" 
                      type="radio" 
                      id="tipo-ambos" 
                      v-model="form.tipoRecurso" 
                      value="ambos"
                    >
                    <label class="form-check-label" for="tipo-ambos">
                      <i class="bi bi-collection me-1"></i> Video y guía PDF
                    </label>
                  </div>
                  <div class="invalid-feedback" v-if="errors.tipoRecurso">{{ errors.tipoRecurso }}</div>
                </div>
              </div>

              <!-- Archivo de video -->
              <div class="mb-4" v-if="form.tipoRecurso === 'video' || form.tipoRecurso === 'ambos'">
                <VideoFileInput
                  id="video"
                  label="Archivo de video"
                  :required="true"
                  helpText="Formatos aceptados: .mp4, .mov, .avi. Tamaño máximo: 500 MB."
                  :maxSizeMB="500"
                  :value="form.video"
                  @update:value="(file) => form.video = file"
                  @error="(msg) => errors.video = msg"
                />
                <div class="invalid-feedback" v-if="errors.video">{{ errors.video }}</div>
              </div>

              <!-- Archivo PDF -->
              <div class="mb-4" v-if="form.tipoRecurso === 'pdf' || form.tipoRecurso === 'ambos'">
                <PdfFileInput
                  id="pdf"
                  label="Archivo de guía PDF"
                  :required="true"
                  helpText="Formato aceptado: PDF. Tamaño máximo: 20 MB."
                  :maxSizeMB="20"
                  :value="form.pdf"
                  @update:value="(file) => form.pdf = file"
                  @error="(msg) => errors.pdf = msg"
                />
                <div class="invalid-feedback" v-if="errors.pdf">{{ errors.pdf }}</div>
              </div>

              <!-- Botones de acción -->
              <div class="d-flex justify-content-between">
                <router-link to="/asistente/tutoriales" class="btn btn-outline-secondary">
                  <i class="bi bi-arrow-left me-1"></i> Cancelar
                </router-link>
                <button 
                  type="submit" 
                  class="btn btn-primary" 
                  :disabled="uploading"
                >
                  <span v-if="uploading">
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Subiendo... {{ uploadProgress }}%
                  </span>
                  <span v-else>
                    <i class="bi bi-cloud-upload me-1"></i> Subir tutorial
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { supabase } from '../../../../supabase';
import { useAuthStore } from '../../../stores/authStore';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import tutorialService from '../../../services/tutorialService';
import VideoFileInput from '../../../components/Asistente/Tutoriales/VideoFileInput.vue';
import PdfFileInput from '../../../components/Asistente/Tutoriales/PdfFileInput.vue';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  titulo: '',
  descripcion: '',
  categoria: '',
  tipoRecurso: 'video',
  video: null,
  pdf: null
});

const errors = reactive({
  titulo: '',
  descripcion: '',
  categoria: '',
  tipoRecurso: '',
  video: '',
  pdf: ''
});

const uploading = ref(false);
const uploadProgress = ref(0);

const validateForm = () => {
  let isValid = true;
  
  // Validar título
  if (!form.titulo.trim()) {
    errors.titulo = 'El título es obligatorio';
    isValid = false;
  } else if (form.titulo.length > 100) {
    errors.titulo = 'El título no debe exceder los 100 caracteres';
    isValid = false;
  } else {
    errors.titulo = '';
  }
  
  // Validar descripción
  if (!form.descripcion.trim()) {
    errors.descripcion = 'La descripción es obligatoria';
    isValid = false;
  } else {
    errors.descripcion = '';
  }
  
  // Validar categoría
  if (!form.categoria) {
    errors.categoria = 'Debes seleccionar una categoría';
    isValid = false;
  } else {
    errors.categoria = '';
  }
  
  // Validar tipo de recurso
  if (!form.tipoRecurso) {
    errors.tipoRecurso = 'Debes seleccionar un tipo de recurso';
    isValid = false;
  } else {
    errors.tipoRecurso = '';
  }
  
  // Validar video según el tipo de recurso
  if ((form.tipoRecurso === 'video' || form.tipoRecurso === 'ambos') && !form.video) {
    errors.video = 'Debes seleccionar un archivo de video';
    isValid = false;
  } else {
    errors.video = '';
  }
  
  // Validar PDF según el tipo de recurso
  if ((form.tipoRecurso === 'pdf' || form.tipoRecurso === 'ambos') && !form.pdf) {
    errors.pdf = 'Debes seleccionar un archivo PDF';
    isValid = false;
  } else {
    errors.pdf = '';
  }
  
  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    toast.error('Por favor, corrige los errores en el formulario');
    return;
  }
  
  try {
    uploading.value = true;
    uploadProgress.value = 0;
    
    // Verificar que el usuario está autenticado
    if (!authStore.user || !authStore.user.id) {
      throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
    }
    
    console.log('Usuario autenticado:', authStore.user.id);
    
    // Primero, obtener el ID del asistente a partir del user_id
    const { data: asistenteData, error: asistenteError } = await supabase
      .from('asistentes')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single();
    
    if (asistenteError) {
      console.error('Error al obtener asistente:', asistenteError);
      throw new Error('No se pudo obtener la información del asistente. Verifica que tu cuenta tiene permisos de asistente.');
    }
    
    if (!asistenteData || !asistenteData.id) {
      throw new Error('No se encontró un registro de asistente asociado a tu cuenta.');
    }
    
    console.log('ID del asistente encontrado:', asistenteData.id);
    
    // Preparar los datos para el tutorial
    const tutorialData = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      categoria: form.categoria,
      asistente_id: asistenteData.id,
      user_id: authStore.user.id, // Necesario para el servicio
    };
    
    // Usar el servicio para subir el tutorial con los archivos seleccionados
    const { data, error } = await tutorialService.subirTutorial(
      tutorialData, 
      form.video,  // Puede ser null si es solo PDF
      form.pdf,    // Puede ser null si es solo video
      (progress) => {
        uploadProgress.value = progress;
      }
    );
    
    if (error) {
      console.error('Error al subir tutorial:', error);
      throw error;
    }
    
    toast.success('Tutorial subido correctamente');
    router.push('/asistente/tutoriales');
    
  } catch (error) {
    console.error('Error al subir tutorial:', error);
    
    let errorMessage = 'Ha ocurrido un error al subir el tutorial.';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.error) {
      errorMessage = error.error;
    }
    
    toast.error(errorMessage);
  } finally {
    uploading.value = false;
  }
};
</script>