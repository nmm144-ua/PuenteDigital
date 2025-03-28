<template>
  <div class="login-container">
    <div class="login-card-container">
      <div class="login-card">
        <div class="login-header">
          <div class="brand-icon">
            <i class="bi bi-broadcast"></i>
          </div>
          <h1 class="card-title">Iniciar Sesión</h1>
          <p class="card-subtitle">Bienvenido de nuevo a PuenteDigital</p>
        </div>
        
        <div class="card-body">
          <form @submit.prevent="handleLogin" class="login-form">
            <div class="alert alert-danger" v-if="errorMessage">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              {{ errorMessage }}
            </div>
            
            <div class="form-group">
              <label for="email" class="form-label">
                <i class="bi bi-envelope"></i> Correo Electrónico
              </label>
              <input 
                v-model="email" 
                type="email" 
                id="email" 
                class="form-control" 
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="password" class="form-label">
                <i class="bi bi-lock"></i> Contraseña
              </label>
              <div class="password-input-wrapper">
                <input 
                  v-model="password" 
                  :type="showPassword ? 'text' : 'password'" 
                  id="password" 
                  class="form-control" 
                  placeholder="Ingresa tu contraseña"
                  required
                />
                <button 
                  type="button" 
                  class="password-toggle" 
                  @click="toggleShowPassword"
                >
                  <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
            </div>
            
            <div class="form-options">
              <div class="form-check">
                <input 
                  v-model="rememberMe" 
                  type="checkbox" 
                  id="rememberMe" 
                  class="form-check-input"
                />
                <label for="rememberMe" class="form-check-label">Recordarme</label>
              </div>
              <router-link to="/recover-password" class="forgot-password">
                ¿Olvidaste tu contraseña?
              </router-link>
            </div>
            
            <button type="submit" class="btn btn-login" :disabled="isLoading">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <span v-if="isLoading">Iniciando sesión...</span>
              <span v-else>Iniciar Sesión</span>
            </button>
          </form>
          
          <div class="divider">
            <span>O</span>
          </div>
          
          <div class="register-option">
            ¿No tienes una cuenta?
            <router-link to="/register" class="register-link">
              Regístrate
            </router-link>
          </div>
        </div>
      </div>
      
      <div class="login-info">
        <h2>Asistencia Tecnológica</h2>
        <p>
          Conectamos personas mayores con voluntarios dispuestos a ayudar con problemas tecnológicos.
        </p>
        <div class="login-features">
          <div class="feature">
            <div class="feature-icon">
              <i class="bi bi-chat-dots"></i>
            </div>
            <div class="feature-text">
              <h3>Soporte por Chat</h3>
              <p>Asistencia mediante mensajes en tiempo real</p>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon">
              <i class="bi bi-camera-video"></i>
            </div>
            <div class="feature-text">
              <h3>Videollamadas</h3>
              <p>Ayuda visual para problemas complejos</p>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon">
              <i class="bi bi-shield-check"></i>
            </div>
            <div class="feature-text">
              <h3>Seguro y Confiable</h3>
              <p>Voluntarios verificados y soporte seguro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

export default {
  name: 'Login',
  
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    
    const email = ref('');
    const password = ref('');
    const rememberMe = ref(false);
    const showPassword = ref(false);
    const isLoading = ref(false);
    const errorMessage = ref('');
    
    const toggleShowPassword = () => {
      showPassword.value = !showPassword.value;
    };
    
    const handleLogin = async () => {
      errorMessage.value = '';
      isLoading.value = true;
      
      try {
        const success = await authStore.login(email.value, password.value);
        
        if (success) {
          const redirectTo = authStore.isAdmin ? '/admin' : '/asistente';
          router.push(redirectTo);
        } else {
          errorMessage.value = 'Credenciales inválidas. Por favor, inténtalo de nuevo.';
        }
      } catch (error) {
        console.error('Error de inicio de sesión:', error);
        errorMessage.value = 'Error al iniciar sesión. Por favor, inténtalo de nuevo más tarde.';
      } finally {
        isLoading.value = false;
      }
    };
    
    return {
      email,
      password,
      rememberMe,
      showPassword,
      isLoading,
      errorMessage,
      toggleShowPassword,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: #f8f9fa;
  position: relative;
  z-index: 1;
}

.login-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='white' /%3E%3Cpath d='M400 500c-50 0-90-40-90-90v-50c0-50 40-90 90-90s90 40 90 90v50c0 50-40 90-90 90z' fill='%23e0e0e0' /%3E%3Ccircle cx='400' cy='350' r='30' fill='%23e0e0e0' /%3E%3Crect x='500' y='300' width='80' height='120' rx='10' fill='%23d0d0d0' /%3E%3Crect x='510' y='310' width='60' height='100' rx='5' fill='white' /%3E%3C/svg%3E");
  background-size: 200px 200px;
  background-repeat: repeat;
  opacity: 0.1;
  z-index: -1;
}

.login-card-container {
  width: 100%;
  max-width: 1200px;
  display: flex;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  background-color: white;
}

.login-card {
  flex: 1;
  padding: 3rem;
  display: flex;
  flex-direction: column;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-icon {
  width: 70px;
  height: 70px;
  background-color: #266cee;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 1.5rem;
}

.card-title {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
}

.card-subtitle {
  color: #666;
  font-size: 1.1rem;
}

.login-form {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-control {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-control:focus {
  border-color: #266cee;
  box-shadow: 0 0 0 4px rgba(38, 108, 238, 0.1);
  outline: none;
}

.password-input-wrapper {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #777;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.password-toggle:hover {
  color: #266cee;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-check-input {
  width: 1rem;
  height: 1rem;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: pointer;
}

.form-check-input:checked {
  background-color: #266cee;
  border-color: #266cee;
}

.form-check-label {
  color: #666;
  cursor: pointer;
}

.forgot-password {
  color: #266cee;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

.forgot-password:hover {
  text-decoration: underline;
  color: #0a4bb3;
}

.btn-login {
  width: 100%;
  padding: 1rem;
  background-color: #266cee;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.btn-login:hover {
  background-color: #0a4bb3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(38, 108, 238, 0.3);
}

.btn-login:disabled {
  background-color: #9ab7f5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.divider {
  position: relative;
  text-align: center;
  margin: 1.5rem 0;
}

.divider::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #e0e0e0;
  z-index: 1;
}

.divider span {
  position: relative;
  background-color: white;
  padding: 0 1rem;
  color: #999;
  font-size: 0.9rem;
  z-index: 2;
}

.register-option {
  text-align: center;
  color: #666;
  font-size: 1rem;
}

.register-link {
  color: #266cee;
  font-weight: 600;
  text-decoration: none;
  margin-left: 0.5rem;
  transition: color 0.2s ease;
}

.register-link:hover {
  text-decoration: underline;
  color: #0a4bb3;
}

.login-info {
  flex: 1;
  background-color: #266cee;
  color: white;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-info h2 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.login-info p {
  font-size: 1.1rem;
  margin-bottom: 2.5rem;
  opacity: 0.9;
  line-height: 1.6;
}

.login-features {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature {
  display: flex;
  align-items: center;
  gap: 1.2rem;
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.feature-text h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.feature-text p {
  font-size: 0.95rem;
  margin-bottom: 0;
  opacity: 0.8;
  line-height: 1.4;
}

.alert {
  padding: 0.8rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  font-size: 0.95rem;
}

.alert-danger {
  background-color: #ffebee;
  color: #d32f2f;
  border: 1px solid #ffcdd2;
}

/* Responsive styles */
@media (max-width: 992px) {
  .login-card-container {
    flex-direction: column;
    max-width: 600px;
  }
  
  .login-info {
    order: -1;
    padding: 2rem;
  }
  
  .login-features {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
  }
  
  .feature {
    width: calc(50% - 1rem);
  }
}

@media (max-width: 768px) {
  .login-card {
    padding: 2rem;
  }
  
  .login-info {
    padding: 2rem;
  }
  
  .feature {
    width: 100%;
  }
  
  .login-features {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .login-container {
    padding: 1rem;
  }
  
  .login-card {
    padding: 1.5rem;
  }
  
  .login-header {
    margin-bottom: 1.5rem;
  }
  
  .card-title {
    font-size: 1.8rem;
  }
  
  .form-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>