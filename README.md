# PuenteDigital

**PuenteDigital** es una plataforma que conecta voluntarios con personas mayores para brindar asistencia técnica y apoyo en el uso de tecnologías digitales. Su objetivo es fomentar la inclusión digital y la autonomía de los adultos mayores a través del acompañamiento personalizado de voluntarios.

---

## 🖥️ Pantalla de Inicio

![Pantalla de Inicio](./Inicio.png)

La pantalla de inicio presenta las funcionalidades principales de la plataforma:

- **Conecta**: Une personas mayores con voluntarios tecnológicos.
- **Asiste**: Brinda soporte técnico personalizado.
- **Apoya**: Fomenta la autonomía digital para todos.

---

## 🚀 Funcionalidades Principales

- 👥 **Conexión de Usuarios**: Facilita el contacto entre personas mayores y voluntarios.
- 💬 **Asistencia Técnica**: Soporte personalizado para resolver dudas o problemas tecnológicos.
- 👍 **Fomento de Autonomía**: Promueve el aprendizaje continuo y la independencia digital.

---

## 🟢 Inicio de la Aplicación

Para ejecutar el proyecto localmente, asegúrate de iniciar correctamente cada parte del sistema:

### 🔹 Aplicación Web (Vue)

Ubicada en la carpeta `puenteDigital-voluntario`.

```bash
npm run dev
```

### 🔹 Aplicación Móvil (React Native)

Ubicada en la carpeta `PuenteDigitalApp`.

```bash
npx expo start --dev-client
```

### 🔹 Servidor de Señalización

Ubicado en la carpeta `video-signaling-server`.

```bash
node server.js
```

### ⚠️ Configuración Importante

1. En los archivos `supabase.js` de `PuenteDigitalApp` y `puenteDigital-voluntario`:
   - Reemplaza la URL y la clave de Supabase por las de tu proyecto de Supabase previamente creado.
   - Puedes utilizar el archivo `BD.sql` para generar las tablas necesarias en Supabase.

2. En `PuenteDigitalApp`, dentro del archivo `socketService.js`, debes sustituir la línea:

```js
// Server URL - cambiar a la URL real de tu servidor
this.serverUrl = 'http://example.example';
```

   por la URL real del servidor en tu red o entorno de producción.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend Móvil PuenteDigitalApp**: React Native
- **Frontend Web PuenteDigital-voluntario**: Vue.js
- **Servidor de Señalización**: Node.js
- **Backend**: Supabase y Node.js
- **Diseño**: HTML, CSS moderno y componentes accesibles.

---

## 📬 Contacto

Si tienes dudas o sugerencias, no dudes en crear un issue o contactarme a través del perfil de GitHub.

Gracias por visitar PuenteDigital ❤️