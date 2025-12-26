
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.540.0?target=browser";

/**
 * Configuração centralizada do Cloudflare R2.
 * Uso de process.env para acesso a variáveis de ambiente conforme configurações do ambiente.
 */
export const R2_CONFIG = {
  // Use process.env instead of import.meta.env to access configuration variables
  accountId: process.env.VITE_R2_ACCOUNT_ID || '62b6d9afa718591cb73da40f3baf5080', 
  accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID || 'e2de216216b266c0b8839fc3796e4098', 
  secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY || '8d9e514a7ff5bc56ce6f8a609d79a497571c75ee79e4910146edf16d0cbc3c50',
  bucketName: process.env.VITE_R2_BUCKET_NAME || 'galeria-cliente',
  publicUrl: process.env.VITE_R2_PUBLIC_URL || 'https://pub-9082650379b84bf7a848577262e60686.r2.dev' 
};

/**
 * Cria o cliente S3 apenas quando necessário para evitar erros de 
 * detecção de ambiente Node.js durante o carregamento da página.
 */
function getS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
    // Força o SDK a não tentar carregar configurações do disco (corrige o erro fs.readFile)
    customUserAgent: "reyel-client-v1",
  });
}

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
    
    // Feedback visual inicial
    onProgress(10);

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
    console.error('Erro no upload para R2:', error);
    throw error;
  }
}
