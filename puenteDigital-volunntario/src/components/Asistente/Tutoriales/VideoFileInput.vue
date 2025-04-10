<template>
    <div class="video-file-input">
      <label :for="id" class="form-label">
        {{ label }}
        <span v-if="required" class="text-danger">*</span>
      </label>
      
      <input 
        :id="id" 
        type="file" 
        class="form-control" 
        @change="handleFileChange" 
        :accept="acceptedFormats.join(',')"
        :class="{ 'is-invalid': errorMessage }"
      >
      
      <div class="invalid-feedback" v-if="errorMessage">{{ errorMessage }}</div>
      
      <div class="form-text" v-if="helpText">
        {{ helpText }}
      </div>
      
      <div v-if="fileInfo.name" class="mt-2 p-2 bg-light rounded">
        <div class="d-flex align-items-center">
          <i class="bi bi-film me-2 fs-4 text-primary"></i>
          <div class="flex-grow-1">
            <div><strong>Nombre:</strong> {{ fileInfo.name }}</div>
            <div><strong>Tamaño:</strong> {{ formatFileSize(fileInfo.size) }}</div>
            <div><strong>Tipo:</strong> {{ fileInfo.type }}</div>
          </div>
          <button 
            @click.prevent="removeFile" 
            class="btn btn-sm btn-outline-danger"
            title="Eliminar archivo"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, watch, defineProps, defineEmits } from 'vue';
  
  const props = defineProps({
    id: {
      type: String,
      required: true
    },
    label: {
      type: String,
      default: 'Archivo de video'
    },
    required: {
      type: Boolean,
      default: false
    },
    helpText: {
      type: String,
      default: 'Formatos aceptados: .mp4, .mov, .avi. Tamaño máximo: 500 MB.'
    },
    maxSizeMB: {
      type: Number,
      default: 500
    },
    acceptedFormats: {
      type: Array,
      default: () => ['.mp4', '.mov', '.avi']
    },
    value: {
      type: [File, null],
      default: null
    }
  });
  
  const emit = defineEmits(['update:value', 'file-selected', 'file-removed', 'error']);
  
  const errorMessage = ref('');
  const fileInfo = reactive({
    name: '',
    size: 0,
    type: ''
  });
  
  // Mapeo de extensiones a MIME types
  const validMimeTypes = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo'
  };
  
  // Inicializar fileInfo si hay un archivo precargado
  watch(() => props.value, (newFile) => {
    if (newFile) {
      fileInfo.name = newFile.name;
      fileInfo.size = newFile.size;
      fileInfo.type = newFile.type;
    } else {
      fileInfo.name = '';
      fileInfo.size = 0;
      fileInfo.type = '';
    }
  }, { immediate: true });
  
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      clearFileInfo();
      emit('update:value', null);
      return;
    }
    
    // Validar formato
    const isValidFormat = validateFileFormat(file);
    if (!isValidFormat) {
      clearFileInfo();
      errorMessage.value = `Formato no válido. Los formatos permitidos son: ${props.acceptedFormats.join(', ')}`;
      emit('error', errorMessage.value);
      emit('update:value', null);
      return;
    }
    
    // Validar tamaño
    const isValidSize = validateFileSize(file);
    if (!isValidSize) {
      clearFileInfo();
      errorMessage.value = `El archivo excede el tamaño máximo permitido (${props.maxSizeMB} MB). Tu archivo pesa ${formatFileSize(file.size)}.`;
      emit('error', errorMessage.value);
      emit('update:value', null);
      return;
    }
    
    // Archivo válido
    errorMessage.value = '';
    updateFileInfo(file);
    emit('update:value', file);
    emit('file-selected', file);
  };
  
  const validateFileFormat = (file) => {
    // Verificar por MIME type
    const validTypes = Object.values(validMimeTypes);
    if (validTypes.includes(file.type)) {
      return true;
    }
    
    // Verificar por extensión como respaldo
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    return props.acceptedFormats.includes(fileExt);
  };
  
  const validateFileSize = (file) => {
    const maxSizeBytes = props.maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  };
  
  const updateFileInfo = (file) => {
    fileInfo.name = file.name;
    fileInfo.size = file.size;
    fileInfo.type = file.type;
  };
  
  const clearFileInfo = () => {
    fileInfo.name = '';
    fileInfo.size = 0;
    fileInfo.type = '';
  };
  
  const removeFile = () => {
    clearFileInfo();
    errorMessage.value = '';
    emit('update:value', null);
    emit('file-removed');
    
    // Limpiar el input
    const fileInput = document.getElementById(props.id);
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  </script>
  
  <style scoped>
  .video-file-input {
    margin-bottom: 1rem;
  }
  
  .btn-outline-danger:hover {
    background-color: #f8d7da;
    color: #dc3545;
  }
  </style>