// src/services/permissions.service.js
import { Platform, Alert, Linking } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

class PermissionsService {
  // Solicitar permisos de cámara
  async requestCameraPermission() {
    try {
      const permission = Platform.select({
        android: PERMISSIONS.ANDROID.CAMERA,
        ios: PERMISSIONS.IOS.CAMERA,
      });
      
      const result = await request(permission);
      
      switch (result) {
        case RESULTS.GRANTED:
          console.log('Permiso de cámara concedido');
          return true;
        case RESULTS.DENIED:
          console.log('Permiso de cámara denegado');
          return false;
        case RESULTS.BLOCKED:
          console.log('Permiso de cámara bloqueado');
          this.showPermissionBlockedAlert('cámara');
          return false;
        default:
          console.log('Resultado de permiso desconocido:', result);
          return false;
      }
    } catch (error) {
      console.error('Error al solicitar permiso de cámara:', error);
      return false;
    }
  }
  
  // Solicitar permisos de micrófono
  async requestMicrophonePermission() {
    try {
      const permission = Platform.select({
        android: PERMISSIONS.ANDROID.RECORD_AUDIO,
        ios: PERMISSIONS.IOS.MICROPHONE,
      });
      
      const result = await request(permission);
      
      switch (result) {
        case RESULTS.GRANTED:
          console.log('Permiso de micrófono concedido');
          return true;
        case RESULTS.DENIED:
          console.log('Permiso de micrófono denegado');
          return false;
        case RESULTS.BLOCKED:
          console.log('Permiso de micrófono bloqueado');
          this.showPermissionBlockedAlert('micrófono');
          return false;
        default:
          console.log('Resultado de permiso desconocido:', result);
          return false;
      }
    } catch (error) {
      console.error('Error al solicitar permiso de micrófono:', error);
      return false;
    }
  }
  
  // Solicitar todos los permisos necesarios para videollamada
  async requestCallPermissions() {
    const cameraGranted = await this.requestCameraPermission();
    const microphoneGranted = await this.requestMicrophonePermission();
    
    return cameraGranted && microphoneGranted;
  }
  
  // Mostrar alerta cuando los permisos están bloqueados
  showPermissionBlockedAlert(permissionType) {
    Alert.alert(
      'Permiso requerido',
      `El permiso de ${permissionType} es necesario para usar esta función. Por favor, habilítalo en la configuración de tu dispositivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir configuración', onPress: this.openSettings }
      ]
    );
  }
  
  // Abrir configuración del dispositivo
  openSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert('No se pudo abrir la configuración');
    });
  };
}

export default new PermissionsService();