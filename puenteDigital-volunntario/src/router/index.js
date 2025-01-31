import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
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
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/:pathMatch(.*)*', // Captura todas las rutas no definidas
    component: () => import('../views/NotFound.vue'), // Vista de error 404
  },
  {
    path: '/menu-asistente',
    component: () => import('../views/MenuAsistente.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirigir al login si la ruta requiere autenticación y el usuario no está autenticado
    next('/login');
  } else {
    next();
  }
});

export default router
