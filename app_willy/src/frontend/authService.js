/**
 * @file authService.js
 * @description Capa de servicio para manejar el flujo de autenticación.
 * Propósito: Encapsular lógica de Login y Registro con manejo de errores robusto.
 */

const authService = {
    /**
     * @function login
     * @purpose Iniciar sesión con email y contraseña.
     * @param {string} email - Correo del usuario.
     * @param {string} password - Contraseña.
     * @returns {Promise<Object>} Resultado de Supabase {data, error}.
     */
    async login(email, password) {
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error en Auth (Login):', error.message);
            return { data: null, error };
        }
    },

    /**
     * @function signUp
     * @purpose Registrar un nuevo usuario con metadata (nombre y rol).
     * @param {string} email - Correo.
     * @param {string} password - Contraseña.
     * @param {string} full_name - Nombre completo.
     * @param {string} role - Rol institucional (admin, docente, etc).
     * @returns {Promise<Object>} Resultado de Supabase {data, error}.
     */
    async signUp(email, password, full_name, role) {
        try {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name,
                        role
                    }
                }
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error en Auth (SignUp):', error.message);
            return { data: null, error };
        }
    },

    /**
     * @function logout
     * @purpose Cerrar la sesión actual.
     */
    async logout() {
        await window.supabaseClient.auth.signOut();
        localStorage.removeItem('userLoggedIn');
        window.location.href = 'login.html';
    }
};

window.authService = authService;
