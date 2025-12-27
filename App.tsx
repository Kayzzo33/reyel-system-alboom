
import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './views/admin/Dashboard';
import Albums from './views/admin/Albums';
import Clients from './views/admin/Clients';
import Orders from './views/admin/Orders';
import Config from './views/admin/Config';
import Login from './views/auth/Login';
import PublicGallery from './views/public/PublicGallery';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [autoOpenAlbumModal, setAutoOpenAlbumModal] = useState(false);

  // Verifica se o usuário está acessando uma galeria pública via URL (?gallery=TOKEN)
  const queryParams = new URLSearchParams(window.location.search);
  const galleryToken = queryParams.get('gallery');

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

  const handleNavigateToAlbums = (openModal = false) => {
    setActiveTab('albums');
    if (openModal) setAutoOpenAlbumModal(true);
  };

  // Se houver um token de galeria na URL, renderiza a visão do cliente
  if (galleryToken) {
    return <PublicGallery />;
  }

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
          {activeTab === 'dashboard' && (
            <Dashboard onAction={() => handleNavigateToAlbums(true)} />
          )}
          {activeTab === 'albums' && (
            <Albums 
              initialOpenModal={autoOpenAlbumModal} 
              onModalClose={() => setAutoOpenAlbumModal(false)} 
            />
          )}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'orders' && <Orders />}
          {activeTab === 'config' && <Config />}
        </div>
      </main>
    </div>
  );
};

export default App;
