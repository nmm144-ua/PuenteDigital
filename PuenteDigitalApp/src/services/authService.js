import { supabase } from '../../supabase';
import * as Application from 'expo-application';
import * as Network from 'expo-network';

export const authService = {
  // Obtener información del dispositivo
  async getDeviceInfo() {
    try {
      //const deviceId = Application.androidId || Application.applicationId; // androidId para Android, applicationId para iOS
      const ipAddress = await Network.getIpAddressAsync();
      return { deviceId, ipAddress };
    } catch (error) {
      console.error('Error getting device info:', error);
      return { deviceId: 'unknown', ipAddress: 'unknown' };
    }
  },

  // Registrar dispositivo anónimo
  async registerAnonymousUser() {
   /* try {
     // const { deviceId, ipAddress } = await this.getDeviceInfo();
        
      const { data, error } = await supabase
        .from('usuario')
        .upsert(
          {
            ip: ipAddress,
            id_dispositivo: deviceId,
          },
          {
            onConflict: 'id_dispositivo',
            ignoreDuplicates: false,
          }
        );

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error registering anonymous user:', error);
      return { success: false, error };
    }*/
  },

  // Registrar usuario con credenciales
  async registerUser(fullName, email, password) {
    try {
      //const { deviceId, ipAddress } = await this.getDeviceInfo();

      // 1. Registrar en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Registrar en tabla usuarios
      const { data, error } = await supabase
        .from('usuario')
        .upsert(
          {
            user_id: authData.user.id,
            email,
            nombre: fullName,
            //ip: ipAddress,
            //id_dispositivo: deviceId,
          },
          /*{
            onConflict: 'id_dispositivo',
            ignoreDuplicates: false,
          }*/
        );

      if (error) throw error;
      return { success: true, data: authData };
    } catch (error) {
      console.error('Error in registration:', error);
      return { success: false, error };
    }
  },

  // Login de usuario
  async loginUser(email, password) {
    try {
      //const { deviceId, ipAddress } = await this.getDeviceInfo();

      // 1. Login en auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Actualizar IP en tabla usuarios
      /*const { error: updateError } = await supabase
        .from('usuario')
        .update({
          ip: ipAddress,
          ultimo_acceso: new Date(),
        })
        .eq('user_id', authData.user.id);

      if (updateError) throw updateError;*/

      return { success: true, data: authData };
    } catch (error) {
      console.error('Error in login:', error);
      return { success: false, error };
    }
  },

  // Cerrar sesión
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error in logout:', error);
      return { success: false, error };
    }
  }
};