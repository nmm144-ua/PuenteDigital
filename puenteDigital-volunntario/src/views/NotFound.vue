<template>
    <div class="min-vh-100 bg-light py-5">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-8 col-lg-6">
            <div class="card shadow-sm">
              <div class="card-body p-4 text-center">
                <h1 class="display-4 text-danger">404</h1>
                <p class="lead">Página no encontrada</p>
                <p>La página que estás buscando no existe o ha sido movida.</p>
                <router-link to="/" class="btn btn-primary">
                  Volver al inicio
                </router-link>
              </div>
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
  /* Estilos similares al registro */
  .min-vh-100 {
    min-height: 100vh;
  }
  
  .bg-light {
    background-color: #f8f9fa;
  }
  
  .py-5 {
    padding-top: 3rem;
    padding-bottom: 3rem;
  }
  
  .shadow-sm {
    box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  }
  
  .text-danger {
    color: #dc3545;
  }
  
  .btn-primary {
    background-color: #0d6efd;
    border-color: #0d6efd;
  }
  
  .btn-primary:hover {
    background-color: #0b5ed7;
    border-color: #0a58ca;
  }
  </style>