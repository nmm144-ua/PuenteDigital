// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import { useAuthStore } from '../stores/authStore';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: { requiresGuest: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true }
  },
  {
    path: '/asistente',
    meta: { requiresAuth: true, roles: ['asistente'] },
    children: [
      {
        path: '',
        name: 'DashboardAsistente',
        component: () => import('../views/MenuAsistente.vue')
      },
      {
        path: 'perfil',
        name: 'PerfilAsistente',
        component: () => import('../views/PerfilAsistente.vue')
      },
      {
        path: 'historial',
        name: 'HistorialAsistente',
        component: () => import('../views/NoDisponible.vue')
      },
      {
        path: 'estado',
        name: 'EstadoAsistente',
        component: () => import('../views/EstadoAsistente.vue')
      },
    ]
  },
  {
    path: '/menu-admin',
    component: () => import('../views/NoDisponible.vue'),
    meta: { requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('../views/NotFound.vue'),
  },
  {
    path: '/pagina-no-disponible',
    component: () => import('../views/NoDisponible.vue'),
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPassword.vue')
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/ResetPassword.vue')
  }
];


const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Esperar a que se verifique la sesión si aún no se ha hecho
  if (!authStore.sessionChecked) {
    await authStore.checkSession();
  }

  // Si la ruta requiere no estar autenticado (login/register) y el usuario está autenticado
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return next(authStore.isAdmin ? '/admin' : '/asistente');
  }

  // Si la ruta requiere autenticación y el usuario no está autenticado
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next('/login');
  }

  // Si la ruta tiene roles específicos, verificar si el usuario tiene el rol necesario
  if (to.meta.roles && !to.meta.roles.includes(authStore.currentRole)) {
    // Redirigir según el rol del usuario
    if (authStore.isAdmin) {
      return next('/admin');
    } else {
      return next('/asistente');
    }
  }

  next();
});

export default router;