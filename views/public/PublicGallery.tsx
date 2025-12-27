
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { R2_CONFIG } from '../../lib/r2';
import { Album, Photo, Client, Profile } from '../../types';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';

const useClientSession = (albumId: string) => {
  const key = `reyel_client_${albumId}`;
  const [client, setClient] = useState<Partial<Client> | null>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const saveSession = (clientData: Partial<Client>) => {
    localStorage.setItem(key, JSON.stringify(clientData));
    setClient(clientData);
  };
  return { client, saveSession };
};

const PublicGallery: React.FC = () => {
  const [album, setAlbum] = useState<Album | null>(null);
  const [photographer, setPhotographer] = useState<Profile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pendente');
  const [showIdentModal, setShowIdentModal] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: '', email: '', whatsapp: '' });
  const [identifying, setIdentifying] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const shareToken = queryParams.get('gallery') || window.location.pathname.split('/').pop() || '';
  
  const { client, saveSession } = useClientSession(album?.id || 'session');

  useEffect(() => {
    if (shareToken) fetchAlbum();
    const block = (e: any) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, [shareToken]);

  // Efeito para buscar seleções assim que o album e o cliente estiverem carregados
  useEffect(() => {
    if (album && client?.id) {
      checkExistingSelection();
    }
  }, [album, client]);

  const checkExistingSelection = async () => {
    if (!album || !client?.id) return;
    try {
      const { data: existingSels } = await supabase
        .from('selections')
        .select('photo_id')
        .eq('album_id', album.id)
        .eq('client_id', client.id);
        
      if (existingSels && existingSels.length > 0) {
        setSelectedPhotos(new Set(existingSels.map(s => s.photo_id)));
        setIsFinished(true);
        const { data: pStat } = await supabase.from('order_status').select('status').eq('album_id', album.id).eq('client_id', client.id).maybeSingle();
        if (pStat) setPaymentStatus(pStat.status);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAlbum = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('albums').select('*, photos(*)').eq('share_token', shareToken).single();
      if (error) throw error;
      setAlbum(data);
      setPhotos(data.photos || []);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.photographer_id).single();
      setPhotographer(prof);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleIdentification = async () => {
    if (!clientForm.nome || !clientForm.whatsapp || !clientForm.email) return alert("Preencha tudo.");
    try {
      setIdentifying(true);
      let { data: existingClient } = await supabase.from('clients').select('*').eq('whatsapp', clientForm.whatsapp).maybeSingle();
      if (!existingClient && album) {
        const { data: newC } = await supabase.from('clients').insert([{ nome: clientForm.nome, whatsapp: clientForm.whatsapp, email: clientForm.email, photographer_id: album.photographer_id }]).select().single();
        existingClient = newC;
      }
      if (existingClient) {
        saveSession(existingClient);
        setShowIdentModal(false);
      }
    } catch (err) { console.error(err); } finally { setIdentifying(false); }
  };

  const handleFinishSelection = async () => {
    if (!client) return setShowIdentModal(true);
    if (selectedPhotos.size === 0) return alert("Selecione fotos.");
    try {
      setIsFinishing(true);
      const payload = Array.from(selectedPhotos).map(id => ({ album_id: album?.id, client_id: client.id, photo_id: id }));
      await supabase.from('selections').delete().eq('album_id', album?.id).eq('client_id', client.id);
      await supabase.from('selections').insert(payload);
      setIsFinished(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { alert("Erro ao salvar."); } finally { setIsFinishing(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-[#d4af37] font-black uppercase text-xs tracking-widest">Carregando Galeria...</div>;

  if (isFinished) {
    const selectedPhotoList = photos.filter(p => selectedPhotos.has(p.id));
    return (
      <div className="min-h-screen bg-[#020617] p-8">
        <header className="max-w-6xl mx-auto flex justify-between items-center mb-16">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                 {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-[#d4af37] font-black">R</span>}
              </div>
              <h1 className="text-2xl font-black text-white">{album?.nome_galeria}</h1>
           </div>
           <div className={`px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-widest ${paymentStatus === 'pago' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
              {paymentStatus === 'pago' ? '✓ Downloads Liberados' : 'Aguardando Pagamento'}
           </div>
        </header>
        <main className="max-w-6xl mx-auto text-center space-y-12">
           <h2 className="text-5xl font-black tracking-tighter">Sua Seleção Final</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {selectedPhotoList.map(photo => (
                <div key={photo.id} className="relative aspect-square rounded-[2rem] overflow-hidden group border border-white/5">
                   <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" alt="" />
                   {paymentStatus === 'pago' && (
                     <button onClick={() => window.open(`${R2_CONFIG.publicUrl}/${photo.r2_key_original}`, '_blank')} className="absolute inset-0 bg-[#d4af37]/90 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-black font-black uppercase text-[10px]">Baixar Original</button>
                   )}
                   {paymentStatus !== 'pago' && (
                     <div className="absolute inset-0 flex items-center justify-center opacity-30 grayscale pointer-events-none p-6 rotate-[-15deg]">
                        {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white font-black text-xs tracking-widest">PROTEGIDO</span>}
                     </div>
                   )}
                </div>
              ))}
           </div>
           <div className="bg-slate-900 p-12 rounded-[4rem] max-w-xl mx-auto border border-white/5">
              {paymentStatus === 'pago' ? (
                <p className="text-emerald-500 font-bold">O fotógrafo aprovou seu pagamento! Você já pode baixar os arquivos originais acima.</p>
              ) : (
                <div className="space-y-6">
                   <p className="text-slate-400 font-medium">Sua seleção de {selectedPhotos.size} fotos foi enviada. Fale com o fotógrafo para liberar o download.</p>
                   <Button variant="outline" className="w-full rounded-2xl" onClick={() => setIsFinished(false)}>Alterar Seleção</Button>
                </div>
              )}
           </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] pb-24">
      <header className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-slate-900 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
             {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-[#d4af37] font-black">R</span>}
           </div>
           <div>
             <h1 className="text-lg font-black text-white leading-none">{album?.nome_galeria}</h1>
             <p className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-widest">Fotos: {selectedPhotos.size} / {album?.max_selecoes}</p>
           </div>
        </div>
        <Button variant="primary" className="rounded-xl px-10 py-4 font-black uppercase text-[10px] tracking-widest" isLoading={isFinishing} onClick={handleFinishSelection}>Finalizar e Enviar</Button>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-8">
        {photos.map(photo => (
          <div key={photo.id} className="relative aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden cursor-pointer group shadow-2xl" onClick={() => setViewingPhoto(photo)}>
             <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1500ms]" />
             <div className="absolute top-6 right-6 z-40" onClick={(e) => { e.stopPropagation(); if(isFinished) return; if(!client) setShowIdentModal(true); else { const n = new Set(selectedPhotos); n.has(photo.id) ? n.delete(photo.id) : n.add(photo.id); setSelectedPhotos(n); } }}>
                <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${selectedPhotos.has(photo.id) ? 'bg-[#d4af37] border-[#d4af37] text-black scale-110 shadow-lg' : 'bg-black/40 border-white/20'}`}>
                   {selectedPhotos.has(photo.id) ? '✓' : '+'}
                </div>
             </div>
             <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none p-12 rotate-[-20deg]">
                {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white/10 font-black text-4xl">REYEL</span>}
             </div>
          </div>
        ))}
      </main>

      {showIdentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[4.5rem] p-12 shadow-3xl text-center space-y-10 border-b-8 border-b-[#d4af37]/30">
            <h3 className="text-4xl font-black text-white tracking-tighter">Acesse o Álbum</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Seu Nome" className="w-full bg-black border border-white/5 rounded-3xl px-8 py-6 text-white font-bold" value={clientForm.nome} onChange={e => setClientForm({...clientForm, nome: e.target.value})} />
              <input type="email" placeholder="E-mail" className="w-full bg-black border border-white/5 rounded-3xl px-8 py-6 text-white font-bold" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
              <input type="text" placeholder="WhatsApp (DDD + Número)" className="w-full bg-black border border-white/5 rounded-3xl px-8 py-6 text-white font-bold" value={clientForm.whatsapp} onChange={e => setClientForm({...clientForm, whatsapp: e.target.value})} />
            </div>
            <Button variant="primary" className="w-full py-7 rounded-3xl font-black uppercase text-[11px]" isLoading={identifying} onClick={handleIdentification}>Acessar Galeria</Button>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="fixed inset-0 z-[110] bg-black/99 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
          <button className="absolute top-12 right-12 p-6 text-white/30 hover:text-white" onClick={() => setViewingPhoto(null)}>FECHAR</button>
          <div className="relative max-h-[80vh] rounded-[2.5rem] overflow-hidden border border-white/5">
            <img src={`${R2_CONFIG.publicUrl}/${viewingPhoto.r2_key_original}`} className="max-h-[80vh] object-contain pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center opacity-40 p-20 rotate-[-15deg]">
              {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white/10 font-black text-8xl">PROTEGIDO</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicGallery;
