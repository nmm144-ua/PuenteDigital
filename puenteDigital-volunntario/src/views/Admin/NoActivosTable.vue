<template>
    <div class="container mt-4">
      <h2 class="mb-4">Asistentes Pendientes de Activación</h2>
      
      <div v-if="loading" class="text-center">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      </div>
      
      <div v-else-if="asistentes.length === 0" class="alert alert-info">
        No hay asistentes pendientes de activación.
      </div>
      
      <div v-else class="table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-light">
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Habilidades</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asistente in asistentes" :key="asistente.id">
              <td>{{ asistente.nombre }}</td>
              <td>{{ asistente.email }}</td>
              <td>{{ asistente.telefono }}</td>
              <td>{{ asistente.habilidades }}</td>
              <td>
                <div class="btn-group" role="group">
                  <button 
                    @click="aceptarAsistente(asistente)" 
                    class="btn btn-success btn-sm"
                    :disabled="loading"
                  >
                    Aceptar
                  </button>
                  <button 
                    @click="eliminarAsistente(asistente)" 
                    class="btn btn-danger btn-sm"
                    :disabled="loading"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  
      <!-- Modal de confirmación -->
      <div 
        class="modal fade" 
        id="confirmacionModal" 
        tabindex="-1" 
        aria-labelledby="confirmacionModalLabel"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="confirmacionModalLabel">
                {{ modalTitulo }}
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              {{ modalMensaje }}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button 
                type="button" 
                class="btn btn-primary" 
                @click="confirmarAccion"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { asistenteService } from '@/services/asistenteService';
  import { Modal } from 'bootstrap';
  
  const asistentes = ref([]);
  const loading = ref(false);
  const confirmacionModal = ref(null);
  const modalTitulo = ref('');
  const modalMensaje = ref('');
  const accionPendiente = ref(null);
  
  const cargarAsistentesPendientes = async () => {
    try {
      loading.value = true;
      asistentes.value = await asistenteService.getAllAsistentesDesactivados();
    } catch (error) {
      console.error('Error al cargar asistentes:', error);
      alert('No se pudieron cargar los asistentes pendientes');
    } finally {
      loading.value = false;
    }
  };
  
  const mostrarConfirmacion = (titulo, mensaje, accion) => {
    modalTitulo.value = titulo;
    modalMensaje.value = mensaje;
    accionPendiente.value = accion;
    
    // Usando Bootstrap Modal
    const modalElement = document.getElementById('confirmacionModal');
    const modal = new Modal(modalElement);
    modal.show();
  };
  
  const confirmarAccion = async () => {
    if (accionPendiente.value) {
      await accionPendiente.value();
      
      // Cerrar modal
      const modalElement = document.getElementById('confirmacionModal');
      const modal = Modal.getInstance(modalElement);
      modal.hide();
      
      // Recargar lista
      await cargarAsistentesPendientes();
    }
  };
  
  const aceptarAsistente = (asistente) => {
    mostrarConfirmacion(
      'Confirmar Activación', 
      `¿Estás seguro de activar la cuenta de ${asistente.nombre}?`,
      async () => {
        try {
          loading.value = true;
          await asistenteService.activarCuentaAsistente(asistente.id);
          alert(`Cuenta de ${asistente.nombre} activada correctamente`);
        } catch (error) {
          console.error('Error al activar asistente:', error);
          alert('No se pudo activar la cuenta');
        } finally {
          loading.value = false;
        }
      }
    );
  };
  
  const eliminarAsistente = (asistente) => {
    mostrarConfirmacion(
      'Confirmar Eliminación', 
      `¿Estás seguro de eliminar la cuenta de ${asistente.nombre}?`,
      async () => {
        try {
          loading.value = true;
          await asistenteService.deleteAsistente(asistente.id);
          await 
          alert(`Cuenta de ${asistente.nombre} eliminada correctamente`);
        } catch (error) {
          console.error('Error al eliminar asistente:', error);
          alert('No se pudo eliminar la cuenta');
        } finally {
          loading.value = false;
        }
      }
    );
  };
  
  onMounted(cargarAsistentesPendientes);
  </script>
  
  <style scoped>
  .btn-group .btn {
    margin-right: 5px;
  }
  </style>