<template>
  <div class="register-container">
    <div class="register-card-container">
      <div class="register-card">
        <div class="card-header">
          <div class="brand-icon">
            <i class="bi bi-broadcast"></i>
          </div>
          <h1 class="card-title">Registro Nuevo Asistente</h1>
          <p class="card-subtitle">Únete a nuestra red de voluntarios de PuenteDigital</p>
        </div>
        
        <div class="card-body">
          <form @submit.prevent="handleRegister" class="register-form">
            <div class="alert alert-danger" v-if="errorMessage">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              {{ errorMessage }}
            </div>
            
            <div class="form-group">
              <label for="nombre" class="form-label">
                <i class="bi bi-person"></i> Nombre completo
              </label>
              <input 
                v-model="form.nombre" 
                type="text" 
                class="form-control"
                id="nombre"
                placeholder="Ingresa tu nombre completo"
                required
              >
              <div v-if="errors.nombre" class="error-message">{{ errors.nombre }}</div>
            </div>
            
            <div class="form-group">
              <label for="email" class="form-label">
                <i class="bi bi-envelope"></i> Email
              </label>
              <input 
                v-model="form.email" 
                type="email" 
                class="form-control"
                id="email"
                placeholder="correo@ejemplo.com"
                required
              >
              <div v-if="errors.email" class="error-message">{{ errors.email }}</div>
            </div>
            
            <div class="form-group">
              <label for="telefono" class="form-label">
                <i class="bi bi-phone"></i> Teléfono
              </label>
              <input 
                v-model="form.telefono" 
                type="tel" 
                class="form-control"
                id="telefono"
                placeholder="Número de teléfono"
                required
              >
              <div v-if="errors.telefono" class="error-message">{{ errors.telefono }}</div>
            </div>
            
            <div class="form-group">
              <label for="password" class="form-label">
                <i class="bi bi-lock"></i> Contraseña
              </label>
              <div class="password-input-wrapper">
                <input 
                  v-model="form.password" 
                  :type="showPassword ? 'text' : 'password'" 
                  class="form-control"
                  id="password"
                  placeholder="Crea una contraseña segura"
                  required
                >
                <button 
                  type="button" 
                  class="password-toggle" 
                  @click="toggleShowPassword"
                >
                  <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              <div v-if="errors.password" class="error-message">{{ errors.password }}</div>
            </div>

            <div class="form-group">
              <label for="confirmPassword" class="form-label">
                <i class="bi bi-shield-lock"></i> Confirmar Contraseña
              </label>
              <div class="password-input-wrapper">
                <input 
                  v-model="form.confirmPassword" 
                  :type="showConfirmPassword ? 'text' : 'password'" 
                  class="form-control"
                  id="confirmPassword"
                  placeholder="Repite tu contraseña"
                  required
                >
                <button 
                  type="button" 
                  class="password-toggle" 
                  @click="toggleShowConfirmPassword"
                >
                  <i :class="showConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              <div v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</div>
            </div>

            <div class="form-group">
              <label for="habilidades" class="form-label">
                <i class="bi bi-tools"></i> Habilidades
              </label>
              <textarea 
                v-model="form.habilidades" 
                class="form-control"
                id="habilidades"
                rows="4"
                placeholder="Describe tus habilidades técnicas..."
              ></textarea>
            </div>
            
            <!-- Declaración de Responsabilidad -->
            <div class="declaration-section">
              <h3 class="section-title">
                <i class="bi bi-clipboard-check"></i> Declaración de Responsabilidad
              </h3>
              <div class="declaration-container">
                <h4 class="declaration-title">Declaración de Responsabilidad y Confidencialidad</h4>
                <p class="declaration-info"><strong>Proyecto:</strong> PuenteDigital</p>
                <p class="declaration-info"><strong>Fecha:</strong> {{ fechaActual }}</p>

                <p class="declaration-text">
                  Por la presente, en calidad de asistente voluntario en el proyecto de desarrollo de una aplicación móvil que conecta a personas mayores con competencias digitales limitadas con voluntarios para proporcionarles soporte técnico y tutoría personalizada, declaro lo siguiente:
                </p>

                <ol class="declaration-list">
                  <li>
                    <strong>Finalidad del Rol</strong><br>
                    Mi rol como asistente voluntario consiste en proporcionar soporte técnico y tutoría a los usuarios de la plataforma mediante videollamadas, chat en vivo y otros métodos de comunicación establecidos en la plataforma. Reconozco que mi labor se desarrolla bajo los principios de inclusión digital y respeto a los usuarios.
                  </li>
                  <li>
                    <strong>Confidencialidad de la Información</strong><br>
                    Me comprometo a:<br>
                    - Mantener absoluta confidencialidad sobre toda la información personal, técnica o confidencial de los usuarios a la que tenga acceso durante la ejecución de mis tareas, incluyendo pero no limitado a:<br>
                    &nbsp;&nbsp;* Datos personales (nombre, dirección, número de teléfono, edad, etc.).<br>
                    &nbsp;&nbsp;* Información técnica o problemas reportados por los usuarios.<br>
                    &nbsp;&nbsp;* Cualquier otro dato que sea confidencial o sensible.<br>
                    - No divulgar, compartir, copiar o usar esta información para ningún fin distinto al establecido en el proyecto, incluso después de finalizada mi participación en el mismo.
                  </li>
                  <li>
                    <strong>Protección de Datos Personales</strong><br>
                    Me comprometo a cumplir con la normativa vigente sobre protección de datos personales, incluyendo (pero no limitado a):<br>
                    - El Reglamento General de Protección de Datos (RGPD) o normativa equivalente aplicable.<br>
                    - Respetar los procedimientos establecidos en la plataforma para el manejo de datos sensibles.
                  </li>
                  <li>
                    <strong>Responsabilidad Ética y Profesional</strong><br>
                    - Actuar de manera profesional, ética y respetuosa durante las interacciones con los usuarios.<br>
                    - Evitar cualquier comportamiento que pueda poner en riesgo la seguridad de los datos de los usuarios o la reputación del proyecto.<br>
                    - Reportar inmediatamente cualquier incidente de seguridad, problema técnico o situación que pueda comprometer la privacidad de los usuarios.
                  </li>
                  <li>
                    <strong>Reconocimiento de la Naturaleza Voluntaria del Rol</strong><br>
                    Reconozco que mi participación en este proyecto es completamente voluntaria, no remunerada y que no implica una relación laboral con los responsables de la aplicación o con cualquier otra organización asociada al proyecto.
                  </li>
                  <li>
                    <strong>Consecuencias del Incumplimiento</strong><br>
                    Soy consciente de que el incumplimiento de cualquiera de los puntos anteriormente descritos puede dar lugar a la suspensión de mi participación en el proyecto y, en caso de ser necesario, a las acciones legales correspondientes según la normativa vigente.
                  </li>
                </ol>

                <p class="declaration-text">
                  <strong>Aceptación</strong><br>
                  Con mi nombre y DNI, declaro haber leído, entendido y aceptado los términos de esta Declaración de Responsabilidad y Confidencialidad, comprometiéndome a respetarlos en todo momento durante mi participación en el proyecto. Asimismo, autorizo a los responsables del proyecto a verificar la información proporcionada y a tomar las medidas necesarias en caso de incumplimiento.
                </p>
              </div>

              <!-- Campos de aceptación -->
              <div class="signature-fields">
                <div class="form-group">
                  <label for="declaracionNombre" class="form-label">Nombre completo</label>
                  <input 
                    v-model="form.declaracionNombre" 
                    type="text" 
                    id="declaracionNombre"
                    placeholder="Tu nombre completo"
                    class="form-control"
                    required
                  >
                  <div v-if="errors.declaracionNombre" class="error-message">{{ errors.declaracionNombre }}</div>
                </div>
                <div class="form-group">
                  <label for="declaracionDNI" class="form-label">DNI</label>
                  <input 
                    v-model="form.declaracionDNI" 
                    type="text" 
                    id="declaracionDNI"
                    placeholder="Tu número de DNI"
                    class="form-control"
                    required
                  >
                  <div v-if="errors.declaracionDNI" class="error-message">{{ errors.declaracionDNI }}</div>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn register-button">
                <i class="bi bi-check-circle"></i> Enviar Registro
              </button>
              <router-link to="/" class="btn back-button">
                <i class="bi bi-arrow-left"></i> Volver
              </router-link>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { declaracionService } from '@/services/declaracionService';
import { asistenteService } from '@/services/asistenteService';
import { supabase } from '../../../supabase';

export default {
  setup() {
    const form = ref({
      nombre: '',
      email: '',
      telefono: '',
      password: '',
      confirmPassword: '', 
      habilidades: '',
      declaracionNombre: '',
      declaracionDNI: ''
    });

    const errors = ref({});
    const errorMessage = ref('');
    const fechaActual = ref('');
    const router = useRouter();
    const authStore = useAuthStore();

    // Estado para mostrar/ocultar la contraseña
    const showPassword = ref(false);
    const showConfirmPassword = ref(false);

    // Función para alternar la visibilidad de la contraseña
    const toggleShowPassword = () => {
      showPassword.value = !showPassword.value;
    };

    // Función para alternar la visibilidad de la confirmación de contraseña
    const toggleShowConfirmPassword = () => {
      showConfirmPassword.value = !showConfirmPassword.value;
    };

    // Función para obtener la fecha actual
    const obtenerFechaActual = () => {
      const fecha = new Date();
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const año = fecha.getFullYear();
      fechaActual.value = `${dia}/${mes}/${año}`;
    };

    // Validar el formulario
    const validarFormulario = () => {
      errors.value = {};

      if (form.value.nombre.length < 2) {
        errors.value.nombre = 'El nombre debe tener al menos 2 caracteres.';
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
        errors.value.email = 'El correo electrónico no es válido.';
      }

      if (!/^\d{9,}$/.test(form.value.telefono)) {
        errors.value.telefono = 'El teléfono debe tener al menos 9 dígitos.';
      }

      if (form.value.password.length < 6) {
        errors.value.password = 'La contraseña debe tener al menos 6 caracteres.';
      }

      if (form.value.password !== form.value.confirmPassword) {
        errors.value.confirmPassword = 'Las contraseñas no coinciden.';
      }

      if (form.value.declaracionNombre.length < 2) {
        errors.value.declaracionNombre = 'El nombre completo es obligatorio.';
      }

      if (!/^\d{8}[A-Za-z]$/.test(form.value.declaracionDNI)) {
        errors.value.declaracionDNI = 'El DNI no es válido.';
      }

      return Object.keys(errors.value).length === 0;
    };

    const handleRegister = async () => {
      if (!validarFormulario()) {
        errorMessage.value = 'Por favor, corrige los errores en el formulario.';
        return;
      }
      let declaracion = null;
      let asistente = null;

      try {
        const { data, error } = await supabase.auth.signUp({
          email: form.value.email,
          password: form.value.password,
          options: {
            // Configura la redirección al login
            emailRedirectTo: 'http://localhost:5173/login'
          }
        });

        if (error) throw error;

        const userId = data.user.id;

        asistente = await asistenteService.createAsistente({
          user_id: userId, 
          nombre: form.value.nombre,
          telefono: form.value.telefono,
          email: form.value.email,
          habilidades: form.value.habilidades,
          rol: 'asistente',
          cuentaAceptada: false,
          activo: false,
          disponible: false
        });

        declaracion = await declaracionService.createDeclaracionResponsabilidad({
          asistente_id: asistente.id,
          nombre: form.value.declaracionNombre,
          dni: form.value.declaracionDNI,
          fecha: new Date().toISOString()
        });

        // Redirigir al login
        router.push('/login');
        
      } catch (error) {
        if(declaracion){
          await declaracionService.deleteDeclaracionById(declaracion.id);
        }
        else if(asistente){
          await asistenteService.deleteAsistente(asistente.id);
        }
        console.error('Error en el registro:', error.message);

        errorMessage.value = 'Hubo un error en el registro. Por favor, inténtalo de nuevo.';
      }
    };

    // Obtener la fecha actual al cargar el componente
    onMounted(() => {
      obtenerFechaActual();
    });

    return {
      form,
      errors,
      errorMessage,
      fechaActual,
      showPassword,
      showConfirmPassword,
      toggleShowPassword,
      toggleShowConfirmPassword,
      handleRegister
    };
  }
};
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  padding: 2rem;
  background-color: #f8f9fa;
  position: relative;
  z-index: 1;
}

.register-container::before {
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

.register-card-container {
  max-width: 900px;
  margin: 0 auto;
}

.register-card {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  background-color: #266cee;
  color: white;
  padding: 2rem;
  text-align: center;
}

.brand-icon {
  width: 70px;
  height: 70px;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 1rem;
}

.card-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.card-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

.card-body {
  padding: 2rem;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  margin-bottom: 0.5rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #444;
  margin-bottom: 0.5rem;
}

.form-label i {
  color: #266cee;
}

.form-control {
  width: 100%;
  padding: 0.8rem 1rem;
  font-size: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #266cee;
  box-shadow: 0 0 0 3px rgba(38, 108, 238, 0.15);
}

.password-input-wrapper {
  position: relative;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #777;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-toggle:hover {
  color: #266cee;
}

.error-message {
  color: #d32f2f;
  font-size: 0.8rem;
  margin-top: 0.3rem;
}

.alert {
  padding: 1rem;
  border-radius: 8px;
  background-color: #ffebee;
  color: #d32f2f;
  border: 1px solid #ffcdd2;
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.declaration-section {
  margin-top: 1rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #266cee;
}

.declaration-container {
  max-height: 300px;
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
  margin-bottom: 1.5rem;
}

.declaration-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

.declaration-info {
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.declaration-text {
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  line-height: 1.6;
}

.declaration-list {
  padding-left: 1.5rem;
  margin-bottom: 1.5rem;
}

.declaration-list li {
  margin-bottom: 1.2rem;
  font-size: 0.95rem;
  line-height: 1.6;
}

.signature-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.register-button, .back-button {
  flex: 1;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.register-button {
  background-color: #266cee;
  color: white;
  border: none;
}

.register-button:hover {
  background-color: #1e5bcc;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(38, 108, 238, 0.2);
}

.back-button {
  background-color: #f5f5f5;
  color: #555;
  border: 1px solid #ddd;
  text-decoration: none;
}

.back-button:hover {
  background-color: #ebebeb;
  color: #333;
}

/* Responsive styles */
@media (max-width: 768px) {
  .register-container {
    padding: 1rem;
  }
  
  .card-header {
    padding: 1.5rem;
  }
  
  .card-body {
    padding: 1.5rem;
  }
  
  .signature-fields {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>