<template>
  <div class="signature-pad-container">
    <label class="form-label">
      <i class="bi bi-pen"></i> Firma digital
    </label>
    <div class="signature-pad-wrapper">
      <canvas ref="signatureCanvas" class="signature-pad"></canvas>
    </div>
    <div class="signature-controls">
      <button type="button" class="btn btn-outline-secondary btn-sm" @click="limpiarFirma">
        <i class="bi bi-x"></i> Borrar firma
      </button>
    </div>
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div class="form-text">Firma con el ratón o pantalla táctil en el recuadro de arriba.</div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import SignaturePad from 'signature_pad';

export default {
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    required: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const signatureCanvas = ref(null);
    const signaturePad = ref(null);
    const errorMessage = ref('');

    // Inicializar el pad de firma
    const inicializarSignaturePad = () => {
      if (!signatureCanvas.value) return;
      
      // Ajustar el tamaño del canvas
      const canvas = signatureCanvas.value;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = 200 * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      
      // Crear la instancia de SignaturePad
      signaturePad.value = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)'
      });
      
      // Cargar firma si hay un valor existente
      if (props.modelValue) {
        signaturePad.value.fromDataURL(props.modelValue);
      }
      
      // Agregar eventos
      signaturePad.value.addEventListener("endStroke", () => {
        actualizarValor();
      });
    };
    
    // Actualizar el valor del modelo
    const actualizarValor = () => {
      if (signaturePad.value.isEmpty()) {
        emit('update:modelValue', '');
        if (props.required) {
          errorMessage.value = 'La firma es obligatoria';
        }
        emit('change', { isEmpty: true, dataURL: '' });
      } else {
        const dataURL = signaturePad.value.toDataURL('image/png');
        emit('update:modelValue', dataURL);
        errorMessage.value = '';
        emit('change', { isEmpty: false, dataURL });
      }
    };
    
    // Limpiar la firma
    const limpiarFirma = () => {
      if (signaturePad.value) {
        signaturePad.value.clear();
        actualizarValor();
      }
    };
    
    // Redimensionar el canvas cuando cambia el tamaño de la ventana
    const redimensionarCanvas = () => {
      if (signaturePad.value) {
        const data = signaturePad.value.toData();
        inicializarSignaturePad();
        if (data) {
          signaturePad.value.fromData(data);
        }
      }
    };
    
    // Montar el componente
    onMounted(() => {
      inicializarSignaturePad();
      window.addEventListener('resize', redimensionarCanvas);
    });
    
    // Vigilar cambios en el valor del modelo
    watch(() => props.modelValue, (newValue) => {
      if (signaturePad.value && newValue && signaturePad.value.isEmpty()) {
        signaturePad.value.fromDataURL(newValue);
      } else if (signaturePad.value && !newValue) {
        signaturePad.value.clear();
      }
    });
    
    return {
      signatureCanvas,
      limpiarFirma,
      errorMessage
    };
  }
};
</script>

<style scoped>
.signature-pad-container {
  margin-bottom: 1.5rem;
  width: 100%;
}

.signature-pad-wrapper {
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  background-color: #fff;
  margin-bottom: 0.5rem;
  touch-action: none;
}

.signature-pad {
  width: 100%;
  height: 200px;
  touch-action: none;
}

.signature-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #dc3545;
  font-size: 0.875em;
  margin-top: 0.25rem;
}

.form-text {
  color: #6c757d;
  font-size: 0.875em;
}
</style>