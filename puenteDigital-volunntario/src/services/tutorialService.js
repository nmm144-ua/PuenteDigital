// src/services/tutorialService.js
import { supabase } from '../supabase';

/**
 * Servicio para gestionar tutoriales
 */
export const tutorialService = {
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
            ...tutorialData,
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
   * @returns {Promise<void>}
   */
  async incrementarVistas(tutorialId) {
    try {
      const { data: tutorial } = await this.obtenerTutorialPorId(tutorialId);
      
      if (tutorial) {
        await supabase
          .from('tutoriales')
          .update({ vistas: (tutorial.vistas || 0) + 1 })
          .eq('id', tutorialId);
      }
    } catch (error) {
      console.error('Error al incrementar vistas:', error);
    }
  },

  /**
   * Actualiza el contador de "me gusta" de un tutorial
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<Object>}
   */
  async incrementarMeGusta(tutorialId) {
    try {
      const { data: tutorial } = await this.obtenerTutorialPorId(tutorialId);
      
      if (tutorial) {
        const { data, error } = await supabase
          .from('tutoriales')
          .update({ me_gusta: (tutorial.me_gusta || 0) + 1 })
          .eq('id', tutorialId)
          .select();
        
        if (error) throw error;
        
        return { data, error: null };
      }
      
      throw new Error('Tutorial no encontrado');
    } catch (error) {
      console.error('Error al incrementar me gusta:', error);
      return { data: null, error };
    }
  },

  /**
   * Actualiza el contador de compartidos de un tutorial
   * @param {string} tutorialId - ID del tutorial
   * @returns {Promise<void>}
   */
  async incrementarCompartidos(tutorialId) {
    try {
      const { data: tutorial } = await this.obtenerTutorialPorId(tutorialId);
      
      if (tutorial) {
        await supabase
          .from('tutoriales')
          .update({ compartidos: (tutorial.compartidos || 0) + 1 })
          .eq('id', tutorialId);
      }
    } catch (error) {
      console.error('Error al incrementar compartidos:', error);
    }
  }
};

export default tutorialService;