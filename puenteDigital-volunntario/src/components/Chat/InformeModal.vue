<!-- src/components/Asistente/InformeModal.vue -->
<template>
    <div class="informe-modal-overlay" @click.self="closeModal">
      <div class="informe-modal-container">
        <div class="informe-modal-header">
          <h2><i class="fas fa-clipboard-check"></i> Informe de asistencia</h2>
          <button @click="closeModal" class="close-button">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="informe-modal-body">
          <!-- Informe principal -->
          <div class="form-group">
            <label for="informe">Descripción de la asistencia:</label>
            <div class="textarea-container">
              <textarea
                id="informe"
                v-model="informe"
                class="informe-textarea"
                placeholder="Describe las acciones realizadas durante la asistencia, soluciones proporcionadas, y recomendaciones dadas al usuario..."
                :maxlength="maxLength"
              ></textarea>
              <div class="char-counter" :class="{ 'warning': informe.length < 10 }">
                {{ informe.length }} / {{ maxLength }}
              </div>
            </div>
            <div class="validation-message" v-if="informe.length < 10">
              <i class="fas fa-exclamation-circle"></i>
              El informe debe tener al menos 10 caracteres
            </div>
          </div>
          
          <!-- Plantillas rápidas -->
          <div class="plantillas-container">
            <h3>Plantillas rápidas</h3>
            <div class="plantillas-grid">
              <button 
                v-for="(plantilla, index) in plantillas" 
                :key="index"
                @click="aplicarPlantilla(plantilla)"
                class="plantilla-button"
              >
                {{ plantilla.titulo }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="informe-modal-footer">
          <button @click="closeModal" class="cancel-button">
            <i class="fas fa-times"></i> Cancelar
          </button>
          <button 
            @click="guardarInforme" 
            class="save-button" 
            :disabled="!esValido || guardando"
          >
            <i class="fas fa-spinner fa-spin" v-if="guardando"></i>
            <i class="fas fa-save" v-else></i>
            {{ guardando ? 'Guardando...' : 'Guardar y finalizar' }}
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, computed, onMounted } from 'vue';
  import { solicitudesAsistenciaService } from '@/services/solicitudAsistenciaService';
  
  export default {
    name: 'InformeModal',
    props: {
      solicitudId: {
        type: [Number, String],
        required: true
      }
    },
    emits: ['close', 'saved'],
    setup(props, { emit }) {
      const informe = ref('');
      const guardando = ref(false);
      const maxLength = 1000;
      
      // Plantillas predefinidas
      const plantillas = [
        {
          titulo: 'Problema resuelto',
          texto: 'Se atendió consulta del usuario sobre un problema técnico. Se identificó la causa del problema y se proporcionó una solución paso a paso. El usuario pudo resolver el inconveniente durante la asistencia.'
        },
        {
          titulo: 'Información proporcionada',
          texto: 'Se atendió solicitud de información sobre nuestros servicios/productos. Se explicaron las características, beneficios y precios. El usuario recibió toda la información solicitada y quedó satisfecho con la atención.'
        },
        {
          titulo: 'Incidencia escalada',
          texto: 'Se atendió un problema técnico complejo que requiere intervención del equipo de soporte avanzado. Se recopilaron todos los detalles necesarios y se ha escalado la incidencia. El usuario fue informado del proceso a seguir.'
        },
        {
          titulo: 'Consulta de facturación',
          texto: 'Se atendió consulta relacionada con facturación. Se revisó el historial de pagos y se aclararon las dudas específicas del usuario. Se le proporcionó información sobre próximos cargos y métodos de pago disponibles.'
        }
      ];
      
      // Validación del formulario
      const esValido = computed(() => {
        return informe.value.length >= 10;
      });
      
      // Cargar datos iniciales si es necesario
      const cargarDatos = async () => {
        try {
          // Si se está editando un informe existente, podrías cargar su contenido aquí
          if (props.solicitudId) {
            const solicitud = await solicitudesAsistenciaService.getSolicitudById(props.solicitudId);
            if (solicitud && solicitud.informe) {
              informe.value = solicitud.informe;
            }
          }
        } catch (error) {
          console.error('Error al cargar datos:', error);
        }
      };
      
      // Aplicar plantilla
      const aplicarPlantilla = (plantilla) => {
        // Si ya hay contenido, preguntar antes de sobrescribir
        if (informe.value.trim() !== '') {
          if (!confirm('¿Deseas reemplazar el texto actual con esta plantilla?')) {
            return;
          }
        }
        informe.value = plantilla.texto;
      };
      
      // Guardar informe
      const guardarInforme = async () => {
        if (!esValido.value) return;
        
        guardando.value = true;
        try {
          // Guardar usando el servicio existente (solo enviando el texto del informe)
          await solicitudesAsistenciaService.guardarInforme(props.solicitudId, informe.value);
          
          // Emitir evento de guardado exitoso
          emit('saved');
        } catch (error) {
          console.error('Error al guardar informe:', error);
          alert('Error al guardar el informe: ' + error.message);
        } finally {
          guardando.value = false;
        }
      };
      
      // Cerrar modal
      const closeModal = () => {
        if (informe.value.trim() !== '' && 
            !confirm('¿Estás seguro de cerrar sin guardar los cambios?')) {
          return;
        }
        emit('close');
      };
      
      // Al montar el componente
      onMounted(() => {
        cargarDatos();
      });
      
      return {
        informe,
        guardando,
        maxLength,
        plantillas,
        esValido,
        aplicarPlantilla,
        guardarInforme,
        closeModal
      };
    }
  };
  </script>
  
  <style scoped>
  .informe-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
  }
  
  .informe-modal-container {
    background-color: white;
    border-radius: 12px;
    width: 100%;
    max-width: 650px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }
  
  .informe-modal-header {
    padding: 20px;
    background: linear-gradient(135deg, #1976d2, #1565c0);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .informe-modal-header h2 {
    margin: 0;
    font-size: 1.4rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .close-button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .close-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .informe-modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
  }
  
  .textarea-container {
    position: relative;
  }
  
  .informe-textarea {
    width: 100%;
    min-height: 150px;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  
  .informe-textarea:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }
  
  .char-counter {
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-size: 12px;
    color: #999;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 2px 8px;
    border-radius: 12px;
  }
  
  .char-counter.warning {
    color: #f44336;
  }
  
  .validation-message {
    margin-top: 8px;
    color: #f44336;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .plantillas-container {
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }
  
  .plantillas-container h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 1.1rem;
    color: #333;
  }
  
  .plantillas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }
  
  .plantilla-button {
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    color: #555;
  }
  
  .plantilla-button:hover {
    background-color: #e3f2fd;
    border-color: #1976d2;
    color: #1976d2;
    transform: translateY(-2px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
  }
  
  .informe-modal-footer {
    padding: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 15px;
    border-top: 1px solid #eaeaea;
    background-color: #f9f9f9;
  }
  
  .cancel-button, .save-button {
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }
  
  .cancel-button {
    background-color: #f5f5f5;
    color: #555;
    border: 1px solid #ddd;
  }
  
  .cancel-button:hover {
    background-color: #e0e0e0;
  }
  
  .save-button {
    background-color: #1976d2;
    color: white;
    border: none;
  }
  
  .save-button:hover:not(:disabled) {
    background-color: #1565c0;
  }
  
  .save-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  /* Responsividad */
  @media (max-width: 768px) {
    .informe-modal-container {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }
    
    .plantillas-grid {
      grid-template-columns: 1fr;
    }
    
    .informe-modal-footer {
      flex-direction: column-reverse;
    }
    
    .cancel-button, .save-button {
      width: 100%;
      justify-content: center;
    }
  }
  </style>