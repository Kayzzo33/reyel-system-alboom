
// Usamos aws4fetch: uma biblioteca leve que faz o mesmo que o SDK, mas sem tentar acessar o disco rígido.
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

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
}

// Inicializamos o cliente de forma estática e segura para o browser
const r2Client = new AwsClient({
  accessKeyId: R2_CONFIG.accessKeyId,
  secretAccessKey: R2_CONFIG.secretAccessKey,
  service: 's3',
  region: 'auto',
});

export async function uploadPhotoToR2(
  file: File, 
  albumId: string, 
  onProgress: (p: number) => void
): Promise<{ url: string; key: string }> {
  try {
    const key = `albums/${albumId}/originals/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const uploadUrl = `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${key}`;
    
    onProgress(10);

    // O aws4fetch assina a requisição usando Web Crypto (nativo do browser)
    // Isso NÃO usa o sistema de arquivos e NÃO causa erro de unenv
    const response = await r2Client.fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('R2 Response Error:', errorText);
      throw new Error(`Erro no R2: ${response.statusText}`);
    }

    onProgress(100);
    
    const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;
    return { url: publicUrl, key };
  } catch (error: any) {
    console.error('Falha Crítica no Upload:', error);
    throw new Error("Erro de conexão com o Storage. Verifique se o CORS no Cloudflare está configurado para permitir o seu domínio.");
  }
}
