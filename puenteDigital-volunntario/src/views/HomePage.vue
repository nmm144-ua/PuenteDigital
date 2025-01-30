<template>
  <div class="min-vh-100 bg-light d-flex flex-column">

    <!-- Contenido principal -->
    <main class="container flex-grow-1 d-flex align-items-center">
      <div class="text-center w-100">
        <h1 class="display-4 mb-4">¿Qué es PuenteDigital?</h1>
        <p class="lead text-muted mx-auto mb-5" style="max-width: 600px;">
          Una plataforma que conecta voluntarios con personas mayores para brindar
          asistencia técnica y apoyo en el uso de tecnologías digitales.
        </p>

        <!-- Botones grandes -->
        <div class="d-grid gap-3 d-md-flex justify-content-center">
          <router-link to="/register" class="btn btn-primary btn-lg py-3 px-5">
            Soy Nuevo
          </router-link>
          <router-link to="/login" class="btn btn-outline-primary btn-lg py-3 px-5">
            Iniciar Sesión
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'Home',
};
</script>

<style scoped>
/* Estilos personalizados */
.navbar {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-lg {
  font-size: 1.25rem;
  font-weight: 500;
  border-radius: 12px;
}

.btn-outline-primary {
  border-width: 2px;
}
</style>