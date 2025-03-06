// src/services/declaracionService.js
import { supabase } from '../../supabase';

export const jornadasService = {

    async createJornada(jornadaData) {
        const { data, error } = await supabase
            .from('jornadas')
            .insert([jornadaData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getJornadaById(jornadaId) {
        const { data, error } = await supabase
            .from('jornadas')
            .select('*')
            .eq('id', jornadaId)
            .single();
        if (error) throw error;
        return data;
    },

    async terminarJornada(jornadaId) {
        const { data, error } = await supabase
            .from('jornadas')
            .update({ fin: new Date().toISOString() })
            .eq('id', jornadaId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getJornadasByAsistenteId(asistenteId) {
        const { data, error } = await supabase
            .from('jornadas')
            .select('*')
            .eq('asistente_id', asistenteId);

        if (error) throw error;
        return data;
    },

    async deleteJornadaById(jornadaId) {
        const { data, error } = await supabase
            .from('jornadas')
            .delete()
            .eq('id', jornadaId);

        if (error) throw error;
        return data;
    },
    async deleteJornadaByAsistenteId(asistenteId) {
        const { data, error } = await supabase
            .from('jornadas')
            .delete()
            .eq('asistente_id', asistenteId);
    
        return { data, error };
    },
};

    
