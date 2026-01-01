
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
  const clearSession = () => {
    localStorage.removeItem(key);
    setClient(null);
  };
  return { client, saveSession, clearSession };
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
  const [identModalReason, setIdentModalReason] = useState<'start' | 'access'>('start');
  const [clientForm, setClientForm] = useState({ nome: '', email: '', whatsapp: '' });
  const [identifying, setIdentifying] = useState(false);
  const [isProtected, setIsProtected] = useState(false); 
  const [noSelectionAlert, setNoSelectionAlert] = useState(false);

  const photosRef = useRef<HTMLElement>(null);
  const queryParams = new URLSearchParams(window.location.search);
  const shareToken = queryParams.get('gallery') || window.location.pathname.split('/').pop() || '';
  
  const { client, saveSession, clearSession } = useClientSession(album?.id || 'session');

  useEffect(() => {
    if (shareToken) fetchAlbum();
    
    // Bloqueio de Interações Básicas
    const block = (e: any) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    
    // Blindagem Anti-Print Instantânea
    const triggerProtection = () => setIsProtected(true);
    const releaseProtection = () => setIsProtected(false);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.shiftKey && e.key === '4') || (e.metaKey && e.shiftKey && e.key === '3')) {
        triggerProtection();
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('blur', triggerProtection);
    window.addEventListener('focus', releaseProtection);
    
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('blur', triggerProtection);
      window.removeEventListener('focus', releaseProtection);
    };
  }, [shareToken]);

  useEffect(() => {
    if (album && client?.id) {
      checkExistingSelection();
    }
  }, [album, client]);

  const checkExistingSelection = async (autoRedirect = false) => {
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
        if (autoRedirect) setIsFinished(true);
        
        const { data: pStat } = await supabase
          .from('order_status')
          .select('status')
          .eq('album_id', album.id)
          .eq('client_id', client.id)
          .maybeSingle();
          
        if (pStat) setPaymentStatus(pStat.status);
        return true;
      } else {
        if (autoRedirect) setNoSelectionAlert(true);
        return false;
      }
    } catch (e) { console.error("Erro seleção:", e); return false; }
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
        if (identModalReason === 'access') {
          checkExistingSelection(true);
        } else if (viewingPhoto) {
          // Se estava selecionando uma foto específica no modal, adiciona ela agora
          togglePhotoSelection(viewingPhoto.id);
        }
      }
    } catch (err) { console.error(err); } finally { setIdentifying(false); }
  };

  const togglePhotoSelection = (photoId: string) => {
    if (!client) {
      setIdentModalReason('start');
      setShowIdentModal(true);
      return;
    }
    const n = new Set(selectedPhotos);
    if (n.has(photoId)) n.delete(photoId);
    else {
      if (n.size >= (album?.max_selecoes || 999)) return alert("Limite de fotos atingido.");
      n.add(photoId);
    }
    setSelectedPhotos(n);
  };

  const handleAccessMySelection = () => {
    if (!client) {
      setIdentModalReason('access');
      setShowIdentModal(true);
    } else {
      checkExistingSelection(true);
    }
  };

  const handleFinishSelection = async () => {
    if (!client) {
      setIdentModalReason('start');
      return setShowIdentModal(true);
    }
    if (selectedPhotos.size === 0) return alert("Selecione pelo menos uma foto antes de confirmar.");
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

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center gap-6 text-center">
       <div className="w-10 h-10 border-4 border-red-600/10 border-t-red-600 rounded-full animate-spin"></div>
       <div className="text-red-600 font-black uppercase text-[10px] tracking-[0.5rem]">ReyelProduções</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] select-none overflow-x-hidden">
      
      {/* OVERLAY DE PROTEÇÃO ULTRA-AGRESSIVA */}
      {isProtected && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-[150px] flex items-center justify-center pointer-events-none transition-all duration-75">
          <div className="text-white font-black text-xs uppercase tracking-[1em] opacity-40 text-center px-10">
            PROTEÇÃO ATIVADA<br/><span className="text-[8px] tracking-[0.2em] block mt-4">REYEL PRODUÇÕES</span>
          </div>
        </div>
      )}

      {/* CAPA DO ÁLBUM - SÓ EXPLORAR GALERIA */}
      {!isFinished && (
        <section className="h-screen w-full flex flex-col lg:flex-row bg-[#000000] relative overflow-hidden">
           <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-20 space-y-12 text-center lg:text-left z-10">
              <div className="space-y-6">
                <p className="text-red-600 font-black uppercase text-[10px] md:text-xs tracking-[0.4em]">Reyel Barros de Almeida</p>
                <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-none uppercase">{album?.nome_galeria}</h1>
                <p className="text-slate-500 text-sm md:text-lg font-bold max-w-md leading-relaxed">{album?.descricao || "Prepare-se para reviver momentos únicos e inesquecíveis capturados por nossas lentes."}</p>
              </div>
              <div className="w-full md:w-auto">
                <Button variant="primary" size="lg" className="px-16 py-6 rounded-2xl w-full md:w-auto" onClick={scrollToPhotos}>Explorar Galeria</Button>
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
        <header className="sticky top-0 z-50 bg-[#000000]/80 backdrop-blur-3xl border-b border-white/5 px-4 md:px-10 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0a0a0a] rounded-xl border border-white/5 flex items-center justify-center overflow-hidden">
               {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-red-600 font-black text-sm">R</span>}
             </div>
             <div className="hidden sm:block">
               <h2 className="text-[10px] md:text-xs font-black text-white leading-none tracking-tighter uppercase">{album?.nome_galeria}</h2>
               <p className="text-[8px] md:text-[9px] text-slate-600 font-black mt-1 uppercase tracking-widest"><span className="text-red-600">{selectedPhotos.size}</span> / {album?.max_selecoes} FOTOS</p>
             </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <Button variant="premium" size="sm" className="rounded-xl px-4 md:px-8 py-3 md:py-4 font-black uppercase text-[8px] md:text-[10px] tracking-widest" onClick={handleAccessMySelection}>Minhas Escolhas</Button>
             <Button variant="primary" className="rounded-xl px-4 md:px-8 py-3 md:py-4 font-black uppercase text-[8px] md:text-[10px] tracking-widest" isLoading={isFinishing} onClick={handleFinishSelection}>
               {client ? "Confirmar Escolhas" : "Iniciar Seleção"}
             </Button>
          </div>
        </header>
      )}

      {/* TELA FINALIZADO / RESUMO */}
      {isFinished && (
        <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 text-center space-y-12 animate-in fade-in duration-700">
           <header className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-emerald-600/10 text-emerald-600 rounded-3xl flex items-center justify-center border border-emerald-600/20">{ICONS.Check}</div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">Seleção Salva</h1>
              <p className="text-slate-500 font-bold max-w-md">Olá {client?.nome}, suas {selectedPhotos.size} fotos escolhidas estão seguras.</p>
           </header>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
              {photos.filter(p => selectedPhotos.has(p.id)).map(photo => (
                <div key={photo.id} className="relative aspect-[3/4] rounded-3xl overflow-hidden group border border-white/5 bg-[#0a0a0a]">
                   <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" />
                </div>
              ))}
           </div>
           <div className="bg-[#0a0a0a] p-10 md:p-16 rounded-[3rem] max-w-2xl mx-auto border border-white/5 space-y-8">
              <Button variant="outline" className="w-full rounded-2xl py-6 font-black uppercase text-[10px] tracking-widest" onClick={() => setIsFinished(false)}>Revisar Fotos</Button>
              <button className="text-slate-800 text-[9px] font-black uppercase tracking-widest hover:text-red-600 transition-colors" onClick={() => { clearSession(); window.location.reload(); }}>Sair do meu perfil</button>
           </div>
        </main>
      )}

      {/* GRADE DE FOTOS DO CLIENTE - SEM NOMES DE ARQUIVO */}
      {!isFinished && (
        <main ref={photosRef} className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-20 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-10">
          {photos.map(photo => (
            <div 
              key={photo.id} 
              className={`relative aspect-[3/4] bg-[#0a0a0a] rounded-3xl overflow-hidden cursor-pointer group shadow-2xl transition-all duration-500 ring-1 ${selectedPhotos.has(photo.id) ? 'ring-red-600 scale-105' : 'ring-white/5'}`}
              onClick={() => setViewingPhoto(photo)}
            >
               <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" loading="lazy" />
               
               <div className="absolute top-4 right-4 z-40" onClick={(e) => { 
                 e.stopPropagation(); 
                 togglePhotoSelection(photo.id);
               }}>
                  <div className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl border flex items-center justify-center transition-all backdrop-blur-2xl ${selectedPhotos.has(photo.id) ? 'bg-red-600 border-red-600 text-white scale-110 shadow-2xl shadow-red-600/30' : 'bg-black/40 border-white/10 text-white/40'}`}>
                     {selectedPhotos.has(photo.id) ? ICONS.CheckSmall : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
                  </div>
               </div>
               
               <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none p-10 rotate-[-15deg]">
                  {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white font-black text-xl uppercase tracking-[1em]">REYEL</span>}
               </div>
            </div>
          ))}
        </main>
      )}

      {/* MODAL IDENTIFICAÇÃO - SEMPRE POR CIMA DE TUDO */}
      {showIdentModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-[3rem] p-10 text-center space-y-8">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">
              {identModalReason === 'access' ? 'Recuperar Escolhas' : 'Identificação'}
            </h3>
            <div className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-2">Nome Completo</label>
                <input type="text" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/30" value={clientForm.nome} onChange={e => setClientForm({...clientForm, nome: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-2">WhatsApp</label>
                <input type="text" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/30" value={clientForm.whatsapp} onChange={e => setClientForm({...clientForm, whatsapp: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-2">E-mail</label>
                <input type="email" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/30" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
              </div>
            </div>
            <Button variant="primary" className="w-full py-6 rounded-2xl font-black uppercase text-xs" isLoading={identifying} onClick={handleIdentification}>Continuar</Button>
            <button className="text-slate-700 text-[9px] font-black uppercase tracking-widest" onClick={() => setShowIdentModal(false)}>Voltar</button>
          </div>
        </div>
      )}

      {/* MODAL SEM SELEÇÃO */}
      {noSelectionAlert && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in zoom-in-95">
           <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-sm rounded-[3rem] p-12 text-center space-y-6">
              <h4 className="text-xl font-black text-white uppercase tracking-tight">Vazio</h4>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">Não encontramos fotos salvas para seus dados ainda.</p>
              <Button variant="primary" className="w-full py-5 rounded-2xl font-black uppercase text-[10px]" onClick={() => setNoSelectionAlert(false)}>Iniciar agora</Button>
           </div>
        </div>
      )}

      {/* VISUALIZAÇÃO AMPLIADA - SEM NOME DO ARQUIVO PARA CLIENTE */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[1200] bg-black/99 backdrop-blur-3xl flex flex-col items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <header className="absolute top-0 left-0 right-0 p-6 md:p-10 flex justify-between items-center z-[1300]">
             <div className="flex flex-col">
                <span className="text-red-600 text-[8px] font-black uppercase tracking-[0.3em]">Visualização Protegida</span>
             </div>
             <button className="w-12 h-12 md:w-16 md:h-16 bg-white/5 text-white rounded-2xl flex items-center justify-center hover:bg-red-600 transition-all" onClick={() => setViewingPhoto(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </header>

          <div className="relative max-h-[70vh] md:max-h-[80vh] w-full flex justify-center z-[1250]">
            <img src={`${R2_CONFIG.publicUrl}/${viewingPhoto.r2_key_original}`} className="max-h-[70vh] md:max-h-[80vh] object-contain pointer-events-none rounded-2xl border border-white/5" />
            <div className="absolute inset-0 flex items-center justify-center opacity-40 p-10 md:p-20 rotate-[-15deg] pointer-events-none grayscale">
              {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-white font-black text-6xl uppercase tracking-[1em]">REYEL PRODUÇÕES</span>}
            </div>
          </div>

          <div className="mt-12 z-[1300]">
             <Button 
               variant={selectedPhotos.has(viewingPhoto.id) ? 'primary' : 'premium'} 
               className="px-16 py-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em]"
               onClick={() => togglePhotoSelection(viewingPhoto.id)}
             >
               {selectedPhotos.has(viewingPhoto.id) ? '✓ Foto Selecionada' : 'Adicionar à Seleção'}
             </Button>
          </div>
        </div>
      )}

      <style>{`
        @media print { html, body { display: none !important; } }
        ::selection { background: transparent; color: transparent; }
      `}</style>
    </div>
  );
};

export default PublicGallery;
