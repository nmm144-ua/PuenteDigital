<template>
    <div class="min-vh-100 bg-light">
      <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
          <a class="navbar-brand" href="#">PuenteDigital</a>
          <div class="d-flex">
            <router-link to="/login" class="btn btn-link text-light me-2">Iniciar Sesión</router-link>
            <router-link to="/register" class="btn btn-light text-primary">
              Soy Nuevo
            </router-link>
          </div>
        </div>
      </nav>
      
      <main class="container my-5">
        <div class="text-center mb-5">
          <h2 class="display-4 mb-4">¿Qué es PuenteDigital?</h2>
          <p class="lead text-muted mx-auto" style="max-width: 600px;">
            Una plataforma que conecta voluntarios con personas mayores para brindar
            asistencia técnica y apoyo en el uso de tecnologías digitales.
          </p>
        </div>
      </main>
    </div>
  </template>