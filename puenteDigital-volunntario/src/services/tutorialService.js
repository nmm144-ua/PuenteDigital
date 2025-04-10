// src/services/tutorialService.js
import { supabase } from '../../supabase';

/**
 * Servicio para gestionar tutoriales
 */
export const tutorialService = {
  /**
   * Obtiene tutoriales con filtros y paginación
   * @param {Object} opciones - Opciones de filtrado y paginación
   * @param {string} opciones.categoria - Categoría para filtrar
   * @param {string} opciones.orden - Criterio de ordenación (recientes, populares, vistos)
   * @param {string} opciones.busqueda - Texto para buscar en el título
   * @param {number} opciones.pagina - Número de página actual
   * @param {number} opciones.porPagina - Número de tutoriales por página
   * @returns {Promise<Object>} Resultado de la consulta con tutoriales y total
   */
  async obtenerTutorialesConFiltros(opciones = {}) {
    try {
      const {
        categoria = '',
        orden = 'recientes',
        busqueda = '',
        pagina = 1,
        porPagina = 9
      } = opciones;
      
      // Construir la consulta base
      let query = supabase
        .from('tutoriales')
        .select(`
          *,
          asistentes:asistente_id (nombre)
        `, { count: 'exact' });
      
      // Aplicar filtros
      if (categoria) {
        query = query.eq('categoria', categoria);
      }
      
      if (busqueda) {
        query = query.ilike('titulo', `%${busqueda}%`);
      }
      
      // Ordenar resultados
      switch (orden) {
        case 'recientes':
          query = query.order('created_at', { ascending: false });
          break;
        case 'populares':
          query = query.order('me_gusta', { ascending: false });
          break;
        case 'vistos':
          query = query.order('vistas', { ascending: false });
          break;
      }
      
      // Paginación
      const desde = (pagina - 1) * porPagina;
      query = query.range(desde, desde + porPagina - 1);
      
      // Ejecutar consulta
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Procesar los datos para incluir el nombre del asistente
      const tutorialesProcesados = data.map(tutorial => ({
        ...tutorial,
        nombre_asistente: tutorial.asistentes?.nombre || 'Asistente'
      }));
      
      return { 
        data: tutorialesProcesados, 
        total: count || 0,
        error: null 
      };
    } catch (error) {
      console.error('Error en obtenerTutorialesConFiltros:', error);
      return { data: [], total: 0, error };
    }
  },
  /**
   * Obtiene todos los tutoriales de un asistente
   * @param {number} asistenteId - ID del asistente
   * @returns {Promise<Object>} Resultado de la consulta
   */
  async obtenerTutorialesPorAsistente(asistenteId) {
    return await supabase
      .from('tutoriales')
      .select('*')
      .eq('asistente_id', asistenteId)
      .order('created_at', { ascending: false });
  },

  /**
   * Obtiene un tutorial por su ID
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>} Resultado de la consulta
   */
  async obtenerTutorialPorId(tutorialId) {
    return await supabase
      .from('tutoriales')
      .select('*')
      .eq('id', tutorialId)
      .single();
  },

  /**
   * Obtiene un tutorial por su ID junto con el nombre del asistente
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>} Resultado de la consulta
   */
  async obtenerTutorialConDetalles(tutorialId) {
    return await supabase
      .from('tutoriales')
      .select(`
        *,
        asistentes:asistente_id (nombre)
      `)
      .eq('id', tutorialId)
      .single();
  },

  /**
   * Sube un tutorial a Supabase
   * @param {Object} tutorialData - Datos del tutorial
   * @param {File} archivo - Archivo de video
   * @param {Function} onProgress - Función para seguimiento del progreso
   * @returns {Promise<Object>} Resultado de la operación
   */
  async subirTutorial(tutorialData, archivo, onProgress = () => {}) {
    try {
      // Verificar que tenemos el user_id
      if (!tutorialData.user_id) {
        throw new Error('Se requiere el ID de usuario para subir un tutorial');
      }

      // Extraer user_id para no incluirlo en la inserción
      const { user_id, ...datosParaInsertar } = tutorialData;
      
      // Generar nombre único para el archivo
      const extension = archivo.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const filePath = `videos/${tutorialData.asistente_id}_${timestamp}_${random}.${extension}`;
      
      // Subir el archivo a Supabase Storage
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('tutoriales')
        .upload(filePath, archivo, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const porcentaje = Math.round((progress.loaded / progress.total) * 100);
            onProgress(porcentaje);
          }
        });
      
      if (uploadError) throw uploadError;
      
      // Obtener URL pública del archivo
      const { data: { publicUrl } } = supabase.storage
        .from('tutoriales')
        .getPublicUrl(filePath);
      
      // Guardar la información en la base de datos
      const { data, error: insertError } = await supabase
        .from('tutoriales')
        .insert([
          {
            ...datosParaInsertar,
            video_path: filePath,
            video_url: publicUrl,
            tamanio: archivo.size,
            formato: archivo.type
          }
        ])
        .select();
      
      if (insertError) throw insertError;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error en subirTutorial:', error);
      return { data: null, error };
    }
  },

  /**
   * Elimina un tutorial de Supabase
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>} Resultado de la operación
   */
  async eliminarTutorial(tutorialId) {
    try {
      // Primero obtener la info del tutorial para eliminar el archivo
      const { data: tutorial, error: getError } = await this.obtenerTutorialPorId(tutorialId);
      
      if (getError) throw getError;
      
      if (tutorial?.video_path) {
        // Eliminar el archivo de storage
        const { error: storageError } = await supabase.storage
          .from('tutoriales')
          .remove([tutorial.video_path]);
        
        if (storageError) throw storageError;
      }
      
      // Eliminar el registro de la base de datos
      const { error: deleteError } = await supabase
        .from('tutoriales')
        .delete()
        .eq('id', tutorialId);
      
      if (deleteError) throw deleteError;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error en eliminarTutorial:', error);
      return { success: false, error };
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
        .select('*')
        .eq('categoria', categoria)
        .neq('id', tutorialId)
        .limit(limite);
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener tutoriales relacionados:', error);
      return { data: [], error };
    }
  },
  
  /**
   * Obtiene estadísticas generales de todos los tutoriales
   * @returns {Promise<Object>} Estadísticas generales (total tutoriales, vistas y me gusta)
   */
  async obtenerEstadisticasGenerales() {
    try {
      const { data, error } = await supabase
        .from('tutoriales')
        .select('id, vistas, me_gusta');
      
      if (error) throw error;
      
      const estadisticas = {
        totalTutoriales: data.length,
        totalVistas: data.reduce((sum, tutorial) => sum + (tutorial.vistas || 0), 0),
        totalMeGusta: data.reduce((sum, tutorial) => sum + (tutorial.me_gusta || 0), 0)
      };
      
      return { data: estadisticas, error: null };
    } catch (error) {
      console.error('Error al obtener estadísticas generales:', error);
      return { 
        data: { totalTutoriales: 0, totalVistas: 0, totalMeGusta: 0 }, 
        error 
      };
    }
  }
};

export default tutorialService;