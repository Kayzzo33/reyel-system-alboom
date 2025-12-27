
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
  const [downloading, setDownloading] = useState<string | null>(null);

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
        const ids = new Set(existingSels.map(s => s.photo_id));
        setSelectedPhotos(ids);
        setIsFinished(true);
        
        const { data: pStat } = await supabase
          .from('order_status')
          .select('status')
          .eq('album_id', album.id)
          .eq('client_id', client.id)
          .maybeSingle();
          
        if (pStat) setPaymentStatus(pStat.status);
      }
    } catch (e) { console.error("Erro ao recuperar seleção:", e); }
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
    if (!clientForm.nome || !clientForm.whatsapp || !clientForm.email) return alert("Por favor, preencha todos os campos.");
    try {
      setIdentifying(true);
      // Busca por WhatsApp ou Email para evitar duplicatas
      let { data: existingClient } = await supabase
        .from('clients')
        .select('*')
        .or(`whatsapp.eq.${clientForm.whatsapp},email.eq.${clientForm.email}`)
        .maybeSingle();

      if (!existingClient && album) {
        const { data: newC } = await supabase
          .from('clients')
          .insert([{ 
            nome: clientForm.nome, 
            whatsapp: clientForm.whatsapp, 
            email: clientForm.email, 
            photographer_id: album.photographer_id 
          }])
          .select()
          .single();
        existingClient = newC;
      }
      
      if (existingClient) {
        saveSession(existingClient);
        setShowIdentModal(false);
        // Ao identificar, já tenta puxar o que ele tinha feito antes
        checkExistingSelection();
      }
    } catch (err) { console.error(err); } finally { setIdentifying(false); }
  };

  const handleFinishSelection = async () => {
    if (!client) return setShowIdentModal(true);
    if (selectedPhotos.size === 0) return alert("Selecione pelo menos uma foto.");
    
    try {
      setIsFinishing(true);
      // Limpa seleções anteriores para garantir que a "nova versão" seja a única no painel do fotógrafo
      await supabase.from('selections').delete().eq('album_id', album?.id).eq('client_id', client.id);
      
      const payload = Array.from(selectedPhotos).map(id => ({ 
        album_id: album?.id, 
        client_id: client.id, 
        photo_id: id 
      }));
      
      const { error } = await supabase.from('selections').insert(payload);
      if (error) throw error;
      
      setIsFinished(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { 
      console.error(err);
      alert("Erro ao salvar sua seleção. Tente novamente."); 
    } finally { 
      setIsFinishing(false); 
    }
  };

  const forceDownload = async (photo: Photo) => {
    try {
      setDownloading(photo.id);
      const url = `${R2_CONFIG.publicUrl}/${photo.r2_key_original}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = photo.filename || `foto_${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Erro no download:", err);
      // Fallback para o modo antigo caso o fetch falhe (CORS)
      window.open(`${R2_CONFIG.publicUrl}/${photo.r2_key_original}`, '_blank');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
       <div className="w-12 h-12 border-4 border-[#d4af37]/10 border-t-[#d4af37] rounded-full animate-spin"></div>
       <div className="text-[#d4af37] font-black uppercase text-[10px] tracking-[0.5rem]">Carregando sua Galeria...</div>
    </div>
  );

  if (isFinished) {
    const selectedPhotoList = photos.filter(p => selectedPhotos.has(p.id));
    return (
      <div className="min-h-screen bg-[#020617] p-8 animate-in fade-in duration-700">
        <header className="max-w-6xl mx-auto flex justify-between items-center mb-16">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl">
                 {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-[#d4af37] font-black text-2xl">R</span>}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tighter leading-none">{album?.nome_galeria}</h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">Olá, {client?.nome}</p>
              </div>
           </div>
           <div className={`px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl ${paymentStatus === 'pago' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${paymentStatus === 'pago' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {paymentStatus === 'pago' ? 'Downloads Liberados' : 'Aguardando Pagamento'}
           </div>
        </header>
        <main className="max-w-6xl mx-auto text-center space-y-12 pb-20">
           <h2 className="text-5xl font-black tracking-tighter">Sua Seleção Final</h2>
           
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {selectedPhotoList.map(photo => (
                <div key={photo.id} className="relative aspect-square rounded-[2rem] overflow-hidden group border border-white/5 shadow-2xl transition-all hover:scale-105">
                   <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" alt="" />
                   
                   {paymentStatus === 'pago' ? (
                     <button 
                       onClick={() => forceDownload(photo)} 
                       disabled={downloading === photo.id}
                       className="absolute inset-0 bg-[#d4af37]/90 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-black font-black uppercase text-[10px] p-4 gap-2"
                     >
                        {downloading === photo.id ? (
                          <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <div className="scale-150">{ICONS.Download}</div>
                            <span>Baixar Original</span>
                          </>
                        )}
                     </button>
                   ) : (
                     <div className="absolute inset-0 flex items-center justify-center opacity-30 grayscale pointer-events-none p-6 rotate-[-15deg]">
                        {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white font-black text-xs tracking-widest uppercase">Protegido</span>}
                     </div>
                   )}
                </div>
              ))}
           </div>

           <div className="bg-slate-900/50 p-12 rounded-[4rem] max-w-xl mx-auto border border-white/5 shadow-3xl backdrop-blur-md">
              {paymentStatus === 'pago' ? (
                <div className="space-y-4">
                  <p className="text-emerald-500 font-black text-xl tracking-tighter">✓ Pagamento Confirmado!</p>
                  <p className="text-slate-400 text-sm">Passe o mouse ou toque nas fotos acima para baixar os arquivos em alta resolução.</p>
                </div>
              ) : (
                <div className="space-y-8">
                   <p className="text-slate-400 font-medium leading-relaxed italic text-sm">"Sua seleção de {selectedPhotos.size} fotos foi enviada com sucesso para o fotógrafo. Assim que o pagamento for confirmado, os botões de download aparecerão aqui automaticamente."</p>
                   <Button variant="outline" className="w-full py-6 rounded-3xl font-black uppercase text-[10px] tracking-widest border-white/10 text-slate-500 hover:text-white" onClick={() => setIsFinished(false)}>Alterar Seleção</Button>
                </div>
              )}
           </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] pb-24 select-none">
      <header className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 px-8 py-6 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-slate-900 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
             {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-[#d4af37] font-black">R</span>}
           </div>
           <div>
             <h1 className="text-lg font-black text-white leading-none tracking-tighter">{album?.nome_galeria}</h1>
             <p className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-widest">Fotos: <span className="text-[#d4af37]">{selectedPhotos.size}</span> / {album?.max_selecoes}</p>
           </div>
        </div>
        <Button 
          variant="primary" 
          className="rounded-2xl px-10 py-4 font-black uppercase text-[10px] tracking-widest shadow-3xl shadow-[#d4af37]/20 border border-[#d4af37]/20" 
          isLoading={isFinishing} 
          onClick={handleFinishSelection}
        >
          Finalizar Escolhas
        </Button>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-10">
        {photos.map(photo => (
          <div 
            key={photo.id} 
            className="relative aspect-[3/4] bg-slate-900 rounded-[3rem] overflow-hidden cursor-pointer group shadow-3xl ring-1 ring-white/5 transition-all duration-500 hover:ring-[#d4af37]/30" 
            onClick={() => setViewingPhoto(photo)}
          >
             <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]" loading="lazy" />
             
             <div className="absolute top-6 right-6 z-40" onClick={(e) => { 
               e.stopPropagation(); 
               if(!client) return setShowIdentModal(true); 
               const n = new Set(selectedPhotos); 
               if(n.has(photo.id)) n.delete(photo.id); 
               else {
                 if(n.size >= (album?.max_selecoes || 999)) return alert("Limite atingido!");
                 n.add(photo.id);
               }
               setSelectedPhotos(n); 
             }}>
                <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 backdrop-blur-xl ${selectedPhotos.has(photo.id) ? 'bg-[#d4af37] border-[#d4af37] text-black scale-110 shadow-3xl' : 'bg-black/40 border-white/20 hover:border-white'}`}>
                   {selectedPhotos.has(photo.id) ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                   )}
                </div>
             </div>
             
             <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none p-12 rotate-[-20deg] grayscale contrast-150">
                {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white/10 font-black text-4xl">REYEL</span>}
             </div>
             <div className="absolute inset-0 bg-transparent z-20"></div>
          </div>
        ))}
      </main>

      {showIdentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[4.5rem] p-12 shadow-3xl text-center space-y-10 border-b-8 border-b-[#d4af37]/30">
            <div>
              <h3 className="text-4xl font-black text-white tracking-tighter">Acesse o Álbum</h3>
              <p className="text-slate-500 text-xs mt-2 font-medium uppercase tracking-widest">Identifique-se para salvar suas fotos</p>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Seu Nome" className="w-full bg-black border border-white/5 rounded-3xl px-8 py-6 text-white font-bold" value={clientForm.nome} onChange={e => setClientForm({...clientForm, nome: e.target.value})} />
              <input type="email" placeholder="E-mail" className="w-full bg-black border border-white/5 rounded-3xl px-8 py-6 text-white font-bold" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
              <input type="text" placeholder="WhatsApp (DDD + Número)" className="w-full bg-black border border-white/5 rounded-3xl px-8 py-6 text-white font-bold" value={clientForm.whatsapp} onChange={e => setClientForm({...clientForm, whatsapp: e.target.value})} />
            </div>
            <Button variant="primary" className="w-full py-7 rounded-3xl font-black uppercase text-[11px] tracking-widest" isLoading={identifying} onClick={handleIdentification}>Acessar Galeria</Button>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="fixed inset-0 z-[110] bg-black/99 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
          <button className="absolute top-12 right-12 p-6 text-white/30 hover:text-white transition-all uppercase font-black text-[10px] tracking-widest" onClick={() => setViewingPhoto(null)}>Fechar Galeria</button>
          <div className="relative max-h-[80vh] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-3xl">
            <img src={`${R2_CONFIG.publicUrl}/${viewingPhoto.r2_key_original}`} className="max-h-[80vh] object-contain pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center opacity-40 p-20 rotate-[-15deg] grayscale contrast-200 pointer-events-none">
              {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white/10 font-black text-8xl">PROTEGIDO</span>}
            </div>
            <div className="absolute inset-0 bg-transparent z-40"></div>
          </div>
          <div className="mt-12">
             <Button 
               variant={selectedPhotos.has(viewingPhoto.id) ? 'primary' : 'outline'} 
               className="px-12 py-6 rounded-3xl font-black uppercase text-[12px] tracking-widest"
               onClick={() => {
                 const n = new Set(selectedPhotos);
                 if(n.has(viewingPhoto.id)) n.delete(viewingPhoto.id);
                 else n.add(viewingPhoto.id);
                 setSelectedPhotos(n);
               }}
             >
               {selectedPhotos.has(viewingPhoto.id) ? '✓ Foto Selecionada' : '+ Escolher esta Foto'}
             </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicGallery;
