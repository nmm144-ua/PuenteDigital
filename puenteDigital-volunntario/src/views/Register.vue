<template>
  <div class="min-vh-100 bg-light py-5">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
          <div class="card shadow-sm">
            <div class="card-body p-4">
              <h2 class="card-title text-center mb-4">Registro Nuevo Asistente</h2>

              <!-- Mensaje de error -->
              <div v-if="errorMessage" class="alert alert-danger">
                {{ errorMessage }}
              </div>
              
              <form @submit.prevent="handleRegister" class="needs-validation" novalidate>
                <!-- Campos del formulario -->
                <div class="mb-3">
                  <label for="nombre" class="form-label">Nombre completo</label>
                  <input 
                    v-model="form.nombre" 
                    type="text" 
                    class="form-control"
                    id="nombre"
                    required
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
                    required
                  >
                  <div v-if="errors.email" class="text-danger small">{{ errors.email }}</div>
                </div>
                
                <div class="mb-3">
                  <label for="telefono" class="form-label">Teléfono</label>
                  <input 
                    v-model="form.telefono" 
                    type="tel" 
                    class="form-control"
                    id="telefono"
                    required
                  >
                  <div v-if="errors.telefono" class="text-danger small">{{ errors.telefono }}</div>
                </div>
                
                <!-- Campo de contraseña con botón para mostrar/ocultar -->
                <div class="mb-3">
                  <label for="password" class="form-label">Contraseña</label>
                  <div class="input-group">
                    <input 
                      v-model="form.password" 
                      :type="showPassword ? 'text' : 'password'" 
                      class="form-control"
                      id="password"
                      required
                    >
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary"
                      @click="toggleShowPassword"
                    >
                      <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                    </button>
                  </div>
                  <div v-if="errors.password" class="text-danger small">{{ errors.password }}</div>
                </div>

                <!-- Campo de confirmación de contraseña con botón para mostrar/ocultar -->
                <div class="mb-3">
                  <label for="confirmPassword" class="form-label">Confirmar Contraseña</label>
                  <div class="input-group">
                    <input 
                      v-model="form.confirmPassword" 
                      :type="showConfirmPassword ? 'text' : 'password'" 
                      class="form-control"
                      id="confirmPassword"
                      required
                    >
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary"
                      @click="toggleShowConfirmPassword"
                    >
                      <i :class="showConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                    </button>
                  </div>
                  <div v-if="errors.confirmPassword" class="text-danger small">{{ errors.confirmPassword }}</div>
                </div>
  
                <div class="mb-3">
                  <label for="habilidades" class="form-label">Habilidades</label>
                  <textarea 
                  v-model="form.habilidades" 
                  class="form-control"
                  id="habilidades"
                  rows="4"
                  placeholder="Describe tus habilidades técnicas..."
                  ></textarea>
                </div>
    
                <!-- Declaración de Responsabilidad -->
                <div class="mb-4">
                  <h3 class="h5 mb-3">Declaración de Responsabilidad</h3>
                  <div class="bg-light p-3 rounded declaracion-responsabilidad">
                    <h4 class="h6 fw-bold">Declaración de Responsabilidad y Confidencialidad</h4>
                    <p class="mb-2"><strong>Proyecto:</strong> PuenteDigital</p>
                    <p class="mb-2"><strong>Fecha:</strong> {{ fechaActual }}</p>
  
                    <p class="mb-3">
                      Por la presente, en calidad de asistente voluntario en el proyecto de desarrollo de una aplicación móvil que conecta a personas mayores con competencias digitales limitadas con voluntarios para proporcionarles soporte técnico y tutoría personalizada, declaro lo siguiente:
                    </p>
  
                    <ol class="mb-3">
                      <li class="mb-3">
                        <strong>Finalidad del Rol</strong><br>
                        Mi rol como asistente voluntario consiste en proporcionar soporte técnico y tutoría a los usuarios de la plataforma mediante videollamadas, chat en vivo y otros métodos de comunicación establecidos en la plataforma. Reconozco que mi labor se desarrolla bajo los principios de inclusión digital y respeto a los usuarios.
                      </li>
                      <li class="mb-3">
                        <strong>Confidencialidad de la Información</strong><br>
                        Me comprometo a:<br>
                        - Mantener absoluta confidencialidad sobre toda la información personal, técnica o confidencial de los usuarios a la que tenga acceso durante la ejecución de mis tareas, incluyendo pero no limitado a:<br>
                        &nbsp;&nbsp;* Datos personales (nombre, dirección, número de teléfono, edad, etc.).<br>
                        &nbsp;&nbsp;* Información técnica o problemas reportados por los usuarios.<br>
                        &nbsp;&nbsp;* Cualquier otro dato que sea confidencial o sensible.<br>
                        - No divulgar, compartir, copiar o usar esta información para ningún fin distinto al establecido en el proyecto, incluso después de finalizada mi participación en el mismo.
                      </li>
                      <li class="mb-3">
                        <strong>Protección de Datos Personales</strong><br>
                        Me comprometo a cumplir con la normativa vigente sobre protección de datos personales, incluyendo (pero no limitado a):<br>
                        - El Reglamento General de Protección de Datos (RGPD) o normativa equivalente aplicable.<br>
                        - Respetar los procedimientos establecidos en la plataforma para el manejo de datos sensibles.
                      </li>
                      <li class="mb-3">
                        <strong>Responsabilidad Ética y Profesional</strong><br>
                        - Actuar de manera profesional, ética y respetuosa durante las interacciones con los usuarios.<br>
                        - Evitar cualquier comportamiento que pueda poner en riesgo la seguridad de los datos de los usuarios o la reputación del proyecto.<br>
                        - Reportar inmediatamente cualquier incidente de seguridad, problema técnico o situación que pueda comprometer la privacidad de los usuarios.
                      </li>
                      <li class="mb-3">
                        <strong>Reconocimiento de la Naturaleza Voluntaria del Rol</strong><br>
                        Reconozco que mi participación en este proyecto es completamente voluntaria, no remunerada y que no implica una relación laboral con los responsables de la aplicación o con cualquier otra organización asociada al proyecto.
                      </li>
                      <li class="mb-3">
                        <strong>Consecuencias del Incumplimiento</strong><br>
                        Soy consciente de que el incumplimiento de cualquiera de los puntos anteriormente descritos puede dar lugar a la suspensión de mi participación en el proyecto y, en caso de ser necesario, a las acciones legales correspondientes según la normativa vigente.
                      </li>
                    </ol>
  
                    <p class="mb-0">
                      <strong>Aceptación</strong><br>
                      Con mi nombre y DNI, declaro haber leído, entendido y aceptado los términos de esta Declaración de Responsabilidad y Confidencialidad, comprometiéndome a respetarlos en todo momento durante mi participación en el proyecto. Asimismo, autorizo a los responsables del proyecto a verificar la información proporcionada y a tomar las medidas necesarias en caso de incumplimiento.
                    </p>
                  </div>
  
                  <!-- Campos de aceptación -->
                  <div class="mb-3 mt-3">
                    <input 
                      v-model="form.declaracionNombre" 
                      type="text" 
                      placeholder="Nombre completo"
                      class="form-control"
                      required
                    >
                    <div v-if="errors.declaracionNombre" class="text-danger small">{{ errors.declaracionNombre }}</div>
                  </div>
                  <div class="mb-3">
                    <input 
                      v-model="form.declaracionDNI" 
                      type="text" 
                      placeholder="DNI"
                      class="form-control"
                      required
                    >
                    <div v-if="errors.declaracionDNI" class="text-danger small">{{ errors.declaracionDNI }}</div>
                  </div>
                </div>
    
                <!-- Botones -->
                <button type="submit" class="btn btn-primary w-100 mb-3">
                  Enviar
                </button>
                <router-link to="/" class="btn btn-link w-100 text-center">
                  Volver
                </router-link>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore'; // Importar el store de autenticación
import { supabaseService } from '../services/supabaseService'; // Importar el servicio
import { supabase } from '../../supabase'; // Importar el cliente de Supabase

export default {
  setup() {
    const form = ref({
      nombre: '',
      email: '',
      telefono: '',
      password: '',
      confirmPassword: '', // Nuevo campo para confirmar la contraseña
      habilidades: '',
      declaracionNombre: '',
      declaracionDNI: ''
    });

    const errors = ref({});
    const errorMessage = ref('');
    const fechaActual = ref('');
    const router = useRouter();
    const authStore = useAuthStore(); // Usar el store de autenticación

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

      try {
        const { data, error } = await supabase.auth.signUp({
          email: form.value.email,
          password: form.value.password,
        });

        if (error) throw error;

        const userId = data.user.id;

        const asistente = await supabaseService.createAsistente({
          user_id: userId, 
          nombre: form.value.nombre,
          telefono: form.value.telefono,
          email: form.value.email,
          habilidades: form.value.habilidades,
        });

        await supabaseService.createDeclaracionResponsabilidad({
          asistente_id: asistente.id,
          nombre: form.value.declaracionNombre,
          dni: form.value.declaracionDNI,
          fecha: new Date().toISOString()
        });

        // Actualizar el estado de autenticación en el store
        authStore.user = data.user;

        // Redirigir al menú del asistente
        router.push('/menu-asistente');
      } catch (error) {
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
.declaracion-responsabilidad {
  max-height: 400px;
  overflow-y: auto;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.declaracion-responsabilidad ol {
  padding-left: 20px;
}

.declaracion-responsabilidad li {
  margin-bottom: 10px;
}

.btn-link {
  text-decoration: none;
}

.btn-link:hover {
  text-decoration: underline;
}

/* Estilos para el botón de mostrar/ocultar contraseña */
.input-group button {
  border-radius: 0 0.25rem 0.25rem 0;
}
</style>