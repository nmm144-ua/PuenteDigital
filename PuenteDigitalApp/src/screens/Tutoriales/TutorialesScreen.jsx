import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  StatusBar,
  RefreshControl
} from 'react-native';
import { supabase } from '../../../supabase';
import { Ionicons } from '@expo/vector-icons';

const TutorialesScreen = ({ navigation }) => {
  const [tutoriales, setTutoriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [tipoRecurso, setTipoRecurso] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [showBuscador, setShowBuscador] = useState(false);

  useEffect(() => {
    cargarTutoriales();
  }, [filtroCategoria, tipoRecurso]);

  const cargarTutoriales = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Construir la consulta base
      let query = supabase
        .from('tutoriales')
        .select(`
          *,
          asistentes:asistente_id (nombre)
        `);
      
      // Aplicar filtro de búsqueda si existe
      if (busqueda.trim()) {
        query = query.ilike('titulo', `%${busqueda.trim()}%`);
      }
      
      // Aplicar filtro de categoría
      if (filtroCategoria) {
        query = query.eq('categoria', filtroCategoria);
      }
      
      // Filtrar por tipo de recurso
      if (tipoRecurso !== 'todos') {
        // Corrección del filtro para que funcione correctamente
        if (tipoRecurso === 'video') {
          query = query.in('tipo_recurso', ['video', 'ambos']);
        } else if (tipoRecurso === 'pdf') {
          query = query.in('tipo_recurso', ['pdf', 'ambos']);
        }
      }
      
      // Ordenar por más recientes
      query = query.order('created_at', { ascending: false });
      
      // Ejecutar consulta
      const { data, error: supabaseError } = await query;
      
      if (supabaseError) throw supabaseError;
      
      // Procesar los datos para incluir el nombre del asistente
      const tutorialesProcesados = data.map(tutorial => ({
        ...tutorial,
        nombre_asistente: tutorial.asistentes?.nombre || 'Asistente'
      }));
      
      setTutoriales(tutorialesProcesados);
    } catch (err) {
      console.error('Error al cargar tutoriales:', err);
      setError('No se pudieron cargar los tutoriales. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarTutoriales();
  };

  const handleSearch = () => {
    cargarTutoriales();
  };

  const toggleBuscador = () => {
    setShowBuscador(!showBuscador);
    if (showBuscador) {
      // Si estamos cerrando el buscador, limpiamos la búsqueda
      setBusqueda('');
      cargarTutoriales();
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

  const getIconoTipoRecurso = (tipo) => {
    switch (tipo) {
      case 'video':
        return 'videocam-outline';
      case 'pdf':
        return 'document-text-outline';
      case 'ambos':
        return 'albums-outline';
      default:
        return 'help-circle-outline';
    }
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

  const handleVerTutorial = (tutorial) => {
    navigation.navigate('DetalleTutorial', { tutorial });
  };

  const renderCategoriasChips = () => {
    const categorias = [
      { id: '', nombre: 'Todos' },
      { id: 'tecnologia', nombre: 'Tecnología' },
      { id: 'educacion', nombre: 'Educación' },
      { id: 'salud', nombre: 'Salud' },
      { id: 'tramites', nombre: 'Trámites' },
      { id: 'comunicacion', nombre: 'Comunicación' },
      { id: 'otro', nombre: 'Otro' }
    ];

    return (
      <FlatList
        horizontal
        data={categorias}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoriaChip,
              filtroCategoria === item.id && styles.categoriaChipActive
            ]}
            onPress={() => setFiltroCategoria(item.id)}
          >
            <Text 
              style={[
                styles.categoriaChipText,
                filtroCategoria === item.id && styles.categoriaChipTextActive
              ]}
            >
              {item.nombre}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.categoriasContainer}
      />
    );
  };

  const renderTipoRecursoChips = () => {
    const tipos = [
      { id: 'todos', nombre: 'Todos' },
      { id: 'video', nombre: 'Videos' },
      { id: 'pdf', nombre: 'Guías PDF' }
    ];

    return (
      <FlatList
        horizontal
        data={tipos}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.tipoRecursoChip,
              tipoRecurso === item.id && styles.tipoRecursoChipActive
            ]}
            onPress={() => setTipoRecurso(item.id)}
          >
            <Ionicons 
              name={item.id === 'todos' ? 'list-outline' : 
                   (item.id === 'video' ? 'videocam-outline' : 'document-text-outline')} 
              size={16} 
              color={tipoRecurso === item.id ? '#fff' : '#007BFF'} 
              style={styles.tipoRecursoIcon}
            />
            <Text 
              style={[
                styles.tipoRecursoChipText,
                tipoRecurso === item.id && styles.tipoRecursoChipTextActive
              ]}
            >
              {item.nombre}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.tiposRecursoContainer}
      />
    );
  };

  const renderTutorialItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tutorialCard}
      onPress={() => handleVerTutorial(item)}
    >
      {/* Placeholder generado con iconos en lugar de imágenes */}
      <View style={[
        styles.tutorialImageContainer,
        { backgroundColor: item.tipo_recurso === 'pdf' ? '#f8d7da' : '#d1e7dd' }
      ]}>
        <View style={styles.placeholderContainer}>
          <Ionicons 
            name={item.tipo_recurso === 'pdf' ? 'document-text' : 'videocam'} 
            size={50} 
            color={item.tipo_recurso === 'pdf' ? '#dc3545' : '#28a745'} 
          />
          <Text style={[
            styles.placeholderText,
            { color: item.tipo_recurso === 'pdf' ? '#dc3545' : '#28a745' }
          ]}>
            {item.tipo_recurso === 'pdf' ? 'PDF' : 'VIDEO'}
          </Text>
        </View>
        <View style={[
          styles.tipoBadge, 
          { backgroundColor: getColorTipoRecurso(item.tipo_recurso || 'video') }
        ]}>
          <Ionicons 
            name={getIconoTipoRecurso(item.tipo_recurso || 'video')} 
            size={14} 
            color="#fff" 
          />
          <Text style={styles.tipoBadgeText}>
            {formatTipoRecurso(item.tipo_recurso || 'video')}
          </Text>
        </View>
      </View>
      
      {/* Información del tutorial */}
      <View style={styles.tutorialInfo}>
        <Text style={styles.tutorialTitulo} numberOfLines={2}>{item.titulo}</Text>
        
        <View style={styles.tutorialMeta}>
          <View style={styles.categoriaBadge}>
            <Text style={styles.categoriaBadgeText}>
              {formatCategoria(item.categoria)}
            </Text>
          </View>
          
          <Text style={styles.tutorialFecha}>
            <Ionicons name="calendar-outline" size={12} color="#666" />
            {' '}{formatDate(item.created_at)}
          </Text>
        </View>
        
        <Text style={styles.tutorialDescripcion} numberOfLines={2}>
          {item.descripcion}
        </Text>
        
        <View style={styles.tutorialStats}>
          <Text style={styles.tutorialStatText}>
            <Ionicons name="eye-outline" size={14} color="#666" />
            {' '}{item.vistas || 0}
          </Text>
          <Text style={styles.tutorialStatText}>
            <Ionicons name="thumbs-up-outline" size={14} color="#666" />
            {' '}{item.me_gusta || 0}
          </Text>
          <Text style={styles.tutorialAsistente}>
            <Ionicons name="person-outline" size={14} color="#666" />
            {' '}{item.nombre_asistente}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        
        {showBuscador ? (
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar tutoriales..."
              value={busqueda}
              onChangeText={setBusqueda}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Ionicons name="search" size={20} color="#007BFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.headerTitle}>Tutoriales</Text>
        )}
        
        <TouchableOpacity 
          style={styles.searchToggleButton}
          onPress={toggleBuscador}
        >
          <Ionicons 
            name={showBuscador ? "close" : "search"} 
            size={24} 
            color="#007BFF" 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.filtrosContainer}>
        {renderCategoriasChips()}
        {renderTipoRecursoChips()}
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Cargando tutoriales...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={cargarTutoriales}
          >
            <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      ) : tutoriales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off-outline" size={48} color="#6c757d" />
          <Text style={styles.emptyText}>No se encontraron tutoriales</Text>
          <Text style={styles.emptySubtext}>
            Prueba a cambiar los filtros o vuelve más tarde.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tutoriales}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTutorialItem}
          contentContainerStyle={styles.tutorialesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007BFF"]}
            />
          }
        />
      )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
    marginBottom: 5, // Ajustamos para que no se corte
  },
  searchToggleButton: {
    marginLeft: 10,
    padding: 8, // Aumentamos el área táctil
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 40, // Altura fija para el buscador
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    paddingHorizontal: 8,
  },
  searchButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007BFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  filtrosContainer: {
    backgroundColor: '#fff',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  categoriasContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoriaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoriaChipActive: {
    backgroundColor: '#007BFF',
    borderColor: '#0062cc',
  },
  categoriaChipText: {
    fontSize: 14,
    color: '#495057',
  },
  categoriaChipTextActive: {
    color: '#fff',
  },
  tiposRecursoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tipoRecursoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tipoRecursoChipActive: {
    backgroundColor: '#007BFF',
    borderColor: '#0062cc',
  },
  tipoRecursoIcon: {
    marginRight: 4,
  },
  tipoRecursoChipText: {
    fontSize: 14,
    color: '#495057',
  },
  tipoRecursoChipTextActive: {
    color: '#fff',
  },
  tutorialesList: {
    padding: 16,
  },
  tutorialCard: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  tutorialImageContainer: {
    position: 'relative',
    height: 160,
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  tipoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  tutorialInfo: {
    padding: 16,
  },
  tutorialTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  tutorialMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoriaBadge: {
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoriaBadgeText: {
    fontSize: 12,
    color: '#007BFF',
  },
  tutorialFecha: {
    fontSize: 12,
    color: '#6c757d',
  },
  tutorialDescripcion: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  tutorialStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  tutorialStatText: {
    fontSize: 12,
    color: '#6c757d',
    marginRight: 12,
  },
  tutorialAsistente: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
    textAlign: 'right',
  },
});

export default TutorialesScreen;