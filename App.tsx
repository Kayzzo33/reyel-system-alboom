
import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './views/admin/Dashboard';
import Albums from './views/admin/Albums';
import Clients from './views/admin/Clients';
import PublicGallery from './views/public/PublicGallery';
import Login from './views/auth/Login';
import { supabase } from './lib/supabase';

// Componente simples de captura de erro local
const ErrorScreen: React.FC<{error: any}> = ({error}) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 p-10">
    <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-8 rounded-[2.5rem] shadow-2xl text-center">
      <h2 className="text-2xl font-bold text-white mb-4">Falha na Inicialização</h2>
      <p className="text-slate-400 text-sm mb-6">Não conseguimos conectar aos serviços da ReyelProduções.</p>
      <div className="bg-black/50 p-4 rounded-2xl text-left mb-6 overflow-auto max-h-40">
        <code className="text-red-400 text-xs">{String(error)}</code>
      </div>
      <button onClick={() => window.location.reload()} className="w-full py-3 bg-[#d4af37] text-black font-bold rounded-xl hover:brightness-110">
        Tentar Novamente
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<any>(null);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        // Força o fim do loading após 4 segundos idependente do que aconteça
        const forceEndLoading = setTimeout(() => {
          if (active) setLoading(false);
        }, 4000);

        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (active) {
          clearTimeout(forceEndLoading);
          setSession(data.session);
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (active) {
          // Não paramos o app por erro de sessão, apenas mostramos login
          setLoading(false);
        }
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (active) setSession(newSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (fatalError) return <ErrorScreen error={fatalError} />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-[#d4af37]/10 border-t-[#d4af37] rounded-full animate-spin"></div>
          <div className="text-center animate-pulse">
            <h2 className="text-white font-black tracking-widest uppercase text-[10px]">Reyel Produções</h2>
            <p className="text-slate-600 text-[9px] mt-1">Sincronizando Workspace...</p>
          </div>
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
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="p-12 bg-slate-900 border border-slate-800 rounded-[3rem] text-center">
                <h3 className="text-xl font-bold mb-2">Pedidos</h3>
                <p className="text-slate-500 text-sm">Este módulo está sendo atualizado para sua região.</p>
              </div>
            </div>
          )}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Configurações Gerais</h2>
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
                <p className="text-sm text-slate-400">Armazenamento Cloudflare R2: <span className="text-emerald-500 font-bold">Ativo</span></p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
