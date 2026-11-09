// ==========================================
// ARQUIVO: js/supabase.js
// FUNÇÃO: Inicializar a conexão com o banco
// ==========================================

const supabaseUrl = 'https://gsiqlibvlkntwshlsjdm.supabase.co'; // Ex: https://xyz.supabase.co
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFsaWJ2bGtudHdzaGxzamRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTk2ODQsImV4cCI6MjEwMjQ3NTY4NH0.phLpPVQE_C40VtnoCIYDod2X22Fj1jAsfLiTrrLl6kM';

window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);