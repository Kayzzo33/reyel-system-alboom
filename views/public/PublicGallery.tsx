
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
  
  const [showIdentModal, setShowIdentModal] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: '', email: '', whatsapp: '' });
  const [identifying, setIdentifying] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const shareToken = queryParams.get('gallery') || window.location.pathname.split('/').pop() || '';
  
  const { client, saveSession } = useClientSession(album?.id || 'default');

  useEffect(() => {
    if (shareToken) fetchAlbum();
    
    // Bloquear Teclas de Atalho de Print/Inspecionar (Ctrl+U, Ctrl+S, etc)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p')) || e.key === 'F12') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shareToken]);

  const fetchAlbum = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('albums')
        .select('*, photos(*)')
        .eq('share_token', shareToken)
        .single();

      if (error) throw error;
      setAlbum(data);
      setPhotos(data.photos || []);

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.photographer_id).single();
      setPhotographer(prof);

    } catch (err) {
      console.error("Erro ao carregar galeria:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleIdentification = async () => {
    if (!clientForm.nome || !clientForm.whatsapp || !clientForm.email) {
      alert("Por favor, preencha todos os campos para continuar.");
      return;
    }

    try {
      setIdentifying(true);
      let { data: existingClient } = await supabase
        .from('clients')
        .select('*')
        .or(`whatsapp.eq.${clientForm.whatsapp},email.eq.${clientForm.email}`)
        .maybeSingle();

      let finalClient = existingClient;

      if (!existingClient && album) {
        const { data: newClient, error: createError } = await supabase
          .from('clients')
          .insert([{
            nome: clientForm.nome,
            whatsapp: clientForm.whatsapp,
            email: clientForm.email,
            photographer_id: album.photographer_id
          }])
          .select()
          .single();
        
        if (createError) throw createError;
        finalClient = newClient;
      } else if (existingClient) {
        await supabase.from('clients').update({ nome: clientForm.nome }).eq('id', existingClient.id);
      }

      if (finalClient) {
        saveSession(finalClient);
        setShowIdentModal(false);
      }
    } catch (err) {
      alert("Houve um problema ao processar seu acesso.");
    } finally {
      setIdentifying(false);
    }
  };

  const handleFinishSelection = async () => {
    if (!client) {
      setShowIdentModal(true);
      return;
    }

    if (selectedPhotos.size === 0) {
      alert("Selecione pelo menos uma foto para finalizar.");
      return;
    }

    if (!confirm(`Deseja finalizar a seleção de ${selectedPhotos.size} fotos?`)) return;

    try {
      setIsFinishing(true);
      const selectionPayload = Array.from(selectedPhotos).map(photoId => ({
        album_id: album?.id,
        client_id: client.id,
        photo_id: photoId
      }));

      await supabase.from('selections').delete().eq('album_id', album?.id).eq('client_id', client.id);
      const { error } = await supabase.from('selections').insert(selectionPayload);
      if (error) throw error;

      setIsFinished(true);
    } catch (err) {
      alert("Erro ao salvar sua seleção.");
    } finally {
      setIsFinishing(false);
    }
  };

  const toggleSelection = (photoId: string) => {
    if (!client) {
      setShowIdentModal(true);
      return;
    }

    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      if (newSelection.size >= (album?.max_selecoes || 999)) {
        alert(`Limite de ${album?.max_selecoes} fotos atingido.`);
        return;
      }
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium text-xs tracking-widest uppercase">Segurança Ativada...</p>
    </div>
  );

  if (!album) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Galeria não encontrada</h2>
    </div>
  );

  if (isFinished) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-8 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
        {ICONS.Check}
      </div>
      <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Seleção Finalizada!</h2>
      <p className="text-slate-400 max-w-sm font-medium leading-relaxed">
        Obrigado, <span className="text-white font-bold">{client?.nome}</span>! Suas fotos foram enviadas com sucesso para análise do fotógrafo.
      </p>
      <Button variant="outline" className="mt-10 rounded-2xl border-white/10" onClick={() => setIsFinished(false)}>Revisar fotos</Button>
    </div>
  );

  return (
    <div 
      className="min-h-screen bg-[#020617] text-slate-100 pb-24 selection:bg-transparent"
      onContextMenu={(e) => e.preventDefault()} // BLOQUEIO CLIQUE DIREITO
    >
      <header className="sticky top-0 z-40 w-full bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden">
               {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-[#d4af37] font-black text-xl">R</span>}
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">{album.nome_galeria}</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{new Date(album.data_evento).toLocaleDateString('pt-BR', { dateStyle: 'long' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-right">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Fotos Selecionadas</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-black text-[#d4af37]">{selectedPhotos.size}</span>
                <span className="text-slate-700">/</span>
                <span className="text-xs font-bold text-slate-500">{album.max_selecoes}</span>
              </div>
            </div>
            <Button variant="primary" size="sm" className="font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-[#d4af37]/10" isLoading={isFinishing} onClick={handleFinishSelection}>
              Finalizar Seleção
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="relative group aspect-[3/4] bg-slate-900 rounded-[2rem] overflow-hidden cursor-pointer shadow-2xl ring-1 ring-white/5 hover:ring-[#d4af37]/50 transition-all duration-500"
              onClick={() => setViewingPhoto(photo)}
              onDragStart={(e) => e.preventDefault()} // BLOQUEIO ARRASTE
            >
              <img 
                src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} 
                alt={photo.filename}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 pointer-events-none"
                loading="lazy"
              />
              
              <div className="absolute top-5 right-5 z-10" onClick={(e) => { e.stopPropagation(); toggleSelection(photo.id); }}>
                <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 backdrop-blur-md ${
                  selectedPhotos.has(photo.id) ? `bg-[#d4af37] border-[#d4af37] text-black scale-110 shadow-[0_0_20px_rgba(212,175,55,0.4)]` : 'bg-black/20 border-white/30 hover:border-white hover:bg-black/40'
                }`}>
                  {selectedPhotos.has(photo.id) ? ICONS.CheckSmall : ICONS.Plus}
                </div>
              </div>

              {/* Marca d'Água Dinâmica - OPACIDADE 65% (MUITA VISIBILIDADE) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden p-8 z-20">
                {photographer?.marca_dagua_url ? (
                  <img 
                    src={photographer.marca_dagua_url} 
                    className="w-full h-full object-contain opacity-65 filter grayscale contrast-200 rotate-[-15deg] brightness-150"
                  />
                ) : (
                   <span className="text-4xl font-black tracking-[1rem] uppercase text-white/10 rotate-[-30deg]">ReyelProduções</span>
                )}
              </div>
              
              {/* Overlay invisível para impedir salvar como */}
              <div className="absolute inset-0 bg-transparent z-10"></div>

              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-30">
                <p className="text-[10px] font-bold text-white/50 truncate">{photo.filename}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showIdentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl text-center space-y-8">
            <div className="w-20 h-20 bg-[#d4af37]/10 text-[#d4af37] rounded-[2rem] flex items-center justify-center mx-auto mb-2">{ICONS.Clients}</div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Identifique-se</h3>
              <p className="text-slate-400 text-sm mt-2 font-medium">Preencha seus dados para salvar sua seleção.</p>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Seu Nome Completo" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 text-center font-bold" value={clientForm.nome} onChange={(e) => setClientForm({...clientForm, nome: e.target.value})} />
              <input type="email" placeholder="Seu Melhor E-mail" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 text-center font-bold" value={clientForm.email} onChange={(e) => setClientForm({...clientForm, email: e.target.value})} />
              <input type="text" placeholder="WhatsApp (00) 00000-0000" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 text-center font-bold" value={clientForm.whatsapp} onChange={(e) => setClientForm({...clientForm, whatsapp: e.target.value})} />
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="primary" className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs" isLoading={identifying} onClick={handleIdentification}>Acessar Galeria</Button>
              <button className="text-slate-600 text-[10px] font-bold hover:text-slate-400" onClick={() => setShowIdentModal(false)}>Apenas visualizar</button>
            </div>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300" onContextMenu={(e) => e.preventDefault()}>
          <button className="absolute top-8 right-8 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-[110]" onClick={() => setViewingPhoto(null)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="relative group max-h-[85vh] max-w-full overflow-hidden flex items-center justify-center">
            <img 
              src={`${R2_CONFIG.publicUrl}/${viewingPhoto.r2_key_original}`} 
              alt={viewingPhoto.filename}
              className="max-h-[85vh] max-w-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-500 pointer-events-none"
              onDragStart={(e) => e.preventDefault()}
            />
            
            {/* Marca d'Água Modal - OPACIDADE 65% */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none p-12 overflow-hidden z-20">
              {photographer?.marca_dagua_url ? (
                <img src={photographer.marca_dagua_url} className="w-2/3 h-2/3 object-contain opacity-65 filter grayscale contrast-200 rotate-[-15deg] brightness-150" />
              ) : (
                <span className="text-6xl font-black tracking-[2rem] uppercase text-white/10 rotate-[-30deg]">ReyelProduções</span>
              )}
            </div>
            {/* Bloqueador de clique em cima da imagem grande */}
            <div className="absolute inset-0 bg-transparent z-30"></div>
          </div>

          <div className="mt-8 flex items-center gap-6 z-50">
             <Button 
               variant={selectedPhotos.has(viewingPhoto.id) ? 'primary' : 'outline'} 
               size="lg" 
               className="gap-3 min-w-[240px] font-black uppercase tracking-widest text-xs rounded-2xl py-5 shadow-2xl"
               onClick={() => toggleSelection(viewingPhoto.id)}
             >
               {selectedPhotos.has(viewingPhoto.id) ? ICONS.Check : ICONS.Plus}
               {selectedPhotos.has(viewingPhoto.id) ? 'Foto Selecionada' : 'Selecionar Foto'}
             </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicGallery;
