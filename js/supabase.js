// ==========================================
// ARQUIVO: js/supabase.js
// FUNÇÃO: Inicializar a conexão com o banco
// ==========================================

const supabaseUrl = 'https://gsiqlibvlkntwshlsjdm.supabase.co'; // Ex: https://xyz.supabase.co
const supabaseKey = 'sb_publishable_uDk0zGf97fV9pWIe2K3Viw_bYmo18zB';

window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);