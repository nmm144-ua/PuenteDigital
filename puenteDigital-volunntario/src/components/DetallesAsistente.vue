<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
      <button 
        @click="closeModal" 
        class="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <h2 class="text-2xl font-bold mb-4">Detalles del Asistente</h2>

      <div v-if="asistente" class="space-y-4">
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <p class="font-semibold">Nombre: {{ asistente.nombre }}</p>
          </div>
          <div>
            <p class="font-semibold">Email: {{ asistente.email }}</p>
          </div>
          <div>
            <p class="font-semibold">Rol: {{ asistente.rol }}</p>
          </div>
          <div>
            <p class="font-semibold">Estado: {{ asistente.activo ? 'Activo' : 'Inactivo' }}</p>
          </div>
        </div>

        <div v-if="declaracion" class="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 class="text-xl font-semibold mb-3">Declaración de Responsabilidad</h3>
          <div class="prose max-w-none">
            <div class="mt-4 flex items-center">
              <p class="font-semibold mr-2">Fecha de Firma: {{ formatDate(declaracion.fecha) }}</p>
            </div>
            <div class="mt-4 flex items-center">
              <p class="font-semibold mr-2">Nombre de Firma: {{ declaracion.nombre }}</p>
            </div>
            <div class="mt-4 flex items-center">
              <p class="font-semibold mr-2">DNI de Firma: {{ declaracion.dni }}</p>
            </div>
            
            <!-- Añadir visualización de firma digital -->
            <div class="mt-4">
              <p class="font-semibold mb-2">Firma Digital:</p>
              <FirmaViewer :firma_url="declaracion.firma_url" />
            </div>
          </div>
        </div>

        <div v-else class="text-yellow-600 bg-yellow-50 p-3 rounded">
          No hay declaración de responsabilidad registrada para este asistente.
        </div>
      </div>
      <div v-else class="text-center">
        <p>Cargando detalles...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { asistenteService } from '@/services/asistenteService'
import { declaracionService } from '@/services/declaracionService'
import FirmaViewer from './Firma/FirmaViewer.vue'  

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  asistenteId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['close'])

const asistente = ref(null)
const declaracion = ref(null)

const fetchAsistenteDetails = async () => {
  if (props.asistenteId) {
    try {
      asistente.value = await asistenteService.getAsistenteById(props.asistenteId)
      
      // Intentar obtener la declaración
      try {
        const declaraciones = await declaracionService.getDeclaracionByAsistenteId(props.asistenteId)
        declaracion.value = declaraciones[0] || null
      } catch (error) {
        console.error('Error al obtener declaración:', error)
        declaracion.value = null
      }
    } catch (error) {
      console.error('Error al obtener detalles del asistente:', error)
    }
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fetchAsistenteDetails()
  }
})

const closeModal = () => {
  emit('close')
}

const formatDate = (dateString) => {
  if (!dateString) return 'No disponible'
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>