
import React, { useState, useEffect, useRef } from 'react';
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
  const [isProtected, setIsProtected] = useState(false); 

  const photosRef = useRef<HTMLElement>(null);
  const queryParams = new URLSearchParams(window.location.search);
  const shareToken = queryParams.get('gallery') || window.location.pathname.split('/').pop() || '';
  
  const { client, saveSession } = useClientSession(album?.id || 'session');

  useEffect(() => {
    if (shareToken) fetchAlbum();
    
    const block = (e: any) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    
    // SISTEMA ANTI-PRINT ULTRA RÁPIDO
    const triggerProtection = () => setIsProtected(true);
    const releaseProtection = () => setTimeout(() => setIsProtected(false), 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloqueia instantaneamente se tocar em Shift, Control, Alt, Win/Cmd ou PrintScreen
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || e.key === 'PrintScreen') {
        setIsProtected(true);
      }
    };

    const handleKeyUp = () => {
      // Mantém o bloqueio por 1s após soltar para garantir que o SO finalizou a ação
      setTimeout(() => setIsProtected(false), 800);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', triggerProtection);
    window.addEventListener('focus', releaseProtection);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') triggerProtection();
      else releaseProtection();
    });

    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', triggerProtection);
      window.removeEventListener('focus', releaseProtection);
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

  const scrollToPhotos = () => {
    photosRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const fileName = `${(photo.filename || 'foto').replace(/\.[^/.]+$/, "")}.jpg`;

    try {
      setDownloading(photo.id);
      const response = await fetch(`${R2_CONFIG.publicUrl}/${photo.r2_key_original}?v=${Date.now()}`);
      const blob = await response.blob();

      if (isMobile && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Reyel Produções' });
          setDownloading(null);
          return;
        }
      }

      const binaryBlob = new Blob([blob], { type: 'application/octet-stream' });
      const blobUrl = window.URL.createObjectURL(binaryBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 5000);
    } catch (err) { 
      window.location.assign(`${R2_CONFIG.publicUrl}/${photo.r2_key_original}`);
    } finally { setDownloading(null); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center gap-6">
       <div className="w-10 h-10 border-4 border-red-600/10 border-t-red-600 rounded-full animate-spin"></div>
       <div className="text-red-600 font-black uppercase text-[10px] tracking-[0.5rem]">ReyelProduções</div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#000000] select-none`}>
      
      {/* OVERLAY DE PROTEÇÃO (SÓ APARECE QUANDO ISPROTECTED) */}
      {isProtected && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[60px] flex items-center justify-center pointer-events-none transition-all duration-75">
          <div className="text-white font-black text-xs uppercase tracking-[0.5em] opacity-30">Captura Bloqueada</div>
        </div>
      )}

      {/* CAPA DO ÁLBUM */}
      {!isFinished && (
        <section className="h-screen w-full flex flex-col lg:flex-row bg-[#000000] relative overflow-hidden">
           <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-20 space-y-12 text-center lg:text-left">
              <div className="space-y-6">
                <p className="text-red-600 font-black uppercase text-[10px] md:text-xs tracking-[0.4em]">Reyel Barros de Almeida</p>
                <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-none uppercase">{album?.nome_galeria}</h1>
                <p className="text-slate-500 text-sm md:text-lg font-bold max-w-md leading-relaxed">{album?.descricao || "Prepare-se para reviver momentos únicos e inesquecíveis capturados por nossas lentes."}</p>
                <div className="pt-4">
                   <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.2em]">{new Date(album?.data_evento || '').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div>
                <Button variant="outline" className="rounded-none px-12 py-5 font-black uppercase text-[10px] tracking-widest border-red-600/50 text-red-600 hover:bg-red-600 hover:text-white" onClick={scrollToPhotos}>Ver Galeria</Button>
              </div>
           </div>
           <div className="w-full lg:w-1/2 h-full relative group">
              {album?.capa_url ? (
                <img src={album.capa_url} className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-[2000ms]" alt="Capa" />
              ) : (
                <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center text-slate-800 font-black uppercase tracking-[1em]">Reyel Produções</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-transparent to-transparent hidden lg:block"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent lg:hidden"></div>
           </div>
        </section>
      )}

      {/* HEADER FIXO */}
      {!isFinished && (
        <header className="sticky top-0 z-50 bg-[#000000]/80 backdrop-blur-3xl border-b border-white/5 px-6 py-6 md:py-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#0a0a0a] rounded-xl border border-white/5 flex items-center justify-center overflow-hidden">
               {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-red-600 font-black text-sm">R</span>}
             </div>
             <div>
               <h2 className="text-sm font-black text-white leading-none tracking-tighter uppercase">{album?.nome_galeria}</h2>
               <p className="text-[10px] text-slate-600 font-black mt-1.5 uppercase tracking-widest"><span className="text-red-600">{selectedPhotos.size}</span> / {album?.max_selecoes} SELECIONADAS</p>
             </div>
          </div>
          <Button variant="primary" className="rounded-xl px-6 md:px-10 py-4 font-black uppercase text-[10px] tracking-widest" isLoading={isFinishing} onClick={handleFinishSelection}>Finalizar</Button>
        </header>
      )}

      {/* RESULTADO */}
      {isFinished && (
        <main className="max-w-7xl mx-auto px-6 py-20 text-center space-y-16 animate-in fade-in duration-700">
           <header className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-emerald-600/10 text-emerald-600 rounded-3xl flex items-center justify-center border border-emerald-600/20">{ICONS.Check}</div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">Seleção Concluída</h1>
              <p className="text-slate-500 font-bold max-w-md">Olá {client?.nome}, suas {selectedPhotos.size} fotos favoritas foram enviadas para o fotógrafo com sucesso!</p>
              <div className={`px-6 py-3 rounded-full border text-[9px] font-black uppercase tracking-widest ${paymentStatus === 'pago' ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-600' : 'bg-red-600/10 border-red-600/30 text-red-600'}`}>
                 {paymentStatus === 'pago' ? '✓ Downloads Liberados' : 'Aguardando Pagamento'}
              </div>
           </header>

           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
              {photos.filter(p => selectedPhotos.has(p.id)).map(photo => (
                <div key={photo.id} className="relative aspect-[3/4] rounded-3xl overflow-hidden group border border-white/5 bg-[#0a0a0a]">
                   <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" />
                   {paymentStatus === 'pago' && (
                     <button onClick={(e) => forceDownload(e, photo)} className="absolute bottom-4 right-4 w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50">
                        {downloading === photo.id ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : ICONS.Download}
                     </button>
                   )}
                </div>
              ))}
           </div>
           
           <div className="bg-[#0a0a0a] p-10 md:p-16 rounded-[3rem] max-w-2xl mx-auto border border-white/5">
              <Button variant="outline" className="w-full rounded-2xl py-6 font-black uppercase text-[10px] tracking-widest" onClick={() => setIsFinished(false)}>Revisar Minha Seleção</Button>
           </div>
        </main>
      )}

      {/* GRADE DE FOTOS */}
      {!isFinished && (
        <main ref={photosRef} className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-24 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-12">
          {photos.map(photo => (
            <div 
              key={photo.id} 
              className={`relative aspect-[3/4] bg-[#0a0a0a] rounded-3xl overflow-hidden cursor-pointer group shadow-2xl transition-all duration-500 ring-1 ${selectedPhotos.has(photo.id) ? 'ring-red-600 scale-105' : 'ring-white/5'}`}
              onClick={() => setViewingPhoto(photo)}
            >
               <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" loading="lazy" />
               
               <div className="absolute top-4 right-4 z-40" onClick={(e) => { 
                 e.stopPropagation(); 
                 if(!client) return setShowIdentModal(true); 
                 const n = new Set(selectedPhotos); 
                 if(n.has(photo.id)) n.delete(photo.id); 
                 else {
                   if(n.size >= (album?.max_selecoes || 999)) return alert("Limite atingido.");
                   n.add(photo.id);
                 }
                 setSelectedPhotos(n); 
               }}>
                  <div className={`w-10 h-10 md:w-16 md:h-16 rounded-2xl border flex items-center justify-center transition-all backdrop-blur-2xl ${selectedPhotos.has(photo.id) ? 'bg-red-600 border-red-600 text-white scale-110 shadow-2xl shadow-red-600/30' : 'bg-black/40 border-white/10 text-white/40'}`}>
                     {selectedPhotos.has(photo.id) ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
                  </div>
               </div>
               
               <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none p-10 rotate-[-20deg] grayscale contrast-200">
                  {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white/5 font-black text-2xl uppercase tracking-[1em]">REYEL PRODUÇÕES</span>}
               </div>
            </div>
          ))}
        </main>
      )}

      {/* MODAL IDENTIFICAÇÃO */}
      {showIdentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-[3rem] p-12 text-center space-y-10">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Sua Identificação</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Seu Nome" className="w-full bg-black border border-white/5 rounded-2xl px-8 py-5 text-white font-bold outline-none" value={clientForm.nome} onChange={e => setClientForm({...clientForm, nome: e.target.value})} />
              <input type="text" placeholder="WhatsApp (Com DDD)" className="w-full bg-black border border-white/5 rounded-2xl px-8 py-5 text-white font-bold outline-none" value={clientForm.whatsapp} onChange={e => setClientForm({...clientForm, whatsapp: e.target.value})} />
              <input type="email" placeholder="E-mail" className="w-full bg-black border border-white/5 rounded-2xl px-8 py-5 text-white font-bold outline-none" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
            </div>
            <Button variant="primary" className="w-full py-6 rounded-3xl font-black uppercase text-xs" isLoading={identifying} onClick={handleIdentification}>Entrar na Galeria</Button>
            <button className="text-slate-700 text-[10px] font-black uppercase tracking-widest" onClick={() => setShowIdentModal(false)}>Voltar</button>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZAÇÃO */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[110] bg-black/99 backdrop-blur-3xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
          <button className="absolute top-8 right-8 p-4 text-white/40 font-black text-[10px] uppercase tracking-widest" onClick={() => setViewingPhoto(null)}>Fechar Visualização</button>
          <div className="relative max-h-[75vh] md:max-h-[85vh] rounded-[2rem] overflow-hidden border border-white/5">
            <img src={`${R2_CONFIG.publicUrl}/${viewingPhoto.r2_key_original}`} className="max-h-[75vh] md:max-h-[85vh] object-contain pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center opacity-10 p-20 rotate-[-15deg] pointer-events-none grayscale">
              {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white/5 font-black text-6xl uppercase tracking-[1em]">PROTEGIDO</span>}
            </div>
          </div>
          <div className="mt-12">
             <Button 
               variant={selectedPhotos.has(viewingPhoto.id) ? 'primary' : 'outline'} 
               className="px-12 py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest"
               onClick={() => {
                 const n = new Set(selectedPhotos);
                 if(n.has(viewingPhoto.id)) n.delete(viewingPhoto.id);
                 else {
                   if(n.size >= (album?.max_selecoes || 999)) return alert("Limite atingido.");
                   n.add(viewingPhoto.id);
                 }
                 setSelectedPhotos(n);
               }}
             >
               {selectedPhotos.has(viewingPhoto.id) ? '✓ Foto Selecionada' : 'Adicionar à Seleção'}
             </Button>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body { filter: blur(100px) !important; pointer-events: none !important; }
          img, section, header, main { display: none !important; }
        }
        ::selection { background: #ff0000; color: white; }
      `}</style>
    </div>
  );
};

export default PublicGallery;
