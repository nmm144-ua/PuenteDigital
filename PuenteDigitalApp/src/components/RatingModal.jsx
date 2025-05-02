// src/components/RatingModal.jsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ActivityIndicator
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsistenciaService from '../services/AsistenciaService';

const RatingModal = ({ visible, solicitudId, onClose }) => {
  const [rating, setRating] = useState(5); // Valor por defecto: 5 estrellas
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!solicitudId) {
      alert('No se puede valorar esta asistencia. Vuelva a intentarlo más tarde.');
      onClose();
      return;
    }
    
    setSubmitting(true);
    try {
      await AsistenciaService.guardarValoracion(solicitudId, rating);
      alert('¡Gracias por su valoración!');
      onClose();
    } catch (error) {
      console.error('Error al guardar valoración:', error);
      alert('No se pudo guardar la valoración. Inténtelo de nuevo más tarde.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
          accessibilityLabel={`${i} estrellas`}
          accessibilityHint={`Calificar con ${i} estrellas`}
        >
          <MaterialIcons
            name={i <= rating ? "star" : "star-border"}
            size={50}
            color={i <= rating ? "#FFD700" : "#CCCCCC"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => onClose()}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <MaterialIcons
              name="check-circle"
              size={60}
              color="#4CAF50"
            />
            <Text style={styles.title}>Videollamada finalizada</Text>
          </View>
          
          <Text style={styles.message}>
            ¿Cómo calificaría la atención recibida?
          </Text>
          
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          
          <Text style={styles.ratingText}>
            {rating === 1 && "Muy insatisfecho"}
            {rating === 2 && "Insatisfecho"}
            {rating === 3 && "Aceptable"}
            {rating === 4 && "Satisfecho"}
            {rating === 5 && "Muy satisfecho"}
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => onClose()}
              disabled={submitting}
              accessibilityLabel="Omitir valoración"
              accessibilityHint="No dar valoración y continuar"
            >
              <Text style={styles.skipButtonText}>Omitir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityLabel="Enviar valoración"
              accessibilityHint="Guardar la valoración seleccionada"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar valoración</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
  },
  message: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  starButton: {
    padding: 5,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 25,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  skipButton: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: '40%',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 18,
  },
  submitButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    minWidth: '50%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default RatingModal;