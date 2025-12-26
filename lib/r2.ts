
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.540.0?target=browser&no-check";

/**
 * Função de extração segura de variáveis de ambiente.
 * Verifica múltiplas fontes para garantir que o site não quebre se o process.env estiver ausente.
 */
const getSafeEnv = (key: string, fallback: string): string => {
  try {
    // 1. Tenta process.env (Vercel/Node)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
    // 2. Tenta import.meta.env (Vite)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
    // 3. Tenta window.env (Injeção manual)
    if (typeof window !== 'undefined' && (window as any).env && (window as any).env[key]) {
      return (window as any).env[key];
    }
  } catch (e) {
    console.warn(`Erro ao ler env ${key}:`, e);
  }
  return fallback;
};

export const R2_CONFIG = {
  accountId: getSafeEnv('VITE_R2_ACCOUNT_ID', '62b6d9afa718591cb73da40f3baf5080'), 
  accessKeyId: getSafeEnv('VITE_R2_ACCESS_KEY_ID', 'e2de216216b266c0b8839fc3796e4098'), 
  secretAccessKey: getSafeEnv('VITE_R2_SECRET_ACCESS_KEY', '8d9e514a7ff5bc56ce6f8a609d79a497571c75ee79e4910146edf16d0cbc3c50'),
  bucketName: getSafeEnv('VITE_R2_BUCKET_NAME', 'galeria-cliente'),
  publicUrl: getSafeEnv('VITE_R2_PUBLIC_URL', 'https://pub-9082650379b84bf7a848577262e60686.r2.dev') 
};

/**
 * Singleton para o cliente S3 para evitar múltiplas instâncias
 */
let _s3Client: S3Client | null = null;

function getS3Client() {
  if (_s3Client) return _s3Client;

  _s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
    // Estas flags forçam o SDK a ignorar provedores que usam o disco
    apiVersion: 'v3',
    maxAttempts: 3,
    customUserAgent: 'reyel-client-browser'
  });
  
  return _s3Client;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
}

export async function uploadPhotoToR2(
  file: File, 
  albumId: string, 
  onProgress: (p: number) => void
): Promise<{ url: string; key: string }> {
  try {
    const key = `albums/${albumId}/originals/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    onProgress(5);

    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
    });

    await s3.send(command);
    onProgress(100);
    
    const url = `${R2_CONFIG.publicUrl}/${key}`;
    return { url, key };
  } catch (error) {
    console.error('Erro crítico no upload R2:', error);
    throw error;
  }
}
