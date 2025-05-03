import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Linking,
  Dimensions
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import tutorialesService from '../../services/tutorialesService'; // Importamos el servicio

const DetalleTutorialScreen = ({ route, navigation }) => {
  const { tutorial: tutorialParam } = route.params;
  const [tutorial, setTutorial] = useState(tutorialParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [dioMeGusta, setDioMeGusta] = useState(false);
  const videoRef = useRef(null);

  // Computed properties para determinar qué recursos mostrar
  const tieneVideo = tutorial?.tipo_recurso === 'video' || tutorial?.tipo_recurso === 'ambos';
  const tienePdf = tutorial?.tipo_recurso === 'pdf' || tutorial?.tipo_recurso === 'ambos';

  useEffect(() => {
    // Incrementar contador de vistas
    incrementarVistas();
  }, []);

  const incrementarVistas = async () => {
    try {
      if (!tutorial?.id) return;

      // Usar el servicio para incrementar las vistas
      const { data, error: apiError } = await tutorialesService.incrementarVistas(tutorial.id);

      if (apiError) throw apiError;

      if (data && data.length > 0) {
        setTutorial(prev => ({ ...prev, vistas: data[0].vistas }));
      }
    } catch (err) {
      console.error('Error al incrementar vistas:', err);
    }
  };

  const darMeGusta = async () => {
    try {
      // Feedback táctil
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Verificar si el usuario está autenticado usando el servicio
      const { autenticado, error: authError } = await tutorialesService.verificarUsuarioAutenticado();
      
      if (authError) throw authError;
      
      if (!autenticado) {
        Alert.alert(
          "Iniciar sesión",
          "Debes iniciar sesión para dar me gusta a un tutorial.",
          [{ text: "Entendido" }]
        );
        return;
      }

      const nuevoEstado = !dioMeGusta;
      setDioMeGusta(nuevoEstado);

      if (nuevoEstado) {
        // Incrementar me gusta usando el servicio
        const { data, error: likeError } = await tutorialesService.incrementarMeGusta(tutorial.id);

        if (likeError) throw likeError;

        if (data && data.length > 0) {
          setTutorial(prev => ({ ...prev, me_gusta: data[0].me_gusta }));
        }
      } else {
        // Decrementar me gusta usando el servicio
        const { data, error: unlikeError } = await tutorialesService.decrementarMeGusta(tutorial.id);

        if (unlikeError) throw unlikeError;

        if (data && data.length > 0) {
          setTutorial(prev => ({ ...prev, me_gusta: data[0].me_gusta }));
        }
      }

    } catch (err) {
      console.error('Error al dar me gusta:', err);
      Alert.alert(
        "Error",
        "No se pudo registrar tu me gusta. Inténtalo de nuevo.",
        [{ text: "Entendido" }]
      );
      setDioMeGusta(!dioMeGusta); // Revertir el estado
    }
  };

  const compartirTutorial = async () => {
    try {
      // Feedback táctil
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Preparar datos para compartir
      const titulo = tutorial.titulo;
      const descripcion = tutorial.descripcion;
      
      // Compartir usando API nativa - sin URL específica
      const result = await Share.share({
        message: `¡Mira este tutorial: ${titulo}! ${descripcion}`,
        title: titulo,
      });

      if (result.action === Share.sharedAction) {
        // Incrementar contador de compartidos usando el servicio
        await tutorialesService.incrementarCompartidos(tutorial.id);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo compartir el tutorial");
    }
  };

  const abrirPdf = async () => {
    if (!tutorial?.pdf_url) {
      Alert.alert("Error", "Este tutorial no tiene una guía PDF disponible");
      return;
    }
    
    try {
      setDescargandoPdf(true);

      // Verificar si podemos abrir la URL
      if (await Linking.canOpenURL(tutorial.pdf_url)) {
        // Proporcionar instrucciones claras antes de abrir el PDF
        Alert.alert(
          "Abrir Guía PDF",
          "A continuación se abrirá la guía PDF. Para verla necesitarás una aplicación de lectura de PDF en tu dispositivo.",
          [
            { 
              text: "Cancelar", 
              style: "cancel",
              onPress: () => setDescargandoPdf(false)
            },
            { 
              text: "Abrir PDF", 
              onPress: async () => {
                await Linking.openURL(tutorial.pdf_url);
                
                // Incrementar contador de compartidos como medida de "descarga"
                await tutorialesService.incrementarCompartidos(tutorial.id);
                
                setDescargandoPdf(false);
              }
            }
          ]
        );
      } else {
        Alert.alert(
          "No se puede abrir el PDF", 
          "Tu dispositivo no puede abrir archivos PDF. Por favor, instala una aplicación para leer PDFs desde tu tienda de aplicaciones.",
          [{ text: "Entendido" }]
        );
        setDescargandoPdf(false);
      }
    } catch (error) {
      console.error('Error al abrir PDF:', error);
      Alert.alert(
        "Error",
        "No se pudo abrir la guía PDF. Por favor, inténtalo de nuevo más tarde.",
        [{ text: "Entendido" }]
      );
      setDescargandoPdf(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatCategoria = (categoria) => {
    const categorias = {
      'tecnologia': 'Tecnología',
      'educacion': 'Educación',
      'salud': 'Salud',
      'tramites': 'Trámites',
      'comunicacion': 'Comunicación',
      'otro': 'Otro'
    };
    
    return categorias[categoria] || categoria;
  };

  const formatTipoRecurso = (tipo) => {
    const tipos = {
      'video': 'Video',
      'pdf': 'Guía PDF',
      'ambos': 'Video y PDF'
    };
    
    return tipos[tipo] || tipo;
  };

  const getColorTipoRecurso = (tipo) => {
    switch (tipo) {
      case 'video':
        return '#28a745'; // verde
      case 'pdf':
        return '#dc3545'; // rojo
      case 'ambos':
        return '#ffc107'; // amarillo
      default:
        return '#6c757d'; // gris
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header con botón de volver */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tutorial.titulo}
        </Text>
      </View>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Información del tutorial */}
        <View style={styles.infoSection}>
          <Text style={styles.titulo}>{tutorial.titulo}</Text>
          
          <View style={styles.badgesContainer}>
            <View style={styles.categoriaBadge}>
              <Text style={styles.categoriaBadgeText}>
                {formatCategoria(tutorial.categoria)}
              </Text>
            </View>
            
            <View style={[
              styles.tipoBadge, 
              { backgroundColor: getColorTipoRecurso(tutorial.tipo_recurso || 'video') }
            ]}>
              <Ionicons 
                name={tutorial.tipo_recurso === 'video' ? 'videocam-outline' : 
                     (tutorial.tipo_recurso === 'pdf' ? 'document-text-outline' : 'albums-outline')} 
                size={14} 
                color="#fff" 
              />
              <Text style={styles.tipoBadgeText}>
                {formatTipoRecurso(tutorial.tipo_recurso || 'video')}
              </Text>
            </View>
          </View>
          
          <View style={styles.metaContainer}>
            <Text style={styles.fechaText}>
              <Ionicons name="calendar-outline" size={14} color="#6c757d" />
              {' '}{formatDate(tutorial.created_at)}
            </Text>
            
            <Text style={styles.asistenteText}>
              <Ionicons name="person-outline" size={14} color="#6c757d" />
              {' '}{tutorial.nombre_asistente || 'Asistente'}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Descripción:</Text>
          <Text style={styles.descripcion}>{tutorial.descripcion}</Text>
        </View>

        {/* Sección de video */}
        {tieneVideo && (
          <View style={styles.videoSection}>
            <Text style={styles.sectionTitle}>Video:</Text>
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                source={{ uri: tutorial.video_url }}
                useNativeControls
                resizeMode="contain"
                style={styles.video}
                usePoster={false}
              />
            </View>
            <Text style={styles.instruccionesText}>
              • Pulse sobre el vídeo para reproducir.
              {'\n'}• Pulse una vez para pausar o reanudar.
              {'\n'}• Utilice los controles para avanzar o retroceder.
            </Text>
          </View>
        )}

        {/* Sección de PDF */}
        {tienePdf && (
          <View style={styles.pdfSection}>
            <Text style={styles.sectionTitle}>Guía PDF:</Text>
            
            <View style={styles.pdfInfoContainer}>
              <View style={styles.pdfIconContainer}>
                <Ionicons name="document-text" size={40} color="#dc3545" />
              </View>
              
              <View style={styles.pdfDetails}>
                <Text style={styles.pdfTitle}>Guía en formato PDF</Text>
                <Text style={styles.pdfSize}>
                  {formatFileSize(tutorial.pdf_tamanio || 0)}
                </Text>
              </View>              
            </View>
            
            {/* Instrucciones claras para el PDF */}
            <View style={styles.pdfInstruccionesContainer}>
              <Text style={styles.pdfInstruccionesTitle}>
                ¿Cómo ver la guía PDF?
              </Text>
              <Text style={styles.pdfInstruccionesText}>
                1. Pulse el botón "Ver Guía PDF" a continuación.
                {'\n'}2. El documento se abrirá en su aplicación para leer PDFs.
                {'\n'}3. Si no tiene una aplicación para leer PDFs, su dispositivo le ofrecerá instalar una.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.pdfAbrirButton}
              onPress={abrirPdf}
              disabled={descargandoPdf}
            >
              {descargandoPdf ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={24} color="#fff" />
                  <Text style={styles.pdfAbrirButtonText}>Ver Guía PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Acciones */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[
              styles.actionButton,
              dioMeGusta ? styles.actionButtonActive : null
            ]}
            onPress={darMeGusta}
          >
            <Ionicons 
              name={dioMeGusta ? "thumbs-up" : "thumbs-up-outline"} 
              size={20} 
              color={dioMeGusta ? "#fff" : "#007BFF"} 
            />
            <Text 
              style={[
                styles.actionButtonText,
                dioMeGusta ? styles.actionButtonTextActive : null
              ]}
            >
              Me gusta ({tutorial.me_gusta || 0})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={compartirTutorial}
          >
            <Ionicons name="share-outline" size={20} color="#007BFF" />
            <Text style={styles.actionButtonText}>Compartir</Text>
          </TouchableOpacity>
        </View>
        
        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={20} color="#6c757d" />
            <Text style={styles.statValue}>{tutorial.vistas || 0}</Text>
            <Text style={styles.statLabel}>Vistas</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="thumbs-up-outline" size={20} color="#6c757d" />
            <Text style={styles.statValue}>{tutorial.me_gusta || 0}</Text>
            <Text style={styles.statLabel}>Me gusta</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="share-outline" size={20} color="#6c757d" />
            <Text style={styles.statValue}>{tutorial.compartidos || 0}</Text>
            <Text style={styles.statLabel}>Compartidos</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 25, // Aumentamos el padding superior
    marginTop: 10, // Añadimos margen superior
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
    height: 80, // Definimos una altura fija para el header
  },
  backButton: {
    marginRight: 16,
    padding: 8, // Aumentamos el área táctil
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
    marginBottom: 5, // Ajustamos para que no se corte
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoriaBadge: {
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  categoriaBadgeText: {
    fontSize: 12,
    color: '#007BFF',
  },
  tipoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tipoBadgeText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fechaText: {
    fontSize: 14,
    color: '#6c757d',
  },
  asistenteText: {
    fontSize: 14,
    color: '#6c757d',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 16,
    color: '#495057',
    lineHeight: 24,
  },
  videoSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  videoContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 12,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  instruccionesText: {
    fontSize: 14,
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007BFF',
  },
  pdfSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pdfInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 12,
    marginBottom: 16,
  },
  pdfIconContainer: {
    marginRight: 12,
  },
  pdfDetails: {
    flex: 1,
  },
  pdfTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  pdfSize: {
    fontSize: 14,
    color: '#6c757d',
  },
  pdfInstruccionesContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  pdfInstruccionesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  pdfInstruccionesText: {
    fontSize: 15,
    color: '#856404',
    lineHeight: 24,
  },
  pdfAbrirButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pdfAbrirButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonActive: {
    backgroundColor: '#007BFF',
    borderColor: '#0062cc',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007BFF',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
  }
});

export default DetalleTutorialScreen;