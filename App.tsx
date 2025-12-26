
import React, { useState, useEffect } from 'react';
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
        const { data: { session: s } } = await supabase.auth.getSession();
        if (active) {
          setSession(s);
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth error:", err);
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
          <p className="text-slate-600 text-[9px] mt-1 font-medium">Verificando...</p>
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
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'albums' && <Albums />}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'orders' && (
             <div className="h-[60vh] flex items-center justify-center bg-slate-900/50 rounded-[3rem] border border-slate-800">
               <p className="text-slate-500">Módulo de Pedidos em breve.</p>
             </div>
          )}
          {activeTab === 'config' && (
             <div className="p-8 bg-slate-900/50 rounded-[3rem] border border-slate-800">
               <h2 className="text-2xl font-bold mb-4">Configurações</h2>
               <p className="text-emerald-500 font-bold">R2 Storage Conectado</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
