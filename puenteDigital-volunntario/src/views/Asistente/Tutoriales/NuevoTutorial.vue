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

              <!-- Archivo de video -->
              <div class="mb-4">
                <label for="video" class="form-label">Archivo de video <span class="text-danger">*</span></label>
                <input 
                  type="file" 
                  class="form-control" 
                  id="video" 
                  @change="handleFileChange" 
                  accept=".mp4,.mov,.avi"
                  :class="{ 'is-invalid': errors.video }"
                >
                <div class="invalid-feedback" v-if="errors.video">{{ errors.video }}</div>
                <div class="form-text">
                  Formatos aceptados: .mp4, .mov, .avi. Tamaño máximo: 500 MB.
                </div>
                <div v-if="fileInfo.name" class="mt-2 p-2 bg-light rounded">
                  <div><strong>Nombre:</strong> {{ fileInfo.name }}</div>
                  <div><strong>Tamaño:</strong> {{ formatFileSize(fileInfo.size) }}</div>
                  <div><strong>Tipo:</strong> {{ fileInfo.type }}</div>
                </div>
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

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  titulo: '',
  descripcion: '',
  categoria: '',
  video: null
});

const errors = reactive({
  titulo: '',
  descripcion: '',
  categoria: '',
  video: ''
});

const fileInfo = reactive({
  name: '',
  size: 0,
  type: ''
});

const uploading = ref(false);
const uploadProgress = ref(0);

// Validar archivo seleccionado
const handleFileChange = (event) => {
  const file = event.target.files[0];
  
  if (!file) {
    fileInfo.name = '';
    fileInfo.size = 0;
    fileInfo.type = '';
    form.video = null;
    return;
  }
  
  // Validar formato
  const allowedFormats = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo' // .avi
  ];
  
  if (!allowedFormats.includes(file.type)) {
    errors.video = 'Formato no válido. Por favor, sube un archivo .mp4, .mov o .avi.';
    form.video = null;
    return;
  }
  
  // Validar tamaño (500 MB = 524,288,000 bytes)
  const MAX_SIZE = 524288000;
  if (file.size > MAX_SIZE) {
    errors.video = `El archivo excede el tamaño máximo permitido (500 MB). Tu archivo pesa ${formatFileSize(file.size)}.`;
    form.video = null;
    return;
  }
  
  // Archivo válido
  errors.video = '';
  form.video = file;
  fileInfo.name = file.name;
  fileInfo.size = file.size;
  fileInfo.type = file.type;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

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
  
  // Validar video
  if (!form.video) {
    errors.video = 'Debes seleccionar un archivo de video';
    isValid = false;
  } else {
    errors.video = '';
  }
  
  return isValid;
};

const generateUniqueFileName = (originalName) => {
  const extension = originalName.split('.').pop().toLowerCase();
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const userId = authStore.user.id;
  
  return `${userId}_${timestamp}_${random}.${extension}`;
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
    
    const asistenteId = asistenteData.id;
    
    // Generar nombre único para el archivo
    const uniqueFileName = generateUniqueFileName(form.video.name);
    const filePath = `videos/${uniqueFileName}`;
    
    console.log('Intentando subir archivo a:', filePath);
    
    // Subir el archivo a Supabase Storage - con manejo de errores detallado
    let fileResponse;
    try {
      fileResponse = await supabase.storage
        .from('tutoriales')
        .upload(filePath, form.video, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            uploadProgress.value = Math.round((progress.loaded / progress.total) * 100);
          }
        });
        
      if (fileResponse.error) {
        console.error('Error al subir archivo:', fileResponse.error);
        throw fileResponse.error;
      }
    } catch (uploadError) {
      console.error('Excepción en la subida de archivo:', uploadError);
      throw new Error(`Error al subir el archivo: ${uploadError.message || 'Comprueba que el bucket de almacenamiento existe'}`);
    }
    
    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('tutoriales')
      .getPublicUrl(filePath);
      
    if (!urlData || !urlData.publicUrl) {
      throw new Error('No se pudo obtener la URL pública del archivo');
    }
    
    const publicUrl = urlData.publicUrl;
    console.log('URL pública:', publicUrl);
    
    // Preparar los datos para insertar - SIN user_id ya que no lo necesitas
    const tutorialData = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      categoria: form.categoria,
      asistente_id: asistenteId,
      video_path: filePath,
      video_url: publicUrl,
      tamanio: form.video.size,
      formato: form.video.type
    };
    
    console.log('Datos a insertar:', tutorialData);
    
    // Guardar la información en la base de datos
    const { data: insertData, error: insertError } = await supabase
      .from('tutoriales')
      .insert([tutorialData])
      .select();
    
    if (insertError) {
      console.error('Error al insertar en BD:', insertError);
      // Si falla la inserción, eliminar el archivo subido para no dejar huérfanos
      await supabase.storage
        .from('tutoriales')
        .remove([filePath]);
        
      throw insertError;
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