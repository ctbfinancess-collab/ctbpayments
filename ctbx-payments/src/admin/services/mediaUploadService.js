import { apiClient } from '../../api';

// Upload real de imagens do CMS para o Cloudinary. O arquivo vai direto do
// navegador para o Cloudinary (upload assinado) — nunca passa pelo nosso
// backend. O backend só gera a assinatura HMAC (usa o CLOUDINARY_API_SECRET
// para isso); este arquivo, e o navegador de forma geral, nunca veem esse
// secret em nenhum momento.
//
// Autenticação: media/sign e media/destroy agora exigem a sessão real do
// admin (cookie httpOnly, credentials:'include') — o antigo header
// X-Admin-Token não é mais usado nem aceito por essas rotas.
export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export class MediaUploadError extends Error {
  constructor(message, code = 'MEDIA_UPLOAD_ERROR') {
    super(message);
    this.name = 'MediaUploadError';
    this.code = code;
  }
}

export function validateImageFile(file) {
  if (!file) throw new MediaUploadError('Nenhum arquivo selecionado.', 'NO_FILE');
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    throw new MediaUploadError('Formato não permitido. Envie JPG, PNG, WEBP ou GIF.', 'FORMAT_NOT_ALLOWED');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new MediaUploadError(`Arquivo maior que o limite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`, 'FILE_TOO_LARGE');
  }
}

async function requestUploadSignature() {
  try {
    const response = await apiClient('/v1/admin/media/sign', {
      method: 'POST', body: JSON.stringify({}), credentials: 'include', skipAuth: true,
    });
    return response.data;
  } catch (error) {
    if (error.status === 401) throw new MediaUploadError('Sua sessão expirou. Faça login novamente.', 'ADMIN_SESSION_INVALID');
    throw new MediaUploadError(error.message || 'Não foi possível preparar o envio.', error.code || 'SIGN_FAILED');
  }
}

// Grava no Postgres os metadados que o Cloudinary devolveu depois de um
// upload real — sem isso, a mídia sumia da Biblioteca e de qualquer
// conteúdo vinculado assim que a página recarregasse (só existia em
// memória do navegador).
async function persistMediaMetadata(uploaded) {
  const response = await apiClient('/v1/admin/media', {
    method: 'POST',
    credentials: 'include',
    skipAuth: true,
    body: JSON.stringify({
      publicId: uploaded.public_id, secureUrl: uploaded.secure_url, resourceType: uploaded.resource_type || 'image',
      format: uploaded.format, width: uploaded.width, height: uploaded.height, bytes: uploaded.bytes,
      originalFilename: uploaded.original_filename,
    }),
  });
  return response.data.media;
}

function normalizePersistedMedia(row, name) {
  return {
    id: row.id,
    name: name || row.originalFilename || row.publicId,
    type: 'Imagem',
    dimensions: row.width && row.height ? `${row.width}×${row.height}` : '—',
    size: formatBytes(row.bytes),
    usage: 'Enviado pelo Painel Administrativo',
    uploadedAt: new Date(row.createdAt).toLocaleDateString('pt-BR'),
    statusKey: 'active',
    statusLabel: 'Ativa',
    secureUrl: row.secureUrl,
    publicId: row.publicId,
    format: row.format,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
  };
}

// Biblioteca real — tudo que já foi enviado em qualquer sessão anterior,
// direto do Postgres (não só o que foi enviado agora nesta aba).
export async function listPersistedMedia() {
  const response = await apiClient('/v1/admin/media', { method: 'GET', credentials: 'include', skipAuth: true });
  return response.data.media.map((row) => normalizePersistedMedia(row));
}

function uploadWithProgress({ cloudName, file, formFields, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    Object.entries(formFields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    formData.append('file', file);
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let payload = null;
      try { payload = JSON.parse(xhr.responseText); } catch { /* resposta inesperada do Cloudinary */ }
      if (xhr.status >= 200 && xhr.status < 300 && payload) resolve(payload);
      else reject(new MediaUploadError(payload?.error?.message || 'O Cloudinary recusou o envio.', 'CLOUDINARY_UPLOAD_FAILED'));
    };
    xhr.onerror = () => reject(new MediaUploadError('Falha de rede ao enviar para o Cloudinary.', 'NETWORK_ERROR'));
    xhr.send(formData);
  });
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number') return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Fluxo completo: valida no cliente → pede assinatura ao backend → envia
// direto ao Cloudinary com progresso → grava os metadados reais no
// Postgres (sobrevive a F5) → normaliza no formato já usado pela
// biblioteca de mídia do CMS (mesmo shape de ADMIN_CMS_MEDIA), mas agora
// com "id" = uuid real do banco (não mais o public_id do Cloudinary),
// pronto pra ser referenciado como media_id de qualquer conteúdo.
export async function uploadImageToCloudinary(file, { onProgress } = {}) {
  validateImageFile(file);
  const signatureData = await requestUploadSignature();
  const uploaded = await uploadWithProgress({
    cloudName: signatureData.cloudName,
    file,
    formFields: {
      api_key: signatureData.apiKey,
      timestamp: signatureData.timestamp,
      signature: signatureData.signature,
      folder: signatureData.folder,
      allowed_formats: signatureData.allowedFormats,
    },
    onProgress,
  });
  let persisted;
  try {
    persisted = await persistMediaMetadata(uploaded);
  } catch (error) {
    throw new MediaUploadError(
      error.message || 'O upload chegou ao Cloudinary, mas não foi possível salvar no banco — tente novamente.',
      error.code || 'MEDIA_PERSIST_FAILED',
    );
  }
  return normalizePersistedMedia(persisted, file.name);
}

export async function destroyCloudinaryMedia(publicId) {
  try {
    const response = await apiClient('/v1/admin/media/destroy', {
      method: 'POST', body: JSON.stringify({ publicId }), credentials: 'include', skipAuth: true,
    });
    return response.data;
  } catch (error) {
    if (error.status === 401) throw new MediaUploadError('Sua sessão expirou. Faça login novamente.', 'ADMIN_SESSION_INVALID');
    throw new MediaUploadError(error.message || 'Não foi possível remover a mídia.', error.code || 'DESTROY_FAILED');
  }
}
