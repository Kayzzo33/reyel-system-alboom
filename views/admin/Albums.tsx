
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [newAlbum, setNewAlbum] = useState({
    nome: '',
    nome_galeria: '',
    client_id: '',
    categoria: 'Wedding',
    preco_por_foto: 15,
    max_selecoes: 50,
    data_evento: new Date().toISOString().split('T')[0]
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
      // Removida a ordenação para evitar erro 400 caso o SQL ainda não tenha rodado
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', album.id);
        
      if (error) throw error;
      setAlbumPhotos(data || []);
    } catch (err) {
      console.error("Erro ao carregar fotos do álbum:", err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Deseja realmente excluir esta foto?")) return;
    try {
      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;
      setAlbumPhotos(prev => prev.filter(p => p.id !== photoId));
      fetchAlbums();
    } catch (err) {
      alert("Erro ao excluir foto.");
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbum.nome || !newAlbum.nome_galeria) {
      alert('Por favor, defina o nome interno e o nome da galeria.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const payload = {
        nome: newAlbum.nome,
        nome_galeria: newAlbum.nome_galeria,
        categoria: newAlbum.categoria,
        preco_por_foto: newAlbum.preco_por_foto,
        max_selecoes: newAlbum.max_selecoes,
        data_evento: newAlbum.data_evento,
        photographer_id: user.id,
        share_token: Math.random().toString(36).substring(2, 10),
        client_id: newAlbum.client_id || null,
        ativo: true,
        permite_download: false
      };

      const { data, error } = await supabase.from('albums').insert([payload]).select().single();
      if (error) throw error;

      setCreatedAlbumId(data.id);
      setStep(2);
    } catch (err: any) {
      console.error("Erro ao criar álbum:", err);
      alert(`Erro: ${err.message || 'Erro de permissão ou conexão.'}`);
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

        const { error: dbError } = await supabase.from('photos').insert([{
          album_id: albumId,
          r2_key_original: key,
          r2_key_thumbnail: key,
          filename: file.name,
          tamanho_bytes: file.size,
          ordem: 0
        }]);

        if (dbError) throw dbError;
        updateQueueItem(file.name, { status: 'completed', url });
        
        if (selectedAlbum?.id === albumId) {
          handleManageAlbum(selectedAlbum);
        }
      } catch (err: any) {
        console.error(`Falha no arquivo ${file.name}:`, err);
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
            <Button variant="ghost" onClick={() => { setSelectedAlbum(null); setUploadQueue([]); }} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-[#d4af37]">
              {ICONS.Back}
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">{selectedAlbum.nome_galeria}</h2>
              <p className="text-slate-400 text-sm">Gerenciando fotos e configurações.</p>
            </div>
          </div>
          <div className="md:ml-auto flex gap-3">
             <Button variant="outline" className="rounded-xl border-white/10" onClick={() => fileInputRef.current?.click()}>
               {ICONS.Plus} Add Fotos
             </Button>
             <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
             <Button variant="primary" className="rounded-xl px-6 font-bold">
               {ICONS.Share} Link do Cliente
             </Button>
          </div>
        </header>

        {uploadQueue.some(i => i.status === 'uploading') && (
           <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 p-6 rounded-3xl flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
                 <span className="text-sm font-bold text-[#d4af37]">Sincronizando fotos com o Storage R2...</span>
              </div>
           </div>
        )}

        {loadingPhotos ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-slate-900 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : albumPhotos.length === 0 ? (
          <div className="py-24 text-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem]">
            <div className="text-slate-600 mb-4 transform scale-150">{ICONS.Photo}</div>
            <p className="text-slate-500 font-medium">Este álbum ainda não possui fotos.</p>
            <Button variant="ghost" className="mt-4" onClick={() => fileInputRef.current?.click()}>Subir primeiras fotos agora</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albumPhotos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-white/5 hover:border-[#d4af37]/40 transition-all shadow-lg">
                <img 
                  src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  alt={photo.filename}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <button 
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:scale-110 z-10"
                >
                  {ICONS.Delete}
                </button>
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
          <h2 className="text-3xl font-bold text-white tracking-tight">Álbuns</h2>
          <p className="text-slate-400 font-medium">Gerencie suas galerias e realize envios em massa.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">{ICONS.Search}</span>
            <input
              type="text"
              placeholder="Buscar álbum..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 transition-all w-full md:w-64"
            />
          </div>
          <Button variant="primary" className="rounded-xl px-6 font-bold" onClick={() => { setStep(1); setIsModalOpen(true); }}>
            {ICONS.Plus} Novo Álbum
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-72 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse"></div>)}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] text-center space-y-6">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-600 scale-125">{ICONS.Albums}</div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">Sua estante está vazia</h3>
            <p className="text-slate-500 text-sm font-medium">Crie seu primeiro álbum para subir fotos e compartilhar.</p>
          </div>
          <Button variant="outline" className="rounded-xl border-white/10" onClick={() => setIsModalOpen(true)}>Criar primeiro álbum</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="group bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-[#d4af37]/40 transition-all duration-300 shadow-2xl">
              <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60"></div>
                <div className="text-slate-800 text-5xl transform group-hover:scale-110 transition-transform">{ICONS.Photo}</div>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#d4af37] transition-colors line-clamp-1">{album.nome_galeria}</h3>
                  <p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest">{album.categoria}</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-black">
                    <span className="p-2 bg-slate-800 rounded-xl text-[#d4af37]">{ICONS.Photo}</span>
                    {album.photos?.[0]?.count || 0} FOTOS
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-xl px-5 py-2.5 bg-slate-800/50 hover:bg-[#d4af37] hover:text-black font-bold transition-all" onClick={() => handleManageAlbum(album)}>
                    Gerenciar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-4xl rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-center gap-4 mb-12">
              <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-[#d4af37]' : 'bg-slate-800'}`}></div>
              <div className={`h-[2px] w-12 transition-colors duration-500 ${step >= 2 ? 'bg-[#d4af37]' : 'bg-slate-800'}`}></div>
              <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-[#d4af37]' : 'bg-slate-800'}`}></div>
            </div>

            {step === 1 ? (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-white tracking-tighter">Configuração do Álbum</h3>
                  <p className="text-slate-500 mt-2 font-medium">Defina os detalhes básicos para a nova galeria.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Administrativo</label>
                      <input type="text" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 font-bold" placeholder="Ex: Casamento João e Maria" value={newAlbum.nome} onChange={(e) => setNewAlbum({...newAlbum, nome: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Público na Galeria</label>
                      <input type="text" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 font-bold" placeholder="Ex: Maria & João • 2024" value={newAlbum.nome_galeria} onChange={(e) => setNewAlbum({...newAlbum, nome_galeria: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente (Opcional)</label>
                      <select className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 font-bold appearance-none cursor-pointer" value={newAlbum.client_id} onChange={(e) => setNewAlbum({...newAlbum, client_id: e.target.value})}>
                        <option value="">Nenhum cliente vinculado</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço/Foto (R$)</label>
                        <input type="number" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 font-bold" value={newAlbum.preco_por_foto} onChange={(e) => setNewAlbum({...newAlbum, preco_por_foto: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Limite Seleções</label>
                        <input type="number" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 font-bold" value={newAlbum.max_selecoes} onChange={(e) => setNewAlbum({...newAlbum, max_selecoes: Number(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data do Evento</label>
                      <input type="date" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 font-bold" value={newAlbum.data_evento} onChange={(e) => setNewAlbum({...newAlbum, data_evento: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/5">
                  <Button variant="ghost" className="flex-1 py-4 rounded-2xl font-bold" onClick={handleCloseModal}>Cancelar</Button>
                  <Button variant="primary" className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={handleCreateAlbum}>Próximo: Enviar Fotos</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-white tracking-tighter">Upload para o Cloud R2</h3>
                  <p className="text-slate-500 mt-2 font-medium">As fotos serão armazenadas com segurança e alta disponibilidade.</p>
                </div>

                <div 
                  className="aspect-video bg-slate-950 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer group hover:border-[#d4af37]/40 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-24 h-24 bg-[#d4af37]/10 text-[#d4af37] rounded-[2.5rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-[#d4af37]/5">
                    {ICONS.Plus}
                  </div>
                  <p className="text-white font-black text-xl tracking-tight">Clique para selecionar</p>
                  <p className="text-slate-500 text-sm mt-2 font-medium">JPG ou PNG (Upload em massa suportado)</p>
                  <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
                </div>

                {uploadQueue.length > 0 && (
                  <div className="bg-slate-950/50 rounded-[2rem] p-8 max-h-[300px] overflow-y-auto border border-white/5 space-y-4 custom-scrollbar">
                    {uploadQueue.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-6 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white truncate uppercase tracking-tighter">{item.fileName}</p>
                          <div className="w-full bg-slate-850 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className={`h-full transition-all duration-300 ${item.status === 'completed' ? 'bg-emerald-500' : item.status === 'error' ? 'bg-red-500' : 'bg-[#d4af37]'}`} style={{ width: `${item.progress}%` }}></div>
                          </div>
                        </div>
                        <div className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-500 w-20 text-right">
                           {item.status === 'completed' ? <span className="text-emerald-500">CONCLUÍDO</span> : item.status === 'error' ? <span className="text-red-500">FALHA</span> : `${Math.round(item.progress)}%`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button variant="primary" className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-[#d4af37]/20" onClick={handleCloseModal}>Concluir Processo</Button>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Albums;
