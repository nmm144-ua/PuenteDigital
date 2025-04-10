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
        tipoRecurso = 'todos',
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

      // Filtrar por tipo de recurso
      if (tipoRecurso !== 'todos') {
        if (tipoRecurso === 'video' || tipoRecurso === 'pdf') {
          query = query.eq('tipo_recurso', tipoRecurso).or(`tipo_recurso.eq.ambos`);
        } 
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
  async subirTutorial(tutorialData, videoArchivo = null, pdfArchivo = null, onProgress = () => {}) {
    try {
      // Verificar que tenemos el user_id
      if (!tutorialData.user_id) {
        throw new Error('Se requiere el ID de usuario para subir un tutorial');
      }

      // Verificar que al menos se ha proporcionado un archivo
      if (!videoArchivo && !pdfArchivo) {
        throw new Error('Debes proporcionar al menos un archivo (video o PDF)');
      }

      // Extraer user_id para no incluirlo en la inserción
      const { user_id, ...datosParaInsertar } = tutorialData;
      
      // Determinar el tipo de recurso
      let tipoRecurso = 'video';
      if (videoArchivo && pdfArchivo) {
        tipoRecurso = 'ambos';
      } else if (pdfArchivo && !videoArchivo) {
        tipoRecurso = 'pdf';
      }

      // Objeto para almacenar información de archivos
      const archivosInfo = {};
      let progreso = 0;
      const totalArchivos = (videoArchivo ? 1 : 0) + (pdfArchivo ? 1 : 0);
      const incrementoProgreso = 100 / totalArchivos;

      // Subir archivo de video si existe
      if (videoArchivo) {
        const extension = videoArchivo.name.split('.').pop().toLowerCase();
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const videoPath = `videos/${tutorialData.asistente_id}_${timestamp}_${random}.${extension}`;
        
        // Subir el archivo a Supabase Storage
        const { data: videoData, error: videoError } = await supabase.storage
          .from('tutoriales')
          .upload(videoPath, videoArchivo, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              if (totalArchivos === 1) {
                // Si solo hay un archivo, reportamos directamente el progreso
                onProgress(Math.round((progress.loaded / progress.total) * 100));
              } else {
                // Si hay múltiples archivos, calculamos el progreso parcial
                const archivoProgreso = Math.round((progress.loaded / progress.total) * incrementoProgreso);
                onProgress(progreso + archivoProgreso);
              }
            }
          });
        
        if (videoError) throw videoError;
        
        // Obtener URL pública del archivo
        const { data: { publicUrl: videoUrl } } = supabase.storage
          .from('tutoriales')
          .getPublicUrl(videoPath);
        
        // Guardar información del video
        archivosInfo.video_path = videoPath;
        archivosInfo.video_url = videoUrl;
        archivosInfo.tamanio = videoArchivo.size;
        archivosInfo.formato = videoArchivo.type;

        // Actualizar progreso total
        progreso += incrementoProgreso;
        onProgress(progreso);
      }

      // Subir archivo PDF si existe
      if (pdfArchivo) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const pdfPath = `pdfs/${tutorialData.asistente_id}_${timestamp}_${random}.pdf`;
        
        // Subir el archivo a Supabase Storage
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from('tutoriales')
          .upload(pdfPath, pdfArchivo, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              if (totalArchivos === 1) {
                // Si solo hay un archivo, reportamos directamente el progreso
                onProgress(Math.round((progress.loaded / progress.total) * 100));
              } else {
                // Si hay múltiples archivos, calculamos el progreso parcial
                const archivoProgreso = Math.round((progress.loaded / progress.total) * incrementoProgreso);
                onProgress(progreso + archivoProgreso);
              }
            }
          });
        
        if (pdfError) throw pdfError;
        
        // Obtener URL pública del archivo
        const { data: { publicUrl: pdfUrl } } = supabase.storage
          .from('tutoriales')
          .getPublicUrl(pdfPath);
        
        // Guardar información del PDF
        archivosInfo.pdf_path = pdfPath;
        archivosInfo.pdf_url = pdfUrl;
        archivosInfo.pdf_tamanio = pdfArchivo.size;
      }

      // Si es solo PDF y no video, establecer valores por defecto para campos requeridos de video
      if (tipoRecurso === 'pdf') {
        archivosInfo.video_path = 'no-video';
        archivosInfo.video_url = '';
        archivosInfo.tamanio = 0;
        archivosInfo.formato = 'application/pdf';
      }

      // Guardar la información en la base de datos
      const { data, error: insertError } = await supabase
        .from('tutoriales')
        .insert([
          {
            ...datosParaInsertar,
            ...archivosInfo,
            tipo_recurso: tipoRecurso
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
      // Primero obtener la info del tutorial para eliminar los archivos
      const { data: tutorial, error: getError } = await this.obtenerTutorialPorId(tutorialId);
      
      if (getError) throw getError;
      
      // Eliminar archivo de video si existe
      if (tutorial?.video_path && tutorial.video_path !== 'no-video') {
        const { error: videoStorageError } = await supabase.storage
          .from('tutoriales')
          .remove([tutorial.video_path]);
        
        if (videoStorageError) console.error('Error al eliminar video:', videoStorageError);
      }
      
      // Eliminar archivo PDF si existe
      if (tutorial?.pdf_path) {
        const { error: pdfStorageError } = await supabase.storage
          .from('tutoriales')
          .remove([tutorial.pdf_path]);
        
        if (pdfStorageError) console.error('Error al eliminar PDF:', pdfStorageError);
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
  },

  // Métodos para descargar PDF
  async obtenerUrlDescargaPdf(tutorialId) {
    try {
      const { data: tutorial, error: getError } = await this.obtenerTutorialPorId(tutorialId);
      
      if (getError) throw getError;
      
      if (!tutorial?.pdf_path) {
        throw new Error('Este tutorial no tiene un PDF asociado');
      }
      
      // Generar URL de descarga con tiempo limitado (1 hora)
      const { data, error: signedUrlError } = await supabase.storage
        .from('tutoriales')
        .createSignedUrl(tutorial.pdf_path, 3600);
      
      if (signedUrlError) throw signedUrlError;
      
      return { url: data.signedUrl, error: null };
    } catch (error) {
      console.error('Error al obtener URL de descarga:', error);
      return { url: null, error };
    }
  },
};

export default tutorialService;