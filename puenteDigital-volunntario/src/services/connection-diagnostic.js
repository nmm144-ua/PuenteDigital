// Diagnóstico y Solución de Conexiones WebRTC
// Añade este archivo como src/services/connection-diagnostic.js

import socketService from './socket.service';
import webrtcService from './webrtc.service';
import router from '../router'; // Ajusta la ruta según tu estructura de proyecto

class ConnectionDiagnostic {
  constructor() {
    this.debug = true;
    this.connectionAttempts = {};
    this.callRequests = new Set();
    this._initialized = false;
    this.navigating = false;
  }

  // Función para logs
  log(message, ...args) {
    if (this.debug) {
      console.log(`[Diagnostic] ${message}`, ...args);
    }
  }

  // Función para logs de error
  logError(message, error) {
    console.error(`[Diagnostic ERROR] ${message}`, error);
  }

  // Inicializar diagnóstico y escuchar eventos de conexión
  init() {
    if (this._initialized) return;
    
    this.log('🔍 Inicializando diagnóstico de conexiones');
    
    // Sobrescribir temporalmente métodos para obtener más información
    this._patchSocketService();
    this._patchWebRTCService();
    
    // Escuchar eventos de socket
    this._setupSocketListeners();
    
    this._initialized = true;
  }

  // Escuchar eventos específicos de socket para diagnóstico
  _setupSocketListeners() {
    // Evento de usuario que se une a la sala
    socketService.on('user-joined', (data) => {
      this.log('👤 Usuario unido a la sala', data);
      
      // Si es un usuario móvil, mostrar información detallada
      if (data.userAgent && this._isMobileUserAgent(data.userAgent)) {
        this.log('📱 Detectado usuario desde dispositivo móvil', data);
      }
    });

    // Escuchar solicitudes de llamada
    socketService.on('call-requested', (data) => {
      this.log('📞 Solicitud de llamada recibida', data);
      this.callRequests.add(data.from || data.userId);
      
      // Verificar si debemos navegar al componente de videollamada
      this._checkVideoCallNavigation(data);
    });

    // Escuchar ofertas WebRTC
    socketService.on('offer', (data) => {
      this.log('🔄 Oferta WebRTC recibida', data);
      
      // Si hemos recibido una oferta pero no hay solicitud de llamada previa,
      // podría indicar un problema de sincronización
      const fromUserId = data.from || data.userId;
      if (fromUserId && !this.callRequests.has(fromUserId)) {
        this.log('⚠️ Recibida oferta sin solicitud de llamada previa, añadiendo manualmente');
        this.callRequests.add(fromUserId);
        this._checkVideoCallNavigation({
          from: fromUserId,
          roomId: data.roomId || socketService.roomId
        });
      }
    });
    
    // Evento de reconexión
    socketService.on('reconnect', () => {
      this.log('🔌 Socket reconectado, comprobando llamadas pendientes');
      this._checkPendingCalls();
    });
  }

  // Verificar si debemos navegar al componente de videollamada
  _checkVideoCallNavigation(data) {
    // Logging detallado para depuración
    this.log('🧭 Intentando navegar a videollamada', {
      data,
      currentRoute: router.currentRoute.value.path,
      roomId: data.roomId || socketService.roomId,
      fromUserId: data.from || data.userId
    });
  
    // Verificar que no estemos ya navegando
    if (this.navigating) {
      this.log('🔄 Ya se está navegando, ignorando');
      return;
    }
  
    const currentRoute = router.currentRoute.value;
    const fromUserId = data.from || data.userId;
    const roomId = data.roomId || socketService.roomId;
  
    // Condiciones más flexibles para la navegación
    if (
      !currentRoute.path.includes('/videollamada') && 
      fromUserId && 
      roomId
    ) {
      this.navigating = true;
      
      this.log('🚀 Navegando al componente de videollamada', {
        roomId,
        fromUserId,
        currentRoute: currentRoute.path
      });
  
      // Usar try-catch para manejar errores de navegación
      router.push({
        path: `/videollamada/${roomId}`,
        query: {
          solicitudId: currentRoute.params.solicitudId || null,
          callerId: fromUserId,
          role: 'usuario'  // Asumo que la app móvil llama como usuario
        }
      }).then(() => {
        this.log('✅ Navegación a videollamada completada');
        
        // Reiniciar flag de navegación después de un tiempo
        setTimeout(() => {
          this.navigating = false;
        }, 5000);
      }).catch(error => {
        this.logError('❌ Error al navegar a videollamada:', error);
        this.navigating = false;
      });
    }
  }

  // Extraer ID de solicitud desde la ruta
  _extractSolicitudIdFromPath(path) {
    // Intenta extraer el ID de solicitud de la ruta actual
    // Asume formato como /asistente/chat/ABC123 o similar
    const matches = path.match(/\/chat\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      return matches[1];
    }
    return null;
  }

  // Comprobar llamadas pendientes después de una reconexión
  _checkPendingCalls() {
    if (this.callRequests.size > 0) {
      this.log('📞 Hay llamadas pendientes después de reconexión', [...this.callRequests]);
      
      // Tomar la última solicitud de llamada
      const lastCallerId = Array.from(this.callRequests).pop();
      
      // Verificar navegación a videollamada
      this._checkVideoCallNavigation({
        from: lastCallerId,
        roomId: socketService.roomId
      });
    }
  }

  // Sobrescribir temporalmente métodos de Socket.IO para diagnóstico
  _patchSocketService() {
    // Guardar referencia al método original
    const originalJoinRoom = socketService.joinRoom;
    
    // Sobrescribir joinRoom para añadir información adicional
    socketService.joinRoom = (roomId, userId, userName, metadata = {}) => {
      // Añadir información del dispositivo para mejor diagnóstico
      const enhancedMetadata = {
        ...metadata,
        deviceInfo: this._getDeviceInfo(),
        timestamp: new Date().toISOString()
      };
      
      this.log('🔄 Uniendo a sala con metadata mejorada', {
        roomId, userId, userName, metadata: enhancedMetadata
      });
      
      // Llamar al método original con metadata mejorada
      return originalJoinRoom.call(socketService, roomId, userId, userName, enhancedMetadata);
    };
  }

  // Sobrescribir temporalmente métodos de WebRTC para diagnóstico
  _patchWebRTCService() {
    // Guardar referencia al método original
    const originalHandleIncomingOffer = webrtcService.handleIncomingOffer;
    
    // Sobrescribir handleIncomingOffer para añadir más diagnóstico
    webrtcService.handleIncomingOffer = async (offer, fromUserId) => {
      this.log('🔄 Manejando oferta entrante con datos mejorados', {
        fromUserId,
        hasLocalStream: !!webrtcService.localStream,
        offerType: offer?.type,
        hasSDP: !!offer?.sdp,
        sdpLength: offer?.sdp?.length
      });
      
      // Registrar esta oferta para diagnóstico
      this.callRequests.add(fromUserId);
      
      // Comprobar navegación al componente de videollamada
      this._checkVideoCallNavigation({
        from: fromUserId,
        roomId: socketService.roomId
      });
      
      try {
        // Llamar al método original
        return await originalHandleIncomingOffer.call(webrtcService, offer, fromUserId);
      } catch (error) {
        this.logError('❌ Error manejando oferta entrante:', error);
        // Reintentar la conexión después de un error
        this._scheduleReconnect(fromUserId);
        throw error;
      }
    };
  }

  // Programar un reintento de conexión
  _scheduleReconnect(userId) {
    if (!userId) return;
    
    // Incrementar contador de intentos
    this.connectionAttempts[userId] = (this.connectionAttempts[userId] || 0) + 1;
    
    // Limitar número de intentos
    if (this.connectionAttempts[userId] > 3) {
      this.log('⚠️ Demasiados intentos de reconexión para', userId);
      return;
    }
    
    // Calcular retraso exponencial
    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts[userId] - 1), 10000);
    
    this.log(`⏱️ Programando reconexión en ${delay}ms para`, userId);
    
    setTimeout(() => {
      this.log('🔄 Intentando reconexión con', userId);
      
      // Si tenemos RoomId, intentar reiniciar toda la conexión
      if (socketService.roomId) {
        webrtcService.restartConnection(userId)
          .then(() => {
            this.log('✅ Reconexión exitosa con', userId);
          })
          .catch(error => {
            this.logError('❌ Error en reconexión con ' + userId + ':', error);
          });
      }
    }, delay);
  }

  // Obtener información del dispositivo actual para diagnóstico
  _getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      devicePixelRatio: window.devicePixelRatio
    };
  }

  // Detectar si un user agent corresponde a un dispositivo móvil
  _isMobileUserAgent(userAgent) {
    if (!userAgent) return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  // Detener diagnóstico y restablecer métodos originales
  dispose() {
    // Aquí iría la lógica para revertir los parches y liberar recursos
    this.log('🧹 Limpiando diagnóstico de conexiones');
    
    // Eliminar event listeners de socket
    socketService.off('user-joined');
    socketService.off('call-requested');
    socketService.off('offer');
    socketService.off('reconnect');
    
    this._initialized = false;
  }
}

// Exportar una instancia única
const connectionDiagnostic = new ConnectionDiagnostic();
export default connectionDiagnostic;