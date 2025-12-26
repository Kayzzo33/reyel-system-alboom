
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const getEnv = (key: string, fallback: string): string => {
  try {
    // Tenta ler de várias fontes comuns em ambientes de deploy (Vercel/Vite/Browser)
    const val = (typeof process !== 'undefined' && process.env?.[key]) || 
                (window as any).env?.[key] || 
                fallback;
    return val;
  } catch {
    return fallback;
  }
};

const URL = getEnv('VITE_SUPABASE_URL', 'https://asfqluyekvureosyhlgg.supabase.co');
const KEY = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZnFsdXlla3Z1cmVvc3lobGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjMyMTAsImV4cCI6MjA4MTk5OTIxMH0.JEvFj5suvt1jGQivHMOClHJ0bXSl1MkaRcdV4LpA1KY');

// Inicialização protegida
let client;
try {
  client = createClient(URL, KEY);
} catch (e) {
  console.error("Erro fatal ao inicializar Supabase:", e);
  // Fallback para evitar crash de importação
  client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } } as any;
}

export const supabase = client;

export const getSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
};
