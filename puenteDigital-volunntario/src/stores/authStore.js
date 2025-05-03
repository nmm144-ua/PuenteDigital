import { defineStore } from 'pinia';
import { supabase } from '../../supabase'; // Importar el cliente de Supabase
import { asistenteService } from '@/services/asistenteService';
import { usuarioAppService } from '@/services/usuarioAppService';
import { jornadasService } from '@/services/jornadasService';
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Usuario autenticado
    asistenteID: null,
    session: null, // Sesión de Supabase
    isLoading: false, // Estado de carga
    error: null, // Mensaje de error
    userRole: null, // New state for user role
    asistenteInfo: null, // Información completa del asistente
    jornadaActiva: null, // Jornada activa del asistente
    asistenteBloqueado: true, // Estado bloqueado por defecto
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.userRole === 'admin',
    currentRole: (state) => state.userRole,
    isAsistente: (state) => state.userRole === 'asistente',
    canProvideAssistance: (state) => !state.asistenteBloqueado && state.jornadaActiva !== null,
  },
  actions: {

    // Verificar si el asistente tiene una jornada activa
    async verificarJornadaActiva() {
      if (!this.user || !this.isAsistente) return false;
      
      try {
        const asistente = await asistenteService.getAsistenteByUserId(this.user.id);
        this.asistenteInfo = asistente;
        
        // Buscar jornada activa (sin fecha de fin)
        const jornadas = await jornadasService.getJornadasByAsistenteId(asistente.id);
        const jornadaActiva = jornadas.find(j => !j.fin);
        
        this.jornadaActiva = jornadaActiva || null;
        this.asistenteBloqueado = !jornadaActiva;
        
        return !!jornadaActiva;
      } catch (error) {
        console.error('Error al verificar jornada activa:', error);
        this.jornadaActiva = null;
        this.asistenteBloqueado = true;
        return false;
      }
    },
    
    // Iniciar jornada para el asistente
    async iniciarJornada() {
      if (!this.user || !this.isAsistente || this.jornadaActiva) return false;
      
      try {
        const asistente = this.asistenteInfo || await asistenteService.getAsistenteByUserId(this.user.id);
        
        // Crear nueva jornada
        const nuevaJornada = await jornadasService.createJornada({
          asistente_id: asistente.id,
          inicio: new Date().toISOString(),
        });
        
        this.jornadaActiva = nuevaJornada;
        this.asistenteBloqueado = false;
        
        // Actualizar estado del asistente en la base de datos
        await asistenteService.actualizarEstadoAsistente(this.user.id, true);
        
        return true;
      } catch (error) {
        console.error('Error al iniciar jornada:', error);
        return false;
      }
    },
    
    // Finalizar jornada del asistente
    async finalizarJornada() {
      if (!this.jornadaActiva) return false;
      
      try {
        await jornadasService.terminarJornada(this.jornadaActiva.id);
        
        // Actualizar estado del asistente en la base de datos
        if (this.user) {
          await asistenteService.actualizarEstadoAsistente(this.user.id, false);
        }
        
        this.jornadaActiva = null;
        this.asistenteBloqueado = true;
        
        return true;
      } catch (error) {
        console.error('Error al finalizar jornada:', error);
        return false;
      }
    },

    // Iniciar sesión
    async login(email, password) {

      this.isLoading = true;
      this.error = null;
      try {
        try {
          const usuarioApp = await usuarioAppService.getUsuarioByEmail(email);
          if (usuarioApp && usuarioApp.length > 0) {
            throw new Error('Este email pertenece a un usuario del sistema usuariosApp y no puede iniciar sesión como asistente.');
          }
        } catch (userAppError) {
          // Si es el error que acabamos de lanzar, propagarlo
          if (userAppError.message.includes('usuariosApp')) {
            throw userAppError;
          }
          // Si es otro error (como que la tabla no existe)
          console.error('Error al verificar usuariosApp:', userAppError);
        }
        // Iniciar sesión con correo y contraseña
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        const auxAsistente = await asistenteService.getAsistenteByEmail(email);
        if (auxAsistente[0].cuentaAceptada == false) {
          supabase.auth.signOut();
          throw new Error('Tu cuenta aún no ha sido aceptada por un administrador.');
        }
        else if(auxAsistente[0].solicitudSuspendido == true) {
          supabase.auth.signOut();
          throw new Error('Tu cuenta tiene una solicitud de suspensión.');
        }


        // Get user role from asistentes table
        const { data: asistente } = await supabase
          .from('asistentes')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        // Actualizar el usuario con el rol
        this.user = data.user;
        this.asistenteID = data.id;
        this.session = data.session;
        this.userRole = asistente?.rol || 'asistente'; // Default to 'asistente' if no role found
        
        return true;

        return true;


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
        // Finalizar jornada activa si existe
        if (this.jornadaActiva) {
          await this.finalizarJornada();
        }
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Limpiar el estado
        this.user = null;
        this.asistenteID = null;
        this.session = null;
        this.userRole = null;
        this.asistenteInfo = null;
        this.jornadaActiva = null;
        this.asistenteBloqueado = true;
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
          // Obtener información del asistente
          const { data: asistente } = await supabase
            .from('asistentes')
            .select('*')
            .eq('user_id', data.session.user.id)
            .single();
          
          this.userRole = asistente?.rol || 'asistente';
          this.user = data.session.user || null;
          this.session = data.session || null;
          
          // Verificar jornada activa si es asistente
          if (this.userRole === 'asistente') {
            await this.verificarJornadaActiva();
          } else {
            // Si es admin, no necesita jornada
            this.asistenteBloqueado = false;
          }
        } else {
          this.user = null;
          this.session = null;
          this.userRole = null;
          this.jornadaActiva = null;
          this.asistenteBloqueado = true;
        }
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
    isAsistente: (state) => state.userRole === 'asistente',
  },
});