
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadPhotoToR2, UploadProgress, R2_CONFIG } from '../../lib/r2';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';
import { Album, Client, Photo, Profile } from '../../types';

const Albums: React.FC<{ initialOpenModal?: boolean; onModalClose?: () => void }> = ({ initialOpenModal, onModalClose }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  // Estados para Gerenciamento de Álbum Selecionado
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
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
    if (initialOpenModal) setIsModalOpen(true);
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
    if (!newAlbum.nome_galeria) return alert('Nome da galeria obrigatório');
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
    } catch (err) { alert('Erro ao criar álbum'); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const albumId = createdAlbumId || selectedAlbum?.id;
    if (!albumId) return;

    for (const file of files) {
      try {
        const { key } = await uploadPhotoToR2(file, albumId, () => {});
        await supabase.from('photos').insert([{
          album_id: albumId,
          r2_key_original: key,
          r2_key_thumbnail: key,
          filename: file.name,
          tamanho_bytes: file.size,
          ordem: 0
        }]);
      } catch (err) { console.error("Erro upload:", file.name); }
    }
    
    if (selectedAlbum) handleManageAlbum(selectedAlbum);
    fetchAlbums();
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

  // Visão Detalhada do Álbum (Quando um álbum está selecionado)
  if (selectedAlbum) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <header className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedAlbum(null)} className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
              {ICONS.Back}
            </Button>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter">{selectedAlbum.nome_galeria}</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                {selectedAlbum.categoria} • {albumPhotos.length} Fotos • R$ {selectedAlbum.preco_por_foto}/foto
              </p>
            </div>
          </div>
          <div className="md:ml-auto flex gap-3">
             <Button variant="outline" className="rounded-xl border-white/10" onClick={() => fileInputRef.current?.click()}>
               {ICONS.Plus} Add Fotos
             </Button>
             <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
             <Button 
                variant={isCopied ? "secondary" : "primary"} 
                className={`rounded-xl px-6 font-bold transition-all duration-300 ${isCopied ? 'bg-emerald-500 text-white' : 'shadow-2xl shadow-[#d4af37]/20'}`}
                onClick={() => handleShareAlbum(selectedAlbum)}
             >
               {isCopied ? ICONS.Check : ICONS.Share} 
               <span className="ml-2">{isCopied ? "Copiado!" : "Copiar Link"}</span>
             </Button>
             <Button variant="ghost" className="rounded-xl text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteAlbum(selectedAlbum.id)}>
               {ICONS.Delete}
             </Button>
          </div>
        </header>

        {loadingPhotos ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-slate-900 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {albumPhotos.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem]">
                <p className="text-slate-500 font-bold">Nenhuma foto neste álbum ainda.</p>
              </div>
            ) : (
              albumPhotos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square bg-slate-900 rounded-3xl overflow-hidden border border-white/5 shadow-lg">
                  <img 
                    src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" 
                    alt={photo.filename} 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                     <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">{photo.filename}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // Visão da Lista de Álbuns
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Meus Álbuns</h2>
          <p className="text-slate-500 font-medium">Gerencie e publique suas galerias.</p>
        </div>
        <Button variant="primary" className="rounded-2xl px-8 font-black text-xs uppercase shadow-2xl shadow-[#d4af37]/20" onClick={() => setIsModalOpen(true)}>
          {ICONS.Plus} Novo Álbum
        </Button>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-900 rounded-[3rem] animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {albums.map((album) => (
            <div key={album.id} className="bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden group hover:border-[#d4af37]/30 transition-all shadow-2xl">
               <div className="p-10 space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-white group-hover:text-[#d4af37] transition-colors">{album.nome_galeria}</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{album.categoria} • R$ {album.preco_por_foto}/foto</p>
                  </div>
                  <div className="flex justify-between items-center pt-8 border-t border-white/5">
                     <span className="text-slate-500 text-[10px] font-black uppercase">{album.photos?.[0]?.count || 0} Itens</span>
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       className="bg-slate-850 px-6 rounded-xl font-black text-[9px] uppercase hover:bg-[#d4af37] hover:text-black transition-all"
                       onClick={() => handleManageAlbum(album)}
                     >
                       Gerenciar
                     </Button>
                  </div>
               </div>
            </div>
          ))}
          {albums.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem]">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Você ainda não criou nenhum álbum.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3.5rem] p-12 shadow-2xl relative border-b-8 border-b-[#d4af37]/40">
            {step === 1 ? (
              <div className="space-y-10">
                <div className="text-center"><h3 className="text-3xl font-black text-white tracking-tighter">Novo Álbum</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Nome Galeria</label>
                    <input type="text" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold" value={newAlbum.nome_galeria} onChange={(e) => setNewAlbum({...newAlbum, nome_galeria: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Valor por Foto (R$)</label>
                    <input type="number" className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-[#d4af37] font-black" value={newAlbum.preco_por_foto} onChange={(e) => setNewAlbum({...newAlbum, preco_por_foto: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <Button variant="primary" className="w-full py-5 rounded-2xl font-black uppercase text-xs" onClick={handleCreateAlbum}>Confirmar e Subir Fotos</Button>
                <button className="w-full text-slate-600 text-xs font-black uppercase tracking-widest" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              </div>
            ) : (
              <div className="space-y-10 text-center">
                 <div className="aspect-video bg-black border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-[#d4af37]/30 transition-all" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-20 h-20 bg-[#d4af37]/10 text-[#d4af37] rounded-[2rem] flex items-center justify-center mb-6">{ICONS.Plus}</div>
                    <p className="text-white font-black text-xl tracking-tighter">Subir as fotos do Álbum</p>
                    <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} />
                 </div>
                 <Button variant="primary" className="w-full py-5 rounded-2xl font-black text-xs uppercase" onClick={() => setIsModalOpen(false)}>Finalizar Tudo</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Albums;
