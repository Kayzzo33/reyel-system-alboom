
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
  const [defaultPrice, setDefaultPrice] = useState('15.00');
  const [pixKey, setPixKey] = useState('');
  
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
        let { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        setProfile(data);
        if (data?.default_price_per_photo) setDefaultPrice(data.default_price_per_photo.toString());
        if (data?.pix_key) setPixKey(data.pix_key);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      await supabase.from('profiles').update({ 
        default_price_per_photo: parseFloat(defaultPrice),
        pix_key: pixKey 
      }).eq('id', profile.id);
      alert("Configurações salvas!");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'watermark') => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    try {
      setSaving(true);
      const { url } = await uploadPhotoToR2(file, `profile-assets/${profile.id}`, () => {});
      const updates = type === 'logo' ? { logo_url: url } : { marca_dagua_url: url };
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      setProfile({ ...profile, ...updates });
      alert("Upload concluído!");
    } finally {
      setSaving(false);
      if (e.target) e.target.value = '';
    }
  };

  if (loading) return <div className="p-20 text-center text-slate-600 font-black uppercase text-xs">Sincronizando...</div>;

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Configurações</h2>
        <p className="text-slate-500 font-medium">Controle de marca e financeiro.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-10 space-y-10 shadow-2xl">
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Identidade Visual</h3>
          
          <div className="grid gap-10">
            <div className="flex items-center gap-8 group">
              <div className="w-24 h-24 bg-black rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden relative">
                {profile?.logo_url ? <img src={profile.logo_url} className="w-full h-full object-contain p-4" /> : <span className="text-slate-800 font-black">LOGO</span>}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button className="text-[10px] font-black text-red-600 uppercase" onClick={() => logoInputRef.current?.click()}>Alterar</button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase text-[10px] tracking-widest text-slate-500">Logo do Estúdio</h4>
                <input type="file" hidden ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo')} />
                <Button variant="ghost" size="sm" className="rounded-xl border border-white/5" onClick={() => logoInputRef.current?.click()}>Subir Imagem</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl">
           <h3 className="text-xl font-black text-white uppercase tracking-tight">Financeiro</h3>
           <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Preço/Foto (R$)</label>
                <input 
                  type="number" 
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-white font-bold text-xl outline-none focus:ring-1 focus:ring-red-600/30"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Sua Chave PIX</label>
                <input 
                  type="text" 
                  placeholder="E-mail ou CPF"
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-emerald-500 font-black outline-none focus:ring-1 focus:ring-emerald-500/30"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
                <p className="text-[9px] text-slate-700 font-medium ml-1 uppercase tracking-widest">Enviada automaticamente ao cliente no checkout.</p>
              </div>
           </div>
           <Button variant="primary" className="w-full py-5 rounded-2xl font-black uppercase text-xs" isLoading={saving} onClick={handleSaveConfig}>
             Salvar Dados
           </Button>
        </div>
      </div>
    </div>
  );
};

export default Config;
