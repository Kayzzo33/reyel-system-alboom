
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
      alert("Configurações salvas com sucesso!");
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

  if (loading) return <div className="p-20 text-center text-slate-500 font-black">Carregando Configurações...</div>;

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h2 className="text-3xl font-black text-white tracking-tighter">Configurações</h2>
        <p className="text-slate-500 font-medium">Branding e valores do seu estúdio.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 space-y-10 shadow-2xl">
          <h3 className="text-xl font-black text-white">Identidade Visual</h3>
          
          <div className="grid gap-10">
            <div className="flex items-center gap-8 group">
              <div className="w-24 h-24 bg-black rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden relative">
                {profile?.logo_url ? <img src={profile.logo_url} className="w-full h-full object-contain p-4" /> : <span className="text-slate-800 font-black">LOGO</span>}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button className="text-[10px] font-black text-[#d4af37]" onClick={() => logoInputRef.current?.click()}>MUDAR</button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase text-xs tracking-widest">Logo Principal</h4>
                <input type="file" hidden ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo')} />
                <Button variant="outline" size="sm" className="rounded-xl border-white/10" onClick={() => logoInputRef.current?.click()}>Alterar</Button>
              </div>
            </div>

            <div className="flex items-center gap-8 group">
              <div className="w-24 h-24 bg-black rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden relative">
                {profile?.marca_dagua_url ? <img src={profile.marca_dagua_url} className="w-full h-full object-contain p-4 opacity-40" /> : <span className="text-slate-800 font-black">MARCA</span>}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button className="text-[10px] font-black text-[#d4af37]" onClick={() => watermarkInputRef.current?.click()}>MUDAR</button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase text-xs tracking-widest">Marca D'água</h4>
                <input type="file" hidden ref={watermarkInputRef} onChange={(e) => handleFileUpload(e, 'watermark')} />
                <Button variant="outline" size="sm" className="rounded-xl border-white/10" onClick={() => watermarkInputRef.current?.click()}>Alterar</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl">
           <h3 className="text-xl font-black text-white">Financeiro e Vendas</h3>
           <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço Fixo por Foto (R$)</label>
                <input 
                  type="number" 
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-white font-bold text-xl"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sua Chave PIX</label>
                <input 
                  type="text" 
                  placeholder="E-mail, CPF ou Aleatória"
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-[#d4af37] font-bold"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
                <p className="text-[9px] text-slate-600 font-medium ml-1 uppercase tracking-widest">Será enviada automaticamente aos clientes no WhatsApp.</p>
              </div>
           </div>
           <Button variant="primary" className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-[#d4af37]/10" isLoading={saving} onClick={handleSaveConfig}>
             Salvar Configurações
           </Button>
        </div>
      </div>
    </div>
  );
};

export default Config;
