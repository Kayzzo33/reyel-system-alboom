
// Importando o cliente principal e o comando
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.540.0";

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
    onProgress(10);

    // CRITICAL: Forçamos o SDK a ignorar qualquer arquivo de configuração local
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_CONFIG.accessKeyId,
        secretAccessKey: R2_CONFIG.secretAccessKey,
      },
      // Desativa explicitamente a detecção de ambiente Node/FS
      customUserAgent: "reyel-browser-client",
      forcePathStyle: true
    });

    const arrayBuffer = await file.arrayBuffer();
    
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    });

    await s3.send(command);
    onProgress(100);
    
    const url = `${R2_CONFIG.publicUrl}/${key}`;
    return { url, key };
  } catch (error: any) {
    console.error('R2 Upload Error:', error);
    // Erro amigável se o ambiente ainda tentar carregar fs
    if (error.message?.includes('fs.readFile')) {
       throw new Error("Erro de Inicialização do SDK: O navegador tentou carregar módulos de servidor. Verifique se as extensões do navegador não estão bloqueando o script.");
    }
    throw error;
  }
}
