<script setup>
import { RouterLink, RouterView } from 'vue-router';


</script>

<template>
  <!-- Navbar -->
  <nav class="navbar navbar-dark bg-primary">
      <div class="container">
        <a class="navbar-brand" href="/">PuenteDigital</a>
      </div>
    </nav>
    <router-view></router-view>
</template>