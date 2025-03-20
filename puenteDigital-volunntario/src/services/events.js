// src/services/events.js
const EventEmitter = {
    listeners: {},
  
    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    },
  
    off(event, callback) {
      if (!this.listeners[event]) return;
      
      if (callback) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      } else {
        this.listeners[event] = [];
      }
    },
  
    emit(event, data) {
      if (!this.listeners[event]) return;
      this.listeners[event].forEach(callback => callback(data));
    }
  };
  
  export default EventEmitter;