
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadPhotoToR2 } from '../../lib/r2';
import { ICONS } from '../../constants';
import Button from '../../components/ui/Button';
import { Profile } from '../../types';

const Config: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rlsError, setRlsError] = useState<string | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setRlsError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log("Config: Buscando perfil para", user.id);
        
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error("Erro ao buscar perfil:", error.message);
        }

        if (!data) {
          console.log("Config: Perfil não existe, tentando criar...");
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ 
              id: user.id, 
              email: user.email, 
              nome_exibicao: user.email?.split('@')[0] || 'Fotógrafo' 
            }])
            .select()
            .maybeSingle();
          
          if (createError) {
            console.error("Config: Falha RLS ao criar perfil:", createError.message);
            setRlsError("Permissão negada (RLS). Por favor, execute o script SQL no painel do Supabase conforme as instruções.");
          } else {
            data = newProfile;
          }
        }
        
        setProfile(data);
      }
    } catch (err: any) {
      console.error("Erro fatal Config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'watermark') => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setSaving(true);
      console.log(`Config: Iniciando upload R2 para ${type}...`);
      
      const { url } = await uploadPhotoToR2(file, `profile-assets/${profile.id}`, (p) => {
        console.log(`Config: Upload ${type} - ${p}%`);
      });

      console.log("Config: Atualizando Supabase com URL:", url);
      const updates = type === 'logo' ? { logo_url: url } : { marca_dagua_url: url };
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;
      
      setProfile({ ...profile, ...updates });
      alert("Sucesso! Sua " + (type === 'logo' ? "Logo" : "Marca d'água") + " foi atualizada.");
    } catch (err: any) {
      console.error("Config: Erro no processo de upload:", err);
      alert("Erro ao salvar: " + (err.message || "Verifique sua conexão."));
    } finally {
      setSaving(false);
      if (e.target) e.target.value = '';
    }
  };

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Sincronizando Perfil...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Configurações</h2>
        <p className="text-slate-400">Personalize a identidade visual das suas galerias.</p>
      </header>

      {rlsError && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
           <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
             {ICONS.Logout}
           </div>
           <div>
              <h4 className="font-bold text-red-400">Erro de Configuração no Banco de Dados</h4>
              <p className="text-red-500/60 text-xs mt-1 leading-relaxed">{rlsError}</p>
           </div>
           <Button variant="danger" size="sm" className="md:ml-auto rounded-xl" onClick={fetchProfile}>Tentar Novamente</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-10 shadow-xl">
          <div className="flex items-center gap-4 border-b border-white/5 pb-8">
            <div className="p-3 bg-[#d4af37]/10 text-[#d4af37] rounded-2xl border border-[#d4af37]/20">{ICONS.Config}</div>
            <h3 className="text-xl font-bold text-white">Branding do Estúdio</h3>
          </div>

          <div className="grid gap-12">
            {/* Logo Section */}
            <div className="flex flex-col md:flex-row items-center gap-8 group">
              <div className="w-32 h-32 bg-slate-950 rounded-[2rem] border border-white/5 flex items-center justify-center overflow-hidden relative ring-1 ring-white/10 group-hover:ring-[#d4af37]/50 transition-all">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} className="w-full h-full object-contain p-4" />
                ) : (
                  <span className="text-slate-800 text-[10px] font-black uppercase tracking-widest">Logo</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button variant="ghost" size="sm" onClick={() => logoInputRef.current?.click()}>Alterar</Button>
                </div>
              </div>
              <div className="flex-1 space-y-3 text-center md:text-left">
                <h4 className="font-bold text-white text-lg tracking-tight">Logotipo Principal</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">Será exibido no topo de todos os links enviados aos clientes.</p>
                <input type="file" hidden ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo')} accept="image/*" />
                <Button variant="outline" size="sm" className="rounded-xl border-white/10" onClick={() => logoInputRef.current?.click()}>Subir Logo</Button>
              </div>
            </div>

            {/* Watermark Section */}
            <div className="flex flex-col md:flex-row items-center gap-8 group">
              <div className="w-32 h-32 bg-slate-950 rounded-[2rem] border border-white/5 flex items-center justify-center overflow-hidden relative ring-1 ring-white/10 group-hover:ring-[#d4af37]/50 transition-all">
                {profile?.marca_dagua_url ? (
                  <img src={profile.marca_dagua_url} className="w-full h-full object-contain p-4 opacity-50" />
                ) : (
                  <div className="text-slate-800 scale-150">{ICONS.Photo}</div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button variant="ghost" size="sm" onClick={() => watermarkInputRef.current?.click()}>Alterar</Button>
                </div>
              </div>
              <div className="flex-1 space-y-3 text-center md:text-left">
                <h4 className="font-bold text-white text-lg tracking-tight">Marca D'água</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">Proteção aplicada sobre as fotos para evitar downloads não autorizados.</p>
                <input type="file" hidden ref={watermarkInputRef} onChange={(e) => handleFileUpload(e, 'watermark')} accept="image/*" />
                <Button variant="primary" size="sm" className="rounded-xl font-bold" onClick={() => watermarkInputRef.current?.click()}>Subir Marca</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-xl">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-white">Status da Infra</h3>
                    <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">Monitorado</span>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-6 bg-slate-950 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-black">S</div>
                          <div>
                            <p className="text-sm font-bold text-white">Supabase Engine</p>
                            <p className="text-[10px] text-slate-500 font-medium">Banco de dados operacional</p>
                          </div>
                       </div>
                       {ICONS.Check}
                    </div>
                    <div className="flex items-center justify-between p-6 bg-slate-950 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center font-black">R2</div>
                          <div>
                            <p className="text-sm font-bold text-white">Cloudflare Storage</p>
                            <p className="text-[10px] text-slate-500 font-medium">Armazenamento de alta performance</p>
                          </div>
                       </div>
                       {ICONS.Check}
                    </div>
                 </div>
            </div>

            <div className="bg-slate-800/10 border border-dashed border-slate-800 rounded-[2.5rem] p-10 text-center">
                <p className="text-slate-500 text-xs font-medium leading-relaxed italic">
                    "Uma boa identidade visual valoriza o seu trabalho e gera mais vendas durante a seleção de fotos."
                </p>
            </div>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center">
           <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-white/10 flex flex-col items-center gap-6 shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="w-12 h-12 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_#d4af3733]"></div>
              <span className="font-black text-[#d4af37] tracking-[0.3em] uppercase text-[9px]">Sincronizando Marca...</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default Config;
