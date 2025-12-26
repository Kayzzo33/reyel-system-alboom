
import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './views/admin/Dashboard';
import Albums from './views/admin/Albums';
import Clients from './views/admin/Clients';
import PublicGallery from './views/public/PublicGallery';
import Login from './views/auth/Login';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Timeout de segurança: se o Supabase demorar mais de 5s, para de carregar
        const timeout = setTimeout(() => {
          if (mounted) setLoading(false);
        }, 5000);

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          clearTimeout(timeout);
          setSession(currentSession);
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro na inicialização:", err);
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // Se estiver carregando, mostra o spinner elegante
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin"></div>
          <div className="text-center">
            <h2 className="text-white font-bold tracking-widest uppercase text-xs">Reyel Produções</h2>
            <p className="text-slate-500 text-[10px] mt-1">Iniciando ambiente seguro...</p>
          </div>
        </div>
      </div>
    );
  }

  // Se não tiver sessão, mostra Login
  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Layout Principal
  return (
    <div className="flex min-h-screen bg-[#020617]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <main className="flex-1 ml-64 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'albums' && <Albums />}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'orders' && (
             <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <div className="p-12 bg-slate-900/50 border border-slate-800 rounded-[3rem] text-center max-w-lg">
                  <h2 className="text-2xl font-bold text-white mb-2">Pedidos</h2>
                  <p className="text-sm">Módulo de faturamento em processamento. Aqui você gerenciará as vendas de fotos avulsas.</p>
                </div>
             </div>
          )}
          {activeTab === 'config' && (
             <div className="space-y-8 animate-in fade-in duration-700">
                <h2 className="text-3xl font-bold text-white tracking-tighter">Configurações</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2rem]">
                    <h3 className="text-emerald-500 font-bold text-sm uppercase mb-4">Storage R2</h3>
                    <p className="text-slate-300 text-sm">Status: <span className="text-emerald-400 font-bold">Conectado</span></p>
                    <p className="text-slate-500 text-xs mt-2">Seus uploads estão sendo enviados para o endpoint Cloudflare de alto desempenho.</p>
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
