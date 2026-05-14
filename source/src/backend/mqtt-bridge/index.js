/**
 * @file index.js
 * @description Puente MQTT → Supabase para Energy School.
 *
 * Arquitectura de Despliegue:
 *   ESP32 (PZEM-004T) → WiFi → HiveMQ Cloud (mqtts://) → Este script (Render) → Supabase
 *
 * Decisiones de diseño:
 *   - Se usa HiveMQ Cloud como broker MQTT en la nube (gratis, TLS obligatorio).
 *   - Se incluye un servidor HTTP "dummy" con Express porque Render apaga los
 *     contenedores que no abran un puerto HTTP. El servidor sirve como health check.
 *   - Se usa la clave service_role de Supabase para bypass de RLS, ya que este
 *     servicio opera a nivel de servidor sin contexto de usuario autenticado.
 *   - La reconexión MQTT es automática con backoff exponencial (manejo nativo de mqtt.js).
 *   - Se valida el payload JSON antes de insertarlo para evitar datos corruptos.
 *   - El tópico usa wildcard '#' para capturar todos los sub-tópicos de telemetría.
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// 1. DEPENDENCIAS
// ─────────────────────────────────────────────────────────────

const dotenv = require('dotenv');
const mqtt = require('mqtt');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno desde .env (solo en desarrollo local)
dotenv.config();

// ─────────────────────────────────────────────────────────────
// 2. CONFIGURACIÓN CENTRALIZADA
// ─────────────────────────────────────────────────────────────

/**
 * Todas las variables críticas se leen de process.env.
 * En Render, se configuran desde el panel "Environment Variables".
 * En desarrollo local, se leen del archivo .env.
 */
const CONFIG = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  mqtt: {
    url: process.env.MQTT_URL,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    topic: 'energy_school/telemetria/#',
    clientId: `energy-bridge-${Date.now()}`,
  },
  port: parseInt(process.env.PORT, 10) || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',
};

// ─────────────────────────────────────────────────────────────
// 3. LOGGER
// ─────────────────────────────────────────────────────────────

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[CONFIG.logLevel] ?? LOG_LEVELS.info;

const logger = {
  debug: (...args) => currentLevel <= 0 && console.log(`[${new Date().toISOString()}] [DEBUG]`, ...args),
  info:  (...args) => currentLevel <= 1 && console.log(`[${new Date().toISOString()}] [INFO]`, ...args),
  warn:  (...args) => currentLevel <= 2 && console.warn(`[${new Date().toISOString()}] [WARN]`, ...args),
  error: (...args) => currentLevel <= 3 && console.error(`[${new Date().toISOString()}] [ERROR]`, ...args),
};

// ─────────────────────────────────────────────────────────────
// 4. VALIDACIÓN DE CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────

/**
 * Verifica que todas las variables de entorno críticas estén presentes.
 * Sin estas, el servicio no puede funcionar y debe fallar rápidamente.
 */
function validateConfig() {
  const required = [
    ['SUPABASE_URL', CONFIG.supabase.url],
    ['SUPABASE_SERVICE_ROLE_KEY', CONFIG.supabase.serviceRoleKey],
    ['MQTT_URL', CONFIG.mqtt.url],
    ['MQTT_USERNAME', CONFIG.mqtt.username],
    ['MQTT_PASSWORD', CONFIG.mqtt.password],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    logger.error(`Variables de entorno faltantes: ${missing.join(', ')}`);
    logger.error('Configúralas en el panel de Render o en tu archivo .env local.');
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────
// 5. CLIENTE SUPABASE
// ─────────────────────────────────────────────────────────────

/**
 * Inicializa el cliente Supabase con la clave service_role.
 *
 * ¿Por qué service_role y no anon_key?
 * La tabla consumo_energia tiene una política RLS que solo permite INSERT
 * al rol service_role. Este backend no tiene un usuario logueado en contexto,
 * por lo que necesita el bypass completo de RLS.
 */
function initSupabase() {
  const supabase = createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  logger.info('✅ Cliente Supabase inicializado.');
  return supabase;
}

// ─────────────────────────────────────────────────────────────
// 6. VALIDACIÓN DE PAYLOAD
// ─────────────────────────────────────────────────────────────

const DISPOSITIVOS_VALIDOS = ['luz', 'aire_acondicionado', 'enchufe'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida y sanitiza el payload JSON recibido del ESP32.
 *
 * Reglas:
 *   - salon_id: obligatorio, UUID válido (debe existir en tabla salones).
 *   - potencia_w: obligatorio, número >= 0.
 *   - energia_kwh: obligatorio, número >= 0.
 *   - voltaje, corriente: opcionales, numéricos.
 *   - dispositivo: opcional, debe estar en la lista permitida.
 *
 * @param {Object} payload - Datos parseados del mensaje MQTT.
 * @returns {{ valid: boolean, data?: Object, error?: string }}
 */
function validatePayload(payload) {
  if (!payload.salon_id || typeof payload.salon_id !== 'string') {
    return { valid: false, error: 'Campo "salon_id" ausente o inválido.' };
  }

  if (!UUID_REGEX.test(payload.salon_id)) {
    return { valid: false, error: `"salon_id" no es un UUID válido: ${payload.salon_id}` };
  }

  if (typeof payload.potencia_w !== 'number' || payload.potencia_w < 0) {
    return { valid: false, error: '"potencia_w" debe ser un número no negativo.' };
  }

  if (typeof payload.energia_kwh !== 'number' || payload.energia_kwh < 0) {
    return { valid: false, error: '"energia_kwh" debe ser un número no negativo.' };
  }

  if (payload.dispositivo && !DISPOSITIVOS_VALIDOS.includes(payload.dispositivo)) {
    return {
      valid: false,
      error: `"dispositivo" inválido: "${payload.dispositivo}". Permitidos: ${DISPOSITIVOS_VALIDOS.join(', ')}`,
    };
  }

  // Construir objeto sanitizado (solo campos esperados por la tabla)
  const data = {
    salon_id: payload.salon_id,
    potencia_w: payload.potencia_w,
    energia_kwh: payload.energia_kwh,
  };

  if (typeof payload.voltaje === 'number') data.voltaje = payload.voltaje;
  if (typeof payload.corriente === 'number') data.corriente = payload.corriente;
  if (payload.dispositivo) data.dispositivo = payload.dispositivo;

  return { valid: true, data };
}

// ─────────────────────────────────────────────────────────────
// 7. INSERCIÓN EN SUPABASE
// ─────────────────────────────────────────────────────────────

/**
 * Inserta una lectura de consumo energético en la tabla consumo_energia.
 * El campo registrado_en se genera automáticamente en Supabase (DEFAULT now()).
 */
async function insertConsumo(supabase, data) {
  const { error } = await supabase
    .from('consumo_energia')
    .insert(data);

  if (error) {
    logger.error(`Error al insertar en Supabase: ${error.message}`);
    logger.debug('Datos fallidos:', JSON.stringify(data));
    return false;
  }

  logger.info(`📊 Lectura registrada → Salón: ${data.salon_id} | ${data.potencia_w}W | ${data.energia_kwh}kWh`);
  return true;
}

// ─────────────────────────────────────────────────────────────
// 8. CLIENTE MQTT (HiveMQ Cloud)
// ─────────────────────────────────────────────────────────────

/**
 * Conecta al broker HiveMQ Cloud usando mqtts:// (TLS obligatorio).
 *
 * HiveMQ Cloud requiere:
 *   - Protocolo seguro (mqtts://, puerto 8883)
 *   - Autenticación con usuario y contraseña
 *   - TLS habilitado (rejectUnauthorized: true para verificar certificado)
 *
 * Opciones de reconexión:
 *   - reconnectPeriod: 5 segundos entre intentos automáticos.
 *   - connectTimeout: 30 segundos máximo para establecer conexión.
 */
function initMQTT(supabase) {
  logger.info(`🔌 Conectando a HiveMQ Cloud: ${CONFIG.mqtt.url}`);

  const client = mqtt.connect(CONFIG.mqtt.url, {
    clientId: CONFIG.mqtt.clientId,
    username: CONFIG.mqtt.username,
    password: CONFIG.mqtt.password,
    clean: true,
    connectTimeout: 30_000,
    reconnectPeriod: 5_000,
    // TLS: verificar certificado del broker (seguridad en producción)
    rejectUnauthorized: true,
  });

  // ── Conexión establecida ──
  client.on('connect', () => {
    logger.info('✅ Conexión MQTT establecida con HiveMQ Cloud.');

    client.subscribe(CONFIG.mqtt.topic, { qos: 1 }, (err, granted) => {
      if (err) {
        logger.error(`Error al suscribirse: ${err.message}`);
        return;
      }
      logger.info(`📡 Suscrito a: ${granted.map(g => g.topic).join(', ')} (QoS: ${granted[0]?.qos})`);
    });
  });

  // ── Mensaje recibido ──
  client.on('message', async (topic, message) => {
    logger.debug(`Mensaje en tópico: ${topic}`);

    let payload;
    try {
      payload = JSON.parse(message.toString());
    } catch (parseError) {
      logger.warn(`Payload no es JSON válido en "${topic}": ${message.toString().substring(0, 200)}`);
      return;
    }

    logger.debug('Payload:', JSON.stringify(payload));

    const validation = validatePayload(payload);
    if (!validation.valid) {
      logger.warn(`Payload rechazado (${topic}): ${validation.error}`);
      return;
    }

    await insertConsumo(supabase, validation.data);
  });

  // ── Reconexión automática ──
  client.on('reconnect', () => {
    logger.warn('🔄 Reconectando a HiveMQ Cloud...');
  });

  // ── Error ──
  client.on('error', (err) => {
    logger.error(`Error MQTT: ${err.message}`);
  });

  // ── Desconexión ──
  client.on('close', () => {
    logger.warn('Conexión MQTT cerrada. Reconexión automática activa.');
  });

  // ── Offline ──
  client.on('offline', () => {
    logger.warn('⚠️ Cliente MQTT offline.');
  });

  return client;
}

// ─────────────────────────────────────────────────────────────
// 9. SERVIDOR HTTP DUMMY (Requerido por Render)
// ─────────────────────────────────────────────────────────────

/**
 * Render requiere que el servicio escuche en un puerto HTTP.
 * Si no detecta tráfico HTTP, apaga el contenedor automáticamente.
 *
 * Este servidor Express minimalista cumple esa función y además
 * sirve como endpoint de health check para monitoreo externo.
 */
function initHTTPServer() {
  const app = express();

  // Ruta principal: Health Check
  app.get('/', (req, res) => {
    res.json({
      status: 'MQTT Bridge Online',
      service: 'Energy School',
      uptime: `${Math.floor(process.uptime())}s`,
      timestamp: new Date().toISOString(),
    });
  });

  // Ruta de salud para Render y herramientas de monitoreo
  app.get('/health', (req, res) => {
    res.status(200).json({ healthy: true });
  });

  app.listen(CONFIG.port, () => {
    logger.info(`🌐 Servidor HTTP escuchando en puerto ${CONFIG.port} (requerido por Render).`);
  });

  return app;
}

// ─────────────────────────────────────────────────────────────
// 10. GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────

/**
 * Cierra conexiones limpiamente al recibir SIGINT/SIGTERM.
 * Render envía SIGTERM al detener o redesplegar el servicio.
 */
function setupGracefulShutdown(mqttClient) {
  const shutdown = (signal) => {
    logger.info(`Señal ${signal} recibida. Cerrando conexiones...`);

    mqttClient.end(false, {}, () => {
      logger.info('Conexión MQTT cerrada limpiamente.');
      logger.info('Servicio Energy School MQTT Bridge finalizado.');
      process.exit(0);
    });

    // Forzar cierre si MQTT no responde en 5 segundos
    setTimeout(() => {
      logger.warn('Forzando cierre del proceso.');
      process.exit(1);
    }, 5_000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ─────────────────────────────────────────────────────────────
// 11. PUNTO DE ENTRADA PRINCIPAL
// ─────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     ⚡ Energy School — MQTT Bridge Service           ║');
  console.log('║     HiveMQ Cloud → Supabase (Desplegado en Render)   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Validar configuración
  validateConfig();

  // Inicializar servicios
  const supabase = initSupabase();
  const mqttClient = initMQTT(supabase);

  // Levantar servidor HTTP (Render lo necesita para mantener vivo el servicio)
  initHTTPServer();

  // Configurar apagado limpio
  setupGracefulShutdown(mqttClient);

  logger.info('🚀 Servicio iniciado. Esperando telemetría de los ESP32...');
}

// Ejecutar
main();
