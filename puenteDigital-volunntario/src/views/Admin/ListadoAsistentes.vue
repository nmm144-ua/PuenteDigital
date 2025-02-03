<template>
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Listado de Asistentes</h1>
  
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="asistente in asistentes" 
          :key="asistente.id" 
          class="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-lg font-semibold">
              {{ asistente.nombre }} {{ asistente.apellido }}
            </h2>
            <span 
              :class="{
                'bg-green-100 text-green-800': asistente.activo,
                'bg-red-100 text-red-800': !asistente.activo
              }" 
              class="px-2 py-1 rounded-full text-sm"
            >
              {{ asistente.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <p class="text-gray-600">{{ asistente.email }}</p>
          <p class="text-sm text-gray-500">Rol: {{ asistente.rol }}</p>
          
          <div class="mt-4 flex space-x-2">
            <button 
              @click="openAsistenteDetails(asistente.id)"
              class=" px-3 py-1 rounded hover:bg-blue-600 transition"
            >
              Ver Detalles
            </button>
          </div>
        </div>
      </div>
  
      <DetallesAsistente 
        :is-open="showDetailsModal" 
        :asistente-id="selectedAsistenteId"
        @close="closeDetailsModal"
      />
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { asistenteService } from '@/services/asistenteService'
  import DetallesAsistente from '@/components/DetallesAsistente.vue'
  
  const asistentes = ref([])
  const showDetailsModal = ref(false)
  const selectedAsistenteId = ref(null)
  
  onMounted(async () => {
    try {
      asistentes.value = await asistenteService.getAsistentesByRol('asistente')
    } catch (error) {
      console.error('Error al cargar asistentes:', error)
    }
  })
  
  const openAsistenteDetails = (asistenteId) => {
    selectedAsistenteId.value = asistenteId
    showDetailsModal.value = true
  }
  
  const closeDetailsModal = () => {
    showDetailsModal.value = false
    selectedAsistenteId.value = null
  }
  </script>