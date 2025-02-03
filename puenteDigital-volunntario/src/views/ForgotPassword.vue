<template>
    <div class="container-fluid d-flex align-items-center justify-content-center bg-custom">
      <div class="col-md-8 col-lg-6">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h2 class="card-title text-center mb-4">Recuperar Contraseña</h2>
            
            <div v-if="error" class="alert alert-danger">
              {{ error }}
            </div>
  
            <div v-if="success" class="alert alert-success">
              {{ success }}
            </div>
  
            <form @submit.prevent="handleResetPassword" class="needs-validation" novalidate>
              <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input
                  v-model="email"
                  type="email"
                  class="form-control"
                  id="email"
                  placeholder="Introduce tu correo electrónico"
                  required
                />
                <div class="form-text">
                  Te enviaremos un enlace para restablecer tu contraseña.
                </div>
              </div>
  
              <button
                type="submit"
                class="btn btn-primary w-100 mb-3"
                :disabled="loading"
              >
                {{ loading ? 'Enviando...' : 'Enviar enlace de recuperación' }}
              </button>
  
              <div class="text-center">
                <router-link to="/login" class="btn btn-link">
                  Volver al inicio de sesión
                </router-link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { authService } from '../services/authService';
  
  const email = ref('');
  const loading = ref(false);
  const error = ref('');
  const success = ref('');
  
  const handleResetPassword = async () => {
    if (!email.value) {
      error.value = 'Por favor, introduce tu correo electrónico';
      return;
    }
  
    try {
      loading.value = true;
      error.value = '';
      success.value = '';
      
      await authService.resetPassword(email.value);
      
      success.value = 'Te hemos enviado un correo con las instrucciones para restablecer tu contraseña. El envío puede tardar unos minutos :).';
      email.value = ''; // Limpiar el campo
    } catch (err) {
      error.value = 'Ha ocurrido un error al enviar el correo de recuperación. Por favor, inténtalo de nuevo.';
      console.error('Error:', err);
    } finally {
      loading.value = false;
    }
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