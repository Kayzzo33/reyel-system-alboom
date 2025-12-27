
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  if (galleryToken) {
    return <PublicGallery />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] gap-6">
        <div className="w-12 h-12 border-4 border-red-600/10 border-t-red-600 rounded-full animate-spin"></div>
        <div className="text-center">
          <h2 className="text-red-600 font-black tracking-[0.3em] uppercase text-[10px]">Reyel Produções</h2>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className="flex min-h-screen bg-[#000000] text-slate-100 overflow-x-hidden">
      {/* Menu Mobile superior */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 z-50 p-4 flex justify-between items-center">
        <h1 className="text-xl font-black text-white tracking-tighter">REYEL<span className="text-red-600">PROD</span></h1>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-3 bg-white/5 rounded-xl text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => supabase.auth.signOut()} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-24 lg:pt-8 w-full max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full">
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
