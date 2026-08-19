import type { FastifyInstance } from 'fastify';
import type { CloudinaryConfig } from '../config/cloudinaryConfig.js';
import { ApiError, providerNotConfigured } from '../errors/ApiError.js';
import { requireAdminSession } from '../middleware/requireAdminSession.js';
import type { MediaRecord, MediaRepository } from '../repositories/MediaRepository.js';
import type { AdminAuthService } from '../services/adminAuthService.js';
import { signCloudinaryParams } from '../security/cloudinarySignature.js';
import { envelope } from '../utils/envelope.js';
import { mediaFolderSchema, mediaPublicIdSchema, objectSchema } from '../validation/schemas.js';

export interface AdminMediaOptions {
  cloudinary: CloudinaryConfig | undefined;
  authService: AdminAuthService | undefined;
  media: MediaRepository | undefined;
}

// Pasta raiz onde todo upload do CMS é organizado no Cloudinary (item 9 do
// brief). Toda pasta/public_id aceita pelas rotas abaixo é validada, via
// JSON Schema, para viver dentro desta raiz — a rota de exclusão nunca pode
// atingir um asset fora dela.
const DEFAULT_FOLDER = 'ctbx-payments/cms';
// Formatos aceitos no upload assinado (item 11 — impede formatos
// perigosos). SVG fica de fora deliberadamente: pode carregar script inline
// e não é um formato de imagem "raster" seguro para upload de usuário.
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,gif';

const secureUrlSchema = { type: 'string', maxLength: 2048, pattern: '^https://res\\.cloudinary\\.com/' } as const;
const resourceTypeSchema = { type: 'string', enum: ['image', 'video'] } as const;
const persistMediaBodySchema = objectSchema(['publicId', 'secureUrl', 'resourceType'], {
  publicId: mediaPublicIdSchema,
  secureUrl: secureUrlSchema,
  resourceType: resourceTypeSchema,
  format: { type: 'string', maxLength: 20 },
  width: { type: 'integer', minimum: 0 },
  height: { type: 'integer', minimum: 0 },
  bytes: { type: 'integer', minimum: 0 },
  originalFilename: { type: 'string', maxLength: 255 },
});

function toMediaApiShape(row: MediaRecord) {
  return {
    id: row.id, publicId: row.publicId, secureUrl: row.secureUrl, resourceType: row.resourceType,
    format: row.format, width: row.width, height: row.height, bytes: row.bytes,
    originalFilename: row.originalFilename, altText: row.altText,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

function requireMediaRepo(media: MediaRepository | undefined): MediaRepository {
  if (!media) throw providerNotConfigured('de mídia (Cloudinary)');
  return media;
}

export async function adminMediaRoutes(app: FastifyInstance, options: AdminMediaOptions): Promise<void> {
  const { cloudinary, authService, media } = options;
  const adminGuard = requireAdminSession(authService);

  app.post('/media/sign', {
    preHandler: adminGuard,
    schema: { body: objectSchema([], { folder: mediaFolderSchema, publicId: mediaPublicIdSchema }) },
  }, async (request) => {
    if (!cloudinary) throw providerNotConfigured('de mídia (Cloudinary)');
    const body = request.body as { folder?: string; publicId?: string };
    const folder = body.folder ?? DEFAULT_FOLDER;
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = { timestamp, folder, allowed_formats: ALLOWED_FORMATS };
    if (body.publicId) paramsToSign.public_id = body.publicId;
    const signature = signCloudinaryParams(paramsToSign, cloudinary.apiSecret);
    return envelope(request, {
      signature,
      timestamp,
      apiKey: cloudinary.apiKey,
      cloudName: cloudinary.cloudName,
      folder,
      publicId: body.publicId,
      allowedFormats: ALLOWED_FORMATS,
    });
  });

  // Chamado pelo frontend logo depois do upload direto ao Cloudinary
  // (media/sign) ter terminado — grava os metadados devolvidos pelo
  // Cloudinary como registro persistente, pra sobreviver a um F5 e virar
  // algo que outro conteúdo (banner etc.) possa referenciar de verdade.
  app.post('/media', { preHandler: adminGuard, schema: { body: persistMediaBodySchema } }, async (request) => {
    const repo = requireMediaRepo(media);
    const body = request.body as {
      publicId: string; secureUrl: string; resourceType: string; format?: string;
      width?: number; height?: number; bytes?: number; originalFilename?: string;
    };
    const row = await repo.create(body);
    return envelope(request, { media: toMediaApiShape(row) });
  });

  // Biblioteca real — usada pra hidratar a lista de mídia com tudo que já
  // foi enviado em sessões anteriores (antes disso, upload real só existia
  // em memória do navegador e sumia ao dar F5).
  app.get('/media', { preHandler: adminGuard }, async (request) => {
    const repo = requireMediaRepo(media);
    const rows = await repo.list();
    return envelope(request, { media: rows.map(toMediaApiShape) });
  });

  app.post('/media/destroy', {
    preHandler: adminGuard,
    schema: {
      body: objectSchema(['publicId'], {
        publicId: mediaPublicIdSchema,
        resourceType: { type: 'string', enum: ['image', 'video'] },
      }),
    },
  }, async (request) => {
    if (!cloudinary) throw providerNotConfigured('de mídia (Cloudinary)');
    const repo = requireMediaRepo(media);
    const { publicId, resourceType } = request.body as { publicId: string; resourceType?: 'image' | 'video' };

    // Nunca apaga do Cloudinary uma mídia que algum conteúdo ainda usa —
    // desvincular (media/destroy não é chamado nesse caso) é diferente de
    // excluir de vez.
    const existing = await repo.findByPublicId(publicId);
    if (existing && await repo.isReferenced(existing.id)) {
      throw new ApiError('MEDIA_IN_USE', 'Esta mídia ainda está vinculada a um conteúdo — desvincule antes de excluir.', { statusCode: 409 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryParams({ public_id: publicId, timestamp }, cloudinary.apiSecret);
    const form = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: cloudinary.apiKey,
      signature,
    });
    let response: Response;
    try {
      response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/${resourceType ?? 'image'}/destroy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
    } catch (error) {
      request.log.error({ err: error }, 'cloudinary destroy request failed');
      throw new ApiError('MEDIA_DESTROY_UNAVAILABLE', 'Não foi possível contatar o Cloudinary para remover a mídia.', { statusCode: 502, retryable: true });
    }
    if (!response.ok) throw new ApiError('MEDIA_DESTROY_FAILED', 'O Cloudinary recusou a remoção desta mídia.', { statusCode: 502 });
    const result = (await response.json()) as { result?: string };
    if (existing) await repo.delete(existing.id);
    return envelope(request, { result: result.result ?? 'unknown' });
  });
}
