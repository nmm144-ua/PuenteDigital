<!-- src/views/VideoCall/HomeCallView.vue -->
<template>
    <div class="home-call">
      <div class="call-container">
        <h1>Videollamada de Soporte</h1>
        
        <div class="call-options">
          <div class="option-card">
            <h2>Crear una nueva sala</h2>
            <div class="input-group">
              <label for="hostName">Tu nombre:</label>
              <input 
                id="hostName" 
                v-model="hostName" 
                placeholder="Ingresa tu nombre" 
                @keyup.enter="createRoom"
              />
            </div>
            <button 
              class="action-button create-button" 
              @click="createRoom"
              :disabled="!hostName.trim() || loading"
            >
              <i class="fas fa-plus-circle"></i> Crear sala
            </button>
          </div>
          
          <div class="option-card">
            <h2>Unirse a una sala existente</h2>
            <div class="input-group">
              <label for="userName">Tu nombre:</label>
              <input 
                id="userName" 
                v-model="userName" 
                placeholder="Ingresa tu nombre" 
              />
            </div>
            <div class="input-group">
              <label for="roomId">ID de la sala:</label>
              <input 
                id="roomId" 
                v-model="roomIdToJoin" 
                placeholder="Ingresa el ID de la sala" 
                @keyup.enter="joinRoom"
              />
            </div>
            <button 
              class="action-button join-button" 
              @click="joinRoom"
              :disabled="!userName.trim() || !roomIdToJoin.trim() || loading"
            >
              <i class="fas fa-sign-in-alt"></i> Unirse a sala
            </button>
          </div>
        </div>
        
        <div v-if="error" class="error-message">
          <i class="fas fa-exclamation-triangle"></i> {{ error }}
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { useCallStore } from '../../stores/call.store';
  
  export default {
    name: 'HomeCallView',
    
    data() {
      return {
        hostName: '',
        userName: '',
        roomIdToJoin: '',
        error: null,
        loading: false
      };
    },
    
    setup() {
      const callStore = useCallStore();
      return { callStore };
    },
    
    created() {
      // Limpiar estado anterior si existiera
      this.callStore.cleanup();
      
      // Inicializar store
      this.callStore.initialize();
    },
    
    methods: {
      async createRoom() {
        if (!this.hostName.trim()) return;
        
        try {
          this.loading = true;
          this.error = null;
          
          // Crear sala en el servidor
          const room = await this.callStore.createRoom(this.hostName);
          
          if (room) {
            // Navegar a la sala creada
            this.$router.push(`/asistente/room/${room.id}`);
          } else {
            this.error = 'No se pudo crear la sala. Intenta de nuevo.';
          }
        } catch (error) {
          this.error = `Error al crear sala: ${error.message}`;
        } finally {
          this.loading = false;
        }
      },
      
      async joinRoom() {
        if (!this.userName.trim() || !this.roomIdToJoin.trim()) return;
        
        try {
          this.loading = true;
          this.error = null;
          
          // Guardar nombre de usuario en el store
          this.callStore.userName = this.userName;
          
          // Redirigir a la sala (la unión se realizará en RoomView)
          this.$router.push(`/asistente/room/${this.roomIdToJoin}`);
        } catch (error) {
          this.error = `Error al unirse a la sala: ${error.message}`;
          this.loading = false;
        }
      }
    }
  };
  </script>
  
  <style scoped>
.home-call {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #FFFFFF; /* Fondo blanco */
  color: #424242; /* Texto en gris oscuro */
  padding: 20px;
}

.call-container {
  max-width: 1000px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 40px;
  font-size: 2.2rem;
  color: #1976D2; /* Azul primario */
}

.call-options {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: center;
}

.option-card {
  background-color: #F5F5F5; /* Gris muy claro */
  border-radius: 12px;
  padding: 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #E0E0E0; /* Borde gris claro */
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.5rem;
  color: #1976D2; /* Azul primario */
  text-align: center;
}

.input-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #424242; /* Texto gris oscuro */
}

input {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #E0E0E0; /* Borde gris claro */
  background-color: #FFFFFF; /* Fondo blanco */
  color: #424242; /* Texto gris oscuro */
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #1976D2; /* Azul primario */
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.action-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: background-color 0.3s, transform 0.2s;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.action-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.create-button {
  background-color: #1976D2; /* Azul primario */
  color: white;
}

.create-button:hover:not(:disabled) {
  background-color: #0D47A1; /* Azul oscuro */
}

.join-button {
  background-color: #64B5F6; /* Azul claro */
  color: white;
}

.join-button:hover:not(:disabled) {
  background-color: #1976D2; /* Azul primario */
}

.error-message {
  margin-top: 30px;
  padding: 15px;
  background-color: #FFEBEE; /* Rojo muy claro */
  border: 1px solid #FFCDD2; /* Borde rojo claro */
  border-radius: 6px;
  text-align: center;
  font-weight: bold;
  color: #F44336; /* Texto rojo */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .option-card {
    max-width: 100%;
  }
}
</style>