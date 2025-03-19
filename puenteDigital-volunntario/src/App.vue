<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/authStore';
import { useRouter, useRoute } from 'vue-router';
import { computed, ref } from 'vue';
import { onMounted } from 'vue';
import { Dropdown } from 'bootstrap';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const hideNavAndFooter = computed(() => ['NotFound', 'NoDisponible'].includes(route.name));
const showDropdown = ref(false);

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

onMounted(() => {
  const dropdownElement = document.getElementById('dropdownMenuButton');
  if (dropdownElement) {
    new Dropdown(dropdownElement);
  }
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
                <li class="nav-item"><router-link class="nav-link" to="/asistente/gestion-llamadas">VideoLlamadas</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/asistente/solicitudes-chat">ChatTexto</router-link></li>

              </template>
            </template>
          </ul>
          <ul class="navbar-nav ms-auto">
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
    <div class="router-view-container">
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
</style>