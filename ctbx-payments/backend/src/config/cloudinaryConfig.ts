// Lê as credenciais do Cloudinary só de process.env — nunca aceita valor via
// request, nunca loga, nunca inclui em nenhuma resposta HTTP. Se qualquer
// variável estiver ausente, retorna undefined e as rotas de mídia respondem
// PROVIDER_NOT_CONFIGURED (mesmo padrão dos demais providers do BFF).
export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function loadCloudinaryConfig(source: NodeJS.ProcessEnv = process.env): CloudinaryConfig | undefined {
  const cloudName = source.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = source.CLOUDINARY_API_KEY?.trim();
  const apiSecret = source.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return undefined;
  return { cloudName, apiKey, apiSecret };
}
