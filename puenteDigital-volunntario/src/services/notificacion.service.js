import { ref } from 'vue';
import { toast } from 'vue-sonner';

class NotificationService {
  constructor() {
    console.log('NotificationService inicializado');
    this.pendingNotifications = ref([]);
    this.processedNotifications = new Set(); // Para evitar duplicados
    this.lastShowTime = 0; // Para limitar frecuencia
    
    this.TYPES = {
      SUCCESS: 'success',
      ERROR: 'error',
      INFO: 'info',
      WARNING: 'warning'
    };
  }

  show(message, type = this.TYPES.INFO, options = {}) {
    console.log('Intentando mostrar notificación:', { 
      message, 
      type, 
      options 
    });
    const notificationId = `${message}_${Date.now()}`;

    if (this.isDuplicate(message)) {
      console.log('Notificación duplicada ignorada:', message);
      return;
    }

    // Registrar la notificación como procesada
    this.processedNotifications.add(message);
    this.lastShowTime = Date.now();
    
    // Limpiar notificaciones antiguas si hay demasiadas
    if (this.processedNotifications.size > 20) {
      const oldestKey = this.processedNotifications.values().next().value;
      this.processedNotifications.delete(oldestKey);
    }
    
    console.log('Mostrando notificación:', { 
      message, 
      type, 
      options 
    });
    
    try {
      // Usar la función toast base y pasar opciones
      toast(message, {
        ...options,
        type: type, // Añadir tipo de notificación
        position: 'top-right',
        duration: 4000,
        // No usar icon ni iconClass
        render: (props) => {
          // Renderizado personalizado sin HTML directo
          return `
            <div>
              ${message}
              ${options.description ? `<div style="font-size: 0.8em; opacity: 0.7;">${options.description}</div>` : ''}
            </div>
          `;
        }
      });
      
      console.log('Notificación mostrada con éxito');
    } catch (error) {
      console.error('Error al mostrar notificación:', error);
    }
  }

  newMessage(message, sender) {
    console.log(`Nuevo mensaje de ${sender}: ${message}`);
    this.show(`Nuevo mensaje de ${sender}`, this.TYPES.INFO, {
      description: message
    });
  }

  isDuplicate(message) {
    // Si el mensaje ya fue procesado recientemente (menos de 2 segundos)
    return this.processedNotifications.has(message) && 
           (Date.now() - this.lastShowTime < 2000);
  }


}

export default new NotificationService();