<template>
  <div class="container mt-4">
    <h2 class="mb-4">Listado de Asistentes</h2>
    
    <div v-if="loading" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
    
    <div v-else-if="asistentes.length === 0" class="alert alert-info">
      No hay asistentes registrados.
    </div>
    
    <div v-else class="table-responsive">
      <table class="table table-striped table-hover">
        <thead class="table-light">
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="asistente in asistentes" :key="asistente.id">
            <td>{{ asistente.nombre }} {{ asistente.apellido }}</td>
            <td>{{ asistente.email }}</td>
            <td>{{ asistente.rol }}</td>
            <td>
              <span 
                :class="{
                  'badge bg-success': asistente.activo,
                  'badge bg-danger': !asistente.activo
                }"
              >
                {{ asistente.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>
              <button 
                @click="openDeclaracionModal(asistente)" 
                class="btn btn-primary btn-sm"
              >
                Ver Declaración
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal de Declaración de Responsabilidad -->
    <div 
      class="modal fade" 
      id="declaracionModal" 
      tabindex="-1" 
      aria-labelledby="declaracionModalLabel"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="declaracionModalLabel">
              Declaración de Responsabilidad de {{ selectedAsistente.nombre }} {{ selectedAsistente.apellido }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>{{ selectedAsistente.declaracion }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { asistenteService } from '@/services/asistenteService'
import { Modal } from 'bootstrap'

const asistentes = ref([])
const loading = ref(false)
const selectedAsistente = ref({})
let declaracionModal = null

onMounted(async () => {
  try {
    loading.value = true
    asistentes.value = await asistenteService.getAsistentesByRol('asistente')
    declaracionModal = new Modal(document.getElementById('declaracionModal'))
  } catch (error) {
    console.error('Error al cargar asistentes:', error)
  } finally {
    loading.value = false
  }
})

const openDeclaracionModal = (asistente) => {
  selectedAsistente.value = asistente
  declaracionModal.show()
}
</script>

<style scoped>
.badge {
  padding: 0.5em 1em;
  border-radius: 0.25em;
}
</style>