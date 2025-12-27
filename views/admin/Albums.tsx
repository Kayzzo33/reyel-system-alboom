
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadPhotoToR2, UploadProgress } from '../../lib/r2';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';
import { Album, Client } from '../../types';

interface AlbumsProps {
  initialOpenModal?: boolean;
  onModalClose?: () => void;
}

const Albums: React.FC<AlbumsProps> = ({ initialOpenModal, onModalClose }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
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

  // Upload State
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
        share_token: Math.random().toString(36).substring(2, 10), // Token aleatório simples
        client_id: newAlbum.client_id || null,
        ativo: true,
        permite_download: false
      };

      console.log("Tentando criar álbum com payload:", payload);
      const { data, error } = await supabase.from('albums').insert([payload]).select().single();

      if (error) {
        console.error("Erro Supabase ao criar álbum:", error);
        throw error;
      }

      setCreatedAlbumId(data.id);
      setStep(2);
    } catch (err: any) {
      console.error("Erro completo handleCreateAlbum:", err);
      alert(`Erro ao criar álbum: ${err.message || 'Verifique sua conexão ou permissões RLS.'}`);
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
    if (!createdAlbumId) return;

    for (const file of files) {
      updateQueueItem(file.name, { status: 'uploading' });
      try {
        const { url, key } = await uploadPhotoToR2(file, createdAlbumId, (p) => {
          updateQueueItem(file.name, { progress: p });
        });

        const { error: dbError } = await supabase.from('photos').insert([{
          album_id: createdAlbumId,
          r2_key_original: key,
          r2_key_thumbnail: key,
          filename: file.name,
          tamanho_bytes: file.size,
          ordem: 0
        }]);

        if (dbError) throw dbError;

        updateQueueItem(file.name, { status: 'completed', url });
      } catch (err: any) {
        console.error("Falha no upload/registro da foto:", file.name, err);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Álbuns</h2>
          <p className="text-slate-400">Gerencie suas galerias e envie fotos para o R2.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">{ICONS.Search}</span>
            <input
              type="text"
              placeholder="Buscar álbum..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 transition-all"
            />
          </div>
          <Button variant="primary" className="rounded-xl px-6" onClick={() => { setStep(1); setIsModalOpen(true); }}>
            {ICONS.Plus} Novo Álbum
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-72 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse"></div>)}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] text-center space-y-6">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-600">{ICONS.Albums}</div>
          <div className="max-w-xs space-y-2">
            <h3 className="text-xl font-bold text-white">Sua galeria está vazia</h3>
            <p className="text-slate-500 text-sm">Crie seu primeiro álbum para subir fotos e compartilhar com seus clientes.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>Criar meu primeiro álbum</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="group bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden hover:border-[#d4af37]/40 transition-all duration-300 shadow-xl">
              <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60"></div>
                <div className="text-slate-800 text-4xl transform group-hover:scale-110 transition-transform">{ICONS.Photo}</div>
              </div>
              <div className="p-7 space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#d4af37] transition-colors line-clamp-1">{album.nome_galeria}</h3>
                  <p className="text-slate-500 text-sm mt-1">{album.nome}</p>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                    <span className="p-1.5 bg-slate-800 rounded-lg">{ICONS.Photo}</span>
                    {album.photos?.[0]?.count || 0} Fotos
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-xl px-4 py-2 bg-slate-800/50 hover:bg-[#d4af37] hover:text-black">
                    Gerenciar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-4xl rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center justify-center gap-4 mb-10">
              <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-[#d4af37]' : 'bg-slate-800'}`}></div>
              <div className={`h-[2px] w-12 ${step >= 2 ? 'bg-[#d4af37]' : 'bg-slate-800'}`}></div>
              <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-[#d4af37]' : 'bg-slate-800'}`}></div>
            </div>

            {step === 1 ? (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-white tracking-tighter">Detalhes do Álbum</h3>
                  <p className="text-slate-500 mt-2 font-medium">Configure as regras de entrega e seleção.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome Interno</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Casamento Maria e João"
                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                        value={newAlbum.nome}
                        onChange={(e) => setNewAlbum({...newAlbum, nome: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome na Galeria (Público)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Maria & João • Wedding Day"
                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                        value={newAlbum.nome_galeria}
                        onChange={(e) => setNewAlbum({...newAlbum, nome_galeria: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Vincular Cliente (Opcional)</label>
                      <select 
                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 appearance-none cursor-pointer"
                        value={newAlbum.client_id}
                        onChange={(e) => setNewAlbum({...newAlbum, client_id: e.target.value})}
                      >
                        <option value="">Sem cliente vinculado...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Preço/Foto (R$)</label>
                        <input type="number" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40" value={newAlbum.preco_por_foto} onChange={(e) => setNewAlbum({...newAlbum, preco_por_foto: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Max Seleções</label>
                        <input type="number" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40" value={newAlbum.max_selecoes} onChange={(e) => setNewAlbum({...newAlbum, max_selecoes: Number(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Data do Evento</label>
                      <input type="date" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40" value={newAlbum.data_evento} onChange={(e) => setNewAlbum({...newAlbum, data_evento: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" className="flex-1 py-4 rounded-2xl" onClick={handleCloseModal}>Cancelar</Button>
                  <Button variant="primary" className="flex-1 py-4 rounded-2xl font-bold" onClick={handleCreateAlbum}>Próximo: Upload de Fotos</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-white tracking-tighter">Upload de Fotos</h3>
                  <p className="text-slate-500 mt-2 font-medium">As fotos serão processadas e enviadas para o seu storage.</p>
                </div>

                <div 
                  className="aspect-video bg-slate-950 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center p-12 hover:border-[#d4af37]/50 transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 bg-[#d4af37]/10 text-[#d4af37] rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {ICONS.Plus}
                  </div>
                  <p className="text-white font-bold text-lg">Clique para selecionar fotos</p>
                  <p className="text-slate-500 text-sm mt-2">Suporte para arquivos JPG/PNG em massa</p>
                  <input 
                    type="file" 
                    multiple 
                    hidden 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    accept="image/*"
                  />
                </div>

                {uploadQueue.length > 0 && (
                  <div className="bg-slate-950/50 rounded-3xl p-6 max-h-[250px] overflow-y-auto border border-white/5 space-y-3 custom-scrollbar">
                    {uploadQueue.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.fileName}</p>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${item.status === 'completed' ? 'bg-emerald-500' : item.status === 'error' ? 'bg-red-500' : 'bg-[#d4af37]'}`}
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-[10px] font-black uppercase text-slate-500 w-16 text-right">
                          {item.status === 'completed' ? <span className="text-emerald-500">Pronto</span> : item.status === 'error' ? <span className="text-red-500">Erro</span> : `${Math.round(item.progress)}%`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="primary" className="w-full py-4 rounded-2xl font-bold" onClick={handleCloseModal}>Concluir e Ver Álbum</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Albums;
