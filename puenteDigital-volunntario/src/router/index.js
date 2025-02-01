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
    component: HomePage
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true } // Solo accesible si NO está autenticado
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true } // Solo accesible si NO está autenticado
  },
  {
    path: '/menu-asistente',
    component: () => import('../views/MenuAsistente.vue'),
    meta: { 
      requiresAuth: true,
      roles: ['asistente']
    }
  },
  /*{
    path: '/menu-admin',
    component: () => import('../views/MenuAdmin.vue'),
    meta: { 
      requiresAuth: true,
      roles: ['admin']
    },
    children: [
      
    ]
  },*/
  {
    path: '/:pathMatch(.*)*',
    component: () => import('../views/NotFound.vue'),
  },
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
    return next(authStore.isAdmin ? '/menu-admin' : '/menu-asistente');
  }

  // Si la ruta requiere autenticación y el usuario no está autenticado
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next('/login');
  }

  // Si la ruta tiene roles específicos, verificar si el usuario tiene el rol necesario
  if (to.meta.roles && !to.meta.roles.includes(authStore.currentRole)) {
    // Redirigir según el rol del usuario
    if (authStore.isAdmin) {
      return next('/menu-admin');
    } else {
      return next('/menu-asistente');
    }
  }

  next();
});

export default router;