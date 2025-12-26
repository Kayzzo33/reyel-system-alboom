
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3";

/**
 * Configuração centralizada do Cloudflare R2.
 * Prioriza variáveis de ambiente para segurança no deploy.
 */
export const R2_CONFIG = {
  accountId: (import.meta as any).env?.VITE_R2_ACCOUNT_ID || '62b6d9afa718591cb73da40f3baf5080', 
  accessKeyId: (import.meta as any).env?.VITE_R2_ACCESS_KEY_ID || 'e2de216216b266c0b8839fc3796e4098', 
  secretAccessKey: (import.meta as any).env?.VITE_R2_SECRET_ACCESS_KEY || '8d9e514a7ff5bc56ce6f8a609d79a497571c75ee79e4910146edf16d0cbc3c50',
  bucketName: (import.meta as any).env?.VITE_R2_BUCKET_NAME || 'galeria-cliente',
  publicUrl: (import.meta as any).env?.VITE_R2_PUBLIC_URL || 'https://pub-9082650379b84bf7a848577262e60686.r2.dev' 
};

// Cliente S3 configurado para o Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
}

/**
 * Realiza o upload REAL para o bucket do R2.
 */
export async function uploadPhotoToR2(
  file: File, 
  albumId: string, 
  onProgress: (p: number) => void
): Promise<{ url: string; key: string }> {
  try {
    const key = `albums/${albumId}/originals/${Date.now()}-${file.name}`;
    
    // Simula progresso inicial
    onProgress(10);

    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
    });

    await s3Client.send(command);
    
    onProgress(100);
    
    const url = `${R2_CONFIG.publicUrl}/${key}`;
    return { url, key };
  } catch (error) {
    console.error('Erro no upload para R2:', error);
    throw error;
  }
}
