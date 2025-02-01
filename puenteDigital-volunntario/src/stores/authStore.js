import { defineStore } from 'pinia';
import { supabase } from '../../supabase'; // Importar el cliente de Supabase
import { asistenteService } from '@/services/asistenteService';
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Usuario autenticado
    session: null, // Sesión de Supabase
    isLoading: false, // Estado de carga
    error: null, // Mensaje de error
    userRole: null, // New state for user role
  }),
  actions: {
    // Iniciar sesión
    async login(email, password) {
      this.isLoading = true;
      this.error = null;
      try {
        
        // Iniciar sesión con correo y contraseña
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        const auxAsistente = await asistenteService.getAsistenteByEmail(email);
        if (auxAsistente[0].cuentaAceptada == false) {
          throw new Error('Tu cuenta aún no ha sido aceptada por un administrador.');
          supabase.auth.signOut();
        }


        // Get user role from asistentes table
        const { data: asistente } = await supabase
          .from('asistentes')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        // Actualizar el usuario con el rol
        this.user = data.user;
        this.session = data.session;
        this.userRole = asistente?.rol || 'asistente'; // Default to 'asistente' if no role found


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
        // Limpiar el estado
        this.user = null;
        this.session = null;
        this.userRole = null;
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
        if (data.session?.user) {
          // Get user role from asistentes table
          const { data: asistente } = await supabase
            .from('asistentes')
            .select('*')
            .eq('user_id', data.session.user.id)
            .single();
          
          this.userRole = asistente?.rol || 'asistente';
        }
        
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
        // Registrar un nuevo usuario
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        const asistenteData = {
          user_id: authData.user.id,
          nombre: userData.nombre,
          email: userData.email,
          telefono: userData.telefono,
          habilidades: userData.habilidades,
          rol: userData.isAdmin ? 'admin' : 'asistente', // Set role based on registration
        };
        
        const { error: profileError } = await supabase
          .from('asistentes')
          .insert([asistenteData]);
          if (profileError) throw profileError;
          this.user = authData.user;
          this.session = authData.session;
          this.userRole = asistenteData.rol;
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
    isAdmin: (state) => state.userRole === 'admin',
    currentRole: (state) => state.userRole,
  },
});