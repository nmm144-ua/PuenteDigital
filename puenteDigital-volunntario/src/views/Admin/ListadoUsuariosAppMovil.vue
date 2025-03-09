<template>
    <div class="container mt-4">
      <h2 class="mb-4">Gestión de Usuarios App</h2>
  
      <div class="d-flex justify-content-between mb-3">
        <div class="btn-group" role="group">
          <button 
            @click="mostrarTodos" 
            class="btn" 
            :class="filtroActual === 'todos' ? 'btn-primary' : 'btn-outline-primary'"
          >
            Todos los usuarios
          </button>
          <button 
            @click="mostrarRegistrados" 
            class="btn" 
            :class="filtroActual === 'registrados' ? 'btn-primary' : 'btn-outline-primary'"
          >
            Usuarios registrados
          </button>
          <button 
            @click="mostrarAnonimos" 
            class="btn" 
            :class="filtroActual === 'anonimos' ? 'btn-primary' : 'btn-outline-primary'"
          >
            Usuarios anónimos
          </button>
        </div>
        
        <div class="input-group w-auto">
          <input 
            v-model="busqueda" 
            type="text" 
            class="form-control" 
            placeholder="Buscar usuario..."
            @input="aplicarFiltro"
          >
          <button class="btn btn-outline-secondary" type="button">
            <i class="bi bi-search"></i>
          </button>
        </div>
      </div>
      
      <div v-if="loading" class="text-center my-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      </div>
      
      <div v-else-if="usuariosFiltrados.length === 0" class="alert alert-info">
        No hay usuarios que coincidan con el criterio seleccionado.
      </div>
      
      <div v-else class="table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Tipo</th>
              <th>Fecha Registro</th>
              <th>Último Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="usuario in usuariosFiltrados" :key="usuario.id" :class="{'table-warning': usuario.tipo_usuario === 'anonimo'}">
              <td>{{ usuario.id }}</td>
              <td>{{ usuario.nombre || '-' }}</td>
              <td>{{ usuario.email || '-' }}</td>
              <td>
                <span>{{ usuario.tipo_usuario || 'anonimo' }}</span>
              </td>
              <td>{{ formatearFecha(usuario.fecha_registro) }}</td>
              <td>{{ formatearFecha(usuario.ultimo_acceso) }}</td>
              <td>
                <div class="btn-group" role="group">
                  <button 
                    @click="verDetalles(usuario)" 
                    class="btn btn-info btn-sm"
                    title="Ver detalles"
                  >
                    <i class="bi bi-eye-fill"></i>
                  </button>
                  <button 
                    v-if="usuario.tipo_usuario === 'anonimo'"
                    @click="confirmarEliminar(usuario)" 
                    class="btn btn-danger btn-sm"
                    title="Eliminar usuario"
                    :disabled="loading"
                  >
                    <i class="bi bi-trash-fill"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  
      <!-- Modal de detalles usando componente personalizado -->
      <div v-if="mostrarDetalles && usuarioSeleccionado" class="modal-overlay">
        <div class="modal-custom">
          <div class="modal-custom-content">
            <div class="modal-custom-header">
              <h5 class="modal-custom-title">Detalles del Usuario</h5>
              <button type="button" class="btn-close" @click="cerrarDetalles"></button>
            </div>
            <div class="modal-custom-body">
              <div class="seccion">
                <h6>Información General</h6>
                <div class="campo">
                  <span class="campo-label">ID:</span>
                  <span class="campo-valor">{{ usuarioSeleccionado.id }}</span>
                </div>
                <div class="campo">
                  <span class="campo-label">Tipo de Usuario:</span>
                  <span class="campo-valor">{{ usuarioSeleccionado.tipo_usuario || 'anonimo' }}</span>
                </div>
                <div class="campo">
                  <span class="campo-label">Fecha de Creación:</span>
                  <span class="campo-valor">{{ formatearFecha(usuarioSeleccionado.created_at) }}</span>
                </div>
              </div>
              
              <div class="seccion">
                <h6>Datos Personales</h6>
                <div class="campo">
                  <span class="campo-label">Nombre:</span>
                  <span class="campo-valor">{{ usuarioSeleccionado.nombre || '-' }}</span>
                </div>
                <div class="campo">
                  <span class="campo-label">Email:</span>
                  <span class="campo-valor">{{ usuarioSeleccionado.email || '-' }}</span>
                </div>
              </div>
              
              <div class="seccion">
                <h6>Información Técnica</h6>
                <div class="campo">
                  <span class="campo-label">IP:</span>
                  <span class="campo-valor">{{ usuarioSeleccionado.ip || '-' }}</span>
                </div>
                <div class="campo">
                  <span class="campo-label">ID de Usuario:</span>
                  <span class="campo-valor">{{ usuarioSeleccionado.user_id || '-' }}</span>
                </div>
                <div class="campo">
                  <span class="campo-label">ID de Dispositivo:</span>
                  <span class="campo-valor">{{ usuarioSeleccionado.id_dispositivo || '-' }}</span>
                </div>
              </div>
              
              <div class="seccion">
                <h6>Actividad</h6>
                <div class="campo">
                  <span class="campo-label">Fecha de Registro:</span>
                  <span class="campo-valor">{{ formatearFecha(usuarioSeleccionado.fecha_registro) }}</span>
                </div>
                <div class="campo">
                  <span class="campo-label">Último Acceso:</span>
                  <span class="campo-valor">{{ formatearFecha(usuarioSeleccionado.ultimo_acceso) }}</span>
                </div>
              </div>
            </div>
            <div class="modal-custom-footer">
              <button type="button" class="btn btn-secondary" @click="cerrarDetalles">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Modal de confirmación usando componente personalizado -->
      <div v-if="mostrarConfirmacion && usuarioSeleccionado" class="modal-overlay">
        <div class="modal-custom confirmation-modal">
          <div class="modal-custom-content">
            <div class="modal-custom-header">
              <h5 class="modal-custom-title">Confirmar Eliminación</h5>
              <button type="button" class="btn-close" @click="cerrarConfirmacion"></button>
            </div>
            <div class="modal-custom-body">
              <p>¿Estás seguro de que deseas eliminar al usuario {{ usuarioSeleccionado.id }}?</p>
              <p class="text-danger">Esta acción no se puede deshacer.</p>
            </div>
            <div class="modal-custom-footer">
              <button type="button" class="btn btn-secondary" @click="cerrarConfirmacion">Cancelar</button>
              <button type="button" class="btn btn-danger" @click="eliminarUsuario" :disabled="loading">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { usuarioAppService } from '@/services/usuarioAppService';
  
  // Estado
  const usuarios = ref([]);
  const usuariosFiltrados = ref([]);
  const usuarioSeleccionado = ref(null);
  const loading = ref(false);
  const busqueda = ref('');
  const filtroActual = ref('todos');
  const mostrarDetalles = ref(false);
  const mostrarConfirmacion = ref(false);
  
  // Formatear fecha para mostrar en la tabla
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    
    try {
      const date = new Date(fecha);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return fecha || '-';
    }
  };
  
  // Cargar usuarios
  const cargarUsuarios = async (tipo = 'todos') => {
    try {
      loading.value = true;
      filtroActual.value = tipo;
      
      switch (tipo) {
        case 'registrados':
          usuarios.value = await usuarioAppService.getUsuariosRegistrados();
          break;
        case 'anonimos':
          usuarios.value = await usuarioAppService.getUsuariosAnonimos();
          break;
        case 'todos':
        default:
          usuarios.value = await usuarioAppService.getAllUsuarios();
          break;
      }
      
      aplicarFiltro();
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      alert('No se pudieron cargar los usuarios');
    } finally {
      loading.value = false;
    }
  };
  
  // Filtros
  const mostrarTodos = () => cargarUsuarios('todos');
  const mostrarRegistrados = () => cargarUsuarios('registrados');
  const mostrarAnonimos = () => cargarUsuarios('anonimos');
  
  // Aplicar filtro de búsqueda
  const aplicarFiltro = () => {
    if (!busqueda.value.trim()) {
      usuariosFiltrados.value = usuarios.value;
      return;
    }
    
    const termino = busqueda.value.toLowerCase();
    usuariosFiltrados.value = usuarios.value.filter(usuario => {
      return (
        (usuario.nombre && usuario.nombre.toLowerCase().includes(termino)) ||
        (usuario.email && usuario.email.toLowerCase().includes(termino)) ||
        (usuario.id && usuario.id.toString().includes(termino))
      );
    });
  };
  
  // Ver detalles de un usuario
  const verDetalles = (usuario) => {
    usuarioSeleccionado.value = usuario;
    mostrarDetalles.value = true;
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
  };
  
  // Cerrar modal de detalles
  const cerrarDetalles = () => {
    mostrarDetalles.value = false;
    // Restaurar scroll
    document.body.style.overflow = '';
  };
  
  // Confirmar eliminación
  const confirmarEliminar = (usuario) => {
    usuarioSeleccionado.value = usuario;
    mostrarConfirmacion.value = true;
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
  };
  
  // Cerrar modal de confirmación
  const cerrarConfirmacion = () => {
    mostrarConfirmacion.value = false;
    // Restaurar scroll
    document.body.style.overflow = '';
  };
  
  // Eliminar usuario
  const eliminarUsuario = async () => {
    if (!usuarioSeleccionado.value) return;
    
    try {
      loading.value = true;
      await usuarioAppService.deleteUsuario(usuarioSeleccionado.value.id);
      
      // Cerrar modal
      cerrarConfirmacion();
      
      // Mostrar mensaje
      alert(`Usuario eliminado correctamente`);
      
      // Recargar lista
      await cargarUsuarios(filtroActual.value);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('No se pudo eliminar el usuario');
    } finally {
      loading.value = false;
    }
  };
  
  // Inicializar
  onMounted(async () => {
    // Cargar todos los usuarios al inicio
    await mostrarTodos();
  });
  </script>
  
  <style scoped>
  .btn-group .btn {
    margin-right: 2px;
  }
  
  .table th, .table td {
    vertical-align: middle;
  }
  
  /* Estilos para modal personalizado */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1050;
  }
  
  .modal-custom {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .confirmation-modal {
    max-width: 450px;
  }
  
  .modal-custom-content {
    display: flex;
    flex-direction: column;
  }
  
  .modal-custom-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #dee2e6;
  }
  
  .modal-custom-title {
    margin: 0;
  }
  
  .modal-custom-body {
    padding: 1rem;
    overflow-y: auto;
  }
  
  .modal-custom-footer {
    padding: 1rem;
    border-top: 1px solid #dee2e6;
    display: flex;
    justify-content: flex-end;
  }
  
  .seccion {
    margin-bottom: 1.5rem;
  }
  
  .seccion h6 {
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  
  .campo {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .campo:last-child {
    border-bottom: none;
  }
  
  .campo-label {
    font-weight: 500;
    color: #666;
  }
  
  .campo-valor {
    text-align: right;
    word-break: break-all;
  }
  </style>