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
              <li class="nav-item" v-if="authStore.isAdmin">
                <router-link class="nav-link" to="/admin">Panel Admin</router-link>
              </li>
              <template v-else>
                <li class="nav-item"><router-link class="nav-link" to="/asistente">Mi Panel</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/asistente/historial">Historial</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/asistente/estado">Estado</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/asistente/espacio">MiEspacio</router-link></li>
              </template>
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
          <ul class="navbar-nav ms-auto">
            <li class="nav-item" v-if="authStore.isAuthenticated">
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
                  <li><router-link class="dropdown-item" to="/asistente/perfil">Perfil</router-link></li>
                  <li><a class="dropdown-item" href="#" @click.prevent="handleLogout">Cerrar Sesión</a></li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
    </nav>
  </template>

  <!-- Contenido principal -->
  <main class="main-container">
    <router-view></router-view>
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

/* Espacio dinámico entre navbar y footer */
.main-container {
  min-height: calc(100vh - 160px); /* Ajusta el espacio considerando navbar y footer más grandes */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
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
</style>