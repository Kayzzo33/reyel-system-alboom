
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadPhotoWithThumbnail, R2_CONFIG } from '../../lib/r2';
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
    categoria: 'Wedding',
    preco_por_foto: 15,
    max_selecoes: 50,
    data_evento: new Date().toISOString().split('T')[0],
    data_limite: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createdAlbumId, setCreatedAlbumId] = useState<string | null>(null);

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

  const handleManageAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', album.id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setAlbumPhotos(data || []);
    } catch (err) {
      console.error("Erro ao carregar fotos:", err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleShareAlbum = (album: Album) => {
    const url = `${window.location.origin}${window.location.pathname}?gallery=${album.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    });
  };

  const handleCreateAlbum = async () => {
    if (!newAlbum.nome_galeria || !newAlbum.nome) return alert('Campos obrigatórios faltando');
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
    } catch (err) { alert('Erro ao criar álbum'); }
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
      } catch (err) { 
        console.error("Erro upload:", file.name, err); 
      }
    }
    
    setUploadStatus(null);
    if (selectedAlbum) handleManageAlbum(selectedAlbum);
    fetchAlbums();
    if (step === 2) {
      setIsModalOpen(false);
      setStep(1);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm("⚠️ Excluir este álbum e todas as fotos permanentemente?")) return;
    try {
      const { error } = await supabase.from('albums').delete().eq('id', albumId);
      if (error) throw error;
      setAlbums(prev => prev.filter(a => a.id !== albumId));
      setSelectedAlbum(null);
    } catch (err) { alert("Erro ao excluir."); }
  };

  if (selectedAlbum) {
    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
        <header className="flex flex-col lg:flex-row lg:items-center gap-4 md:gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedAlbum(null)} className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-[#0a0a0a] border border-white/5">
              {ICONS.Back}
            </Button>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase">{selectedAlbum.nome_galeria}</h2>
              <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] mt-1">
                {selectedAlbum.categoria} • {albumPhotos.length} Fotos
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 lg:ml-auto">
             <Button variant="ghost" className="flex-1 lg:flex-none rounded-xl text-[10px] md:text-xs border border-white/20 text-white hover:bg-white/10" onClick={() => fileInputRef.current?.click()}>
               {ICONS.Plus} <span className="ml-1">Add Fotos</span>
             </Button>
             <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
             <Button 
                variant={isCopied ? "secondary" : "primary"} 
                className={`flex-1 lg:flex-none rounded-xl px-4 md:px-6 font-black text-[10px] md:text-xs ${isCopied ? 'bg-emerald-600' : ''}`}
                onClick={() => handleShareAlbum(selectedAlbum)}
             >
               {isCopied ? ICONS.Check : ICONS.Share} 
               <span className="ml-2">{isCopied ? "Copiado!" : "Link"}</span>
             </Button>
             <Button variant="ghost" className="rounded-xl text-red-600 hover:bg-red-600/10" onClick={() => handleDeleteAlbum(selectedAlbum.id)}>
               {ICONS.Delete}
             </Button>
          </div>
        </header>

        {uploadStatus && (
          <div className="bg-red-600/10 border border-red-600/20 p-6 rounded-2xl flex items-center gap-4 animate-pulse">
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-600">{uploadStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {loadingPhotos ? (
            [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-[#0a0a0a] rounded-2xl animate-pulse border border-white/5"></div>)
          ) : albumPhotos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square bg-[#0a0a0a] rounded-2xl md:rounded-3xl overflow-hidden border border-white/5 shadow-2xl transition-all hover:border-red-500/30" style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' }}>
              <img 
                src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} 
                className="w-full h-full object-cover will-change-transform" 
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase">Meus Álbuns</h2>
          <p className="text-slate-600 font-medium text-sm">Gerencie suas galerias exclusivas.</p>
        </div>
        <Button variant="primary" className="w-full md:w-auto rounded-xl md:rounded-2xl px-8 py-4 font-black text-xs uppercase shadow-2xl" onClick={() => { setStep(1); setIsModalOpen(true); }}>
          {ICONS.Plus} Novo Álbum
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {albums.map((album) => (
          <div key={album.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 md:p-10 space-y-6 hover:border-red-600/20 transition-all shadow-3xl">
             <div>
                <h3 className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tighter">{album.nome_galeria}</h3>
                <p className="text-[9px] md:text-[10px] text-slate-600 font-black uppercase mt-2 tracking-[0.2em]">Data: {new Date(album.data_evento).toLocaleDateString()}</p>
             </div>
             <Button variant="ghost" className="w-full rounded-2xl text-[10px] uppercase font-black tracking-widest border border-white/5" onClick={() => handleManageAlbum(album)}>Gerenciar</Button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/5 w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-3xl overflow-hidden relative">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white">{ICONS.Back}</button>
             
             {step === 1 ? (
               <div className="space-y-8">
                 <div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Novo Álbum</h3>
                   <p className="text-slate-600 text-xs font-bold mt-2">Configure os detalhes da sua nova galeria.</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Nome Interno</label>
                     <input type="text" placeholder="Ex: Casamento Maria & Joao" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={newAlbum.nome} onChange={e => setNewAlbum({...newAlbum, nome: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Nome na Galeria</label>
                     <input type="text" placeholder="Ex: Wedding Day - M&J" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={newAlbum.nome_galeria} onChange={e => setNewAlbum({...newAlbum, nome_galeria: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Preço por Foto (R$)</label>
                     <input type="number" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={newAlbum.preco_por_foto} onChange={e => setNewAlbum({...newAlbum, preco_por_foto: parseFloat(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Max Seleções</label>
                     <input type="number" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-red-600/40" value={newAlbum.max_selecoes} onChange={e => setNewAlbum({...newAlbum, max_selecoes: parseInt(e.target.value)})} />
                   </div>
                 </div>
                 
                 <Button variant="primary" className="w-full py-5 rounded-2xl font-black uppercase text-xs" onClick={handleCreateAlbum}>Próximo Passo: Fotos</Button>
               </div>
             ) : (
               <div className="space-y-8 text-center py-10">
                 <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 border border-red-600/20">
                   {ICONS.Photo}
                 </div>
                 <div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Hora do Upload</h3>
                   <p className="text-slate-600 text-xs font-bold mt-2">Selecione as fotos do seu computador.</p>
                 </div>
                 <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
                 <Button variant="primary" className="w-full py-6 rounded-2xl font-black uppercase text-xs" onClick={() => fileInputRef.current?.click()} isLoading={!!uploadStatus}>
                   {uploadStatus || 'Selecionar Arquivos'}
                 </Button>
                 <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Formatos aceitos: JPG, PNG, WEBP</p>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Albums;
