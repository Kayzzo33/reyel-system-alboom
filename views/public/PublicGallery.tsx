
import React, { useState, useEffect } from 'react';
import { Album, Photo } from '../../types';
import { mockAlbums, generateMockPhotos } from '../../mockData';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';

const PublicGallery: React.FC = () => {
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    // Simulate fetching album from share token
    const mockAlbum = mockAlbums[0];
    setAlbum(mockAlbum);
    setPhotos(generateMockPhotos(mockAlbum.id, 24));
  }, []);

  const toggleSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  if (!album) return <div className="min-h-screen flex items-center justify-center text-slate-400">Carregando galeria...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-24">
      {/* Gallery Header */}
      <header className="sticky top-0 z-40 w-full bg-[#020617]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className={`w-12 h-12 bg-[${COLORS.primary}] rounded-full flex items-center justify-center text-black font-bold text-xl`}>R</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{album.nome_galeria}</h1>
              <p className="text-sm text-slate-400">Mariana Silva • {new Date(album.data_evento).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-xs text-slate-500 uppercase font-bold">Seleção</p>
              <p className="text-sm font-semibold text-[${COLORS.primary}]">{selectedPhotos.size} / {album.max_selecoes} fotos</p>
            </div>
            <Button variant="primary" size="sm" className="hidden md:flex">
              Finalizar Seleção
            </Button>
          </div>
        </div>
      </header>

      {/* Photo Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="relative group aspect-[4/5] bg-slate-900 rounded-2xl overflow-hidden cursor-pointer shadow-2xl transition-all hover:-translate-y-1"
              onClick={() => setViewingPhoto(photo)}
            >
              <img 
                src={photo.r2_key_thumbnail} 
                alt={photo.filename}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Selection Checkbox */}
              <div 
                className="absolute top-4 right-4 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(photo.id);
                }}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedPhotos.has(photo.id) 
                    ? `bg-[${COLORS.primary}] border-[${COLORS.primary}] text-black scale-110 shadow-lg` 
                    : 'bg-black/20 border-white/50 hover:border-white'
                }`}>
                  {selectedPhotos.has(photo.id) && ICONS.CheckSmall}
                </div>
              </div>

              {/* Watermark Overlay (Simulation) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 rotate-[-45deg] select-none">
                <span className="text-2xl font-bold tracking-widest uppercase border-y border-white px-4 py-2">ReyelProduções</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Cart (Mobile) */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
        <Button variant="primary" className="w-full py-4 rounded-2xl shadow-2xl flex items-center justify-between px-6">
          <span className="font-bold">Finalizar Seleção</span>
          <span className="bg-black/20 px-3 py-1 rounded-full text-xs font-bold">{selectedPhotos.size} selecionadas</span>
        </Button>
      </div>

      {/* Fullscreen Photo Viewer */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
          <button 
            className="absolute top-6 right-6 p-4 text-white hover:bg-white/10 rounded-full transition-colors z-50"
            onClick={() => setViewingPhoto(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <img 
            src={viewingPhoto.r2_key_original} 
            alt={viewingPhoto.filename}
            className="max-h-[85vh] max-w-full object-contain shadow-2xl animate-in zoom-in-95 duration-500"
          />

          <div className="mt-8 flex items-center gap-6">
             <Button 
               variant={selectedPhotos.has(viewingPhoto.id) ? 'primary' : 'outline'} 
               size="lg" 
               className="gap-2 min-w-[200px]"
               onClick={() => toggleSelection(viewingPhoto.id)}
             >
               {selectedPhotos.has(viewingPhoto.id) ? ICONS.Check : ICONS.Plus}
               {selectedPhotos.has(viewingPhoto.id) ? 'Selecionada' : 'Selecionar'}
             </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicGallery;
