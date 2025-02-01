<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/'); // Redirige al home después del logout
};
</script>

<template>
  <!-- Navbar -->
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <a class="navbar-brand" href="/">PuenteDigital</a>
      
      <!-- Botón para móviles -->
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

      <!-- Menú de navegación -->
      <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
        <ul class="navbar-nav">
          <template v-if="authStore.isAuthenticated">
            <!-- Enlaces para usuarios autenticados -->
            <li class="nav-item" v-if="authStore.isAdmin">
              <router-link class="nav-link" to="/admin">Panel Admin</router-link>
            </li>
            <li class="nav-item" v-else>
              <router-link class="nav-link" to="/menu-asistente">Mi Panel</router-link>
            </li>
            <li class="nav-item">
              <a href="#" @click.prevent="handleLogout" class="nav-link">
                Cerrar Sesión
              </a>
            </li>
          </template>
          <template v-else>
            <!-- Enlaces para usuarios no autenticados -->
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

  <router-view></router-view>
</template>

<style scoped>
.navbar {
  margin-bottom: 2rem;
}

.nav-link {
  cursor: pointer;
}

.nav-link.router-link-active {
  font-weight: bold;
}
</style>