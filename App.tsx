
// @ts-ignore
import React, { useState, useEffect } from 'https://esm.sh/react@19.0.0';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './views/admin/Dashboard';
import Albums from './views/admin/Albums';
import Clients from './views/admin/Clients';
import Login from './views/auth/Login';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        // Tempo limite de 5 segundos para o Supabase responder
        const timeout = setTimeout(() => {
          if (active) {
            console.warn("Auth check timed out, forcing loading screen off");
            setLoading(false);
          }
        }, 5000);

        const { data: { session: s }, error } = await supabase.auth.getSession();
        
        if (active) {
          clearTimeout(timeout);
          setSession(s);
          setLoading(false);
          console.log("Auth check completed", s ? "Session found" : "No session");
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (active) setLoading(false);
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (active) setSession(newSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] gap-6">
        <div className="w-12 h-12 border-4 border-[#d4af37]/10 border-t-[#d4af37] rounded-full animate-spin"></div>
        <div className="text-center">
          <h2 className="text-[#d4af37] font-black tracking-[0.3em] uppercase text-[10px]">Reyel Produções</h2>
          <p className="text-slate-600 text-[9px] mt-1 font-medium">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={() => supabase.auth.signOut()} />
      
      <main className="flex-1 ml-64 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'albums' && <Albums />}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'orders' && (
            <div className="flex flex-col items-center justify-center h-[60vh] p-12 bg-slate-900 border border-slate-800 rounded-[3rem] text-center">
              <h3 className="text-xl font-bold mb-2">Pedidos</h3>
              <p className="text-slate-500 text-sm">Em breve disponível em seu painel.</p>
            </div>
          )}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Configurações do Estúdio</h2>
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
                <div className="flex items-center gap-4 text-emerald-500 font-bold text-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  Cloudflare R2 Storage: Ativo
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
