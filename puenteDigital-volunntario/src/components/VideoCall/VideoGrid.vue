<!-- src/components/VideoCall/VideoGrid.vue -->
<template>
  <div class="video-grid" :class="[gridClass, { 'mobile-layout': isMobileDevice }]">
    <template v-if="activeStreams.length > 0">
      <div 
        v-for="streamInfo in activeStreams" 
        :key="streamInfo.userId" 
        class="grid-item"
        :class="{ 'no-video': !hasVideoTrack(streamInfo.userId) }"
      >
        <!-- Simplifica la forma de manejar referencias -->
        <video 
          ref="videoElements"
          :id="`video-${streamInfo.userId}`"
          :data-user-id="streamInfo.userId"
          autoplay 
          playsinline
          class="remote-video"
        ></video>
        
        <div v-if="!hasVideoTrack(streamInfo.userId)" class="no-video-indicator">
          <i class="fas fa-video-slash"></i>
        </div>
        <div class="username-label">
          {{ getParticipantName(streamInfo.userId) }}
          <span v-if="!hasAudioTrack(streamInfo.userId)" class="muted-indicator">
            <i class="fas fa-microphone-slash"></i>
          </span>
        </div>
        <div class="connection-status" :class="getConnectionStatusClass(streamInfo.userId)">
          {{ getConnectionStatusText(streamInfo.userId) }}
        </div>
      </div>
    </template>
    <div v-else class="empty-grid">
      <p>Esperando a que otros participantes se unan a la llamada...</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoGrid',
  props: {
    remoteStreams: {
      type: Object,
      required: true
    },
    participants: {
      type: Array,
      default: () => []
    },
    connectionStates: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      videoRefs: {},
      isMobileDevice: false,
      streamStatus: {}, // Almacena el estado de video/audio para cada stream
      videoAttachAttempts: {}, // Seguimiento de intentos de conexión de video
      globalAttachAttempt: 0 
    };
  },
  computed: {
    // Streams activos filtrados para mostrar solo los que realmente tienen datos
    activeStreams() {
      return Object.keys(this.remoteStreams).map(userId => ({
        userId,
        stream: this.remoteStreams[userId]
      }));
    },
    gridClass() {
      const count = this.activeStreams.length;
      if (count <= 1) return 'grid-1';
      if (count <= 2) return 'grid-2';
      if (count <= 4) return 'grid-4';
      if (count <= 9) return 'grid-9';
      return 'grid-16';
    }
  },
  watch: {
    remoteStreams: {
      deep: true,
      handler(newStreams, oldStreams) {
        console.log("Streams remotos cambiaron:", Object.keys(newStreams));
        
        // Detectar nuevos streams
        Object.keys(newStreams).forEach(userId => {
          if (!oldStreams[userId]) {
            console.log(`Nuevo stream detectado para ${userId}`);
            // Inicializar estado del stream
            this.initStreamStatus(userId, newStreams[userId]);
          }
        });
        
        // Programar la conexión de streams en el siguiente ciclo
        this.$nextTick(() => {
          this.attachStreams();
        });
      }
    }
  },
  created() {
    // Detectar si es un dispositivo móvil
    this.detectMobileDevice();
    
    // Escuchar cambios en la orientación
    window.addEventListener('resize', this.handleResize);
  },
  mounted() {
    this.attachStreams();
    // Verificar periódicamente el estado de los streams
    this.streamCheckInterval = setInterval(() => this.checkStreamStatus(), 5000);
    this.monitorVideoPlayback();
  },
  beforeDestroy() {
    if (this.streamCheckInterval) {
      clearInterval(this.streamCheckInterval);
    }
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    // Detectar dispositivo móvil
    detectMobileDevice() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // Regex para detectar dispositivos móviles
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      
      this.isMobileDevice = mobileRegex.test(userAgent) || window.innerWidth < 768;
      console.log("Detectado como dispositivo móvil:", this.isMobileDevice);
    },
    
    // Manejar cambio de tamaño de ventana
    handleResize() {
      this.detectMobileDevice();
      // Volver a intentar conectar los streams por si hay cambios en el DOM
      this.$nextTick(() => {
        this.attachStreams();
      });
    },
    
    // Inicializar el estado de un stream
    // Modificar en VideoGrid.vue
    initStreamStatus(userId, stream) {
      if (!stream) return;
      
      const hasVideo = stream.getVideoTracks().length > 0 && 
                        stream.getVideoTracks()[0].enabled;
      
      const hasAudio = stream.getAudioTracks().length > 0 && 
                        stream.getAudioTracks()[0].enabled;
      
      // En Vue 3 asignamos directamente a la propiedad reactiva
      this.streamStatus[userId] = {
        hasVideo,
        hasAudio,
        connectionStatus: 'connecting'
      };
      
      // Configurar listeners para los tracks
      this.setupTrackListeners(userId, stream);
    },
    
    // Configurar listeners para los tracks del stream
    setupTrackListeners(userId, stream) {
      if (!stream) return;
      
      const tracks = stream.getTracks();
      
      tracks.forEach(track => {
        // Cuando un track cambia de estado
        track.onmute = () => {
          console.log(`Track ${track.kind} del usuario ${userId} silenciado`);
          if (track.kind === 'video') {
            this.streamStatus[userId].hasVideo = false;
          } else if (track.kind === 'audio') {
            this.streamStatus[userId].hasVideo = false;
          }
          
          this.$emit('track-state-changed', {
            userId,
            trackType: track.kind,
            state: 'muted'
          });
        };
        
        track.onunmute = () => {
          console.log(`Track ${track.kind} del usuario ${userId} reactivado`);
          if (track.kind === 'video') {
            this.streamStatus[userId].hasVideo = true;
          } else if (track.kind === 'audio') {
            this.streamStatus[userId].hasVideo = true;
          }
          
          this.$emit('track-state-changed', {
            userId,
            trackType: track.kind,
            state: 'unmuted'
          });
        };
        
        track.onended = () => {
          console.log(`Track ${track.kind} del usuario ${userId} terminado`);
          this.$emit('track-ended', {
            userId,
            trackType: track.kind
          });
        };
      });
    },
    
    // Verificar si un stream tiene track de video activo
    hasVideoTrack(userId) {
      if (this.streamStatus[userId]) {
        return this.streamStatus[userId].hasVideo;
      }
      
      const stream = this.remoteStreams[userId];
      if (!stream) return false;
      
      const videoTracks = stream.getVideoTracks();
      return videoTracks.length > 0 && videoTracks[0].enabled;
    },
    
    // Verificar si un stream tiene track de audio activo
    hasAudioTrack(userId) {
      if (this.streamStatus[userId]) {
        return this.streamStatus[userId].hasAudio;
      }
      
      const stream = this.remoteStreams[userId];
      if (!stream) return false;
      
      const audioTracks = stream.getAudioTracks();
      return audioTracks.length > 0 && audioTracks[0].enabled;
    },
    
    // Obtener clase CSS según el estado de conexión
    getConnectionStatusClass(userId) {
      const connectionState = this.connectionStates[userId] || 'unknown';
      
      if (connectionState === 'connected') {
        return 'status-connected';
      } else if (connectionState === 'connecting') {
        return 'status-connecting';
      } else if (connectionState === 'disconnected' || connectionState === 'failed') {
        return 'status-error';
      } else {
        return 'status-unknown';
      }
    },
    
    // Obtener texto para el estado de conexión
    getConnectionStatusText(userId) {
      const connectionState = this.connectionStates[userId] || 'unknown';
      
      if (connectionState === 'connected') {
        return 'Conectado';
      } else if (connectionState === 'connecting') {
        return 'Conectando...';
      } else if (connectionState === 'disconnected') {
        return 'Reconectando...';
      } else if (connectionState === 'failed') {
        return 'Error de conexión';
      } else {
        return '';
      }
    },
    
    // Conectar los streams a los elementos de video
    // En VideoGrid.vue, modifica el método attachStreams()
    attachStreams() {
      console.log("Ejecutando attachStreams con streams:", Object.keys(this.remoteStreams));
      
      if (Object.keys(this.remoteStreams).length === 0) {
        console.log("No hay streams remotos para conectar");
        return;
      }
      
      this.$nextTick(() => {
        if (!this.$refs.videoElements) {
          console.warn("No hay elementos de video en el DOM");
          return;
        }
        
        const videoElements = Array.isArray(this.$refs.videoElements) 
          ? this.$refs.videoElements 
          : [this.$refs.videoElements];
        
        console.log("Elementos de video encontrados:", videoElements.length);
        
        Object.entries(this.remoteStreams).forEach(([userId, stream]) => {
          // Buscar el elemento de video correspondiente
          const videoElement = videoElements.find(el => el.getAttribute('data-user-id') === userId);
          
          if (!videoElement) {
            console.warn(`Elemento de video no encontrado para ${userId}`);
            return;
          }
          
          console.log(`Conectando stream para ${userId} - tracks:`, stream.getTracks().map(t => `${t.kind}:${t.id}`).join(', '));
          
          try {
            // Importante: NO crear un nuevo MediaStream, usar el original directamente
            // El problema del frame congelado suele ocurrir cuando se crean nuevos streams
            
            // Detener cualquier reproducción existente
            if (videoElement.srcObject) {
              const oldStream = videoElement.srcObject;
              if (oldStream !== stream) {  // Evitar asignar el mismo stream
                // Limpiar solo si es diferente
                videoElement.srcObject = null;
                console.log(`Limpiando stream anterior para ${userId}`);
              } else {
                // Si es el mismo stream, verificar si está reproduciendo
                if (!videoElement.paused && videoElement.readyState >= 2) {
                  console.log(`Stream ya conectado y reproduciendo para ${userId}`);
                  return;  // Ya está conectado y reproduciendo, no hacer nada
                }
              }
            }
            
            // Asignar el stream original directamente - esto es crucial
            videoElement.srcObject = stream;
            
            // IMPORTANTE: Forzar el refresco del stream
            videoElement.load();
            
            // Guardar referencia
            this.videoRefs[userId] = videoElement;
            
            videoElement.onloadedmetadata = () => {
              console.log(`Video para ${userId} cargado correctamente`);
              
              // Asegurar que el video sea visible
              videoElement.style.display = 'block';
              videoElement.style.width = '100%';
              videoElement.style.height = '100%';
              videoElement.style.objectFit = 'cover';
              
              // Iniciar reproducción
              videoElement.play()
                .then(() => {
                  console.log(`Video para ${userId} reproduciendo correctamente`);
                  
                  // Configurar para permitir actualizaciones en tiempo real
                  videoElement.setAttribute('autoplay', 'true');
                  videoElement.setAttribute('playsinline', 'true');
                  
                  // Asegurar que no esté pausado o muted si fue forzado antes
                  videoElement.muted = false;
                  
                  if (this.streamStatus[userId]) {
                    this.streamStatus[userId].connectionStatus = 'connected';
                  }
                })
                .catch(e => {
                  console.error(`Error al reproducir video para ${userId}:`, e);
                  
                  // Si falla por política de autoplay, intentar con muted
                  videoElement.muted = true;
                  videoElement.play().catch(e2 => {
                    console.error(`Error incluso con muted para ${userId}:`, e2);
                  });
                });
            };
            
            // Eventos específicos para depuración de frames congelados
            videoElement.addEventListener('suspend', () => {
              console.warn(`Video para ${userId} suspendido - intentando reactivar`);
              videoElement.load();  // Forzar recarga
              videoElement.play().catch(e => console.warn(`Error al reactivar: ${e.message}`));
            });
            
            videoElement.addEventListener('stalled', () => {
              console.warn(`Video para ${userId} estancado - intentando reactivar`);
              // Reconectar stream después de pequeño delay
              setTimeout(() => {
                if (videoElement.readyState < 2) {
                  videoElement.load();
                  videoElement.play().catch(e => console.warn(`Error al reactivar: ${e.message}`));
                }
              }, 1000);
            });
          } catch (error) {
            console.error(`Error al conectar stream para ${userId}:`, error);
            this.fallbackStreamConnection(videoElement, stream, userId);
          }
        });
      });
    },

// Método auxiliar para manejar errores de autoplay
handleAutoplayError(videoElement, userId) {
  console.log(`Error de autoplay para ${userId}, esperando interacción`);
  
  const startPlayback = () => {
    if (videoElement) {
      videoElement.play()
        .then(() => {
          console.log(`Video reproduciendo después de interacción para ${userId}`);
          document.removeEventListener('click', startPlayback);
          document.removeEventListener('touchend', startPlayback);
        })
        .catch(e => {
          console.error(`Sigue fallando la reproducción después de interacción para ${userId}:`, e);
        });
    }
  };
  
  // Añadir un solo listener para interacción del usuario
  document.addEventListener('click', startPlayback, { once: true });
  document.addEventListener('touchend', startPlayback, { once: true });
  
  // Emitir evento para mostrar indicación visual
  this.$emit('user-interaction-needed', userId);
},
    
    // Metodo principal para conectar un stream a un elemento de video
    connectStreamToVideo(videoElement, stream, userId) {
      // Método 1: Usar srcObject (estándar web)
      try {
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
          console.log(`Video para ${userId} cargado correctamente`);
          
          videoElement.play()
            .then(() => {
              console.log(`Video para ${userId} reproduciendo correctamente`);
              this.streamStatus[userId].connectionStatus = 'connected';            
            })
            .catch(e => {
              console.error(`Error al reproducir video para ${userId}:`, e);
              this.handlePlaybackError(videoElement, userId, e);
            });
        };
        
        // Configurar listeners de eventos
        this.setupVideoEventListeners(videoElement, userId);
        
      } catch (error) {
        console.error(`Error al conectar stream para ${userId}:`, error);
        this.fallbackStreamConnection(videoElement, stream, userId);
      }
    },
    
    // Métodos alternativos para conectar el stream si el principal falla
    fallbackStreamConnection(videoElement, stream, userId) {
      console.log(`Intentando métodos alternativos para conectar stream de ${userId}`);
      
      // Método 2: Probar con createObjectURL si está disponible (obsoleto pero útil para compatibilidad)
      try {
        if (typeof URL !== 'undefined' && URL.createObjectURL) {
          console.log(`Intentando URL.createObjectURL para ${userId}`);
          
          // Crear un MediaStream con los tracks disponibles
          const newStream = new MediaStream();
          stream.getTracks().forEach(track => {
            try {
              newStream.addTrack(track);
            } catch (e) {
              console.warn(`No se pudo añadir track ${track.kind} al nuevo stream:`, e);
            }
          });
          
          const objectUrl = URL.createObjectURL(newStream);
          videoElement.src = objectUrl;
          
          videoElement.onloadedmetadata = () => {
            console.log(`Video para ${userId} cargado con objectURL`);
            videoElement.play()
              .then(() => console.log(`Video para ${userId} reproduciendo con objectURL`))
              .catch(e => console.error(`Error reproduciendo video para ${userId} con objectURL:`, e));
          };
          
          // Liberar URL cuando no sea necesaria
          videoElement.onended = () => {
            URL.revokeObjectURL(objectUrl);
          };
          
          return;
        }
      } catch (error) {
        console.warn(`Método createObjectURL falló para ${userId}:`, error);
      }
      
      // Método 3: Para React Native verificar método toURL
      try {
        if (typeof stream.toURL === 'function') {
          console.log(`Usando método toURL() para ${userId}`);
          videoElement.src = stream.toURL();
          videoElement.play()
            .catch(e => console.error(`Error reproduciendo video con toURL para ${userId}:`, e));
          return;
        }
      } catch (error) {
        console.warn(`Método toURL falló para ${userId}:`, error);
      }
      
      // Método 4: Último recurso - mostrar mensaje de error y emitir evento
      console.error(`No se pudo conectar el stream de ${userId} después de múltiples intentos`);
      this.$emit('stream-connection-failed', userId);
    },
    
    // Manejar errores de reproducción
    handlePlaybackError(videoElement, userId, error) {
      console.warn(`Error de reproducción para ${userId}:`, error);
      
      // Verificar si el error es por interacción del usuario
      if (error.name === 'NotAllowedError') {
        console.log('Error debido a políticas de reproducción automática, esperando interacción del usuario');
        
        // Crear un listener global para iniciar la reproducción con la primera interacción
        const startPlayback = () => {
          videoElement.play()
            .then(() => {
              console.log(`Video para ${userId} reproduciendo después de interacción`);
              // Limpiar el evento después de un uso exitoso
              document.removeEventListener('click', startPlayback);
              document.removeEventListener('touchend', startPlayback);
            })
            .catch(e => console.error(`Sigue fallando la reproducción para ${userId}:`, e));
        };
        
        document.addEventListener('click', startPlayback, { once: true });
        document.addEventListener('touchend', startPlayback, { once: true });
        
        // Mostrar indicación visual de que se necesita interacción
        this.$emit('user-interaction-needed', userId);
      }
    },
    
    // Configurar listeners de eventos para el elemento de video
    setupVideoEventListeners(videoElement, userId) {
      videoElement.onerror = (event) => {
        console.error(`Error en elemento de video para ${userId}:`, event);
        this.streamStatus[userId].connectionStatus = 'error';
      };
      
      videoElement.onwaiting = () => {
        console.log(`Video para ${userId} en espera (buffering)`);
      };
      
      videoElement.onstalled = () => {
        console.log(`Video para ${userId} detenido por falta de datos`);
      };
      
      videoElement.onpause = () => {
        console.log(`Video para ${userId} pausado`);
      };
      
      videoElement.onplay = () => {
        console.log(`Video para ${userId} iniciando reproducción`);
      };
      
      videoElement.onplaying = () => {
        console.log(`Video para ${userId} reproduciendo correctamente`);
        this.streamStatus[userId].connectionStatus = 'connected';      
      };
    },
    
    // Obtener el nombre del participante
    getParticipantName(userId) {
      const participant = this.participants.find(p => p.userId === userId);
      return participant ? participant.userName : 'Usuario';
    },
    
    // Verificar periódicamente el estado de los streams
    checkStreamStatus() {
      const streamIds = Object.keys(this.remoteStreams);
      console.log(`Verificando estado de ${streamIds.length} streams remotos`);
      
      if (streamIds.length === 0 || !this.$refs.videoElements) {
        return;
      }
      
      const videoElements = Array.isArray(this.$refs.videoElements) 
        ? this.$refs.videoElements 
        : [this.$refs.videoElements];
      
      Object.entries(this.remoteStreams).forEach(([userId, stream]) => {
        if (!stream) return;
        
        // Actualizar estados de tracks
        this.updateTrackStatus(userId, stream);
        
        // Buscar elemento de video
        const videoElement = videoElements.find(el => el.getAttribute('data-user-id') === userId);
        
        if (videoElement) {
          // Verificar si el stream está congelado (los videos congelados suelen tener un readyState de 2 o más pero no avanzan)
          const isStalled = videoElement.readyState >= 2 && videoElement.paused;
          const isSuspended = videoElement.readyState < 2;
          
          if (isStalled || isSuspended || Math.random() < 0.1) {  // 10% de probabilidad de forzar actualización
            console.log(`Forzando actualización del stream para ${userId} (estado: ${isStalled ? 'estancado' : isSuspended ? 'suspendido' : 'periódico'})`);
            
            // Reconectar stream de manera forzada
            const currentTime = videoElement.currentTime;
            
            // Preservar el stream actual para reconectarlo
            const currentStream = videoElement.srcObject;
            
            // Desconectar y reconectar para forzar refresco
            videoElement.srcObject = null;
            
            // Pequeño delay para asegurar desconexión completa
            setTimeout(() => {
              videoElement.srcObject = currentStream;
              videoElement.load();
              
              videoElement.onloadedmetadata = () => {
                // Intentar restaurar posición de reproducción
                if (currentTime > 0) {
                  try {
                    videoElement.currentTime = currentTime;
                  } catch (e) {
                    console.warn(`No se pudo restaurar tiempo de reproducción: ${e.message}`);
                  }
                }
                
                videoElement.play().catch(e => {
                  console.warn(`Error al reproducir después de reconexión: ${e.message}`);
                  // Último recurso: forzar muted
                  videoElement.muted = true;
                  videoElement.play().catch(() => {});
                });
              };
            }, 100);
          }
        }
      });
    },
    // Añade este nuevo método
    monitorVideoPlayback() {
      // Verificar una vez por segundo si los videos están fluyendo correctamente
      setInterval(() => {
        if (!this.$refs.videoElements) return;
        
        const videoElements = Array.isArray(this.$refs.videoElements) 
          ? this.$refs.videoElements 
          : [this.$refs.videoElements];
        
        videoElements.forEach(videoElement => {
          const userId = videoElement.getAttribute('data-user-id');
          if (!userId) return;
          
          // Almacenar tiempo actual para comparar después
          if (!videoElement._lastTime) {
            videoElement._lastTime = videoElement.currentTime;
            videoElement._freezeCount = 0;
            return;
          }
          
          // Si el tiempo no avanza en 3 verificaciones consecutivas, el stream está congelado
          if (videoElement._lastTime === videoElement.currentTime && !videoElement.paused) {
            videoElement._freezeCount = (videoElement._freezeCount || 0) + 1;
            
            if (videoElement._freezeCount >= 3) {
              console.warn(`Video congelado detectado para ${userId} - forzando reconexión`);
              
              // Reconectar stream de manera más agresiva
              const stream = this.remoteStreams[userId];
              if (stream) {
                videoElement.srcObject = null;
                
                // Delay breve
                setTimeout(() => {
                  videoElement.srcObject = stream;
                  videoElement.load();
                  videoElement.play().catch(() => {
                    // Ignorar errores, ya manejados en otros lugares
                  });
                  
                  // Reiniciar contador
                  videoElement._freezeCount = 0;
                }, 200);
              }
            }
          } else {
            // Si el tiempo avanza, reiniciar contador
            videoElement._freezeCount = 0;
          }
          
          // Actualizar tiempo para siguiente comparación
          videoElement._lastTime = videoElement.currentTime;
        });
      }, 1000);
    },

    // Método auxiliar para actualizar estado de tracks
    updateTrackStatus(userId, stream) {
      // Comprobar video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoActive = !videoTracks[0].muted && videoTracks[0].enabled;
        if (this.streamStatus[userId] && this.streamStatus[userId].hasVideo !== videoActive) {
          this.streamStatus[userId].hasVideo = videoActive;
        }
      }
      
      // Comprobar audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioActive = !audioTracks[0].muted && audioTracks[0].enabled;
        if (this.streamStatus[userId] && this.streamStatus[userId].hasAudio !== audioActive) {
          this.streamStatus[userId].hasAudio = audioActive;
        }
      }
    }
  }
}
</script>

<style scoped>
.video-grid {
  display: grid;
  gap: 10px;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.grid-1 {
  grid-template-columns: 1fr;
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.grid-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.grid-16 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
}

/* Versión móvil del grid */
.mobile-layout.grid-1 {
  grid-template-columns: 1fr;
}

.mobile-layout.grid-2 {
  grid-template-columns: 1fr;
  grid-template-rows: repeat(2, 1fr);
}

.mobile-layout.grid-4,
.mobile-layout.grid-9,
.mobile-layout.grid-16 {
  grid-template-columns: 1fr;
  grid-auto-rows: minmax(200px, 1fr);
}

.grid-item {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  background-color: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible !important;
}

.grid-item.no-video {
  background-color: #263238; /* Azul oscuro */
}

.remote-video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  background-color: #000000 !important;
  z-index: 1 !important;
  display: block !important;
}

.no-video-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 3rem;
  background-color: rgba(0, 0, 0, 0.5);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.username-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 6px 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  z-index: 2;
}

.muted-indicator {
  margin-left: 8px;
  color: #ff5252;
}

.connection-status {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: white;
  background-color: rgba(0, 0, 0, 0.6);
  opacity: 0.8;
  transition: opacity 0.3s;
}

.connection-status:empty {
  display: none;
}

.status-connected {
  background-color: rgba(76, 175, 80, 0.7); /* Verde */
}

.status-connecting {
  background-color: rgba(33, 150, 243, 0.7); /* Azul */
}

.status-error {
  background-color: rgba(244, 67, 54, 0.7); /* Rojo */
}

.status-unknown {
  background-color: rgba(158, 158, 158, 0.7); /* Gris */
}

.empty-grid {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: white;
  text-align: center;
  background-color: #1a1a1a;
  border-radius: 8px;
  padding: 20px;
}

</style>