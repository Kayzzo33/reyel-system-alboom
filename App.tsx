
import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './views/admin/Dashboard';
import Albums from './views/admin/Albums';
import Clients from './views/admin/Clients';
import PublicGallery from './views/public/PublicGallery';
import Login from './views/auth/Login';
import { COLORS, ICONS } from './constants';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPublicView, setIsPublicView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (isPublicView) return <PublicGallery />;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]"></div></div>;
  if (!session) return <Login onLoginSuccess={() => {}} />;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <main className="flex-1 ml-64 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'albums' && <Albums />}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'orders' && (
             <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center">
                  <h2 className="text-2xl font-bold text-white">Pedidos e Faturamento</h2>
                  <p>Aqui você verá as fotos que seus clientes compraram e o status dos pagamentos.</p>
                </div>
             </div>
          )}
          {activeTab === 'config' && (
             <div className="space-y-8 animate-in fade-in duration-500">
                <h2 className="text-3xl font-bold text-white">Configurações do Sistema</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Cloudflare R2 Config */}
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl">{ICONS.Config}</div>
                      <h3 className="text-xl font-bold text-white">Conexão Cloudflare R2</h3>
                    </div>
                    <p className="text-sm text-slate-400">Para subir 10k+ fotos com velocidade, precisamos das suas chaves do R2 Bucket. Suas imagens ficam seguras e são servidas via CDN.</p>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Status da Conexão</p>
                        <div className="flex items-center gap-2 text-emerald-500 text-sm font-semibold">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          Pronto para configurar
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">* As credenciais devem ser inseridas no arquivo lib/r2.ts ou nas variáveis de ambiente da Vercel.</p>
                    </div>
                  </div>

                  {/* Branding Config */}
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#d4af37]/10 text-[#d4af37] rounded-2xl">{ICONS.Photo}</div>
                      <h3 className="text-xl font-bold text-white">Marca D'água</h3>
                    </div>
                    <div className="aspect-video bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-6 hover:border-[#d4af37]/50 transition-colors cursor-pointer group">
                      <span className="text-slate-500 group-hover:text-white transition-colors mb-2">Upload da Logo (.png transparente)</span>
                      <p className="text-[10px] text-slate-600">Recomendado: 500x500px</p>
                    </div>
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
