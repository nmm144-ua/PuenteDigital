# PuenteDigital
TFG de Ingeniería Informática en el que se desarrollará una aplicación móvil para intentar ayudar con la brecha digital para las personas que la sufren.

1. npx eas build --profile development --platform android
2. npx expo start --dev-client


# Guía para Probar Apps de Expo en Dispositivos Móviles sin Expo Go

Esta guía te presenta dos métodos para probar tu aplicación Expo en un dispositivo móvil sin utilizar Expo Go, evitando la necesidad de Android Studio.

## Método 1: EAS Build (Build de Desarrollo Completo)

Este método crea una versión instalable de tu aplicación utilizando los servidores de Expo.

### Requisitos Previos
- Cuenta de Expo
- Node.js instalado
- Tu proyecto Expo inicializado

### Pasos

1. **Instala EAS CLI globalmente**
   ```bash
   npm install -g eas-cli
   ```

2. **Inicia sesión en tu cuenta de Expo**
   ```bash
   eas login
   ```

3. **Configura EAS Build en tu proyecto**
   ```bash
   eas build:configure
   ```

4. **Crea un perfil de desarrollo en tu archivo eas.json**
   Tu archivo eas.json debería contener algo similar a:
   ```json
   {
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         }
       },
       "preview": {
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         }
       },
       "production": {}
     }
   }
   ```

5. **Inicia el build de desarrollo**
   ```bash
   eas build --profile development --platform android
   ```

6. **Responde a las preguntas durante el proceso**
   - Cuando te pregunte "Generate a new Android Keystore?", selecciona "Yes" si es tu primer build
   - EAS generará y gestionará las credenciales por ti

7. **Espera a que se complete el build (10-20 minutos)**
   - Puedes seguir el progreso a través del enlace proporcionado
   - Una vez completado, podrás descargar el APK

8. **Instala el APK en tu dispositivo**
   - Transfiere el archivo APK a tu dispositivo
   - Instálalo (asegúrate de permitir la instalación de fuentes desconocidas)

### Ventajas
- No requiere configuración de entorno local
- Proceso completamente gestionado por Expo
- Ideal para pruebas ocasionales

### Desventajas
- Cada build toma tiempo (10-20 minutos)
- Requiere conexión a internet
- No ideal para desarrollo con cambios frecuentes

## Método 2: Expo Dev Client

Este método permite una experiencia de desarrollo más fluida para iteraciones rápidas.

### Requisitos Previos
- Cuenta de Expo
- Node.js instalado
- Tu proyecto Expo inicializado

### Pasos

1. **Instala expo-dev-client en tu proyecto**
   ```bash
   npx expo install expo-dev-client
   ```

2. **Instala EAS CLI si aún no lo has hecho**
   ```bash
   npm install -g eas-cli
   ```

3. **Inicia sesión en Expo**
   ```bash
   eas login
   ```

4. **Configura un perfil development-client en tu archivo eas.json**
   ```json
   {
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         }
       },
       "development-client": {
         "developmentClient": true,
         "distribution": "internal",
         "android": {
           "buildType": "apk",
           "gradleCommand": ":app:assembleDebug"
         }
       },
       "preview": {
         "distribution": "internal"
       },
       "production": {}
     }
   }
   ```

5. **Crea un build de desarrollo con dev client**
   ```bash
   eas build --profile development-client --platform android
   ```

6. **Responde a las preguntas durante el proceso**
   - Genera un nuevo Keystore si es necesario

7. **Instala la aplicación en tu dispositivo una vez completado el build**

8. **Inicia tu servidor de desarrollo local**
   ```bash
   npx expo start --dev-client
   ```

9. **Conecta tu dispositivo a la misma red WiFi que tu computadora**

10. **Abre la aplicación en tu dispositivo y escanea el código QR o ingresa la dirección manualmente**
    - La app instalada funcionará como un cliente de desarrollo
    - Se conectará a tu servidor de desarrollo local
    - Podrás ver los cambios en tiempo real (o casi real)

### Ventajas
- Desarrollo más rápido después de la configuración inicial
- Permite ver cambios sin necesidad de nuevos builds completos
- Experiencia de desarrollo cercana a usar Expo Go

### Desventajas
- Configuración inicial más compleja
- Requiere un build inicial que toma tiempo
- El dispositivo y la computadora deben estar en la misma red

## Consejos adicionales

### Para mejorar la experiencia de desarrollo:

1. **Usa tunneling si tienes problemas de conexión en la misma red**
   ```bash
   npx expo start --dev-client --tunnel
   ```

2. **Configura variables de entorno diferentes para desarrollo y producción**
   - Utiliza un archivo `.env.development` para configuraciones de desarrollo

3. **Actualiza regularmente tus dependencias**
   ```bash
   npx expo-doctor
   npx expo install --fix
   ```

4. **Prueba con el modo de producción ocasionalmente**
   - Los problemas de rendimiento pueden no ser evidentes en modo desarrollo

### Resolución de problemas comunes:

1. **Si el build falla:**
   - Revisa los logs completos en la página de EAS
   - Asegúrate de que todas las dependencias son compatibles
   - Verifica que no haya errores en el código

2. **Si la app no se conecta al servidor de desarrollo:**
   - Verifica que ambos dispositivos estén en la misma red
   - Prueba usando la opción de túnel
   - Asegúrate de que no hay firewalls bloqueando la conexión

3. **Si la app se cierra inesperadamente:**
   - Revisa los logs para errores no capturados
   - Asegúrate de manejar todos los posibles casos nulos
   - Verifica la compatibilidad de las APIs utilizadas

---

Con estos métodos podrás desarrollar y probar tu aplicación Expo en un dispositivo real sin necesidad de Expo Go ni Android Studio, eligiendo el enfoque que mejor se adapte a tu flujo de trabajo.
=======
## Para levantar la app

### Backend
BaaS hecho con supabase, por lo que no es necesario levantar la app

### App web
```
npm run dev
```

### App móvil
```
npm start
```
Y probar con el qr tanto en ios (com la url) como en android (con Expo Go). También se puede probar en la web.

