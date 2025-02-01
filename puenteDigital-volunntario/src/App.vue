<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/authStore';
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const hideNavAndFooter = computed(() => ['NotFound', 'NoDisponible'].includes(route.name));

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

<template>
  <template v-if="!hideNavAndFooter">
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <a class="navbar-brand brand-title" href="/">PuenteDigital</a>
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
                <li class="nav-item"><router-link class="nav-link" to="/menu-asistente">Mi Panel</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/historial-asistente">Historial</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/estado-asistente">Estado</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/espacio-asistente">MiEspacio</router-link></li>
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
              <a href="#" @click.prevent="handleLogout" class="nav-link">Cerrar Sesión</a>
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

</style>
