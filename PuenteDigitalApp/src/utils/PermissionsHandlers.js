import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_STORAGE_KEY = 'device_info_permission_granted';

export const requestDeviceInfoPermissions = async () => {
  try {
    // Primero verificamos si el permiso ya fue otorgado anteriormente
    const storedPermission = await AsyncStorage.getItem(PERMISSION_STORAGE_KEY);
    
    if (storedPermission === 'true') {
      // Si ya tenemos el permiso almacenado, no volvemos a preguntar
      return true;
    }
    
    // Si no hay permiso almacenado, mostramos el diálogo
    return new Promise((resolve) => {
      Alert.alert(
        'Permiso necesario',
        'Para mejorar tu experiencia, necesitamos acceder a información básica de tu dispositivo e internet. Esta información se utiliza únicamente para identificar tu dispositivo y mejorar la seguridad.',
        [
          {
            text: 'No permitir',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Permitir',
            onPress: async () => {
              // Guardar que el usuario ha concedido el permiso
              await AsyncStorage.setItem(PERMISSION_STORAGE_KEY, 'true');
              resolve(true);
            },
          },
        ],
        { cancelable: false }
      );
    });
  } catch (error) {
    // En caso de error en el manejo de permisos, permitimos continuar
    return true;
  }
};

// Función para mostrar una alerta cuando el usuario deniega los permisos
export const showPermissionDeniedAlert = () => {
  Alert.alert(
    'Permisos requeridos',
    'Esta funcionalidad requiere permisos para acceder a información básica del dispositivo. Sin estos permisos, algunas características podrían no funcionar correctamente.',
    [
      {
        text: 'Aceptar',
        style: 'cancel',
      }
    ]
  );
};

// Si necesitas resetear el permiso (para pruebas)
export const resetDeviceInfoPermission = async () => {
  await AsyncStorage.removeItem(PERMISSION_STORAGE_KEY);
};