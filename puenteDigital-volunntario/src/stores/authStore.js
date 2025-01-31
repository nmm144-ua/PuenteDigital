// src/stores/authStore.js
import { defineStore } from 'pinia';
import { supabase } from '../../supabase'; // Importar el cliente de Supabase

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Usuario autenticado
    session: null, // Sesión de Supabase
    isLoading: false, // Estado de carga
    error: null, // Mensaje de error
  }),
  actions: {
    // Iniciar sesión
    async login(email, password) {
      this.isLoading = true;
      this.error = null;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        this.user = data.user;
        this.session = data.session;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },
    // Cerrar sesión
    async logout() {
      this.isLoading = true;
      this.error = null;
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        this.user = null;
        this.session = null;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },
    // Verificar la sesión al cargar la aplicación
    async checkSession() {
      this.isLoading = true;
      this.error = null;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        this.user = data.session?.user || null;
        this.session = data.session || null;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },
    // Registro de nuevo usuario
    async register(email, password) {
      this.isLoading = true;
      this.error = null;
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        this.user = data.user;
        this.session = data.session;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },
  },
  getters: {
    // Verificar si el usuario está autenticado
    isAuthenticated: (state) => !!state.user,
  },
});