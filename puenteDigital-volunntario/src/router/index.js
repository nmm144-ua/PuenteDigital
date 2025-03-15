// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import Login from '../views/Auth/Login.vue';
import Register from '../views/Auth/Register.vue';
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
        component: () => import('../views/Asistente/MenuAsistente.vue')
      },
      {
        path: 'perfil',
        name: 'PerfilAsistente',
        component: () => import('../views/Asistente/PerfilAsistente.vue')
      },
      {
        path: 'historial',
        name: 'HistorialAsistente',
        component: () => import('../views/NoDisponible.vue')
      },
      {
        path: 'estado',
        name: 'EstadoAsistente',
        component: () => import('../views/Asistente/EstadoAsistente.vue')
      },
      {
        path: 'detalles/{id}',
        name: 'DetallesAsistente',
        component: () => import('../components/DetallesAsistente.vue')
      },
      // Actualiza las rutas de videollamada para usar VideollamadaView
      {
        path: 'call',
        name: 'HomeCall',
        component: () => import('../views/VideoCall/HomeCallView.vue')
      },
      {
        path: 'videollamada/:id',  // Nueva ruta para el nuevo componente
        name: 'VideollamadaView',
        component: () => import('../views/VideoCall/VideoLlamadaView.vue'),
        props: route => ({
          roomId: route.params.id,
          role: 'asistente',  // Por defecto es asistente en esta ruta
          userName: useAuthStore().user?.nombre || 'Asistente'
        })
      },
      // Mantener rutas antiguas para retrocompatibilidad
      {
        path: 'room',
        name: 'room',
        component: () => import('../views/VideoCall/RoomView.vue'),
      },
      {
        path: 'room/:id',
        name: 'Room',
        component: () => import('../views/VideoCall/RoomView.vue')
      },
      {
        path: 'gestion-llamadas',
        name: 'GestionLlamadas',
        component: () => import('../views/Asistente/GestionLlamadas.vue')
      },
    ]
  },
  {
    path: '/admin',
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      { path: '',
        name: 'DashboardAdmin',
        component: () => import('../views/Admin/MenuAdmin.vue')
      },
      { path: 'activar-asistente',
        name: 'Activar Asistente',
        component: () => import('../views/Admin/NoActivosTable.vue')
      },
      {
        path: 'asistentes',
        name: 'Asistentes',
        component: () => import('../views/Admin/ListadoAsistentes.vue')
      },
      {
        path: 'perfil',
        name: 'PerfilAdmin',
        component: () => import('../views/Admin/PerfilAdmin.vue')
      },
      {
        path: 'usuarios',
        name: 'Usuarios',
        component: () => import('../views/NoDisponible.vue')
      },
      {
        path: 'suspendidos',
        name: 'Suspendidos',
        component: () => import('../views/Admin/ListadoSuspendidos.vue')
      },
      {
        path: 'UsuariosAppMovil',
        name: 'UsuariosAppMovil',
        component: () => import('../views/Admin/ListadoUsuariosAppMovil.vue')
      }
    ]
  },
  // Ruta pública para usuarios que acceden desde móvil o link
  {
    path: '/videollamada/:id',
    name: 'VideollamadaPublica',
    component: () => import('../views/VideoCall/VideoLlamadaView.vue'),
    props: route => ({
      roomId: route.params.id,
      role: route.query.role || 'usuario',  // Por defecto es usuario
      userName: route.query.nombre || 'Usuario'
    })
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
    component: () => import('../views/Auth/ForgotPassword.vue')
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/Auth/ResetPassword.vue')
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