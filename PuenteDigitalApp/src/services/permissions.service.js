// src/services/permissions.service.js
import { Platform, PermissionsAndroid } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

class PermissionsService {
  // Solicitar permisos de cámara
  async requestCameraPermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Permiso de cámara",
            message: "La aplicación necesita acceso a tu cámara para realizar videollamadas",
            buttonNeutral: "Preguntarme después",
            buttonNegative: "Cancelar",
            buttonPositive: "Aceptar"
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Permiso de cámara concedido');
          return true;
        } else {
          console.log('Permiso de cámara denegado');
          return false;
        }
      } else if (Platform.OS === 'ios') {
        const result = await request(PERMISSIONS.IOS.CAMERA);
        if (result === RESULTS.GRANTED) {
          console.log('Permiso de cámara concedido');
          return true;
        } else {
          console.log('Permiso de cámara denegado');
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error al solicitar permiso de cámara:', error);
      return false;
    }
  }
  
  // Solicitar permisos de micrófono
  async requestMicrophonePermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Permiso de micrófono",
            message: "La aplicación necesita acceso a tu micrófono para realizar videollamadas",
            buttonNeutral: "Preguntarme después",
            buttonNegative: "Cancelar",
            buttonPositive: "Aceptar"
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Permiso de micrófono concedido');
          return true;
        } else {
          console.log('Permiso de micrófono denegado');
          return false;
        }
      } else if (Platform.OS === 'ios') {
        const result = await request(PERMISSIONS.IOS.MICROPHONE);
        if (result === RESULTS.GRANTED) {
          console.log('Permiso de micrófono concedido');
          return true;
        } else {
          console.log('Permiso de micrófono denegado');
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error al solicitar permiso de micrófono:', error);
      return false;
    }
  }
  
  // Verificar permiso de cámara
  async checkCameraPermission() {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        return result;
      } else if (Platform.OS === 'ios') {
        const result = await check(PERMISSIONS.IOS.CAMERA);
        return result === RESULTS.GRANTED;
      }
      
      return false;
    } catch (error) {
      console.error('Error al verificar permiso de cámara:', error);
      return false;
    }
  }
  
  // Verificar permiso de micrófono
  async checkMicrophonePermission() {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        return result;
      } else if (Platform.OS === 'ios') {
        const result = await check(PERMISSIONS.IOS.MICROPHONE);
        return result === RESULTS.GRANTED;
      }
      
      return false;
    } catch (error) {
      console.error('Error al verificar permiso de micrófono:', error);
      return false;
    }
  }
  
  // Solicitar todos los permisos necesarios para videollamadas
  async requestCallPermissions() {
    const cameraPermission = await this.requestCameraPermission();
    const microphonePermission = await this.requestMicrophonePermission();
    
    return cameraPermission && microphonePermission;
  }
  
  // Verificar todos los permisos necesarios para videollamadas
  async checkCallPermissions() {
    const cameraPermission = await this.checkCameraPermission();
    const microphonePermission = await this.checkMicrophonePermission();
    
    return cameraPermission && microphonePermission;
  }
}

export default new PermissionsService();