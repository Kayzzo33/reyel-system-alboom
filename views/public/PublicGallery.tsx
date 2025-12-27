
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
  
  const [showIdentModal, setShowIdentModal] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: '', email: '', whatsapp: '' });
  const [identifying, setIdentifying] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const shareToken = queryParams.get('gallery') || window.location.pathname.split('/').pop() || '';
  
  const { client, saveSession } = useClientSession(album?.id || 'default');

  useEffect(() => {
    if (shareToken) fetchAlbum();
    
    // Proteções globais
    const block = (e: any) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, [shareToken]);

  const fetchAlbum = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('albums').select('*, photos(*)').eq('share_token', shareToken).single();
      if (error) throw error;
      setAlbum(data);
      setPhotos(data.photos || []);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.photographer_id).single();
      setPhotographer(prof);

      if (client?.id) {
        const { data: existingSels } = await supabase.from('selections').select('photo_id').eq('album_id', data.id).eq('client_id', client.id);
        if (existingSels && existingSels.length > 0) {
          setSelectedPhotos(new Set(existingSels.map(s => s.photo_id)));
          setIsFinished(true);
          const { data: pStat } = await supabase.from('order_status').select('status').eq('album_id', data.id).eq('client_id', client.id).maybeSingle();
          if (pStat) setPaymentStatus(pStat.status);
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleIdentification = async () => {
    if (!clientForm.nome || !clientForm.whatsapp || !clientForm.email) return alert("Preencha todos os campos.");
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
    } finally { setIdentifying(false); }
  };

  const toggleSelection = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isFinished) return;
    if (!client) { setShowIdentModal(true); return; }
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) newSelection.delete(photoId);
    else {
      if (newSelection.size >= (album?.max_selecoes || 999)) return alert("Limite atingido.");
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const handleFinishSelection = async () => {
    if (!client) return setShowIdentModal(true);
    if (selectedPhotos.size === 0) return alert("Selecione fotos.");
    if (!confirm(`Finalizar seleção de ${selectedPhotos.size} fotos?`)) return;
    try {
      setIsFinishing(true);
      const payload = Array.from(selectedPhotos).map(id => ({ album_id: album?.id, client_id: client.id, photo_id: id }));
      await supabase.from('selections').delete().eq('album_id', album?.id).eq('client_id', client.id);
      await supabase.from('selections').insert(payload);
      setIsFinished(true);
    } catch (err) { alert("Erro ao salvar."); } finally { setIsFinishing(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center animate-pulse text-[#d4af37] font-black uppercase text-[10px] tracking-widest">Iniciando Galeria Segura...</div>;

  if (isFinished) {
    const selectedPhotoList = photos.filter(p => selectedPhotos.has(p.id));
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col p-8 animate-in fade-in duration-700 select-none">
        <header className="max-w-6xl mx-auto w-full flex items-center justify-between mb-16">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 border border-white/10 rounded-[1.5rem] flex items-center justify-center overflow-hidden">
                 {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-[#d4af37] font-black text-2xl">R</span>}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tighter">{album?.nome_galeria}</h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Resumo da Seleção de {client?.nome}</p>
              </div>
           </div>
           <div className={`px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${paymentStatus === 'pago' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${paymentStatus === 'pago' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {paymentStatus === 'pago' ? 'Download Liberado' : 'Pendente de Pagamento'}
           </div>
        </header>

        <main className="max-w-6xl mx-auto w-full text-center space-y-16">
           <div className="space-y-4">
              <h2 className="text-5xl font-black tracking-tighter leading-none">Minha Escolha Final</h2>
              <p className="text-slate-500 font-medium text-lg">Total selecionado: <span className="text-white font-black">{selectedPhotos.size} itens</span></p>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 bg-slate-900/30 p-12 rounded-[4rem] border border-white/5 shadow-3xl">
              {selectedPhotoList.map(photo => (
                <div key={photo.id} className="relative aspect-square rounded-[2.5rem] overflow-hidden group shadow-2xl ring-1 ring-white/10">
                   <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" alt="" />
                   
                   {/* Marca d'Água Sempre Visível no Resumo */}
                   <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center p-6 opacity-40 grayscale contrast-200 brightness-150 rotate-[-20deg]">
                      {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-2xl font-black text-white/10 tracking-[0.5rem] uppercase">PROTEGIDO</span>}
                   </div>
                   
                   {/* Camada Protetora Invisível */}
                   <div className="absolute inset-0 bg-transparent z-40"></div>

                   {paymentStatus === 'pago' && (
                     <a 
                       href={`${R2_CONFIG.publicUrl}/${photo.r2_key_original}`} 
                       download={photo.filename}
                       className="absolute inset-0 bg-[#d4af37]/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-black z-50 p-4"
                     >
                        <div className="mb-2">{ICONS.Download}</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Baixar Original</span>
                     </a>
                   )}
                </div>
              ))}
           </div>

           <div className="bg-slate-900 border border-white/5 p-16 rounded-[4rem] shadow-3xl max-w-2xl mx-auto border-b-8 border-b-[#d4af37]/20">
              {paymentStatus === 'pago' ? (
                <div className="space-y-8">
                   <h3 className="text-3xl font-black text-emerald-500 tracking-tighter">Tudo pronto!</h3>
                   <p className="text-slate-400 font-medium leading-relaxed">Seu pagamento foi aprovado. Agora você pode passar o mouse sobre as fotos acima e clicar em "Baixar Original" para salvar em alta resolução.</p>
                   <Button variant="primary" className="w-full py-6 rounded-3xl font-black uppercase text-xs shadow-2xl shadow-[#d4af37]/10" onClick={() => window.location.reload()}>Ver Galeria Completa</Button>
                </div>
              ) : (
                <div className="space-y-8">
                   <h3 className="text-3xl font-black text-white tracking-tighter">Quase lá, {client?.nome}!</h3>
                   <p className="text-slate-400 font-medium leading-relaxed italic">"Suas fotos foram enviadas para o fotógrafo. Assim que ele confirmar o pagamento, a opção de download individual será liberada nesta mesma página automaticamente."</p>
                   <div className="flex flex-col gap-4">
                      <Button variant="outline" className="w-full py-6 rounded-3xl font-black uppercase text-xs border-white/10 text-slate-400" onClick={() => setIsFinished(false)}>Revisar e Alterar Fotos</Button>
                      <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Prints e capturas são proibidos para proteger o trabalho do artista.</p>
                   </div>
                </div>
              )}
           </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-24 select-none">
      <header className="sticky top-0 z-50 w-full bg-[#020617]/95 backdrop-blur-3xl border-b border-white/5 px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl">
               {photographer?.logo_url ? <img src={photographer.logo_url} className="w-full h-full object-contain p-2" /> : <span className="text-[#d4af37] font-black text-2xl">R</span>}
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter">{album?.nome_galeria}</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Selecionadas: {selectedPhotos.size} / {album?.max_selecoes}</p>
            </div>
          </div>
          <Button variant="primary" className="font-black uppercase tracking-widest text-[10px] px-10 py-4 rounded-2xl shadow-3xl shadow-[#d4af37]/20" isLoading={isFinishing} onClick={handleFinishSelection}>Finalizar Seleção</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-10">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-[3/4] bg-slate-900 rounded-[3rem] overflow-hidden cursor-pointer shadow-3xl ring-1 ring-white/5 group" onClick={() => setViewingPhoto(photo)}>
              <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" loading="lazy" />
              
              {/* Botão Selecionar Direto (+) */}
              <div className="absolute top-8 right-8 z-40" onClick={(e) => toggleSelection(photo.id, e)}>
                <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 backdrop-blur-xl ${selectedPhotos.has(photo.id) ? 'bg-[#d4af37] border-[#d4af37] text-black scale-110 shadow-3xl' : 'bg-black/40 border-white/20 hover:border-white hover:scale-105'}`}>
                  {selectedPhotos.has(photo.id) ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
                </div>
              </div>

              {/* Marca d'Água Dinâmica */}
              <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center p-12 opacity-50 grayscale contrast-200 brightness-150 rotate-[-20deg]">
                {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-5xl font-black text-white/5 rotate-[-30deg] tracking-[1rem] uppercase">REYEL</span>}
              </div>

              {/* Camada Protetora Invisível */}
              <div className="absolute inset-0 bg-transparent z-20"></div>
            </div>
          ))}
        </div>
      </main>

      {showIdentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[4rem] p-12 shadow-3xl text-center space-y-10 border-b-8 border-b-[#d4af37]/30">
            <div>
              <h3 className="text-4xl font-black text-white tracking-tighter leading-none">Identifique-se</h3>
              <p className="text-slate-500 text-sm mt-4 font-medium leading-relaxed">Para salvar sua seleção, informe seus dados reais.</p>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Nome Completo" className="w-full bg-black border border-white/5 rounded-3xl px-8 py-6 text-white font-bold placeholder-slate-800" value={clientForm.nome} onChange={e => setClientForm({...clientForm, nome: e.target.value})} />
              <input type="email" placeholder="E-mail" className="w-full bg-black border border-white/5 rounded-3xl px-8 py-6 text-white font-bold placeholder-slate-800" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
              <input type="text" placeholder="WhatsApp (Com DDD)" className="w-full bg-black border border-white/5 rounded-3xl px-8 py-6 text-white font-bold placeholder-slate-800" value={clientForm.whatsapp} onChange={e => setClientForm({...clientForm, whatsapp: e.target.value})} />
            </div>
            <Button variant="primary" className="w-full py-6 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-3xl shadow-[#d4af37]/10" isLoading={identifying} onClick={handleIdentification}>Acessar Galeria</Button>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="fixed inset-0 z-[110] bg-black/99 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
          <button className="absolute top-12 right-12 p-6 text-white/30 hover:text-white transition-all z-[120]" onClick={() => setViewingPhoto(null)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div className="relative group max-h-[85vh] max-w-full rounded-[2rem] overflow-hidden shadow-3xl border border-white/5 flex items-center justify-center">
            <img src={`${R2_CONFIG.publicUrl}/${viewingPhoto.r2_key_original}`} className="max-h-[85vh] max-w-full object-contain pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center p-20 opacity-50 grayscale contrast-200 brightness-150 rotate-[-15deg]">
              {photographer?.marca_dagua_url ? <img src={photographer.marca_dagua_url} className="w-full h-full object-contain" /> : <span className="text-8xl font-black text-white/5 rotate-[-30deg] tracking-[3rem] uppercase">PROTEGIDO</span>}
            </div>
            <div className="absolute inset-0 bg-transparent z-40"></div>
          </div>
          <div className="mt-12 z-[120]">
             <Button 
               variant={selectedPhotos.has(viewingPhoto.id) ? 'primary' : 'outline'} 
               size="lg" 
               className="gap-6 min-w-[350px] font-black uppercase tracking-widest text-[12px] rounded-3xl py-7 shadow-3xl shadow-black/80"
               onClick={() => toggleSelection(viewingPhoto.id)}
             >
               {selectedPhotos.has(viewingPhoto.id) ? '✓ Foto Selecionada' : '+ Adicionar ao Pedido'}
             </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicGallery;
