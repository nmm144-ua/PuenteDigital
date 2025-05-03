<template>
    <div class="pdf-file-input">
      <label :for="id" class="form-label">
        {{ label }}
        <span v-if="required" class="text-danger">*</span>
      </label>
      
      <input 
        :id="id" 
        type="file" 
        class="form-control" 
        @change="handleFileChange" 
        accept=".pdf"
        :class="{ 'is-invalid': errorMessage }"
      >
      
      <div class="invalid-feedback" v-if="errorMessage">{{ errorMessage }}</div>
      
      <div class="form-text" v-if="helpText">
        {{ helpText }}
      </div>
      
      <div v-if="fileInfo.name" class="mt-2 p-2 bg-light rounded">
        <div class="d-flex align-items-center">
          <i class="bi bi-file-pdf me-2 fs-4 text-danger"></i>
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
      default: 'Archivo PDF'
    },
    required: {
      type: Boolean,
      default: false
    },
    helpText: {
      type: String,
      default: 'Formato aceptado: PDF. Tamaño máximo: 20 MB.'
    },
    maxSizeMB: {
      type: Number,
      default: 20
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
    if (file.type !== 'application/pdf') {
      clearFileInfo();
      errorMessage.value = 'Solo se permiten archivos PDF';
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
  .pdf-file-input {
    margin-bottom: 1rem;
  }
  
  .btn-outline-danger:hover {
    background-color: #f8d7da;
    color: #dc3545;
  }
  </style>