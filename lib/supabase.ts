
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const getSafeEnv = (key: string, fallback: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
    if (typeof window !== 'undefined' && (window as any).env && (window as any).env[key]) {
      return (window as any).env[key];
    }
  } catch (e) {}
  return fallback;
};

const supabaseUrl = getSafeEnv('VITE_SUPABASE_URL', 'https://asfqluyekvureosyhlgg.supabase.co');
const supabaseAnonKey = getSafeEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZnFsdXlla3Z1cmVvc3lobGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjMyMTAsImV4cCI6MjA4MTk5OTIxMH0.JEvFj5suvt1jGQivHMOClHJ0bXSl1MkaRcdV4LpA1KY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
