
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const getEnv = (key: string, fallback: string): string => {
  try {
    return (typeof process !== 'undefined' && process.env?.[key]) || fallback;
  } catch {
    return fallback;
  }
};

export const R2_CONFIG = {
  accountId: getEnv('VITE_R2_ACCOUNT_ID', '62b6d9afa718591cb73da40f3baf5080'), 
  accessKeyId: getEnv('VITE_R2_ACCESS_KEY_ID', 'e2de216216b266c0b8839fc3796e4098'), 
  secretAccessKey: getEnv('VITE_R2_SECRET_ACCESS_KEY', '8d9e514a7ff5bc56ce6f8a609d79a497571c75ee79e4910146edf16d0cbc3c50'),
  bucketName: getEnv('VITE_R2_BUCKET_NAME', 'galeria-cliente'),
  publicUrl: getEnv('VITE_R2_PUBLIC_URL', 'https://pub-9082650379b84bf7a848577262e60686.r2.dev') 
};

const r2Client = new AwsClient({
  accessKeyId: R2_CONFIG.accessKeyId,
  secretAccessKey: R2_CONFIG.secretAccessKey,
  service: 's3',
  region: 'auto',
});

/**
 * Upload direto para o R2 com tratamento robusto de erros
 */
export async function uploadToR2Direct(file: File | Blob, key: string): Promise<string> {
  const url = `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${key}`;
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const contentType = file instanceof File ? file.type : 'image/webp';

    // Log para depuração técnica (pode ser visto no F12 Console)
    console.log(`[R2] Iniciando upload: ${key} (${contentType})`);

    const response = await r2Client.fetch(url, {
      method: 'PUT',
      body: arrayBuffer,
      headers: { 
        'Content-Type': contentType
        // Content-Length é calculado automaticamente pelo fetch ao usar ArrayBuffer
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[R2 ERROR ${response.status}]:`, errorText);
      throw new Error(`Erro R2: ${response.status}`);
    }

    console.log(`[R2] Upload concluído com sucesso: ${key}`);
    return `${R2_CONFIG.publicUrl}/${key}`;
  } catch (err: any) {
    if (err.message === 'Failed to fetch') {
      console.error("ERRO DE REDE/CORS: Verifique a configuração de CORS no painel do Cloudflare R2.");
      throw new Error("Erro de conexão ou CORS. Verifique as configurações do Cloudflare.");
    }
    throw err;
  }
}

/**
 * Gera uma miniatura WebP otimizada
 */
async function createThumbnail(file: File, maxWidth = 600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context error"));
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Blob conversion error"));
        }, 'image/webp', 0.85);
      };
      img.onerror = () => reject(new Error("Image load error"));
    };
    reader.onerror = () => reject(new Error("File read error"));
  });
}

/**
 * Upload de foto com miniatura (Para fotos da galeria)
 */
export async function uploadPhotoWithThumbnail(
  file: File, 
  albumId: string,
  onProgress: (step: string) => void
): Promise<{ originalKey: string, thumbKey: string }> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  
  const originalKey = `albums/${albumId}/originals/${timestamp}-${safeName}`;
  const thumbKey = `albums/${albumId}/thumbs/${timestamp}-${safeName}.webp`;

  onProgress('Original...');
  await uploadToR2Direct(file, originalKey);

  onProgress('Miniatura...');
  const thumbBlob = await createThumbnail(file);
  await uploadToR2Direct(thumbBlob, thumbKey);

  return { originalKey, thumbKey };
}

/**
 * Atalho para upload de arquivos únicos (Capa, Logo, etc)
 */
export async function uploadPhotoToR2(
  file: File, 
  path: string, 
  onProgress?: (p: number) => void
): Promise<{ url: string; key: string }> {
  if (onProgress) onProgress(50);
  const url = await uploadToR2Direct(file, path);
  if (onProgress) onProgress(100);
  return { url, key: path };
}
