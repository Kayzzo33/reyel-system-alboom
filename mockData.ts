
import { Profile, Client, Album, Photo, OrderStatus, Order } from './types';

export const mockProfile: Profile = {
  id: 'photog-1',
  email: 'contato@reyelproducoes.com',
  nome_exibicao: 'Reyel Produções',
  telefone: '(11) 99999-9999',
  logo_url: 'https://picsum.photos/200/200',
  marca_dagua_url: 'https://picsum.photos/100/100'
};

export const mockClients: Client[] = [
  { id: 'client-1', nome: 'Mariana Silva', email: 'mariana@email.com', telefone: '(11) 98888-7777' },
  { id: 'client-2', nome: 'João Pedro', email: 'joao@email.com', telefone: '(11) 97777-6666' }
];

export const mockAlbums: Album[] = [
  {
    id: 'album-1',
    photographer_id: 'photog-1',
    client_id: 'client-1',
    nome: 'Casamento Mariana & Roberto',
    nome_galeria: 'Wedding Day - M&R',
    categoria: 'Wedding',
    share_token: 'wedding-mr-2024',
    preco_por_foto: 15.00,
    max_selecoes: 50,
    permite_download: false,
    ativo: true,
    data_evento: '2024-10-15',
    created_at: '2024-10-16',
    photo_count: 120
  },
  {
    id: 'album-2',
    photographer_id: 'photog-1',
    client_id: 'client-2',
    nome: 'Ensaio Externo João',
    nome_galeria: 'Urban Session - João',
    categoria: 'Session',
    share_token: 'urban-joao-2024',
    preco_por_foto: 25.00,
    max_selecoes: 20,
    permite_download: true,
    ativo: true,
    data_evento: '2024-11-20',
    created_at: '2024-11-21',
    photo_count: 45
  }
];

export const generateMockPhotos = (albumId: string, count: number): Photo[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `photo-${albumId}-${i}`,
    album_id: albumId,
    r2_key_original: `https://picsum.photos/seed/${albumId}-${i}/1200/800`,
    r2_key_thumbnail: `https://picsum.photos/seed/${albumId}-${i}/400/300`,
    filename: `DSC_${1000 + i}.jpg`,
    tamanho_bytes: 5000000,
    ordem: i
  }));
};

export const mockOrders: Order[] = [
  {
    id: 'P000123',
    album_id: 'album-1',
    client_id: 'client-1',
    quantidade_fotos: 45,
    valor_por_foto: 15,
    subtotal: 675,
    desconto: 75,
    valor_total: 600,
    status: OrderStatus.PAID,
    created_at: '2024-11-01'
  }
];
