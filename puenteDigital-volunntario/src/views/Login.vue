<template>
  <div class="container-fluid d-flex align-items-center justify-content-center bg-custom">
    <div class="col-md-8 col-lg-6">
      <div class="card shadow-sm">
        <div class="card-body p-4">
          <h2 class="card-title text-center mb-4">Iniciar Sesión</h2>
          
          <div v-if="authStore.error" class="alert alert-danger">
            {{ authStore.error }}
          </div>

          <form @submit.prevent="handleLogin" class="needs-validation" novalidate>
            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input
                v-model="email"
                type="email"
                class="form-control"
                id="email"
                placeholder="Correo electrónico"
                required
              />
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Contraseña</label>
              <input
                v-model="password"
                type="password"
                class="form-control"
                id="password"
                placeholder="Contraseña"
                required
              />
              <div class="text-end mt-1">
                <router-link to="/forgot-password" class="text-muted small">
                  ¿Olvidaste tu contraseña?
                </router-link>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 mb-3"
              :disabled="authStore.isLoading"
            >
              {{ authStore.isLoading ? 'Cargando...' : 'Iniciar Sesión' }}
            </button>

            <router-link to="/register" class="btn btn-link w-100 text-center">
              Registrarse
            </router-link>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

export default {
setup() {
  const authStore = useAuthStore();
  const router = useRouter();
  const email = ref('');
  const password = ref('');

  const handleLogin = async () => {
    await authStore.login(email.value, password.value);
    if (authStore.isAuthenticated) {
      // Redirect based on role
      if (authStore.isAdmin) {
        router.push('/admin');
      } else {
        router.push('/asistente');
      }
    }
  };

  return {
    email,
    password,
    authStore,
    handleLogin,
  };
},
};
</script>

<style scoped>
.btn-link {
text-decoration: none;
}
.btn-link:hover {
text-decoration: underline;
}
</style>