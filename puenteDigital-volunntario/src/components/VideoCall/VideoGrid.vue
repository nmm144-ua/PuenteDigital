<!-- src/components/VideoCall/VideoGrid.vue -->
<template>
  <div class="video-grid-container">
    <div class="video-grid" :class="[gridClass]">
      <template v-if="Object.keys(remoteStreams).length > 0">
        <div 
          v-for="(stream, userId) in remoteStreams" 
          :key="userId" 
          class="grid-item"
          :class="{ 'portrait-video': videoOrientations[userId] && videoOrientations[userId].isPortrait }"
        >
        <video 
          ref="videoElements" 
          autoplay 
          playsinline
          preload="auto"
          class="remote-video"
          :data-user-id="userId"
        ></video>
          <div class="username-label">
            {{ getParticipantName(userId) }}
          </div>
        </div>
      </template>
      <div v-else class="empty-grid">
        <p>Esperando a que otros participantes se unan a la llamada...</p>
      </div>
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
    }
  },
  data() {
    return {
      videoOrientations: {},
      streamPlayIntervals: {},
      streamTimers: {},
      _checkingVideos: false,        // Control de verificaciones
      _streamUpdateTimeout: null,     // Control de debounce
      _lastCheckTime: 0,             // Control de tiempo
      _processedStreams: new Set(),   // Control de streams ya procesados
      _updatingVideo: {}             // ✅ NUEVO: Control de actualizaciones por usuario
    };
  },
  computed: {
    gridClass() {
      const count = Object.keys(this.remoteStreams).length;
      if (count <= 1) return 'grid-1';
      if (count <= 2) return 'grid-2';
      if (count <= 4) return 'grid-4';
      if (count <= 9) return 'grid-9';
      return 'grid-16';
    }
  },
  watch: {
    remoteStreams: {
      handler(newStreams, oldStreams) {
        console.log('🔄 Cambio detectado en remoteStreams');
        
        // ✅ DEBOUNCE: Evitar múltiples ejecuciones consecutivas
        if (this._streamUpdateTimeout) {
          clearTimeout(this._streamUpdateTimeout);
        }
        
        this._streamUpdateTimeout = setTimeout(() => {
          // Procesar solo streams nuevos o que cambiaron realmente
          Object.keys(newStreams).forEach(userId => {
            const newStream = newStreams[userId];
            const oldStream = oldStreams ? oldStreams[userId] : null;
            
            // ✅ VERIFICACIÓN ESTRICTA: Solo procesar si cambió el ID del stream
            if (!oldStream || oldStream.id !== newStream.id) {
              console.log(`🆕 Stream nuevo o cambiado para usuario ${userId} (${newStream.id})`);
              
              if (this.isValidMediaStream(newStream)) {
                // Procesar inmediatamente el nuevo stream
                this.$nextTick(() => {
                  this.updateVideoStreamForUser(userId);
                });
              } else {
                console.warn(`❌ Stream inválido para usuario ${userId}`);
              }
            } else {
              console.log(`✅ Stream ${newStream.id} ya procesado para ${userId}`);
            }
          });
          
          // Limpiar streams eliminados
          Object.keys(this.videoOrientations).forEach(userId => {
            if (!newStreams[userId]) {
              this.cleanupUserResources(userId);
            }
          });
        }, 100); // Debounce de 100ms
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    // Verificar que un objeto MediaStream es válido
    isValidMediaStream(stream) {
      if (!stream || typeof stream !== 'object') return false;
      
      return (
        (stream.id && typeof stream.id === 'string') ||
        (typeof stream.getTracks === 'function') ||
        (typeof stream.getVideoTracks === 'function') ||
        (typeof stream.getAudioTracks === 'function')
      );
    },
    
    // Limpiar recursos para un usuario específico
    cleanupUserResources(userId) {
      // Eliminar orientación guardada
      if (this.videoOrientations[userId]) {
        delete this.videoOrientations[userId];
      }
      
      // Limpiar cualquier intervalo de monitoreo
      if (this.streamPlayIntervals[userId]) {
        clearInterval(this.streamPlayIntervals[userId]);
        delete this.streamPlayIntervals[userId];
      }
      
      // Limpiar temporizadores
      if (this.streamTimers[userId]) {
        clearTimeout(this.streamTimers[userId]);
        delete this.streamTimers[userId];
      }
      
      console.log(`Recursos limpiados para usuario ${userId}`);
    },

   async updateVideoStreamForUser(userId) {
      // ✅ PREVENIR MÚLTIPLES EJECUCIONES SIMULTÁNEAS
      if (this._updatingVideo && this._updatingVideo[userId]) {
        console.log(`⏭️ Ya actualizando video para ${userId}, omitiendo...`);
        return;
      }
      
      if (!this._updatingVideo) {
        this._updatingVideo = {};
      }
      this._updatingVideo[userId] = true;
      
      try {
        const videoElements = this.$refs.videoElements;
        if (!videoElements) return;
        
        const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
        const video = videos.find(v => v.getAttribute('data-user-id') === userId);
        
        if (!video) {
          console.warn(`No se encontró elemento de video para usuario ${userId}`);
          return;
        }
        
        const stream = this.remoteStreams[userId];
        if (!stream) {
          console.warn(`No hay stream para usuario ${userId}`);
          return;
        }
        
        console.log(`🔧 ASIGNANDO STREAM a video de ${userId}`, {
          streamId: stream.id,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          active: stream.active
        });
        
        // ✅ VERIFICAR SI YA TIENE EL STREAM CORRECTO
        /*if (video.srcObject && video.srcObject.id === stream.id) {
          console.log(`✅ Video para ${userId} ya tiene el stream correcto, omitiendo asignación`);
          
          // Solo verificar si está reproduciéndose
          if (video.paused) {
            console.log(`▶️ Video para ${userId} pausado, intentando reproducir...`);
            this.playVideoSimple(video, userId);
          }
          //return;
        }*/
        
        // ✅ MÉTODO SIMPLE Y SEGURO (SIN RECREAR ELEMENTO)
        console.log(`🎯 Asignando stream de forma segura para ${userId}`);
        
        try {
          // Limpiar primero
          video.pause();
          video.srcObject = null;
          
          // Esperar un frame
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          // Configurar antes de asignar
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;
          video.controls = false;
          
          // Asignar stream
          video.srcObject = stream;
          
          // Forzar carga
          video.load();
          
          console.log(`✅ Stream asignado correctamente a ${userId}`);
          // ✅ DIAGNÓSTICO DETALLADO DEL STREAM
          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks();

          console.log(`🔬 DIAGNÓSTICO COMPLETO DEL STREAM para ${userId}:`);
          console.log('- Stream activo:', stream.active);
          console.log('- Stream ID:', stream.id);

          if (videoTracks.length > 0) {
            const videoTrack = videoTracks[0];
            console.log('- Video track:', {
              enabled: videoTrack.enabled,
              muted: videoTrack.muted,
              readyState: videoTrack.readyState,
              label: videoTrack.label,
              kind: videoTrack.kind
            });
          } else {
            console.warn('❌ NO HAY VIDEO TRACKS en el stream');
          }

          if (audioTracks.length > 0) {
            const audioTrack = audioTracks[0];
            console.log('- Audio track:', {
              enabled: audioTrack.enabled,
              muted: audioTrack.muted,
              readyState: audioTrack.readyState,
              label: audioTrack.label
            });
          } else {
            console.warn('❌ NO HAY AUDIO TRACKS en el stream');
          }

          // ✅ DIAGNÓSTICO DEL ELEMENTO VIDEO
          console.log('🔬 DIAGNÓSTICO DEL ELEMENTO VIDEO:');
          console.log('- srcObject asignado:', !!video.srcObject);
          console.log('- srcObject ID:', video.srcObject?.id);
          console.log('- autoplay:', video.autoplay);
          console.log('- muted:', video.muted);
          console.log('- playsInline:', video.playsInline);
          console.log('- controls:', video.controls);
          
          if (videoTracks.length > 0) {
            const videoTrack = videoTracks[0];
            if (videoTrack.muted) {
              console.log(`🔧 Video track está muted, intentando unmute...`);
              
              // Intentar unmute (aunque esto generalmente no funciona en tracks remotos)
              videoTrack.enabled = false;
              setTimeout(() => {
                videoTrack.enabled = true;
                console.log(`🔄 Video track reactivado para ${userId}`);
              }, 100);
            }
          }

          // ✅ SOLUCIÓN ALTERNATIVA: Verificar que el stream no esté muted globalmente
          if (stream.muted) {
            console.log(`🔧 Stream completo está muted, intentando unmute...`);
            stream.muted = false;
          }

          // Intentar reproducir inmediatamente
          setTimeout(() => {
            this.playVideoSimple(video, userId);
          }, 200);
          
        } catch (error) {
          console.error(`❌ Error asignando stream a ${userId}:`, error);
        }
        
      } finally {
        // ✅ LIBERAR FLAG SIEMPRE
        if (this._updatingVideo) {
          delete this._updatingVideo[userId];
        }
      }
    },

    // ✅ MÉTODO DE REPRODUCCIÓN SIMPLIFICADO
    playVideoSimple(video, userId) {
      if (!video || video._isPlaying || video._playAttemptInProgress) {
        console.log(`⏭️ Saltando reproducción para ${userId}`);
        return;
      }
      
      if (!video.srcObject) {
        console.warn(`❌ Video para ${userId} no tiene srcObject`);
        return;
      }
      
      console.log(`▶️ Reproduciendo video para ${userId}...`);
      
      // ✅ DIAGNÓSTICO COMPLETO ANTES DE REPRODUCIR
      console.log(`🔍 Estado PRE-PLAY para ${userId}:`, {
        srcObject: !!video.srcObject,
        streamId: video.srcObject?.id,
        readyState: video.readyState,
        networkState: video.networkState,
        paused: video.paused,
        muted: video.muted,
        autoplay: video.autoplay,
        playsInline: video.playsInline,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentTime: video.currentTime,
        duration: video.duration,
        error: video.error ? {
          code: video.error.code,
          message: video.error.message
        } : null,
        // Verificar visibilidad
        offsetWidth: video.offsetWidth,
        offsetHeight: video.offsetHeight,
        // Verificar tracks del stream
        audioTracks: video.srcObject?.getAudioTracks?.()?.length || 0,
        videoTracks: video.srcObject?.getVideoTracks?.()?.length || 0
      });
      
      video._playAttemptInProgress = true;
      video.muted = true; // CRÍTICO para Chrome
      
      console.log(`🎵 Iniciando play() para ${userId} con muted=true...`);
      
      const playPromise = video.play();
      
      console.log(`🔍 Tipo de retorno de play():`, typeof playPromise, playPromise !== undefined);
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`✅ Video para ${userId} reproduciéndose`);
          
          // ✅ DIAGNÓSTICO COMPLETO POST-PLAY
          console.log(`🔍 Estado POST-PLAY para ${userId}:`, {
            paused: video.paused,
            currentTime: video.currentTime,
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            networkState: video.networkState,
            played: video.played.length > 0 ? `${video.played.start(0)}-${video.played.end(0)}` : 'none'
          });
          
          video._playAttemptInProgress = false;
          video._isPlaying = true;
          video._playbackSuccessful = true;
          
          // ✅ VERIFICAR QUE REALMENTE ESTÁ REPRODUCIÉNDOSE
          setTimeout(() => {
            console.log(`🕒 Verificación 1s después para ${userId}:`, {
              paused: video.paused,
              currentTime: video.currentTime,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight
            });
            
            if (video.currentTime > 0 || (!video.paused && video.readyState >= 2)) {
              console.log(`🎬 CONFIRMADO: Video ${userId} está realmente reproduciéndose`);
              
              // Intentar unmute
              setTimeout(() => {
                if (!video.paused && video._isPlaying) {
                  video.muted = false;
                  console.log(`🔊 Audio activado para ${userId}`);
                  // ✅ AÑADIR AQUÍ: Verificar y corregir videos microscópicos
                  setTimeout(() => {
                    const isTinyVideo = this.checkAndFixTinyVideo(video, userId);
                    if (isTinyVideo) {
                      console.log(`🎯 Video microscópico detectado y corregido para ${userId}`);
                    }
                  }, 500); // Esperar un poco más para que las dimensiones se establezcan
                  }
              }, 1000);
            } else {
              console.warn(`⚠️ Video ${userId} dice que reproduce pero no hay evidencia`);
              
              // ✅ DIAGNÓSTICO DE FALLO
              console.log(`🚨 DIAGNÓSTICO DE FALLO para ${userId}:`, {
                paused: video.paused,
                currentTime: video.currentTime,
                readyState: video.readyState,
                networkState: video.networkState,
                error: video.error,
                ended: video.ended,
                seeking: video.seeking
              });
            }
          }, 1000);
          
        }).catch(err => {
          console.error(`❌ Error reproduciendo ${userId}:`, {
            name: err.name,
            message: err.message,
            code: err.code
          });
          
          video._playAttemptInProgress = false;
          
          // ✅ DIAGNÓSTICO DEL ERROR
          console.log(`🔍 Estado en ERROR para ${userId}:`, {
            readyState: video.readyState,
            networkState: video.networkState,
            error: video.error ? {
              code: video.error.code,
              message: video.error.message
            } : null,
            paused: video.paused,
            muted: video.muted
          });
          
          // Si falla, intentar fallbacks específicos
          if (err.name === 'NotAllowedError') {
            console.log(`🚫 NotAllowedError para ${userId} - política de autoplay estricta`);
            video._playbackFailed = true;
          } else {
            console.log(`🔄 Intentando fallback con reintento para ${userId}`);
            setTimeout(() => {
              video.muted = true;
              video.load(); // Reload element
              
              const retryPromise = video.play();
              if (retryPromise !== undefined) {
                retryPromise.then(() => {
                  console.log(`✅ Fallback exitoso para ${userId}`);
                  video._playbackSuccessful = true;
                  video._isPlaying = true;
                }).catch(retryErr => {
                  console.error(`❌ Falló reintento para ${userId}:`, retryErr);
                  video._playbackFailed = true;
                });
              }
            }, 1000);
          }
        });
      } else {
        video._playAttemptInProgress = false;
        console.error(`❌ CRÍTICO: play() no devolvió promesa para ${userId}`);
        video._playbackFailed = true;
      }
    },

    // ✅ MÉTODO FALLBACK
    fallbackVideoAssignment(video, stream, userId) {
      try {
        console.log(`🔄 Usando método fallback para ${userId}`);
        
        video.pause();
        video.srcObject = null;
        
        // Forzar limpieza
        video.load();
        
        // Configurar antes de asignar
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        
        // Asignar stream
        video.srcObject = stream;
        
        // Intentar cargar
        video.load();
        
        console.log(`🎯 Stream asignado por fallback para ${userId}`);
        
        // Esperar un poco y reproducir
        setTimeout(() => {
          video.play().then(() => {
            console.log(`✅ Fallback exitoso para ${userId}`);
            video._playbackSuccessful = true;
          }).catch(err => {
            console.error(`❌ Fallback falló para ${userId}:`, err);
            video._playbackFailed = true;
          });
        }, 500);
        
      } catch (fallbackError) {
        console.error(`❌ Error en fallback para ${userId}:`, fallbackError);
      }
    },
        
    // ✅ REPRODUCIR VIDEO - Versión mejorada sin loops
    playVideo(video, userId) {
      if (!video || video._isPlaying || video._playAttemptInProgress) {
        console.log(`⏭️ Saltando reproducción para ${userId} - ya en progreso`);
        return;
      }
      
      if (!video.srcObject) {
        console.warn(`❌ Video para ${userId} no tiene srcObject para reproducir`);
        return;
      }
      
      // ✅ VERIFICAR QUE EL VIDEO ESTÉ LISTO PARA CHROME
      if (video.readyState < 1) {
        console.warn(`⚠️ Video para ${userId} no está listo (readyState: ${video.readyState}), esperando...`);
        
        const waitAndRetry = () => {
          setTimeout(() => {
            if (video.readyState >= 1) {
              console.log(`✅ Video para ${userId} ahora está listo, reintentando...`);
              this.playVideo(video, userId);
            } else if (video.readyState < 1) {
              console.warn(`⚠️ Video para ${userId} sigue sin estar listo después de esperar`);
            }
          }, 1000);
        };
        
        waitAndRetry();
        return;
      }
      
      console.log(`▶️ Intentando reproducir video para ${userId}...`);
      console.log(`📊 Estado inicial del video:`, {
        paused: video.paused,
        muted: video.muted,
        volume: video.volume,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentSrc: video.currentSrc,
        networkState: video.networkState
      });
      
      video._playAttemptInProgress = true;
      
      // ✅ CONFIGURACIÓN CRÍTICA PARA CHROME
      video.muted = true;
      video.volume = 1.0;
      video.autoplay = true;
      video.playsInline = true;
      
      console.log(`🎵 Iniciando reproducción con muted=true para ${userId}`);
      
      // ✅ VERIFICAR VISIBILIDAD DEL ELEMENTO
      const rect = video.getBoundingClientRect();
      console.log(`📐 Dimensiones del video para ${userId}:`, {
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0
      });
      
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`✅ Video para ${userId} comenzó a reproducirse con muted`);
          console.log(`📊 Estado después de play():`, {
            paused: video.paused,
            currentTime: video.currentTime,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          });
          
          video._playAttemptInProgress = false;
          video._isPlaying = true;
          video._playbackSuccessful = true;
          
          // ✅ VERIFICAR QUE REALMENTE ESTÁ REPRODUCIÉNDOSE
          setTimeout(() => {
            if (video.currentTime > 0 || !video.paused) {
              console.log(`🎬 Confirmado: Video para ${userId} está reproduciéndose (currentTime: ${video.currentTime})`);
              
              // Intentar quitar muted después de confirmar reproducción
              setTimeout(() => {
                if (!video.paused && video._isPlaying) {
                  console.log(`🔊 Intentando activar audio para ${userId}`);
                  video.muted = false;
                  
                  setTimeout(() => {
                    if (!video.muted) {
                      console.log(`✅ Audio activado correctamente para ${userId}`);
                    } else {
                      console.log(`⚠️ Audio sigue muted para ${userId} (política del navegador)`);
                    }
                  }, 500);

                  // ✅ DIAGNÓSTICO DE DIMENSIONES
                  setTimeout(() => {
                    console.log(`🔍 DIAGNÓSTICO FINAL DE DIMENSIONES para ${userId}:`, {
                      videoWidth: video.videoWidth,
                      videoHeight: video.videoHeight,
                      
                      // Dimensiones del elemento DOM
                      elementWidth: video.offsetWidth,
                      elementHeight: video.offsetHeight,
                      
                      // CSS aplicado
                      computedStyle: {
                        width: getComputedStyle(video).width,
                        height: getComputedStyle(video).height,
                        objectFit: getComputedStyle(video).objectFit
                      },
                      
                      // Track settings
                      videoTrackSettings: stream.getVideoTracks()[0]?.getSettings ? 
                        stream.getVideoTracks()[0].getSettings() : 'getSettings no disponible'
                    });
                    
                     // ✅ AÑADIR AQUÍ: Verificar y corregir videos microscópicos
                    const isTinyVideo = this.checkAndFixTinyVideo(video, userId);
                    if (isTinyVideo) {
                      console.log(`🎯 Video microscópico detectado y corregido para ${userId}`);
                    }

                    // Si las dimensiones son microscópicas
                    if (video.videoWidth <= 10 || video.videoHeight <= 10) {
                      console.error(`❌ PROBLEMA CONFIRMADO: React Native envía video con dimensiones ${video.videoWidth}x${video.videoHeight}`);
                      console.log(`💡 SOLUCIÓN: Verificar constraints de video en React Native`);
                      console.log(`💡 SOLUCIÓN: Verificar permisos de cámara en React Native`);
                      console.log(`💡 SOLUCIÓN: Verificar que la cámara no esté siendo usada por otra app`);
                    }
                  }, 3000);
                } else {
                  console.warn(`⚠️ Video para ${userId} dice que reproduce pero sigue paused=${video.paused}`);
                }
              }, 1500);
            } else {
              console.warn(`⚠️ Video para ${userId} dice que reproduce pero currentTime=0 y paused=${video.paused}`);
            }
          }, 1000);
          
        }).catch(err => {
          console.error(`❌ Error crítico al reproducir video de ${userId}:`, err);
          console.log(`🔍 Detalles del error:`, {
            name: err.name,
            message: err.message,
            code: err.code
          });
          console.log(`📊 Estado en error:`, {
            paused: video.paused,
            muted: video.muted,
            readyState: video.readyState,
            networkState: video.networkState,
            error: video.error ? {
              code: video.error.code,
              message: video.error.message
            } : null
          });
          
          video._playAttemptInProgress = false;
          
          // ✅ DIAGNÓSTICO Y REINTENTO ESPECÍFICO
          if (err.name === 'NotAllowedError') {
            console.log(`🚫 NotAllowedError para ${userId} - política de autoplay`);
            video._playbackFailed = true;
          } else if (err.name === 'AbortError') {
            console.log(`⏹️ AbortError para ${userId} - reproducción interrumpida, reintentando...`);
            setTimeout(() => {
              video.load();
              video.muted = true;
              this.playVideo(video, userId);
            }, 1000);
          } else {
            console.log(`🔄 Error desconocido para ${userId}, intentando reseteo completo...`);
            setTimeout(() => {
              video.load();
              video.muted = true;
              video.play().then(() => {
                console.log(`✅ Reseteo exitoso para ${userId}`);
                video._playbackSuccessful = true;
                video._playbackFailed = false;
              }).catch(finalErr => {
                console.error(`❌ Reseteo falló para ${userId}:`, finalErr);
                video._playbackFailed = true;
              });
            }, 1500);
          }
        });
      } else {
        console.warn(`⚠️ Play() no devolvió promesa para ${userId}`);
        video._playAttemptInProgress = false;
        video._playbackFailed = true;
      }
    },
    
    // ✅ VERIFICAR VIDEOS - Sin loop infinito
    checkAndRestartVideos() {
      const now = Date.now();
      if (this._checkingVideos || (now - this._lastCheckTime) < 3000) {
        console.log('🚫 Verificación bloqueada - en curso o muy reciente');
        return;
      }
      
      this._checkingVideos = true;
      this._lastCheckTime = now;
      console.log('🔍 Verificación única de videos...');
      
      try {
        const videoElements = this.$refs.videoElements;
        if (!videoElements) {
          console.log('No hay elementos de video para verificar');
          return;
        }
        
        const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
        let needsProcessing = false;
        
        videos.forEach(video => {
          if (!video) return;
          
          const userId = video.getAttribute('data-user-id');
          if (!userId || !this.remoteStreams[userId]) return;
          
          // ✅ SKIP: Si ya tuvo éxito o falló completamente
          if (video._playbackSuccessful || video._playbackFailed) {
            console.log(`⏭️ Video para ${userId} ya procesado (${video._playbackSuccessful ? 'éxito' : 'falló'})`);
            return;
          }
          
          // Verificar que el video tenga srcObject
          if (!video.srcObject) {
            console.log(`⚠️ Video para ${userId} no tiene srcObject, asignando...`);
            this.updateVideoStreamForUser(userId);
            needsProcessing = true;
            return;
          }
          
          // Solo intentar reproducir si está pausado Y no ha fallado antes
          if (video.paused && !video._playAttemptInProgress && !video._playbackFailed) {
            console.log(`▶️ Video para ${userId} pausado, intento de reproducción`);
            this.playVideo(video, userId);
            needsProcessing = true;
          }
        });
        
        if (!needsProcessing) {
          console.log('✅ Todos los videos están funcionando correctamente');
        }
        
      } finally {
        // ✅ LIBERAR después de 5 segundos para evitar loops
        setTimeout(() => {
          this._checkingVideos = false;
        }, 5000);
      }
    },
    
    getParticipantName(userId) {
      const participant = this.participants.find(p => p.userId === userId);
      return participant ? participant.userName : 'Usuario';
    },

    // ✅ DIAGNÓSTICO COMPLETO
    diagnoseVideos() {
      console.log('===== DIAGNÓSTICO DE VIDEOS EN VIDEOGRID =====');
      
      const videoElements = this.$refs.videoElements;
      if (!videoElements) {
        console.log('No hay elementos de video para diagnosticar');
        return;
      }
      
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      console.log(`Encontrados ${videos.length} elementos de video`);
      
      videos.forEach(video => {
        if (!video) return;
        
        const userId = video.getAttribute('data-user-id');
        if (!userId) {
          console.log('Video sin userId');
          return;
        }
        
        console.log(`VIDEO PARA ${userId}:`);
        console.log('- Pausado:', video.paused);
        console.log('- Terminado:', video.ended);
        console.log('- Tiempo actual:', video.currentTime);
        console.log('- Muted:', video.muted);
        console.log('- Volumen:', video.volume);
        console.log('- Ancho/Alto:', video.videoWidth, 'x', video.videoHeight);
        console.log('- Ready State:', video.readyState);
        console.log('- _playbackSuccessful:', video._playbackSuccessful);
        console.log('- _playbackFailed:', video._playbackFailed);
        
        if (video.srcObject) {
          const stream = video.srcObject;
          console.log('- Stream asignado:', stream.id);
          console.log('- Stream activo:', stream.active);
          console.log('- Audio tracks:', stream.getAudioTracks().length);
          console.log('- Video tracks:', stream.getVideoTracks().length);
          
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            console.log('- Video track principal:', {
              enabled: videoTracks[0].enabled,
              readyState: videoTracks[0].readyState
            });
          }
          
          const storedStream = this.remoteStreams[userId];
          console.log('- ¿Coincide con remoteStreams?', storedStream === stream);
        } else {
          console.log('- NO TIENE STREAM ASIGNADO');
        }
      });
      
      console.log('============================================');
    },

    // ✅ DETENER VIDEOS
    stopAllVideoPlayback() {
      console.log('Pausando todos los videos antes de la limpieza...');
      
      const videoElements = this.$refs.videoElements;
      if (!videoElements) return;
      
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      
      videos.forEach(video => {
        if (!video) return;
        
        try {
          video.pause();
        } catch (e) {
          console.warn('Error al pausar video:', e);
        }
      });
      
      // Limpiar intervalos
      Object.keys(this.streamPlayIntervals).forEach(userId => {
        clearInterval(this.streamPlayIntervals[userId]);
        delete this.streamPlayIntervals[userId];
      });
    },


    checkAndFixTinyVideo(video, userId) {
      if (!video || !video.videoWidth || !video.videoHeight) return;
      
      console.log(`🔍 Verificando dimensiones de video para ${userId}:`, {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      
      // Si las dimensiones son microscópicas
      if (video.videoWidth <= 10 || video.videoHeight <= 10) {
        console.warn(`🚨 VIDEO MICROSCÓPICO DETECTADO para ${userId}: ${video.videoWidth}x${video.videoHeight}`);
        
        // ✅ SOLUCIÓN 1: Aplicar clase CSS especial
        video.classList.add('tiny-video');
        
        // ✅ SOLUCIÓN 2: Forzar estilos específicos
        video.style.objectFit = 'fill';
        video.style.transform = 'scale(2)';
        video.style.minWidth = '100%';
        video.style.minHeight = '100%';
        video.style.width = '100%';
        video.style.height = '100%';
        
        console.log(`🔧 Aplicados estilos correctivos para video microscópico de ${userId}`);
        
        // ✅ SOLUCIÓN 3: Forzar recarga del video
        setTimeout(() => {
          console.log(`🔄 Forzando recarga de video microscópico para ${userId}`);
          const currentSrc = video.srcObject;
          video.srcObject = null;
          setTimeout(() => {
            video.srcObject = currentSrc;
            video.load();
            
            setTimeout(() => {
              console.log(`📐 Dimensiones después de recarga:`, {
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight
              });
            }, 1000);
          }, 100);
        }, 2000);
        
        return true; // Indica que se aplicaron correcciones
      }
      
      return false;
    }
  },

  
  mounted() {
    this.updateVideoStreams = () => {
      const videoElements = this.$refs.videoElements;
      if (!videoElements) return;
      
      const videos = Array.isArray(videoElements) ? videoElements : [videoElements];
      
      videos.forEach(video => {
        if (!video) return;
        
        const userId = video.getAttribute('data-user-id');
        if (!userId || !this.remoteStreams[userId]) return;
        
        if (!video.srcObject || video.srcObject !== this.remoteStreams[userId]) {
          this.updateVideoStreamForUser(userId);
        }
      });
    };
    
    this.updateVideoStreams();
  },
  
  beforeDestroy() {
    if (this._streamUpdateTimeout) {
      clearTimeout(this._streamUpdateTimeout);
    }
    
    Object.keys(this.streamPlayIntervals).forEach(userId => {
      clearInterval(this.streamPlayIntervals[userId]);
    });
    
    Object.keys(this.streamTimers).forEach(userId => {
      clearTimeout(this.streamTimers[userId]);
    });
  }
}
</script>

<style scoped>
/* ... mantienes el mismo CSS que tenías ... */
.video-grid-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px;
  box-sizing: border-box;
  overflow: hidden;
}

.video-grid {
  display: grid;
  gap: 10px;
  width: 100%;
  height: 100%;
  min-height: 300px;
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

.grid-item {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px; /* ✅ AUMENTAR altura mínima */
  background-color: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  
  /* ✅ NUEVO: Debugging visual */
  border: 2px solid #333; /* Para ver el contenedor */
}


.grid-item.portrait-video .remote-video {
  width: auto !important;
  height: 100% !important;
  max-height: 100%;
}

.remote-video {
  width: 100% !important;
  height: 100% !important; /* ✅ CAMBIO: Forzar altura completa */
  max-width: 100%;
  max-height: 100%;
  object-fit: cover; /* ✅ CAMBIO: De contain a cover para videos pequeños */
  background-color: #000;
  
  /* ✅ NUEVO: Forzar dimensiones mínimas */
  min-width: 200px;
  min-height: 150px;
}

.remote-video.tiny-video {
  object-fit: fill !important;
  transform: scale(20) !important; /* ✅ ESCALAR 20X en lugar de 2X */
  transform-origin: center center !important;
  filter: contrast(2) brightness(1.5) !important;
  border: 5px solid #ff0000 !important; /* Borde rojo muy visible */
  background-color: #ff00ff !important; /* Fondo magenta para debug */
  z-index: 999 !important;
  
  /* Forzar dimensiones específicas */
  width: 400px !important;
  height: 300px !important;
  min-width: 400px !important;
  min-height: 300px !important;
  max-width: none !important;
  max-height: none !important;
  
  /* Centrar el video escalado */
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  margin-left: -200px !important; /* -width/2 */
  margin-top: -150px !important;  /* -height/2 */
}

.username-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 4px;
  font-size: 0.9rem;
  z-index: 2;
}

.empty-grid {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #ffffff;
  text-align: center;
  background-color: #1a1a1a;
  border-radius: 8px;
  padding: 20px;
}



@media (min-width: 1200px) {
  .grid-item {
    min-height: 250px;
  }
}

@media (max-width: 768px) {
  .video-grid-container {
    padding: 10px;
  }
  
  .grid-item {
    min-height: 150px;
  }
  
  .username-label {
    font-size: 0.8rem;
    padding: 3px 6px;
  }
}
</style>