<template>
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
          <div class="card shadow-sm">
            <div class="card-body p-4">
              <h2 class="card-title text-center mb-4">Mi Perfil</h2>
              
              <!-- Formulario del perfil -->
              <form @submit.prevent="handleUpdateProfile" class="needs-validation" novalidate>
                <!-- Botón para editar -->
                <div class="mb-3 text-end">
                  <button 
                    type="button" 
                    class="btn btn-secondary"
                    @click="toggleEditing"
                  >
                    {{ isEditing ? 'Cancelar Edición' : 'Editar Perfil' }}
                  </button>
                </div>

                <!-- Campos del formulario -->
                <div class="mb-3">
                  <label for="nombre" class="form-label">Nombre completo</label>
                  <input 
                    v-model="form.nombre" 
                    type="text" 
                    class="form-control"
                    id="nombre"
                    required
                    :disabled="!isEditing"
                  >
                  <div v-if="errors.nombre" class="text-danger small">{{ errors.nombre }}</div>
                </div>
                
                <div class="mb-3">
                  <label for="email" class="form-label">Email</label>
                  <input 
                    v-model="form.email" 
                    type="email" 
                    class="form-control"
                    id="email"
                    disabled
                  >
                </div>
                
                <div class="mb-3">
                  <label for="telefono" class="form-label">Teléfono</label>
                  <input 
                    v-model="form.telefono" 
                    type="tel" 
                    class="form-control"
                    id="telefono"
                    required
                    :disabled="!isEditing"
                  >
                  <div v-if="errors.telefono" class="text-danger small">{{ errors.telefono }}</div>
                </div>

                <div class="mb-3">
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

                <!-- Botón de actualizar (solo visible en modo edición) -->
                <button 
                  v-if="isEditing"
                  type="submit" 
                  class="btn btn-primary w-100 mb-4"
                >
                  Actualizar Perfil
                </button>
              </form>
              
              <!-- Mensajes de éxito/error -->
              <div v-if="successMessage" class="alert alert-success">
                {{ successMessage }}
              </div>
              <div v-if="errorMessage" class="alert alert-danger">
                {{ errorMessage }}
              </div>

              <!-- Formulario de cambio de contraseña -->
              <div class="border-top pt-4">
                <h3 class="h5 mb-3">Cambiar Contraseña</h3>
                <form @submit.prevent="handlePasswordChange" class="needs-validation" novalidate>
                  <div class="mb-3">
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
                        class="btn btn-outline-secondary"
                        @click="toggleCurrentPassword"
                      >
                        <i :class="showCurrentPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                      </button>
                    </div>
                    <div v-if="errors.currentPassword" class="text-danger small">{{ errors.currentPassword }}</div>
                  </div>

                  <div class="mb-3">
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
                        class="btn btn-outline-secondary"
                        @click="toggleNewPassword"
                      >
                        <i :class="showNewPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                      </button>
                    </div>
                    <div v-if="errors.newPassword" class="text-danger small">{{ errors.newPassword }}</div>
                  </div>

                  <div class="mb-3">
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
                        class="btn btn-outline-secondary"
                        @click="toggleConfirmPassword"
                      >
                        <i :class="showConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                      </button>
                    </div>
                    <div v-if="errors.confirmNewPassword" class="text-danger small">{{ errors.confirmNewPassword }}</div>
                  </div>

                  <button type="submit" class="btn btn-warning w-100 mb-3">
                    Cambiar Contraseña
                  </button>
                </form>
              </div>

              <!-- Botón Volver -->
              <router-link to="/menu-asistente" class="btn btn-link w-100 text-center">
                Volver al Menú
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { asistenteService } from '../services/asistenteService';
import { supabase } from '../../supabase';

export default {
  setup() {
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

      if (form.value.nombre.length < 2) {
        errors.value.nombre = 'El nombre debe tener al menos 2 caracteres';
      }

      if (!/^\d{9,}$/.test(form.value.telefono)) {
        errors.value.telefono = 'El teléfono debe tener al menos 9 dígitos';
      }

      return Object.keys(errors.value).length === 0;
    };

    // Validar formulario de contraseña
    const validatePasswordForm = () => {
      errors.value = {};

      if (passwordForm.value.newPassword.length < 6) {
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
        isEditing.value = false; // Desactivar modo edición después de actualizar
      } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        errorMessage.value = 'Error al actualizar el perfil';
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
        passwordForm.value = {
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        };
      } catch (error) {
        console.error('Error al cambiar la contraseña:', error);
        errorMessage.value = 'Error al cambiar la contraseña';
      }
    };

    // Funciones para alternar visibilidad de contraseñas
    const toggleCurrentPassword = () => showCurrentPassword.value = !showCurrentPassword.value;
    const toggleNewPassword = () => showNewPassword.value = !showNewPassword.value;
    const toggleConfirmPassword = () => showConfirmPassword.value = !showConfirmPassword.value;

    // Cargar datos al montar el componente
    onMounted(loadProfile);

    return {
      form,
      passwordForm,
      errors,
      errorMessage,
      successMessage,
      isEditing,
      showCurrentPassword,
      showNewPassword,
      showConfirmPassword,
      handleUpdateProfile,
      handlePasswordChange,
      toggleCurrentPassword,
      toggleNewPassword,
      toggleConfirmPassword,
      toggleEditing
    };
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

.input-group button {
  border-radius: 0 0.25rem 0.25rem 0;
}

/* Estilo para campos deshabilitados */
input:disabled,
textarea:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}
</style>