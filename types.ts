
export interface Profile {
  id: string;
  email: string;
  nome_exibicao: string;
  telefone?: string;
  logo_url?: string;
  marca_dagua_url?: string;
}

export interface Client {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
}

export interface Album {
  id: string;
  photographer_id: string;
  client_id: string;
  nome: string;
  descricao?: string;
  nome_galeria: string;
  categoria: string;
  share_token: string;
  preco_por_foto: number;
  max_selecoes: number;
  permite_download: boolean;
  ativo: boolean;
  data_evento: string;
  created_at: string;
  photo_count?: number;
}

export interface Photo {
  id: string;
  album_id: string;
  r2_key_original: string;
  r2_key_thumbnail: string;
  r2_key_watermarked?: string;
  filename: string;
  tamanho_bytes: number;
  largura?: number;
  altura?: number;
  ordem: number;
}

export enum OrderStatus {
  PENDING = 'pendente',
  PAID = 'pago',
  CANCELLED = 'cancelado'
}

export interface Order {
  id: string;
  album_id: string;
  client_id: string;
  quantidade_fotos: number;
  valor_por_foto: number;
  subtotal: number;
  desconto: number;
  valor_total: number;
  status: OrderStatus;
  created_at: string;
}

export interface Selection {
  id: string;
  album_id: string;
  photo_id: string;
  client_id: string;
}
