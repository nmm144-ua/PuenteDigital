<template>
  <div class="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-custom">
    <div class="row justify-content-center">
      <div class="col-md-10 col-lg-8">
        <div class="card shadow-lg">
          <div class="card-body p-5 text-center">
            <h1 class="display-1 text-danger fw-bold">404</h1>
            <p class="display-6">Página no encontrada</p>
            <p class="fs-4">La página que estás buscando no existe o ha sido movida.</p>
            <router-link to="/" class="btn btn-lg btn-primary mt-3">
              Volver al inicio
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFound',
};
</script>

<style scoped>
/* Fondo azul personalizado */
.bg-custom {
  background-color: #ffffff;
}

/* Asegurar que ocupe toda la pantalla */
.min-vh-100 {
  min-height: 100vh;
}

/* Hacer que el contenedor sea responsive */
.col-md-10 {
  max-width: 80%;
}

.col-lg-8 {
  max-width: 60%;
}

/* Mejorar la sombra de la tarjeta */
.shadow-lg {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

/* Aumentar tamaño de texto */
.display-1 {
  font-size: 5rem;
}

.display-6 {
  font-size: 2.5rem;
}

.fs-4 {
  font-size: 1.5rem;
}

/* Botón más grande */
.btn-lg {
  font-size: 1.2rem;
  padding: 0.75rem 1.5rem;
}

/* Estilos del botón */
.btn-primary {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.btn-primary:hover {
  background-color: #0b5ed7;
  border-color: #0a58ca;
}
</style>
