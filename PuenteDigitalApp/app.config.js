// app.config.js
export default {
    "name": "PuenteDigitalApp",
    "slug": "puentedigitalapp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.puentedigitalapp",
      "infoPlist": {
        "NSCameraUsageDescription": "Esta aplicación necesita acceso a la cámara para videollamadas",
        "NSMicrophoneUsageDescription": "Esta aplicación necesita acceso al micrófono para llamadas de voz",
        "NSPhotoLibraryUsageDescription": "Esta aplicación necesita acceso a tus fotos para compartir imágenes"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.puentedigitalapp",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.CHANGE_NETWORK_STATE",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.INTERNET"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "@config-plugins/react-native-webrtc",
        {
          "cameraPermissionText": "Esta aplicación necesita acceso a la cámara para videollamadas",
          "microphonePermissionText": "Esta aplicación necesita acceso al micrófono para llamadas de voz"
        }
      ],
      "expo-dev-client"
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  };