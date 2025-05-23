<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/authStore';
import { useRouter, useRoute } from 'vue-router';
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { Dropdown } from 'bootstrap';
import { Toaster } from 'vue-sonner';
import globalNotificationService from './services/globalNotificationService';
import JornadaWatcher from './components/Global/JornadaWatcher.vue'; // Importar el componente JornadaWatcher

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const hideNavAndFooter = computed(() => ['NotFound', 'NoDisponible'].includes(route.name));
const showDropdown = ref(false);

// Verificar estado de activación al iniciar sesión pero SIN redirecciones automáticas
const verificarEstadoActivacion = async () => {
  if (authStore.isAuthenticated && authStore.isAsistente) {
    await authStore.verificarJornadaActiva();
    // No redirigimos automáticamente, solo verificamos el estado
  }
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

// Inicializar el servicio de notificaciones globales cuando el usuario está autenticado
// y limpiarlo al cerrar sesión
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated) {
    // Solo inicializar si el usuario es un asistente (no un admin)
    if (!authStore.isAdmin) {
      globalNotificationService.initialize();
      verificarEstadoActivacion(); // Verificar estado de activación cuando el usuario inicia sesión
    }
  } else {
    globalNotificationService.cleanup();
  }
}, { immediate: true });

// NO usamos watch para redirigir automáticamente cuando cambia el estado
// Esto evita el bucle infinito de redirecciones

onMounted(() => {
  const dropdownElement = document.getElementById('dropdownMenuButton');
  if (dropdownElement) {
    new Dropdown(dropdownElement);
  }
  // Inicializar notificaciones si ya está autenticado al montar el componente
  if (authStore.isAuthenticated) {
    if (!authStore.isAdmin) {
      globalNotificationService.initialize();
    }
    verificarEstadoActivacion(); // Verificar estado de activación al montar el componente
  }
});

onUnmounted(() => {
  // Limpiar el servicio de notificaciones al desmontar la aplicación
  globalNotificationService.cleanup();
});
</script>

<template>
  <template v-if="!hideNavAndFooter">
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary px-3">
        <a class="navbar-brand brand-title me-auto" href="/">PuenteDigital</a>
        <button 
          class="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav mx-auto">
            <template v-if="authStore.isAuthenticated">
              <template v-if="authStore.isAdmin">
                <router-link class="nav-link" to="/admin">Panel Admin</router-link>
                <router-link class="nav-link" to="/admin/activar-asistente">Activar Asistente</router-link>
                <router-link class="nav-link" to="/admin/asistentes">Asistentes</router-link>
                <router-link class="nav-link" to="/admin/suspendidos">Solicitudes Suspensión</router-link>
                <router-link class="nav-link" to="/admin/usuariosAppMovil">Usuarios App</router-link>
              </template>
              <template v-else>
                <li class="nav-item"><router-link class="nav-link" to="/asistente">Mi Panel</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/asistente/historial">Historial</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/asistente/estado">Estado</router-link></li>
                <!-- Siempre mostramos los enlaces, pero el middleware de ruta se encargará de redirigir si es necesario -->
                <li class="nav-item"><router-link class="nav-link" to="/asistente/gestion-llamadas">VideoLlamadas</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/asistente/chat">ChatTexto</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/asistente/tutoriales">Tutoriales</router-link></li>
              </template>
            </template>
          </ul>
          <ul class="navbar-nav ms-auto">
            <!-- Indicador de estado para asistentes -->
            <template v-if="authStore.isAuthenticated && authStore.isAsistente">
              <li class="nav-item">
                <router-link class="nav-link" :to="'/asistente/activacion'" :class="{'text-success': !authStore.asistenteBloqueado, 'text-danger': authStore.asistenteBloqueado}">
                  <i :class="['fas', !authStore.asistenteBloqueado ? 'fa-circle text-success' : 'fa-circle text-danger']"></i>
                  {{ !authStore.asistenteBloqueado ? 'Activo' : 'Inactivo' }}
                </router-link>
              </li>
            </template>
            <template v-if="authStore.isAuthenticated">
              <li class="nav-item">
                <div class="dropdown">
                  <img 
                    src="@/assets/avatar.png" 
                    alt="Avatar" 
                    class="rounded-circle dropdown-toggle ms-3"
                    id="dropdownMenuButton" 
                    data-bs-toggle="dropdown" 
                    aria-expanded="false"
                  />
                  <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton">
                    <template v-if="authStore.isAdmin">
                      <li><router-link class="dropdown-item" to="/admin/perfil">Perfil</router-link></li>
                    </template>
                    <template v-else>
                      <li><router-link class="dropdown-item" to="/asistente/perfil">Perfil</router-link></li>
                      <!-- Opción de activación/desactivación en el menú -->
                      <li>
                        <router-link class="dropdown-item" to="/asistente/activacion">
                          {{ authStore.asistenteBloqueado ? 'Activar Asistencia' : 'Desactivar Asistencia' }}
                        </router-link>
                      </li>
                    </template>
                    <li><a class="dropdown-item" href="#" @click.prevent="handleLogout">Cerrar Sesión</a></li>
                  </ul>
                </div>
              </li>
            </template>
            <template v-else>
              <li class="nav-item">
                <router-link class="nav-link" to="/login">Iniciar Sesión</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/register">Registrarse</router-link>
              </li>
            </template>
          </ul>
        </div>
    </nav>
  </template>

  <!-- Contenido principal -->
  <main class="main-container">
    <Toaster />
    <div class="router-view-container">
      <!-- Componente de vigilancia de jornada activa -->
      <JornadaWatcher v-if="authStore.isAuthenticated && authStore.isAsistente" />
      <router-view></router-view>
    </div>
  </main>

  <template v-if="!hideNavAndFooter">
    <!-- Footer -->
    <footer class="footer bg-primary text-white py-3 mt-auto">
      <div class="container text-center">
        <span>© 2025 PuenteDigital. Todos los derechos reservados.</span>
      </div>
    </footer>
  </template>
</template>

<style scoped>
/* Ajustes de la navbar */
.brand-title {
  font-size: 2rem;
  font-weight: bold;
}
.navbar {
  width: 100%;
  font-size: 1.4rem; 
  padding: 1.4rem 0; 
}

/* Estilos para el footer */
.footer {
  width: 100%;
  font-size: 1.4rem; 
  padding: 1.4rem 0;  
}

/* Estilos para el avatar */
.rounded-circle {
  cursor: pointer;
  width: 40px;
  height: 40px;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  left: auto;
}

/* Agregar dentro de la sección <style> existente */
body {
  margin: 0;
  padding: 0;
  background-color: white;
  overflow-x: hidden;
}

/* Agregar el fondo con el patrón SVG */
.main-container::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='white' /%3E%3Cpath d='M400 500c-50 0-90-40-90-90v-50c0-50 40-90 90-90s90 40 90 90v50c0 50-40 90-90 90z' fill='%23e0e0e0' /%3E%3Ccircle cx='400' cy='350' r='30' fill='%23e0e0e0' /%3E%3Crect x='500' y='300' width='80' height='120' rx='10' fill='%23d0d0d0' /%3E%3Crect x='510' y='310' width='60' height='100' rx='5' fill='white' /%3E%3C/svg%3E");
  background-size: 200px 200px; /* Reduce el tamaño del patrón para que se repita más veces */
  background-repeat: repeat; 
  opacity: 0.2; /* Aumenta la visibilidad del patrón */
  z-index: -1;
}

.main-container {
  min-height: calc(100vh - 160px); /* Ajusta según el tamaño de navbar y footer */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow-y: auto; /* Permitir scroll si es necesario */
}

/* Asegurar que el contenido de la ruta ocupe todo el espacio disponible */
.router-view-container {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Estilos para el indicador de estado */
.text-success {
  color: #28a745 !important;
}

.text-danger {
  color: #dc3545 !important;
}

.text-warning {
  color: #ffc107 !important;
}

/* Animación para el indicador de estado activo */
@keyframes pulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

.fa-circle.text-success {
  animation: pulse 2s infinite;
}
</style>