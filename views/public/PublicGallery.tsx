
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { R2_CONFIG } from '../../lib/r2';
import { Album, Photo, Client, Profile } from '../../types';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';

const useClientSession = (albumId: string) => {
  const key = `reyel_client_${albumId}`;
  const [client, setClient] = useState<Partial<Client> | null>(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
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
  const [expired, setExpired] = useState(false);
  
  const [showIdentModal, setShowIdentModal] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: '', email: '', whatsapp: '' });
  const [identifying, setIdentifying] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const shareToken = queryParams.get('gallery') || window.location.pathname.split('/').pop() || '';
  
  const { client, saveSession } = useClientSession(album?.id || 'default');

  useEffect(() => {
    if (shareToken) fetchAlbum();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === 's' || e.key === 'u' || e.key === 'p' || e.key === 'c' || e.key === 'i')) || e.key === 'F12') e.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shareToken]);

  const fetchAlbum = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('albums').select('*, photos(*)').eq('share_token', shareToken).single();
      if (error) throw error;

      // Verifica prazo
      if (data.data_limite && new Date(data.data_limite) < new Date()) setExpired(true);

      setAlbum(data);
      setPhotos(data.photos || []);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.photographer_id).single();
      setPhotographer(prof);

      // Busca se já existe seleção finalizada
      if (client?.id) {
        const { data: existingSels } = await supabase.from('selections').select('photo_id').eq('album_id', data.id).eq('client_id', client.id);
        if (existingSels && existingSels.length > 0) {
          setSelectedPhotos(new Set(existingSels.map(s => s.photo_id)));
          setIsFinished(true);
          
          const { data: pStat } = await supabase.from('order_status').select('status').eq('album_id', data.id).eq('client_id', client.id).maybeSingle();
          if (pStat) setPaymentStatus(pStat.status);
        }
      }
    } catch (err) {
      console.error("Erro galeria:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleIdentification = async () => {
    if (!clientForm.nome || !clientForm.whatsapp) {
      alert("Nome e WhatsApp são necessários.");
      return;
    }
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
        fetchAlbum();
      }
    } finally {
      setIdentifying(false);
    }
  };

  const handleFinishSelection = async () => {
    if (!client) { setShowIdentModal(true); return; }
    if (selectedPhotos.size === 0) { alert("Selecione fotos."); return; }
    if (!confirm(`Finalizar com ${selectedPhotos.size} fotos?`)) return;

    try {
      setIsFinishing(true);
      const payload = Array.from(selectedPhotos).map(id => ({ album_id: album?.id, client_id: client.id, photo_id: id }));
      await supabase.from('selections').delete().eq('album_id', album?.id).eq('client_id', client.id);
      await supabase.from('selections').insert(payload);
      setIsFinished(true);
    } catch (err) {
      alert("Erro ao salvar.");
    } finally {
      setIsFinishing(false);
    }
  };

  const toggleSelection = (photoId: string) => {
    if (isFinished) return;
    if (!client) { setShowIdentModal(true); return; }
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) newSelection.delete(photoId);
    else {
      if (newSelection.size >= (album?.max_selecoes || 999)) { alert("Limite atingido."); return; }
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div></div>;

  if (expired) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
       <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
       </div>
       <h2 className="text-3xl font-black text-white">Galeria Expirada</h2>
       <p className="text-slate-500 mt-2">O prazo de seleção para este álbum encerrou em {new Date(album?.data_limite || '').toLocaleDateString()}.</p>
    </div>
  );

  if (isFinished) {
    const selectedPhotoList = photos.filter(p => selectedPhotos.has(p.id));
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col p-6 animate-in fade-in duration-700">
        <header className="max-w-5xl mx-auto w-full flex items-center justify-between mb-12">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden">
                 {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-[#d4af37] font-black">R</span>}
              </div>
              <h1 className="text-xl font-black text-white">{album?.nome_galeria}</h1>
           </div>
           {paymentStatus === 'pago' ? (
             <div className="bg-emerald-500/10 text-emerald-500 px-6 py-2 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Download Liberado
             </div>
           ) : (
             <div className="bg-amber-500/10 text-amber-500 px-6 py-2 rounded-full border border-amber-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                Pendente de Pagamento
             </div>
           )}
        </header>

        <main className="max-w-5xl mx-auto w-full text-center space-y-12">
           <div className="space-y-4">
              <h2 className="text-4xl font-black tracking-tighter">Resumo da sua Escolha</h2>
              <p className="text-slate-400 font-medium">Você selecionou <span className="text-white font-bold">{selectedPhotos.size} fotos</span>. Confira abaixo:</p>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-900/30 p-8 rounded-[3rem] border border-white/5 shadow-2xl">
              {selectedPhotoList.map(photo => (
                <div key={photo.id} className="relative aspect-square rounded-[2rem] overflow-hidden group shadow-xl ring-1 ring-white/10">
                   <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" alt="" />
                   {paymentStatus === 'pago' && (
                     <a 
                       href={`${R2_CONFIG.publicUrl}/${photo.r2_key_original}`} 
                       download={photo.filename}
                       className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white"
                     >
                        <div className="bg-[#d4af37] text-black p-3 rounded-full">{ICONS.Download}</div>
                     </a>
                   )}
                </div>
              ))}
           </div>

           <div className="bg-slate-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl max-w-lg mx-auto">
              {paymentStatus === 'pago' ? (
                <div className="space-y-6">
                   <h3 className="text-2xl font-black text-emerald-500">Obrigado pela Compra!</h3>
                   <p className="text-slate-400 text-sm leading-relaxed">Suas fotos em alta resolução já estão disponíveis para download individual passando o mouse sobre cada uma acima.</p>
                   <Button variant="primary" className="w-full py-4 rounded-2xl font-black text-xs" onClick={() => window.location.reload()}>Ver Galeria Completa</Button>
                </div>
              ) : (
                <div className="space-y-6">
                   <h3 className="text-2xl font-black text-white">Quase lá, {client?.nome}!</h3>
                   <p className="text-slate-400 text-sm leading-relaxed">Suas fotos foram enviadas para análise. Assim que o pagamento for aprovado pelo administrador, o botão de download aparecerá nesta página automaticamente.</p>
                   <Button variant="outline" className="w-full py-4 rounded-2xl font-black text-xs border-white/10" onClick={() => setIsFinished(false)}>Voltar e Editar Seleção</Button>
                </div>
              )}
           </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-24 select-none" onContextMenu={e => e.preventDefault()}>
      <header className="sticky top-0 z-50 w-full bg-[#020617]/95 backdrop-blur-2xl border-b border-white/5 px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden">
               {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-[#d4af37] font-black">R</span>}
            </div>
            <div>
              <h1 className="text-lg font-black text-white">{album?.nome_galeria}</h1>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Fotos Selecionadas: {selectedPhotos.size} / {album?.max_selecoes}</p>
            </div>
          </div>
          <Button variant="primary" size="sm" className="font-black uppercase tracking-widest text-[9px] px-8 rounded-xl" isLoading={isFinishing} onClick={handleFinishSelection}>Finalizar Seleção</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl ring-1 ring-white/5" onClick={() => setViewingPhoto(photo)}>
              <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover pointer-events-none" loading="lazy" />
              <div className="absolute top-6 right-6 z-40" onClick={e => { e.stopPropagation(); toggleSelection(photo.id); }}>
                <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all ${selectedPhotos.has(photo.id) ? 'bg-[#d4af37] border-[#d4af37] text-black shadow-lg scale-110' : 'bg-black/40 border-white/20'}`}>
                  {selectedPhotos.has(photo.id) ? ICONS.Check : ICONS.Plus}
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center p-8 opacity-60 grayscale contrast-200 brightness-150 rotate-[-15deg]">
                {photographer?.marca_dagua_url ? <div className="w-full h-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${photographer.marca_dagua_url})` }} /> : <span className="text-4xl font-black text-white/10 rotate-[-30deg]">REYEL</span>}
              </div>
            </div>
          ))}
        </div>
      </main>

      {showIdentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl text-center space-y-8">
            <h3 className="text-3xl font-black text-white">Identifique-se</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Seu Nome" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold" value={clientForm.nome} onChange={e => setClientForm({...clientForm, nome: e.target.value})} />
              <input type="text" placeholder="WhatsApp" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold" value={clientForm.whatsapp} onChange={e => setClientForm({...clientForm, whatsapp: e.target.value})} />
            </div>
            <Button variant="primary" className="w-full py-5 rounded-2xl font-black uppercase text-xs" isLoading={identifying} onClick={handleIdentification}>Acessar Galeria</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicGallery;
