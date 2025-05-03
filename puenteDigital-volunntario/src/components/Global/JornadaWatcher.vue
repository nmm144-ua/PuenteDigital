// src/components/Global/JornadaWatcher.vue
<template>
  <!-- Componente sin renderizado -->
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const checkInterval = ref(null);
const CHECK_FREQUENCY = 60000; // Verificar cada minuto

// Verificar el estado de la jornada
const checkJornadaStatus = async () => {
  if (!authStore.isAuthenticated || !authStore.isAsistente) return;
  
  const previousStatus = !!authStore.jornadaActiva;
  await authStore.verificarJornadaActiva();
  const currentStatus = !!authStore.jornadaActiva;
  
  // Si el estado cambió de activo a inactivo (por ejemplo, alguien cerró la jornada desde otro lugar)
  if (previousStatus && !currentStatus) {
    // Verificar si estamos en una ruta que requiere activación
    const currentRoute = router.currentRoute.value;
    if (currentRoute.meta.requiresActivation) {
      // Redirigir a la página de activación
      router.push({ name: 'activacion' });
    }
  }
};

onMounted(() => {
  // Verificar inmediatamente
  checkJornadaStatus();
  
  // Configurar verificación periódica
  checkInterval.value = setInterval(checkJornadaStatus, CHECK_FREQUENCY);
});

onUnmounted(() => {
  if (checkInterval.value) {
    clearInterval(checkInterval.value);
  }
});
</script>