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
            <td>{{ asistente.nombre }}</td>
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
      class="modal fade no-backdrop"
      id="declaracionModal"
      tabindex="-1"
      aria-labelledby="declaracionModalLabel"
      data-bs-backdrop="false"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="declaracionModalLabel">
              Declaración de Responsabilidad de {{ selectedAsistente.nombre }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div v-if="loadingDeclaracion" class="text-center">
              <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Cargando declaración...</span>
              </div>
            </div>
            <div v-else-if="declaraciones.length === 0" class="alert alert-info">
              No hay declaraciones registradas para este asistente.
            </div>
            <div v-else>
              <div v-for="(declaracion, index) in declaraciones" :key="declaracion.id" class="mb-3">
                <h6 v-if="declaraciones.length > 1">Declaración {{ index + 1 }}</h6>
                <p><strong>Fecha:</strong> {{ formatDate(declaracion.fecha) }}</p>
                <p><strong>Declaración:</strong> {{ declaracion.nombre }} {{ declaracion.dni }}</p>
              </div>
            </div>
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
import { jornadasService } from '@/services/jornadasService'
import { declaracionService } from '@/services/declaracionService'

const asistentes = ref([])
const loading = ref(false)
const loadingDeclaracion = ref(false)
const selectedAsistente = ref({})
const declaraciones = ref([])
let declaracionModal = null

onMounted(async () => {
  try {
    loading.value = true
    asistentes.value = await asistenteService.getAsistentesByRol('asistente')
    // Inicializar el modal sin backdrop
    declaracionModal = new Modal(document.getElementById('declaracionModal'), {
      backdrop: false
    })
  } catch (error) {
    console.error('Error al cargar asistentes:', error)
  } finally {
    loading.value = false
  }
})

const openDeclaracionModal = async (asistente) => {
  selectedAsistente.value = asistente
  declaraciones.value = []
  
  try {
    loadingDeclaracion.value = true
    // Cargar las declaraciones del asistente seleccionado
    declaraciones.value = await declaracionService.getDeclaracionByAsistenteId(asistente.id)
    
    // Asegurarse de que el modal esté inicializado
    if (!declaracionModal) {
      declaracionModal = new Modal(document.getElementById('declaracionModal'), {
        backdrop: false
      })
    }
    
    declaracionModal.show()
  } catch (error) {
    console.error('Error al cargar declaraciones:', error)
  } finally {
    loadingDeclaracion.value = false
  }
}

// Función para formatear la fecha
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
</script>

<style scoped>
.badge {
  padding: 0.5em 1em;
  border-radius: 0.25em;
}

/* Eliminar el fondo oscuro del modal */
:global(.modal-backdrop) {
  display: none;
}

:global(.modal.no-backdrop) {
  background-color: transparent;
}

:global(body) {
  overflow: auto !important;
  padding-right: 0 !important;
}
</style>