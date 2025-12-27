
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
        const ids = new Set<string>(existingSels.map((s: any) => String(s.photo_id)));
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
    } catch (e) { console.error("Erro seleção:", e); }
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
    if (!clientForm.nome || !clientForm.whatsapp || !clientForm.email) return alert("Preencha todos os campos.");
    try {
      setIdentifying(true);
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
        checkExistingSelection();
      }
    } catch (err) { console.error(err); } finally { setIdentifying(false); }
  };

  const handleFinishSelection = async () => {
    if (!client) return setShowIdentModal(true);
    if (selectedPhotos.size === 0) return alert("Selecione pelo menos uma foto.");
    try {
      setIsFinishing(true);
      await supabase.from('selections').delete().eq('album_id', album?.id).eq('client_id', client.id);
      const payload = Array.from(selectedPhotos).map(id => ({ 
        album_id: album?.id, 
        client_id: client.id, 
        photo_id: id 
      }));
      await supabase.from('selections').insert(payload);
      setIsFinished(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { alert("Erro ao salvar."); } finally { setIsFinishing(false); }
  };

  const forceDownload = async (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      setDownloading(photo.id);
      // Usamos timestamp para evitar cache do navegador que pode vir sem headers CORS
      const url = `${R2_CONFIG.publicUrl}/${photo.r2_key_original}?t=${new Date().getTime()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network error');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', photo.filename || `foto_${photo.id}.jpg`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) { 
      console.warn("Blob download failed, opening in new tab...", err);
      const url = `${R2_CONFIG.publicUrl}/${photo.r2_key_original}`;
      window.open(url, '_blank'); 
    } finally { 
      setDownloading(null); 
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center gap-6">
       <div className="w-10 h-10 border-4 border-red-600/10 border-t-red-600 rounded-full animate-spin"></div>
       <div className="text-red-600 font-black uppercase text-[10px] tracking-[0.5rem]">ReyelProduções</div>
    </div>
  );

  if (isFinished) {
    const selectedPhotoList = photos.filter(p => selectedPhotos.has(p.id));
    return (
      <div className="min-h-screen bg-[#000000] p-6 animate-in fade-in duration-700">
        <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 mb-16 md:mb-20">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-[#0a0a0a] rounded-2xl flex items-center justify-center overflow-hidden border border-white/5 shadow-2xl">
                 {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-red-600 font-black text-2xl">R</span>}
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none uppercase">{album?.nome_galeria}</h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">Olá, {client?.nome}</p>
              </div>
           </div>
           <div className={`px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4 shadow-xl ${paymentStatus === 'pago' ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-600' : 'bg-red-600/10 border-red-600/30 text-red-600'}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${paymentStatus === 'pago' ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
              {paymentStatus === 'pago' ? 'Downloads Liberados' : 'Aguardando Pagamento'}
           </div>
        </header>

        <main className="max-w-7xl mx-auto text-center space-y-16 pb-20">
           <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">Minha Seleção</h2>
           
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-10">
              {selectedPhotoList.map(photo => (
                <div key={photo.id} className="relative aspect-[3/4] rounded-3xl overflow-hidden group border border-white/5 shadow-3xl bg-[#0a0a0a]">
                   <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" alt="" loading="lazy" />
                   
                   {paymentStatus === 'pago' && (
                     <button 
                       onClick={(e) => forceDownload(e, photo)} 
                       className="absolute bottom-4 right-4 w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 border border-white/10"
                     >
                        {downloading === photo.id ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : ICONS.Download}
                     </button>
                   )}
                   
                   {paymentStatus !== 'pago' && (
                     <div className="absolute inset-0 flex items-center justify-center opacity-40 grayscale pointer-events-none p-6 rotate-[-20deg]">
                        {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white font-black text-sm tracking-[0.3em] uppercase opacity-20">Protegido</span>}
                     </div>
                   )}
                </div>
              ))}
           </div>

           <div className="bg-[#0a0a0a] p-10 md:p-16 rounded-[3rem] md:rounded-[5rem] max-w-2xl mx-auto border border-white/5 shadow-3xl">
              {paymentStatus === 'pago' ? (
                <div className="space-y-4">
                  <p className="text-emerald-500 font-black text-2xl tracking-tighter uppercase">Downloads Prontos</p>
                  <p className="text-slate-500 text-xs font-bold">Clique no ícone de download em cada foto para baixar o arquivo original.</p>
                </div>
              ) : (
                <div className="space-y-8">
                   <p className="text-slate-400 font-bold leading-relaxed text-sm md:text-base italic">"Sua seleção de {selectedPhotos.size} fotos foi enviada com sucesso. O download será liberado automaticamente após a confirmação do pagamento."</p>
                   <Button variant="outline" className="w-full py-6 rounded-3xl text-[10px] tracking-[0.2em]" onClick={() => setIsFinished(false)}>Revisar Minha Escolha</Button>
                </div>
              )}
           </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-24 select-none">
      <header className="sticky top-0 z-50 bg-[#000000]/80 backdrop-blur-3xl border-b border-white/5 px-6 py-6 md:py-8 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#0a0a0a] rounded-xl border border-white/5 flex items-center justify-center overflow-hidden">
             {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-red-600 font-black text-sm">R</span>}
           </div>
           <div>
             <h1 className="text-sm md:text-xl font-black text-white leading-none tracking-tighter truncate max-w-[150px] md:max-w-none uppercase">{album?.nome_galeria}</h1>
             <p className="text-[10px] text-slate-600 font-black mt-1.5 uppercase tracking-[0.2em]"><span className="text-red-600">{selectedPhotos.size}</span> / {album?.max_selecoes} FOTOS</p>
           </div>
        </div>
        <Button 
          variant="primary" 
          className="rounded-2xl px-6 md:px-12 py-4 md:py-5 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-red-900/30" 
          isLoading={isFinishing} 
          onClick={handleFinishSelection}
        >
          Finalizar
        </Button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 md:gap-12">
        {photos.map(photo => (
          <div 
            key={photo.id} 
            className={`relative aspect-[3/4] bg-[#0a0a0a] rounded-3xl overflow-hidden cursor-pointer group shadow-2xl transition-all duration-500 ring-1 ${selectedPhotos.has(photo.id) ? 'ring-red-600 scale-105' : 'ring-white/5'}`}
            onClick={() => setViewingPhoto(photo)}
          >
             <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" loading="lazy" />
             
             <div className="absolute top-4 right-4 md:top-8 md:right-8 z-40" onClick={(e) => { 
               e.stopPropagation(); 
               if(!client) return setShowIdentModal(true); 
               const n = new Set(selectedPhotos); 
               if(n.has(photo.id)) n.delete(photo.id); 
               else {
                 if(n.size >= (album?.max_selecoes || 999)) return alert("Limite excedido!");
                 n.add(photo.id);
               }
               setSelectedPhotos(n); 
             }}>
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl border flex items-center justify-center transition-all backdrop-blur-2xl ${selectedPhotos.has(photo.id) ? 'bg-red-600 border-red-600 text-white scale-110 shadow-2xl shadow-red-600/30' : 'bg-black/40 border-white/10 text-white/40'}`}>
                   {selectedPhotos.has(photo.id) ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
                </div>
             </div>
             
             <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none p-10 rotate-[-20deg] grayscale contrast-200">
                {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white/5 font-black text-2xl uppercase tracking-[1em]">REYEL</span>}
             </div>
          </div>
        ))}
      </main>

      {showIdentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-[3rem] md:rounded-[5rem] p-10 md:p-16 shadow-3xl text-center space-y-10 border-b-8 border-b-red-600/30">
            <div>
              <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">Identificação</h3>
              <p className="text-slate-600 text-[10px] mt-3 font-black uppercase tracking-[0.2em]">Acesse para salvar suas fotos</p>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Seu Nome" className="w-full bg-black border border-white/5 rounded-2xl px-8 py-5 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={clientForm.nome} onChange={e => setClientForm({...clientForm, nome: e.target.value})} />
              <input type="email" placeholder="E-mail" className="w-full bg-black border border-white/5 rounded-2xl px-8 py-5 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
              <input type="text" placeholder="WhatsApp (Com DDD)" className="w-full bg-black border border-white/5 rounded-2xl px-8 py-5 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={clientForm.whatsapp} onChange={e => setClientForm({...clientForm, whatsapp: e.target.value})} />
            </div>
            <Button variant="primary" className="w-full py-6 rounded-3xl font-black uppercase text-xs" isLoading={identifying} onClick={handleIdentification}>Acessar Galeria</Button>
            <button className="text-slate-700 text-[9px] font-black uppercase tracking-widest mt-6 hover:text-white" onClick={() => setShowIdentModal(false)}>Voltar</button>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="fixed inset-0 z-[110] bg-black/99 backdrop-blur-3xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
          <button className="absolute top-8 right-8 p-4 text-white/40 hover:text-white font-black text-[10px] tracking-widest uppercase" onClick={() => setViewingPhoto(null)}>Fechar Visualização</button>
          <div className="relative max-h-[75vh] md:max-h-[85vh] rounded-[2rem] overflow-hidden border border-white/5 shadow-3xl">
            <img src={`${R2_CONFIG.publicUrl}/${viewingPhoto.r2_key_original}`} className="max-h-[75vh] md:max-h-[85vh] object-contain pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center opacity-30 p-20 rotate-[-15deg] grayscale contrast-150 pointer-events-none">
              {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white/5 font-black text-6xl uppercase tracking-[1em]">PROTEGIDO</span>}
            </div>
          </div>
          <div className="mt-12">
             <Button 
               variant={selectedPhotos.has(viewingPhoto.id) ? 'primary' : 'outline'} 
               className="md:px-16 py-6 rounded-3xl font-black uppercase text-[12px] tracking-widest"
               onClick={() => {
                 const n = new Set(selectedPhotos);
                 if(n.has(viewingPhoto.id)) n.delete(viewingPhoto.id);
                 else {
                   if(n.size >= (album?.max_selecoes || 999)) return alert("Limite excedido!");
                   n.add(viewingPhoto.id);
                 }
                 setSelectedPhotos(n);
               }}
             >
               {selectedPhotos.has(viewingPhoto.id) ? '✓ Foto Selecionada' : '+ Adicionar à Seleção'}
             </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicGallery;
