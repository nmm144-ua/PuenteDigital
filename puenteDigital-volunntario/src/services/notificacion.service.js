import { ref } from 'vue';
import { toast } from 'vue-sonner';

class NotificationService {
  constructor() {
    console.log('NotificationService inicializado');
    this.pendingNotifications = ref([]);
    
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


}

export default new NotificationService();