import { supabase } from '../../supabase';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Crear el servicio de autenticación
const createAuthService = () => {
  return {
    // Obtener información del dispositivo
    async getDeviceInfo() {
      try {
        // Obtener ID del dispositivo según la plataforma
        let deviceId = 'unknown';
        
        if (Platform.OS === 'android') {
          try {
            deviceId = Application.androidId || `android-${Device.modelName}-${Date.now()}`;
          } catch (e) {
            deviceId = `android-device-${Date.now()}`;
          }
        } else if (Platform.OS === 'ios') {
          try {
            deviceId = await Application.getIosIdForVendorAsync();
            if (!deviceId) {
              deviceId = `ios-${Device.modelName}-${Date.now()}`;
            }
          } catch (e) {
            deviceId = `ios-device-${Date.now()}`;
          }
        } else {
          deviceId = `web-device-${Date.now()}`;
        }
        
        // Obtener dirección IP con manejo de errores
        let ipAddress = 'unknown';
        try {
          ipAddress = await Network.getIpAddressAsync();
        } catch (e) {
          // No es necesario registrar este error
        }
        
        return { deviceId, ipAddress };
      } catch (error) {
        // Generar un ID único en caso de error
        const fallbackId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        return { deviceId: fallbackId, ipAddress: 'unknown' };
      }
    },

    // Registrar dispositivo anónimo
    async registerAnonymousUser() {
      try {
        // 1. Obtener info del dispositivo
        const deviceInfo = await this.getDeviceInfo();
        
        // 2. Verificar que haya un ID de dispositivo válido
        if (!deviceInfo.deviceId || deviceInfo.deviceId === 'unknown') {
          deviceInfo.deviceId = `anonymous-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
        
        // 3. Intentar registrar en Supabase
        try {
          // Primero verificar si ya existe este dispositivo
          const { data: existingData, error: fetchError } = await supabase
            .from('usuario')
            .select('*')
            .eq('id_dispositivo', deviceInfo.deviceId)
            .maybeSingle();
          
          if (!fetchError && existingData) {
            // Si ya existe, actualizar la IP y fecha de acceso
            const { data, error } = await supabase
              .from('usuario')
              .update({
                ultimo_acceso: new Date().toISOString(),
                ip: deviceInfo.ipAddress
              })
              .eq('id_dispositivo', deviceInfo.deviceId)
              .select();
              
            if (!error) {
              // Guardar en AsyncStorage para acceso fácil
              const userData = {
                id: data[0]?.id || existingData.id,
                id_dispositivo: deviceInfo.deviceId,
                tipo_usuario: 'anonimo'
              };
              
              await AsyncStorage.setItem('userData', JSON.stringify(userData));
              return { success: true, data: data[0] || existingData };
            }
          }
          
          // Si no existe o hubo error al actualizar, intentar insertar
          const { data, error } = await supabase
            .from('usuario')
            .insert({
              ip: deviceInfo.ipAddress,
              id_dispositivo: deviceInfo.deviceId,
              tipo_usuario: 'anonimo',
              fecha_registro: new Date().toISOString(),
              ultimo_acceso: new Date().toISOString()
            })
            .select();

          if (error) throw error;
          
          // Guardar en AsyncStorage para acceso fácil
          if (data && data.length > 0) {
            const userData = {
              id: data[0].id,
              id_dispositivo: deviceInfo.deviceId,
              tipo_usuario: 'anonimo'
            };
            
            await AsyncStorage.setItem('userData', JSON.stringify(userData));
          }
          
          return { success: true, data: data[0] };
        } catch (supabaseError) {
          // Si falla la inserción, intentar una última vez sin onConflict
          try {
            const { data, error } = await supabase
              .from('usuario')
              .insert({
                ip: deviceInfo.ipAddress,
                id_dispositivo: deviceInfo.deviceId,
                tipo_usuario: 'anonimo',
                fecha_registro: new Date().toISOString(),
                ultimo_acceso: new Date().toISOString()
              })
              .select();
              
            if (!error && data) {
              // Guardar en AsyncStorage para acceso fácil
              if (data && data.length > 0) {
                const userData = {
                  id: data[0].id,
                  id_dispositivo: deviceInfo.deviceId,
                  tipo_usuario: 'anonimo'
                };
                
                await AsyncStorage.setItem('userData', JSON.stringify(userData));
              }
              
              return { success: true, data: data[0] };
            }
          } catch (finalError) {
            throw finalError;
          }
          
          throw supabaseError;
        }
      } catch (error) {
        return { success: false, error: { message: 'No se pudo registrar el usuario anónimo' } };
      }
    },

    // Registrar usuario con credenciales
    async registerUser(fullName, email, password) {
      try {
        const { deviceId, ipAddress } = await this.getDeviceInfo();
        
        // 1. Registrar en auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        // 2. Registrar en tabla usuarios
        const { data, error } = await supabase
          .from('usuario')
          .insert({
            user_id: authData.user.id,
            email,
            nombre: fullName,
            ip: ipAddress,
            id_dispositivo: deviceId,
            tipo_usuario: 'registrado',
            fecha_registro: new Date().toISOString(),
            ultimo_acceso: new Date().toISOString()
          })
          .select();

        if (error) throw error;
        
        // Guardar información de usuario en AsyncStorage
        if (data && data.length > 0) {
          const userData = {
            id: data[0].id,
            user_id: authData.user.id,
            nombre: fullName,
            email,
            tipo_usuario: 'registrado'
          };
          
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
        }
        
        return { success: true, data: authData };
      } catch (error) {
        return { success: false, error };
      }
    },

    // Login de usuario
    async loginUser(email, password) {
      try {
        const { deviceId, ipAddress } = await this.getDeviceInfo();

        // 1. Login en auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        // 2. Obtener información del usuario de la tabla usuario
        const { data: userData, error: userQueryError } = await supabase
          .from('usuario')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();

        if (!userQueryError && userData) {
          // 3. Actualizar IP y último acceso
          await supabase
            .from('usuario')
            .update({
              ip: ipAddress,
              ultimo_acceso: new Date().toISOString(),
              id_dispositivo: deviceId // Actualizar también el id de dispositivo
            })
            .eq('id', userData.id);
          
          // 4. Guardar en AsyncStorage
          const userDataStorage = {
            id: userData.id,
            user_id: authData.user.id,
            nombre: userData.nombre,
            email: userData.email,
            tipo_usuario: userData.tipo_usuario
          };
          
          await AsyncStorage.setItem('userData', JSON.stringify(userDataStorage));
        }

        return { success: true, data: authData };
      } catch (error) {
        return { success: false, error };
      }
    },

    // Cerrar sesión
    async logout() {
      try {
        // Eliminar información de usuario del AsyncStorage
        await AsyncStorage.removeItem('userData');
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    }
  };
};

// Exportar una instancia del servicio
export const authService = createAuthService();