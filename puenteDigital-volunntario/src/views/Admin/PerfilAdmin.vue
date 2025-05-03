<template>
  <div class="perfil-container">
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="card profile-card">
            <div class="card-header">
              <div class="profile-header">
                <div class="profile-avatar">
                  <span>{{ form.nombre ? form.nombre.charAt(0).toUpperCase() : 'A' }}</span>
                </div>
                <h2 class="profile-title">Mi Perfil</h2>
              </div>
              
              <!-- Botón para editar -->
              <button 
                type="button" 
                class="btn edit-button"
                @click="toggleEditing"
              >
                <i :class="isEditing ? 'fas fa-times' : 'fas fa-pencil-alt'"></i>
                {{ isEditing ? 'Cancelar' : 'Editar' }}
              </button>
            </div>
            
            <div class="card-body p-4">
              <!-- Formulario del perfil -->
              <form @submit.prevent="handleUpdateProfile" class="needs-validation" novalidate>
                <!-- Campos del formulario -->
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <div class="form-group">
                      <label for="nombre" class="form-label">Nombre completo</label>
                      <input 
                        v-model="form.nombre" 
                        type="text" 
                        class="form-control"
                        id="nombre"
                        required
                        :disabled="!isEditing"
                      >
                      <div v-if="errors.nombre" class="error-message">{{ errors.nombre }}</div>
                    </div>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <div class="form-group">
                      <label for="email" class="form-label">Email</label>
                      <input 
                        v-model="form.email" 
                        type="email" 
                        class="form-control"
                        id="email"
                        disabled
                      >
                    </div>
                  </div>
                </div>
                
                <div class="mb-3">
                  <div class="form-group">
                    <label for="telefono" class="form-label">Teléfono</label>
                    <input 
                      v-model="form.telefono" 
                      type="tel" 
                      class="form-control"
                      id="telefono"
                      required
                      :disabled="!isEditing"
                    >
                    <div v-if="errors.telefono" class="error-message">{{ errors.telefono }}</div>
                  </div>
                </div>

                <div class="mb-4">
                  <div class="form-group">
                    <label for="habilidades" class="form-label">Habilidades</label>
                    <textarea 
                      v-model="form.habilidades" 
                      class="form-control"
                      id="habilidades"
                      rows="4"
                      placeholder="Describe tus habilidades técnicas..."
                      :disabled="!isEditing"
                    ></textarea>
                  </div>
                </div>

                <!-- Botón de actualizar (solo visible en modo edición) -->
                <div v-if="isEditing" class="d-grid mb-4">
                  <button 
                    type="submit" 
                    class="btn update-button"
                  >
                    <i class="fas fa-check"></i> Actualizar Perfil
                  </button>
                </div>
              </form>
              
              <!-- Mensajes de éxito/error -->
              <div v-if="successMessage" class="alert alert-success">
                <i class="fas fa-check-circle"></i> {{ successMessage }}
              </div>
              <div v-if="errorMessage" class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
              </div>

              <!-- Formulario de cambio de contraseña -->
              <div class="password-section">
                <h3 class="section-title">Cambiar Contraseña</h3>
                <form @submit.prevent="handlePasswordChange" class="needs-validation" novalidate>
                  <div class="mb-3">
                    <div class="form-group">
                      <label for="currentPassword" class="form-label">Contraseña Actual</label>
                      <div class="input-group">
                        <input 
                          v-model="passwordForm.currentPassword" 
                          :type="showCurrentPassword ? 'text' : 'password'" 
                          class="form-control"
                          id="currentPassword"
                          required
                        >
                        <button 
                          type="button" 
                          class="btn eye-button"
                          @click="toggleCurrentPassword"
                        >
                          <i :class="showCurrentPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                        </button>
                      </div>
                      <div v-if="errors.currentPassword" class="error-message">{{ errors.currentPassword }}</div>
                    </div>
                  </div>

                  <div class="mb-3">
                    <div class="form-group">
                      <label for="newPassword" class="form-label">Nueva Contraseña</label>
                      <div class="input-group">
                        <input 
                          v-model="passwordForm.newPassword" 
                          :type="showNewPassword ? 'text' : 'password'" 
                          class="form-control"
                          id="newPassword"
                          required
                        >
                        <button 
                          type="button" 
                          class="btn eye-button"
                          @click="toggleNewPassword"
                        >
                          <i :class="showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                        </button>
                      </div>
                      <div v-if="errors.newPassword" class="error-message">{{ errors.newPassword }}</div>
                    </div>
                  </div>

                  <div class="mb-4">
                    <div class="form-group">
                      <label for="confirmNewPassword" class="form-label">Confirmar Nueva Contraseña</label>
                      <div class="input-group">
                        <input 
                          v-model="passwordForm.confirmNewPassword" 
                          :type="showConfirmPassword ? 'text' : 'password'" 
                          class="form-control"
                          id="confirmNewPassword"
                          required
                        >
                        <button 
                        type="button" 
                        class="btn eye-button"
                        @click="toggleConfirmPassword"
                      >
                        <i :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                      </button>
                    </div>
                    <div v-if="errors.confirmNewPassword" class="error-message">{{ errors.confirmNewPassword }}</div>
                  </div>
                </div>

                <div class="d-grid mb-4">
                  <button type="submit" class="btn password-button">
                    <i class="fas fa-key"></i> Cambiar Contraseña
                  </button>
                </div>
              </form>
            </div>
            
            <div class="actions-footer">
              <router-link to="/admin" class="btn back-button">
                <i class="fas fa-arrow-left"></i> Volver al Panel
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { asistenteService } from '@/services/asistenteService';
import { supabase } from '../../../supabase';

const router = useRouter();
const authStore = useAuthStore();

// Estado de edición
const isEditing = ref(false);

// Formulario principal
const form = ref({
  nombre: '',
  email: '',
  telefono: '',
  habilidades: ''
});

// Formulario de contraseña
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: ''
});

// Estados de visibilidad de contraseñas
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

// Estados de mensajes
const errors = ref({});
const errorMessage = ref('');
const successMessage = ref('');

// Toggle modo edición
const toggleEditing = () => {
  if (isEditing.value) {
    // Si estamos cancelando la edición, recargamos los datos originales
    loadProfile();
  }
  isEditing.value = !isEditing.value;
};

// Cargar datos del perfil
const loadProfile = async () => {
  try {
    const userId = authStore.user?.id;
    if (!userId) throw new Error('No se encontró el ID del usuario');

    const asistente = await asistenteService.getAsistenteByUserId(userId);
    form.value = {
      nombre: asistente.nombre,
      email: asistente.email,
      telefono: asistente.telefono,
      habilidades: asistente.habilidades
    };
    errorMessage.value = '';
    successMessage.value = '';
    errors.value = {};
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
    errorMessage.value = 'Error al cargar los datos del perfil';
  }
};

// Validar formulario principal
const validateProfileForm = () => {
  errors.value = {};

  if (!form.value.nombre || form.value.nombre.length < 2) {
    errors.value.nombre = 'El nombre debe tener al menos 2 caracteres';
  }

  if (!form.value.telefono || !/^\d{9,}$/.test(form.value.telefono)) {
    errors.value.telefono = 'El teléfono debe tener al menos 9 dígitos';
  }

  return Object.keys(errors.value).length === 0;
};

// Validar formulario de contraseña
const validatePasswordForm = () => {
  errors.value = {};

  if (!passwordForm.value.currentPassword) {
    errors.value.currentPassword = 'La contraseña actual es obligatoria';
  }

  if (!passwordForm.value.newPassword || passwordForm.value.newPassword.length < 6) {
    errors.value.newPassword = 'La nueva contraseña debe tener al menos 6 caracteres';
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmNewPassword) {
    errors.value.confirmNewPassword = 'Las contraseñas no coinciden';
  }

  return Object.keys(errors.value).length === 0;
};

// Actualizar perfil
const handleUpdateProfile = async () => {
  if (!validateProfileForm()) {
    errorMessage.value = 'Por favor, corrige los errores en el formulario';
    return;
  }

  try {
    const userId = authStore.user?.id;
    if (!userId) throw new Error('No se encontró el ID del usuario');

    await asistenteService.updateAsistente(userId, {
      nombre: form.value.nombre,
      telefono: form.value.telefono,
      habilidades: form.value.habilidades
    });

    successMessage.value = 'Perfil actualizado correctamente';
    errorMessage.value = '';
    isEditing.value = false; // Desactivar modo edición después de actualizar
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    errorMessage.value = 'Error al actualizar el perfil';
    successMessage.value = '';
  }
};

// Cambiar contraseña
const handlePasswordChange = async () => {
  if (!validatePasswordForm()) {
    errorMessage.value = 'Por favor, corrige los errores en el formulario';
    return;
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.value.newPassword
    });

    if (error) throw error;

    successMessage.value = 'Contraseña actualizada correctamente';
    errorMessage.value = '';
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    };
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    errorMessage.value = 'Error al cambiar la contraseña';
    successMessage.value = '';
  }
};

// Funciones para alternar visibilidad de contraseñas
const toggleCurrentPassword = () => showCurrentPassword.value = !showCurrentPassword.value;
const toggleNewPassword = () => showNewPassword.value = !showNewPassword.value;
const toggleConfirmPassword = () => showConfirmPassword.value = !showConfirmPassword.value;

// Cargar datos al montar el componente
onMounted(loadProfile);
</script>

<style scoped>
.perfil-container {
  background-color: #f8f9fa;
  min-height: calc(100vh - 160px);
}

.profile-card {
  border: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  overflow: hidden;
}

.card-header {
  background: linear-gradient(135deg, #3949ab, #1976d2);
  color: white;
  border: none;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 15px;
}

.profile-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.8rem;
  font-weight: 600;
}

.profile-title {
  margin: 0;
  font-weight: 600;
  font-size: 1.6rem;
}

.edit-button {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.edit-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.form-label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.form-control {
  border-radius: 8px;
  padding: 12px 15px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.form-control:focus {
  border-color: #3949ab;
  box-shadow: 0 0 0 3px rgba(57, 73, 171, 0.15);
}

/* Estilo para campos deshabilitados */
input:disabled,
textarea:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.8;
}

.update-button {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.update-button:hover {
  box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
  transform: translateY(-2px);
}

.password-section {
  border-top: 1px solid #e2e8f0;
  margin-top: 30px;
  padding-top: 30px;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  position: relative;
  padding-bottom: 10px;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 40px;
  height: 3px;
  background: #1976d2;
  border-radius: 2px;
}

.eye-button {
  background: #e9ecef;
  border: 1px solid #e2e8f0;
  border-left: none;
  color: #6c757d;
}

.eye-button:hover {
  background: #dee2e6;
  color: #495057;
}

.password-button {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.password-button:hover {
  box-shadow: 0 5px 15px rgba(255, 152, 0, 0.3);
  transform: translateY(-2px);
}

.actions-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
}

.back-button {
  background-color: #e8eaf6;
  color: #3949ab;
  border: 1px solid #c5cae9;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  text-decoration: none;
  margin-left: auto;
}

.back-button:hover {
  background-color: #c5cae9;
  color: #283593;
}

.error-message {
  color: #d32f2f;
  font-size: 0.8rem;
  margin-top: 5px;
}

.alert {
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Media queries para responsividad */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .edit-button {
    align-self: flex-end;
  }
  
  .actions-footer {
    flex-direction: column;
    gap: 15px;
  }
  
  .back-button {
    width: 100%;
    justify-content: center;
    margin-left: 0;
  }
}

/* Animaciones para mejorar la experiencia de usuario */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-control, .btn {
  animation: fadeIn 0.3s ease-out;
}
</style>