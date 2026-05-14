/**
 * @file supabaseClient.js
 * @description Inicialización del cliente de Supabase para toda la aplicación.
 * Propósito: Proveer una instancia única del cliente para interactuar con la DB y Auth.
 */

const SUPABASE_URL = 'https://mfwdnpsqjugptzlpqgoc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1md2RucHNxanVncHR6bHBxZ29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTg1ODMsImV4cCI6MjA5NDI3NDU4M30.-lL5wQvgMszNdrCkyr94-Z3qYeGxdD9e9tCUnG4OzNE';

let supabaseInstance = null;

/**
 * @function getSupabaseClient
 * @purpose Retorna la instancia del cliente de Supabase, inicializándola si no existe.
 * @returns {Object} Instancia del cliente de Supabase.
 */
function getSupabaseClient() {
    if (!supabaseInstance && window.supabase) {
        supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseInstance;
}

// Exportar de forma global para simplificar en entornos sin módulos ES6 (usando script tags)
window.supabaseClient = getSupabaseClient();
