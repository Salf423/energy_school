/**
 * @file iotService.js
 * @description Capa de servicio para control de dispositivos y monitoreo en tiempo real.
 * Propósito: Interactuar con la tabla 'salones' y suscripciones Realtime.
 */

const iotService = {
    /**
     * @function toggleDevice
     * @purpose Cambia el estado de energía de un salón específico.
     * @param {string} salonId - ID único del salón (UUID).
     * @param {boolean} status - Nuevo estado (true = encendido, false = apagado).
     * @returns {Promise<Object>} Resultado de la actualización.
     * @throws Excepción si el usuario no tiene permisos RLS (no es admin/mantenimiento).
     */
    async toggleDevice(salonId, status) {
        try {
            const { data, error } = await window.supabaseClient
                .from('salones')
                .update({ estado_energia: status })
                .eq('id', salonId);
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error en IoT (Toggle):', error.message);
            return { data: null, error };
        }
    },

    /**
     * @function getSalones
     * @purpose Obtiene la lista inicial de salones.
     */
    async getSalones() {
        try {
            const { data, error } = await window.supabaseClient
                .from('salones')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error obteniendo salones:', error.message);
            return { data: [], error };
        }
    },

    /**
     * @function getRealTimeStats
     * @purpose Se suscribe a los cambios en la tabla 'salones' para actualizar el dashboard.
     * @param {Function} callback - Función que se ejecuta al recibir un cambio.
     */
    getRealTimeStats(callback) {
        return window.supabaseClient
            .channel('cambios-salones')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'salones' }, payload => {
                console.log('Cambio detectado en Tiempo Real:', payload);
                callback(payload);
            })
            .subscribe();
    }
};

window.iotService = iotService;
