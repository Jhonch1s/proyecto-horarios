// config.js
// Archivo de configuración global

(function() {
    // ===== CONFIGURACIÓN DE SUPABASE =====
    const SUPABASE_URL = 'https://ulpqftppqpctkpwdkebk.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_9YVf_oVQfe_BbpHYXRk3kw_32OXiaKq';

    // Inicializar el cliente Supabase de forma global
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
