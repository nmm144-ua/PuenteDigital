<!-- src/components/ChatBox.vue -->
<template>
    <div class="chat-box">
      <div class="chat-header">
        <h3>Chat</h3>
        <button class="close-button" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="messages" ref="messagesContainer">
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          class="message"
          :class="{ 'own-message': msg.isLocal }"
        >
          <div class="message-header">
            <span class="sender">{{ msg.sender }}</span>
            <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="message-content">{{ msg.message }}</div>
        </div>
        <div v-if="messages.length === 0" class="no-messages">
          No hay mensajes aún
        </div>
      </div>
      <div class="chat-input">
        <input
          v-model="newMessage"
          placeholder="Escribe un mensaje..."
          @keyup.enter="sendMessage"
        />
        <button 
          class="send-button" 
          @click="sendMessage"
          :disabled="!newMessage.trim()"
        >
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'ChatBox',
    props: {
      messages: {
        type: Array,
        default: () => []
      }
    },
    data() {
      return {
        newMessage: ''
      };
    },
    methods: {
      sendMessage() {
        if (!this.newMessage.trim()) return;
        
        this.$emit('send-message', this.newMessage);
        this.newMessage = '';
      },
      formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      },
      scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.messagesContainer) {
          this.$refs.messagesContainer.scrollTop = this.$refs.messagesContainer.scrollHeight;
        }
      });
    }
  },
  watch: {
    messages() {
      this.scrollToBottom();
    }
  },
  mounted() {
    this.scrollToBottom();
  }
}
</script>

<style scoped>
.chat-box {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #FFFFFF; /* Fondo blanco */
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #1976D2; /* Azul primario */
  color: white;
}

.chat-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.close-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  transition: transform 0.2s;
}

.close-button:hover {
  transform: scale(1.2);
}

.messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #F5F5F5; /* Gris muy claro */
}

.message {
  padding: 12px;
  border-radius: 8px;
  background-color: #E3F2FD; /* Azul muy claro */
  max-width: 80%;
  align-self: flex-start;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #BBDEFB; /* Borde azul claro */
}

.own-message {
  background-color: #1976D2; /* Azul primario */
  color: white;
  align-self: flex-end;
  border-color: #1976D2; /* Borde azul primario */
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 0.8rem;
}

.sender {
  font-weight: bold;
}

.timestamp {
  opacity: 0.7;
}

.message-content {
  word-break: break-word;
}

.no-messages {
  text-align: center;
  opacity: 0.6;
  margin: auto;
  color: #9E9E9E; /* Gris medio */
}

.chat-input {
  display: flex;
  padding: 12px;
  background-color: #FFFFFF; /* Fondo blanco */
  border-top: 1px solid #E0E0E0; /* Borde gris claro */
}

.chat-input input {
  flex: 1;
  padding: 12px;
  border: 1px solid #E0E0E0; /* Borde gris claro */
  border-radius: 4px;
  background-color: #FFFFFF; /* Fondo blanco */
  color: #424242; /* Texto gris oscuro */
}

.chat-input input:focus {
  outline: none;
  border-color: #1976D2; /* Azul primario */
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.send-button {
  margin-left: 8px;
  padding: 0 16px;
  background-color: #1976D2; /* Azul primario */
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.send-button:hover:not(:disabled) {
  background-color: #0D47A1; /* Azul oscuro */
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>