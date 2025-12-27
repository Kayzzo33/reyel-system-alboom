
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

// Gera uma miniatura WebP otimizada antes do upload
async function createThumbnail(file: File, maxWidth = 600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context error"));
        
        // Melhorar qualidade do redimensionamento
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Blob conversion error"));
        }, 'image/webp', 0.8); // Qualidade 80% em WebP é excelente
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export async function uploadPhotoWithThumbnail(
  file: File, 
  albumId: string,
  onProgress: (step: string) => void
): Promise<{ originalKey: string, thumbKey: string }> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/\s+/g, '_');
  
  const originalKey = `albums/${albumId}/originals/${timestamp}-${safeName}`;
  const thumbKey = `albums/${albumId}/thumbs/${timestamp}-${safeName}.webp`;

  // 1. Upload Original
  onProgress('Original...');
  const originalUrl = `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${originalKey}`;
  await r2Client.fetch(originalUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });

  // 2. Gerar e Upload Thumbnail
  onProgress('Miniatura...');
  const thumbBlob = await createThumbnail(file);
  const thumbUrl = `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${thumbKey}`;
  await r2Client.fetch(thumbUrl, {
    method: 'PUT',
    body: thumbBlob,
    headers: { 'Content-Type': 'image/webp' }
  });

  return { originalKey, thumbKey };
}

// Mantendo para compatibilidade caso necessário, mas agora usamos a de cima
export async function uploadPhotoToR2(
  file: File, 
  albumId: string, 
  onProgress: (p: number) => void
): Promise<{ url: string; key: string }> {
  const { originalKey } = await uploadPhotoWithThumbnail(file, albumId, () => onProgress(50));
  onProgress(100);
  return { url: `${R2_CONFIG.publicUrl}/${originalKey}`, key: originalKey };
}
