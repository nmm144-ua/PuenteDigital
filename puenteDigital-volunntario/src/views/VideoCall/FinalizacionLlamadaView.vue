<!-- src/views/FinalizacionLlamadaView.vue -->
<template>
    <div class="finalizacion-container">
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <!-- Cabecera -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="bg-white bg-opacity-20 p-3 rounded-full">
                <i class="fas fa-headset text-2xl"></i>
              </div>
              <div>
                <h1 class="text-2xl font-bold">Asistencia finalizada</h1>
                <p class="opacity-80">La videollamada ha terminado correctamente</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Contenido principal -->
        <div class="p-6">
          <div class="mb-8">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">
              <i class="fas fa-clipboard-check text-blue-600 mr-2"></i>
              Informe de asistencia
            </h2>
            
            <div class="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <p class="text-sm text-gray-600 mb-4">
                Por favor, proporciona un breve informe sobre la asistencia realizada.
                Este informe será almacenado y ayudará a mejorar nuestros servicios.
              </p>
              
              <div class="relative">
                <textarea
                  v-model="informe"
                  class="w-full min-h-[180px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Describe brevemente el motivo de la asistencia, las acciones realizadas y las recomendaciones dadas al usuario..."
                ></textarea>
                
                <div class="absolute bottom-3 right-3 text-xs px-2 py-1 bg-gray-100 rounded text-gray-500">
                  {{ informe.length }} / 1000
                </div>
              </div>
              
              <div class="mt-3" v-if="informe.length < 10">
                <p class="text-amber-600 text-sm flex items-center">
                  <i class="fas fa-exclamation-circle mr-1"></i>
                  El informe debe tener al menos 10 caracteres
                </p>
              </div>
            </div>
          </div>
          
          <!-- Información adicional (opcional) -->
          <div class="grid grid-cols-2 gap-6 mb-8">
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 class="font-medium text-gray-700 mb-2">
                <i class="fas fa-user text-blue-600 mr-2"></i>
                Usuario asistido
              </h3>
              <p class="text-gray-800">{{ nombreUsuario || 'Usuario sin nombre' }}</p>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 class="font-medium text-gray-700 mb-2">
                <i class="fas fa-calendar-alt text-blue-600 mr-2"></i>
                Fecha y hora
              </h3>
              <p class="text-gray-800">{{ fechaActual }}</p>
            </div>
          </div>
        </div>
        
        <!-- Acciones -->
        <div class="bg-gray-50 p-6 border-t border-gray-200 flex justify-between">
          <button 
            @click="omitirInforme" 
            class="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <i class="fas fa-times"></i>
            Omitir informe
          </button>
          
            <button 
            @click="guardarInforme" 
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all transform hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="informe.length < 10 || guardando"
            style="background-color: #2563EB; color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"
            >
            <i class="fas fa-save" v-if="!guardando"></i>
            <i class="fas fa-spinner fa-spin" v-else></i>
            {{ guardando ? 'Guardando...' : 'Guardar y finalizar' }}
            </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useCallStore } from '@/stores/call.store'
  import { solicitudesAsistenciaService } from '@/services/solicitudAsistenciaService'
  
  const router = useRouter()
  const route = useRoute()
  const callStore = useCallStore()
  
  // Recibir el ID como prop o tomarlo de la ruta
  const props = defineProps({
    id: {
      type: [String, Number],
      default: null
    }
  })
  
  const informe = ref('')
  const guardando = ref(false)
  const cargando = ref(false)
  const solicitudCargada = ref(null)
  
  // Intentar obtener el ID de la solicitud de varias fuentes
  const solicitudId = computed(() => {
    // 1. Primero intentar desde props o parámetros de ruta
    if (props.id) return parseInt(props.id);
    if (route.params.id) return parseInt(route.params.id);
    
    // 2. Luego intentar desde el store
    if (callStore.currentRequest?.id) {
      return callStore.currentRequest.id;
    }
    
    // 3. Fallar con null si no hay ID
    return null;
  })
  
  // Cargar la solicitud
  const cargarSolicitud = async () => {
    if (!solicitudId.value) {
      console.warn('No hay ID de solicitud disponible para cargar');
      return null;
    }
    
    cargando.value = true;
    try {
      // Cargar la solicitud usando tu servicio
      const solicitud = await solicitudesAsistenciaService.getSolicitudById(solicitudId.value);
      console.log('Solicitud cargada:', solicitud);
      solicitudCargada.value = solicitud;
      
      // Si no está en el store, actualizarlo
      if (!callStore.currentRequest) {
        callStore.setCurrentRequest(solicitud);
      }
      
      return solicitud;
    } catch (error) {
      console.error('Error al cargar la solicitud:', error);
      return null;
    } finally {
      cargando.value = false;
    }
  }
  
  const nombreUsuario = computed(() => {
    // Intentar obtener de distintas fuentes
    return solicitudCargada.value?.usuario?.nombre || 
           callStore.currentRequest?.usuario?.nombre ||
           callStore.currentRequest?.userName || 
           'Usuario';
  })
  
  
  // Fecha actual formateada
  const fechaActual = computed(() => {
    const now = new Date()
    return now.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  })
  
  // Función para guardar el informe
  const guardarInforme = async () => {
    if (!solicitudId.value) {
      alert('No se puede guardar el informe porque no se ha identificado la solicitud');
      return;
    }
    
    if (informe.value.length < 10) {
      alert('El informe debe tener al menos 10 caracteres');
      return;
    }
    
    guardando.value = true
    try {
      console.log('Guardando informe para solicitud ID:', solicitudId.value);
      const success = await solicitudesAsistenciaService.guardarInforme(solicitudId.value, informe.value)
      if (success) {
        router.push('/asistente/gestion-llamadas')
    } else {
        alert('Error al guardar el informe')
      }
    } catch (error) {
      console.error('Error al guardar el informe:', error)
      alert('Error al guardar el informe: ' + error.message)
    } finally {
      guardando.value = false
    }
  }
  
  // Función para omitir el informe
  const omitirInforme = () => {
    router.push('/asistente/gestion-llamadas')
  }
  
  // Comprobar si tenemos la información necesaria
  onMounted(async () => {
    console.log('Montando componente con solicitudId:', solicitudId.value);
    
    // Si hay ID, intentar cargar la solicitud
    if (solicitudId.value) {
      await cargarSolicitud();
    } else {
      // No hay ID, pero no redireccionar automáticamente
      setTimeout(() => {
        alert('Advertencia: No se pudo identificar la solicitud actual. Podrías tener problemas al guardar el informe.');
      }, 500);
    }
  })
  </script>
  
  <style scoped>
  .finalizacion-container {
    min-height: 100vh;
    background-color: #f5f5f5;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  @media (max-width: 768px) {
    .finalizacion-container {
      padding: 1rem;
    }
  }
  </style>