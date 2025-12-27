
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
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log("Buscando perfil para ID:", user.id);
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (error) {
          console.error("Erro ao buscar perfil:", error.message);
        }
        setProfile(data);
      }
    } catch (err) {
      console.error("Erro fatal fetchProfile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'watermark') => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("Nenhum arquivo selecionado.");
      return;
    }

    if (!profile) {
      alert("Erro: Perfil não carregado. Tente recarregar a página.");
      return;
    }

    try {
      setSaving(true);
      console.log(`Iniciando upload de ${type}:`, file.name);
      
      const { url } = await uploadPhotoToR2(file, 'profile-assets', (progress) => {
        console.log(`Upload progress (${type}): ${progress}%`);
      });

      console.log("Arquivo no R2 com sucesso. URL:", url);
      
      const updates = type === 'logo' ? { logo_url: url } : { marca_dagua_url: url };
      
      console.log("Atualizando Supabase com:", updates);
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) {
        console.error("Erro Supabase Update:", error.message);
        throw new Error(error.message);
      }
      
      setProfile({ ...profile, ...updates });
      alert(`Sucesso! ${type === 'logo' ? 'Logo' : 'Marca d\'água'} atualizada.`);
    } catch (err: any) {
      console.error(`Erro no processo de ${type}:`, err);
      alert(`Falha no upload: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente se necessário
      if (e.target) e.target.value = '';
    }
  };

  if (loading) return <div className="p-8 animate-pulse space-y-4"><div className="h-8 w-48 bg-slate-800 rounded"></div><div className="h-64 w-full bg-slate-800 rounded-3xl"></div></div>;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Configurações</h2>
        <p className="text-slate-400">Personalize sua marca e configure as ferramentas do estúdio.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">{ICONS.Config}</div>
            <h3 className="text-xl font-bold text-white">Identidade Visual</h3>
          </div>

          <div className="space-y-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-32 h-32 bg-slate-950 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden group relative">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} className="w-full h-full object-contain p-2" alt="Logo preview" />
                ) : (
                  <span className="text-slate-700 text-3xl font-black">LOGO</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button variant="ghost" size="sm" onClick={() => logoInputRef.current?.click()}>Alterar</Button>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <h4 className="font-bold text-white">Logotipo do Estúdio</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">Aparecerá nas galerias públicas. PNG transparente recomendado.</p>
                <input type="file" hidden ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo')} accept="image/*" />
                <Button variant="outline" size="sm" className="mt-2" onClick={() => logoInputRef.current?.click()}>Subir Logo</Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 pt-8 border-t border-white/5">
              <div className="w-32 h-32 bg-slate-950 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden group relative">
                {profile?.marca_dagua_url ? (
                  <img src={profile.marca_dagua_url} className="w-full h-full object-contain opacity-50 p-2" alt="Watermark preview" />
                ) : (
                  <div className="text-slate-800 text-3xl">{ICONS.Photo}</div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button variant="ghost" size="sm" onClick={() => watermarkInputRef.current?.click()}>Alterar</Button>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <h4 className="font-bold text-white text-emerald-400 flex items-center gap-2">Marca D'água Ativa</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">Proteja suas fotos. Será sobreposta em todas as visualizações.</p>
                <input type="file" hidden ref={watermarkInputRef} onChange={(e) => handleFileUpload(e, 'watermark')} accept="image/*" />
                <Button variant="primary" size="sm" className="mt-2" onClick={() => watermarkInputRef.current?.click()}>Subir Marca D'água</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-xl">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white">Conexões</h3>
                <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">Online</span>
             </div>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center font-bold">S</div>
                      <span className="text-sm font-semibold">Supabase (Banco)</span>
                   </div>
                   {ICONS.Check}
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center font-bold">R2</div>
                      <span className="text-sm font-semibold">Cloudflare (Fotos)</span>
                   </div>
                   {ICONS.Check}
                </div>
             </div>
          </div>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center">
           <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-6 shadow-2xl">
              <div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
              <span className="font-bold text-[#d4af37] tracking-widest uppercase text-xs">Atualizando Storage...</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default Config;
