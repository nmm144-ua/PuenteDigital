<template>
  <div class="container-fluid d-flex align-items-center justify-content-center bg-custom">
    <div class="col-md-8 col-lg-6">
      <div class="card shadow-sm">
        <div class="card-body p-4">
          <h2 class="card-title text-center mb-4">Cambiar Contraseña</h2>
          
          <div v-if="error" class="alert alert-danger">
            {{ error }}
          </div>

          <div v-if="success" class="alert alert-success">
            {{ success }}
          </div>

          <form v-if="!success" @submit.prevent="handlePasswordUpdate" class="needs-validation" novalidate>
            <div class="mb-3">
              <label for="password" class="form-label">Nueva contraseña</label>
              <input
                v-model="password"
                type="password"
                class="form-control"
                id="password"
                placeholder="Introduce tu nueva contraseña"
                required
                minlength="6"
              />
            </div>

            <div class="mb-3">
              <label for="confirmPassword" class="form-label">Confirmar contraseña</label>
              <input
                v-model="confirmPassword"
                type="password"
                class="form-control"
                id="confirmPassword"
                placeholder="Confirma tu nueva contraseña"
                required
                minlength="6"
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 mb-3"
              :disabled="loading"
            >
              {{ loading ? 'Actualizando...' : 'Actualizar contraseña' }}
            </button>
          </form>

          <div v-if="success" class="text-center">
            <router-link to="/login" class="btn btn-primary">
              Ir al inicio de sesión
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '@/services/authService';

const router = useRouter();
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');

const handlePasswordUpdate = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden';
    return;
  }

  if (password.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres';
    return;
  }

  try {
    loading.value = true;
    error.value = '';
    
    await authService.updatePassword(password.value);
    
    success.value = 'Tu contraseña ha sido actualizada correctamente';
    
   
  } catch (err) {
    error.value = 'Ha ocurrido un error al actualizar la contraseña. Por favor, inténtalo de nuevo.';
    console.error('Error:', err);
  } finally {
    loading.value = false;
  }
};
</script>