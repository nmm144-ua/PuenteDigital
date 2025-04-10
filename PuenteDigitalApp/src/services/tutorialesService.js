// src/services/tutorialesService.js
import { supabase } from '../../supabase';

/**
 * Servicio para gestionar tutoriales en la app móvil
 */
const tutorialesService = {
  /**
   * Obtiene tutoriales con filtros
   * @param {Object} opciones - Opciones de filtrado
   * @param {string} opciones.categoria - Categoría para filtrar
   * @param {string} opciones.tipoRecurso - Tipo de recurso (video, pdf, todos)
   * @param {string} opciones.busqueda - Texto para buscar en el título
   * @returns {Promise<Object>} Resultado de la consulta con tutoriales
   */
  async obtenerTutorialesConFiltros(opciones = {}) {
    try {
      const {
        categoria = '',
        tipoRecurso = 'todos',
        busqueda = '',
      } = opciones;
      
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
      if (categoria) {
        query = query.eq('categoria', categoria);
      }
      
      // Filtrar por tipo de recurso
      if (tipoRecurso !== 'todos') {
        // Usar in() para incluir 'ambos'
        if (tipoRecurso === 'video') {
          query = query.in('tipo_recurso', ['video', 'ambos']);
        } else if (tipoRecurso === 'pdf') {
          query = query.in('tipo_recurso', ['pdf', 'ambos']);
        }
      }
      
      // Ordenar por más recientes
      query = query.order('created_at', { ascending: false });
      
      // Ejecutar consulta
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Procesar los datos para incluir el nombre del asistente
      const tutorialesProcesados = data.map(tutorial => ({
        ...tutorial,
        nombre_asistente: tutorial.asistentes?.nombre || 'Asistente'
      }));
      
      return { data: tutorialesProcesados, error: null };
    } catch (error) {
      console.error('Error en obtenerTutorialesConFiltros:', error);
      return { data: [], error };
    }
  },

  /**
   * Obtiene un tutorial por su ID
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>} Resultado de la consulta
   */
  async obtenerTutorialPorId(tutorialId) {
    try {
      const { data, error } = await supabase
        .from('tutoriales')
        .select('*')
        .eq('id', tutorialId)
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Error en obtenerTutorialPorId:', error);
      return { data: null, error };
    }
  },

  /**
   * Obtiene un tutorial por su ID junto con el nombre del asistente
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>} Resultado de la consulta
   */
  async obtenerTutorialConDetalles(tutorialId) {
    try {
      const { data, error } = await supabase
        .from('tutoriales')
        .select(`
          *,
          asistentes:asistente_id (nombre)
        `)
        .eq('id', tutorialId)
        .single();
      
      if (error) throw error;

      // Procesar los datos para incluir el nombre del asistente
      const tutorialProcesado = {
        ...data,
        nombre_asistente: data.asistentes?.nombre || 'Asistente'
      };
      
      return { data: tutorialProcesado, error: null };
    } catch (error) {
      console.error('Error en obtenerTutorialConDetalles:', error);
      return { data: null, error };
    }
  },

  /**
   * Actualiza el contador de vistas de un tutorial
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>} Resultado de la operación
   */
  async incrementarVistas(tutorialId) {
    try {
      const { data: tutorial, error: getError } = await this.obtenerTutorialPorId(tutorialId);
      
      if (getError) throw getError;
      
      if (tutorial) {
        const { data, error: updateError } = await supabase
          .from('tutoriales')
          .update({ vistas: (tutorial.vistas || 0) + 1 })
          .eq('id', tutorialId)
          .select();
        
        if (updateError) throw updateError;
        
        return { data, error: null };
      }
      
      throw new Error('Tutorial no encontrado');
    } catch (error) {
      console.error('Error al incrementar vistas:', error);
      return { data: null, error };
    }
  },

  /**
   * Actualiza el contador de "me gusta" de un tutorial (incrementando)
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>} Resultado de la operación
   */
  async incrementarMeGusta(tutorialId) {
    try {
      const { data: tutorial, error: getError } = await this.obtenerTutorialPorId(tutorialId);
      
      if (getError) throw getError;
      
      if (tutorial) {
        const { data, error: updateError } = await supabase
          .from('tutoriales')
          .update({ me_gusta: (tutorial.me_gusta || 0) + 1 })
          .eq('id', tutorialId)
          .select();
        
        if (updateError) throw updateError;
        
        return { data, error: null };
      }
      
      throw new Error('Tutorial no encontrado');
    } catch (error) {
      console.error('Error al incrementar me gusta:', error);
      return { data: null, error };
    }
  },

  /**
   * Actualiza el contador de "me gusta" de un tutorial (decrementando)
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>} Resultado de la operación
   */
  async decrementarMeGusta(tutorialId) {
    try {
      const { data: tutorial, error: getError } = await this.obtenerTutorialPorId(tutorialId);
      
      if (getError) throw getError;
      
      if (tutorial) {
        const { data, error: updateError } = await supabase
          .from('tutoriales')
          .update({ me_gusta: Math.max((tutorial.me_gusta || 0) - 1, 0) })
          .eq('id', tutorialId)
          .select();
        
        if (updateError) throw updateError;
        
        return { data, error: null };
      }
      
      throw new Error('Tutorial no encontrado');
    } catch (error) {
      console.error('Error al decrementar me gusta:', error);
      return { data: null, error };
    }
  },

  /**
   * Actualiza el contador de compartidos de un tutorial
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>} Resultado de la operación
   */
  async incrementarCompartidos(tutorialId) {
    try {
      const { data: tutorial, error: getError } = await this.obtenerTutorialPorId(tutorialId);
      
      if (getError) throw getError;
      
      if (tutorial) {
        const { data, error: updateError } = await supabase
          .from('tutoriales')
          .update({ compartidos: (tutorial.compartidos || 0) + 1 })
          .eq('id', tutorialId)
          .select();
        
        if (updateError) throw updateError;
        
        return { data, error: null };
      }
      
      throw new Error('Tutorial no encontrado');
    } catch (error) {
      console.error('Error al incrementar compartidos:', error);
      return { data: null, error };
    }
  },

  /**
   * Obtiene tutoriales relacionados (misma categoría)
   * @param {string} categoria - Categoría para buscar tutoriales similares
   * @param {string} tutorialId - ID del tutorial actual para excluirlo
   * @param {number} limite - Cantidad máxima de tutoriales a devolver
   * @returns {Promise<Object>} Resultado de la consulta
   */
  async obtenerTutorialesRelacionados(categoria, tutorialId, limite = 3) {
    try {
      const { data, error } = await supabase
        .from('tutoriales')
        .select(`
          *,
          asistentes:asistente_id (nombre)
        `)
        .eq('categoria', categoria)
        .neq('id', tutorialId)
        .limit(limite);
      
      if (error) throw error;
      
      // Procesar los datos para incluir el nombre del asistente
      const tutorialesProcesados = data.map(tutorial => ({
        ...tutorial,
        nombre_asistente: tutorial.asistentes?.nombre || 'Asistente'
      }));
      
      return { data: tutorialesProcesados, error: null };
    } catch (error) {
      console.error('Error al obtener tutoriales relacionados:', error);
      return { data: [], error };
    }
  },
  
  /**
   * Verifica si el usuario autenticado puede dar me gusta a un tutorial
   * @returns {Promise<Object>} Resultado de la verificación
   */
  async verificarUsuarioAutenticado() {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      return { 
        autenticado: !!data?.session?.user,
        usuario: data?.session?.user || null,
        error: null
      };
    } catch (error) {
      console.error('Error al verificar usuario autenticado:', error);
      return { autenticado: false, usuario: null, error };
    }
  }
};

export default tutorialesService;