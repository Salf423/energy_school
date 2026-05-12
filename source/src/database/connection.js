/**
 * @file connection.js
 * @description Módulo responsable de establecer y gestionar la conexión persistente
 * a la base de datos principal de Energy School.
 */

const mongoose = require('mongoose');

/**
 * @function connectToDatabase
 * 
 * @purpose Inicializar la conexión a la base de datos de MongoDB. Actúa como el
 * punto de entrada para todas las operaciones de persistencia de métricas de energía
 * y gestión de configuración de salones. Mantiene una conexión persistente.
 * 
 * @param {string} uri - La cadena de conexión (URI) para MongoDB. Generalmente extraída
 * de variables de entorno (process.env.DATABASE_URI) por seguridad.
 * @param {object} options - Opcional. Opciones de configuración adicionales para Mongoose
 * (ej. poolSize, timeouts).
 * 
 * @returns {Promise<mongoose.Connection>} Una promesa que, si se resuelve exitosamente, 
 * devuelve el objeto de conexión activo.
 * 
 * @throws {MongoNetworkError} Falla en la red al intentar comunicarse con el clúster.
 * @throws {MongoParseError} La cadena URI proporcionada es inválida o está mal formateada.
 */
const connectToDatabase = async (uri, options = {}) => {
  try {
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      ...options
    };

    console.log('[DB] Inicializando conexión a la base de datos...');
    
    await mongoose.connect(uri, connectionOptions);
    
    console.log('[DB] Conexión establecida exitosamente con la base de datos de Energy School.');
    return mongoose.connection;
  } catch (error) {
    console.error(`[DB_ERROR] Fallo crítico al conectar a la base de datos: ${error.message}`);
    // Podría integrarse aquí un mecanismo de reintento o notificación de alertas severas.
    throw error;
  }
};

module.exports = {
  connectToDatabase
};
