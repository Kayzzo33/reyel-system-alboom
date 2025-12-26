
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Tenta pegar do ambiente (Vercel/Vite), se não existir, usa o fallback (seu atual)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://asfqluyekvureosyhlgg.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZnFsdXlla3Z1cmVvc3lobGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjMyMTAsImV4cCI6MjA4MTk5OTIxMH0.JEvFj5suvt1jGQivHMOClHJ0bXSl1MkaRcdV4LpA1KY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
