<template>
  <div class="min-vh-100 bg-light py-5">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-body p-4">
              <h2 class="card-title text-center mb-4">Registro Nuevo Asistente</h2>
              
              <form @submit.prevent="handleRegister" class="needs-validation" novalidate>
                <div class="mb-3">
                  <label for="nombre" class="form-label">Nombre completo</label>
                  <input 
                    v-model="form.nombre" 
                    type="text" 
                    class="form-control"
                    id="nombre"
                    required
                  >
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
                </div>
                
                <div class="mb-3">
                  <label for="password" class="form-label">Contraseña</label>
                  <input 
                    v-model="form.password" 
                    type="password" 
                    class="form-control"
                    id="password"
                    required
                  >
                </div>
  
                <div class="mb-4">
                  <h3 class="h5 mb-3">Declaración de Responsabilidad</h3>
                  <div class="bg-light p-3 rounded">
                    <p class="text-muted small mb-3">
                      Me comprometo a mantener la confidencialidad de todos los datos personales
                      y la información sensible de los usuarios de PuenteDigital. Entiendo que esta
                      información solo debe ser utilizada para los fines específicos de brindar
                      asistencia técnica a través de la plataforma.
                    </p>
                    <div class="mb-3">
                      <input 
                        v-model="form.declaracionNombre" 
                        type="text" 
                        placeholder="Nombre completo"
                        class="form-control"
                        required
                      >
                    </div>
                    <div class="mb-3">
                      <input 
                        v-model="form.declaracionDNI" 
                        type="text" 
                        placeholder="DNI"
                        class="form-control"
                        required
                      >
                    </div>
                  </div>
                </div>
  
                <button 
                  type="submit"
                  class="btn btn-primary w-100"
                >
                  Enviar
                </button>
                <router-link to="/" class="btn btn-link me-2">Volver</router-link>

              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { supabase } from '../../supabase';

export default {
  setup() {
    const form = ref({
      nombre: '',
      email: '',
      telefono: '',
      password: '',
      declaracionNombre: '',
      declaracionDNI: ''
    });

    const handleRegister = async () => {
      try {
        // Registro del usuario en auth
        const { user, error: authError } = await supabase.auth.signUp({
          email: form.value.email,
          password: form.value.password
        });

        if (authError) throw authError;

        // Guardar datos del asistente
        const { error: profileError } = await supabase
          .from('asistentes')
          .insert([
            {
              user_id: user.id,
              nombre: form.value.nombre,
              telefono: form.value.telefono,
              email: form.value.email
            }
          ]);

        if (profileError) throw profileError;

        // Guardar declaración de responsabilidad
        const { error: declaracionError } = await supabase
          .from('declaraciones_responsabilidad')
          .insert([
            {
              asistente_id: user.id,
              nombre: form.value.declaracionNombre,
              dni: form.value.declaracionDNI,
              fecha: new Date()
            }
          ]);

        if (declaracionError) throw declaracionError;

        // Redirigir al home o dashboard
        router.push('/');
      } catch (error) {
        console.error('Error en el registro:', error.message);
        // Aquí deberías mostrar el error al usuario
      }
    };

    return {
      form,
      handleRegister
    };
  }
};
</script>