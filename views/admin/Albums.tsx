
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadPhotoToR2, UploadProgress, R2_CONFIG } from '../../lib/r2';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';
import { Album, Client, Photo } from '../../types';

interface AlbumsProps {
  initialOpenModal?: boolean;
  onModalClose?: () => void;
}

const Albums: React.FC<AlbumsProps> = ({ initialOpenModal, onModalClose }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [newAlbum, setNewAlbum] = useState({
    nome: '',
    nome_galeria: '',
    client_id: '',
    categoria: 'Wedding',
    preco_por_foto: 15,
    max_selecoes: 50,
    data_evento: new Date().toISOString().split('T')[0],
    data_limite: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [createdAlbumId, setCreatedAlbumId] = useState<string | null>(null);

  useEffect(() => {
    fetchAlbums();
    fetchClients();
    if (initialOpenModal) {
      setStep(1);
      setIsModalOpen(true);
    }
  }, [initialOpenModal]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (onModalClose) onModalClose();
  };

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('albums').select('*, photos(count)').order('created_at', { ascending: false });
      if (error) throw error;
      setAlbums(data || []);
    } catch (err) {
      console.error("Erro ao buscar álbuns:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('nome');
    setClients(data || []);
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
      console.error("Erro ao carregar fotos do álbum:", err);
      const { data } = await supabase.from('photos').select('*').eq('album_id', album.id);
      setAlbumPhotos(data || []);
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

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm("⚠️ ATENÇÃO: Isso excluirá permanentemente o álbum e TODAS as fotos vinculadas. Continuar?")) return;
    try {
      const { error } = await supabase.from('albums').delete().eq('id', albumId);
      if (error) throw error;
      setAlbums(prev => prev.filter(a => a.id !== albumId));
      if (selectedAlbum?.id === albumId) setSelectedAlbum(null);
    } catch (err) {
      alert("Não foi possível excluir.");
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbum.nome || !newAlbum.nome_galeria) {
      alert('Defina o nome da galeria.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const payload = {
        nome: newAlbum.nome,
        nome_galeria: newAlbum.nome_galeria,
        categoria: newAlbum.categoria,
        preco_por_foto: newAlbum.preco_por_foto,
        max_selecoes: newAlbum.max_selecoes,
        data_evento: newAlbum.data_evento,
        data_limite: newAlbum.data_limite || null,
        photographer_id: user.id,
        share_token: Math.random().toString(36).substring(2, 10),
        client_id: newAlbum.client_id || null,
        ativo: true
      };

      const { data, error } = await supabase.from('albums').insert([payload]).select().single();
      if (error) throw error;

      setCreatedAlbumId(data.id);
      setStep(2);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newQueue = files.map(f => ({
      fileName: f.name,
      progress: 0,
      status: 'pending' as const
    }));
    setUploadQueue(prev => [...prev, ...newQueue]);
    startUploads(files);
  };

  const startUploads = async (files: File[]) => {
    const albumId = createdAlbumId || selectedAlbum?.id;
    if (!albumId) return;

    for (const file of files) {
      updateQueueItem(file.name, { status: 'uploading' });
      try {
        const { url, key } = await uploadPhotoToR2(file, albumId, (p) => {
          updateQueueItem(file.name, { progress: p });
        });

        await supabase.from('photos').insert([{
          album_id: albumId,
          r2_key_original: key,
          r2_key_thumbnail: key,
          filename: file.name,
          tamanho_bytes: file.size,
          ordem: 0
        }]);

        updateQueueItem(file.name, { status: 'completed', url });
        if (selectedAlbum?.id === albumId) handleManageAlbum(selectedAlbum);
      } catch (err) {
        updateQueueItem(file.name, { status: 'error' });
      }
    }
    fetchAlbums();
  };

  const updateQueueItem = (name: string, updates: Partial<UploadProgress>) => {
    setUploadQueue(prev => prev.map(item => 
      item.fileName === name ? { ...item, ...updates } : item
    ));
  };

  const filteredAlbums = albums.filter(album => 
    album.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.nome_galeria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedAlbum) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <header className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedAlbum(null)} className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
              {ICONS.Back}
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">{selectedAlbum.nome_galeria}</h2>
              <div className="flex gap-4 mt-1">
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{selectedAlbum.categoria}</p>
                 {selectedAlbum.data_limite && (
                   <p className="text-red-500/80 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                     Prazo: {new Date(selectedAlbum.data_limite).toLocaleDateString()}
                   </p>
                 )}
              </div>
            </div>
          </div>
          <div className="md:ml-auto flex gap-3">
             <Button variant="outline" className="rounded-xl border-white/10" onClick={() => fileInputRef.current?.click()}>
               {ICONS.Plus} Add Fotos
             </Button>
             <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
             <Button 
                variant={isCopied ? "secondary" : "primary"} 
                className={`rounded-xl px-6 font-bold transition-all duration-300 ${isCopied ? 'bg-emerald-500 text-white' : ''}`}
                onClick={() => handleShareAlbum(selectedAlbum)}
             >
               {isCopied ? ICONS.Check : ICONS.Share} 
               <span className="ml-2">{isCopied ? "Copiado!" : "Compartilhar"}</span>
             </Button>
          </div>
        </header>

        {loadingPhotos ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-slate-900 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albumPhotos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-white/5 shadow-lg">
                <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" alt={photo.filename} />
                <button onClick={() => {}} className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all">{ICONS.Delete}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Meus Projetos</h2>
          <p className="text-slate-400 font-medium">Suas galerias de fotos profissionais.</p>
        </div>
        <Button variant="primary" className="rounded-xl px-6 font-bold shadow-xl shadow-[#d4af37]/10" onClick={() => setIsModalOpen(true)}>
          {ICONS.Plus} Novo Álbum
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAlbums.map((album) => (
          <div key={album.id} className="group bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-[#d4af37]/40 transition-all shadow-2xl">
            <div className="p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-[#d4af37] transition-colors">{album.nome_galeria}</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{album.categoria}</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <span className="text-slate-500 text-[10px] font-black">{album.photos?.[0]?.count || 0} FOTOS</span>
                <Button variant="ghost" size="sm" className="bg-slate-800 px-6 rounded-xl" onClick={() => handleManageAlbum(album)}>Gerenciar</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative">
            {step === 1 ? (
              <div className="space-y-8">
                <div className="text-center">
                   <h3 className="text-2xl font-black text-white">Criar Galeria</h3>
                   <p className="text-slate-500 text-sm">Configurações e prazos.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input type="text" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold" placeholder="Nome Interno" value={newAlbum.nome} onChange={(e) => setNewAlbum({...newAlbum, nome: e.target.value})} />
                  <input type="text" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold" placeholder="Nome na Galeria" value={newAlbum.nome_galeria} onChange={(e) => setNewAlbum({...newAlbum, nome_galeria: e.target.value})} />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Data do Evento</label>
                    <input type="date" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold" value={newAlbum.data_evento} onChange={(e) => setNewAlbum({...newAlbum, data_evento: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Prazo de Seleção (Opcional)</label>
                    <input type="date" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold" value={newAlbum.data_limite} onChange={(e) => setNewAlbum({...newAlbum, data_limite: e.target.value})} />
                  </div>
                </div>
                <Button variant="primary" className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={handleCreateAlbum}>Próximo: Enviar Fotos</Button>
                <button className="w-full text-slate-600 text-xs font-bold hover:text-white" onClick={handleCloseModal}>Cancelar</button>
              </div>
            ) : (
              <div className="space-y-8">
                <div 
                  className="aspect-video bg-slate-950 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-[#d4af37]/40 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 bg-[#d4af37]/10 text-[#d4af37] rounded-2xl flex items-center justify-center mb-4">{ICONS.Plus}</div>
                  <p className="text-white font-bold">Clique para subir as fotos</p>
                  <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
                </div>
                <Button variant="primary" className="w-full py-5 rounded-2xl font-black text-xs" onClick={handleCloseModal}>Concluir</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Albums;
