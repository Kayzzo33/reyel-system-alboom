
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadPhotoWithThumbnail, uploadPhotoToR2, R2_CONFIG } from '../../lib/r2';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';
import { Album, Client, Photo, Profile } from '../../types';

const Albums: React.FC<{ initialOpenModal?: boolean; onModalClose?: () => void }> = ({ initialOpenModal, onModalClose }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [newAlbum, setNewAlbum] = useState({
    nome: '',
    nome_galeria: '',
    descricao: '',
    categoria: 'Event',
    preco_por_foto: 15,
    max_selecoes: 50,
    data_evento: new Date().toISOString().split('T')[0],
    capa_url: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const capaInputRef = useRef<HTMLInputElement>(null);
  const [createdAlbumId, setCreatedAlbumId] = useState<string | null>(null);
  const [uploadingCapa, setUploadingCapa] = useState(false);

  useEffect(() => {
    fetchAlbums();
    fetchProfile();
    if (initialOpenModal) {
      setIsModalOpen(true);
      if (onModalClose) onModalClose();
    }
  }, [initialOpenModal]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile(data);
      if (data?.default_price_per_photo) setNewAlbum(prev => ({ ...prev, preco_por_foto: data.default_price_per_photo }));
    }
  };

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('albums').select('*, photos(count)').order('created_at', { ascending: false });
      setAlbums(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCapaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCapa(true);
      const { url } = await uploadPhotoToR2(file, 'capas-albuns', () => {});
      setNewAlbum(prev => ({ ...prev, capa_url: url }));
    } catch (err) { alert("Erro ao subir capa"); } finally { setUploadingCapa(false); }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbum.nome_galeria || !newAlbum.nome) return alert('Nome do álbum é obrigatório.');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('albums').insert([{
        ...newAlbum,
        photographer_id: user?.id,
        share_token: Math.random().toString(36).substring(2, 10),
        ativo: true
      }]).select().single();
      if (error) throw error;
      setCreatedAlbumId(data.id);
      setStep(2);
      fetchAlbums();
    } catch (err) { 
      console.error(err);
      alert('Erro ao criar álbum.'); 
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const albumId = createdAlbumId || selectedAlbum?.id;
    if (!albumId) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setUploadStatus(`Processando ${i + 1}/${files.length}...`);
        const { originalKey, thumbKey } = await uploadPhotoWithThumbnail(file, albumId, (step) => {
          setUploadStatus(`[${i + 1}/${files.length}] Enviando ${step}`);
        });

        await supabase.from('photos').insert([{
          album_id: albumId,
          r2_key_original: originalKey,
          r2_key_thumbnail: thumbKey,
          filename: file.name,
          tamanho_bytes: file.size,
          ordem: i
        }]);
      } catch (err) { console.error(err); }
    }
    
    setUploadStatus(null);
    if (selectedAlbum) handleManageAlbum(selectedAlbum);
    fetchAlbums();
    if (step === 2) {
      setIsModalOpen(false);
      setStep(1);
    }
  };

  const handleManageAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    setLoadingPhotos(true);
    try {
      const { data } = await supabase.from('photos').select('*').eq('album_id', album.id).order('ordem', { ascending: true });
      setAlbumPhotos(data || []);
    } finally { setLoadingPhotos(false); }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm("⚠️ Excluir este álbum permanentemente?")) return;
    try {
      await supabase.from('albums').delete().eq('id', albumId);
      setAlbums(prev => prev.filter(a => a.id !== albumId));
      setSelectedAlbum(null);
    } catch (err) { alert("Erro ao excluir."); }
  };

  if (selectedAlbum) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <header className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedAlbum(null)} className="p-3 rounded-2xl bg-[#0a0a0a] border border-white/5">{ICONS.Back}</Button>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{selectedAlbum.nome_galeria}</h2>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">{albumPhotos.length} Fotos na galeria</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 lg:ml-auto">
             <Button variant="ghost" className="rounded-xl text-xs border border-white/10 text-white" onClick={() => fileInputRef.current?.click()}>
               {ICONS.Plus} <span className="ml-2">Add Fotos</span>
             </Button>
             <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
             <Button variant={isCopied ? "secondary" : "primary"} className="rounded-xl px-6" onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}?gallery=${selectedAlbum.share_token}`;
                navigator.clipboard.writeText(url).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); });
             }}>
               {isCopied ? ICONS.Check : ICONS.Share} <span className="ml-2">{isCopied ? "Copiado!" : "Link"}</span>
             </Button>
             <Button variant="ghost" className="rounded-xl text-red-600 hover:bg-red-600/10" onClick={() => handleDeleteAlbum(selectedAlbum.id)}>{ICONS.Delete}</Button>
          </div>
        </header>

        {uploadStatus && (
          <div className="bg-red-600/10 border border-red-600/20 p-6 rounded-2xl flex items-center gap-4">
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-black uppercase text-red-600">{uploadStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {loadingPhotos ? [1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-[#0a0a0a] rounded-2xl animate-pulse"></div>) : albumPhotos.map(photo => (
            <div key={photo.id} className="group relative aspect-square bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/5">
              <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Meus Álbuns</h2>
          <p className="text-slate-600 font-medium text-sm">Gerencie suas entregas profissionais.</p>
        </div>
        <Button variant="primary" className="rounded-2xl px-8 py-4 font-black text-xs uppercase shadow-2xl" onClick={() => { setStep(1); setIsModalOpen(true); }}>
          {ICONS.Plus} Criar Galeria
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {albums.map((album) => (
          <div key={album.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-red-600/30 transition-all shadow-3xl">
             <div className="aspect-video relative overflow-hidden bg-black/50">
                {album.capa_url ? <img src={album.capa_url} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center text-slate-800 font-black">SEM CAPA</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
                <div className="absolute bottom-6 left-8">
                   <h3 className="text-xl font-black text-white uppercase tracking-tighter">{album.nome_galeria}</h3>
                </div>
             </div>
             <div className="p-8">
                <Button variant="ghost" className="w-full rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5" onClick={() => handleManageAlbum(album)}>Gerenciar</Button>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/5 w-full max-w-3xl rounded-[3rem] p-12 shadow-3xl relative overflow-y-auto max-h-[90vh]">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white">{ICONS.Back}</button>
             
             {step === 1 ? (
               <div className="space-y-10">
                 <div>
                   <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Configurar Galeria</h3>
                   <p className="text-slate-600 text-xs font-bold mt-2 uppercase tracking-widest">Defina como o cliente verá o trabalho.</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Foto de Capa (Obrigatório p/ Estética)</label>
                        <div 
                          className="aspect-video bg-black rounded-3xl border border-white/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                          onClick={() => capaInputRef.current?.click()}
                        >
                          {newAlbum.capa_url ? <img src={newAlbum.capa_url} className="w-full h-full object-cover" /> : (
                             <div className="flex flex-col items-center gap-2 text-slate-700 group-hover:text-red-600 transition-colors">
                                {ICONS.Photo}
                                <span className="text-[9px] font-black uppercase tracking-widest">Subir Capa</span>
                             </div>
                          )}
                          {uploadingCapa && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>}
                        </div>
                        <input type="file" hidden ref={capaInputRef} onChange={handleCapaUpload} accept="image/*" />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Descrição Curta</label>
                        <textarea 
                          placeholder="Ex: Uma tarde mágica no parque com a família..." 
                          className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-red-600/40 h-28" 
                          value={newAlbum.descricao} 
                          onChange={e => setNewAlbum({...newAlbum, descricao: e.target.value})}
                        />
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Nome da Galeria</label>
                        <input type="text" placeholder="Ex: Batizado do Theo" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={newAlbum.nome_galeria} onChange={e => setNewAlbum({...newAlbum, nome_galeria: e.target.value, nome: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Preço/Foto</label>
                           <input type="number" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={newAlbum.preco_por_foto} onChange={e => setNewAlbum({...newAlbum, preco_por_foto: parseFloat(e.target.value)})} />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Qtd Fotos</label>
                           <input type="number" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={newAlbum.max_selecoes} onChange={e => setNewAlbum({...newAlbum, max_selecoes: parseInt(e.target.value)})} />
                         </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Data do Evento</label>
                        <input type="date" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={newAlbum.data_evento} onChange={e => setNewAlbum({...newAlbum, data_evento: e.target.value})} />
                      </div>
                   </div>
                 </div>
                 
                 <Button variant="primary" className="w-full py-6 rounded-3xl font-black uppercase text-xs shadow-2xl shadow-red-900/40" onClick={handleCreateAlbum}>Salvar e Ir para Fotos</Button>
               </div>
             ) : (
               <div className="text-center py-20 space-y-10">
                 <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center mx-auto text-red-600 border border-red-600/20">{ICONS.Photo}</div>
                 <div>
                   <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Hora do Upload</h3>
                   <p className="text-slate-600 text-xs font-bold mt-2 uppercase tracking-widest">O álbum foi criado! Agora suba as fotos.</p>
                 </div>
                 <Button variant="primary" className="w-full py-6 rounded-3xl font-black uppercase text-xs" onClick={() => fileInputRef.current?.click()} isLoading={!!uploadStatus}>
                   {uploadStatus || 'Selecionar Arquivos'}
                 </Button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Albums;
