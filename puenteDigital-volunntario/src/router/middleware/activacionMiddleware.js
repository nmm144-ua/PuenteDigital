// src/router/middleware/activacionMiddleware.js
import { useAuthStore } from '@/stores/authStore';

export const activacionMiddleware = async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Si la ruta no requiere activación, permitir siempre
  if (!to.meta.requiresActivation) {
    return next();
  }
  
  // Si la ruta requiere activación, verificar autenticación
  if (!authStore.isAuthenticated) {
    return next({ name: 'login' });
  }
  
  // Si es admin, permitir siempre
  if (authStore.isAdmin) {
    return next();
  }
  
  // Solo para asistentes, verificar estado de activación
  if (authStore.isAsistente) {
    // Verificar estado actual
    await authStore.verificarJornadaActiva();
    
    // Si está bloqueado y la ruta requiere activación, redirigir a activación
    if (authStore.asistenteBloqueado && to.meta.requiresActivation) {
      return next({ name: 'activacion' });
    }
    
    // Si está activo o la ruta no requiere activación, permitir
    return next();
  }
  
  // Por defecto, permitir acceso
  return next();
};