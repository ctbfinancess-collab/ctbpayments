import type { FastifyInstance } from 'fastify';
import { ApiError, providerNotConfigured } from '../errors/ApiError.js';
import { requireAdminSession } from '../middleware/requireAdminSession.js';
import type { CmsItemRecord, CmsItemsRepository } from '../repositories/CmsItemsRepository.js';
import type { AdminAuthService } from '../services/adminAuthService.js';
import { envelope } from '../utils/envelope.js';
import { idSchema, objectSchema } from '../validation/schemas.js';

export interface AdminCmsOptions {
  authService: AdminAuthService | undefined;
  items: CmsItemsRepository | undefined;
}

// Coleções liberadas por estas rotas hoje. O schema do banco já é genérico
// (cms_items.collection é texto livre), mas só habilitamos aqui o que já
// tem UI real ligada no admin — links/navegação entram nas próximas
// etapas, sem precisar de migration nova.
const KNOWN_COLLECTIONS = ['banner', 'service', 'product', 'text', 'link', 'nav_item'] as const;
const collectionSchema = { type: 'string', enum: KNOWN_COLLECTIONS } as const;

const shortText = { type: 'string', minLength: 1, maxLength: 200 } as const;
// "value" (jsonb) genérico para qualquer coleção: objeto raso, só valores
// primitivos, com um teto de campos — evita precisar de um schema
// condicional por coleção (if/then) toda vez que um tipo de conteúdo novo
// é ligado aqui. A validação "de negócio" (campo obrigatório X pra
// banner, Y pra serviço etc.) fica por conta do formulário no frontend;
// isto aqui só impede abuso estrutural (objeto aninhado, array, etc.).
const cmsItemValueSchema = {
  type: 'object', maxProperties: 20,
  additionalProperties: { type: ['string', 'number', 'boolean', 'null'], maxLength: 2048 },
} as const;
const idParams = { type: 'object', additionalProperties: false, required: ['id'], properties: { id: idSchema } } as const;
const collectionQuery = objectSchema(['collection'], { collection: collectionSchema });
// null desvincula a mídia do conteúdo sem apagar nada no Cloudinary/media —
// ver requireItems/MediaRepository.isReferenced para a exclusão de verdade.
const nullableMediaIdSchema = { anyOf: [idSchema, { type: 'null' }] } as const;

function requireItems(items: CmsItemsRepository | undefined): CmsItemsRepository {
  if (!items) throw providerNotConfigured('de conteúdo do CMS');
  return items;
}

// Achata "value" (jsonb) no nível raiz da resposta — o frontend já conhece
// banners como um objeto plano (title/subtitle/cta/... junto com
// id/name/status), sem precisar de uma camada de mapeamento a mais.
function toApiShape(row: CmsItemRecord) {
  const value = (row.value && typeof row.value === 'object') ? (row.value as Record<string, unknown>) : {};
  return {
    id: row.id, slug: row.slug, name: row.name, ...value,
    mediaId: row.mediaId, status: row.status, active: row.active, order: row.order,
    updatedAt: row.updatedAt.toISOString(), updatedBy: row.updatedBy,
  };
}

export async function adminCmsRoutes(app: FastifyInstance, options: AdminCmsOptions): Promise<void> {
  const { authService, items } = options;
  const guard = requireAdminSession(authService);

  app.get('/items', { preHandler: guard, schema: { querystring: collectionQuery } }, async (request) => {
    const repo = requireItems(items);
    const { collection } = request.query as { collection: string };
    const rows = await repo.listByCollection(collection);
    return envelope(request, { items: rows.map(toApiShape) });
  });

  app.post('/items', {
    preHandler: guard,
    schema: {
      body: objectSchema(['collection', 'name', 'value'], {
        collection: collectionSchema, name: shortText, value: cmsItemValueSchema, mediaId: nullableMediaIdSchema,
        status: shortText, active: { type: 'boolean' }, order: { type: 'integer' },
      }),
    },
  }, async (request) => {
    const repo = requireItems(items);
    const body = request.body as { collection: string; name: string; value: unknown; mediaId?: string | null; status?: string; active?: boolean; order?: number };
    const row = await repo.create({ ...body, updatedBy: request.adminAuth!.id });
    return envelope(request, { item: toApiShape(row) });
  });

  app.put('/items/:id', {
    preHandler: guard,
    schema: {
      params: idParams,
      querystring: collectionQuery,
      body: objectSchema([], { name: shortText, value: cmsItemValueSchema, mediaId: nullableMediaIdSchema, status: shortText, active: { type: 'boolean' }, order: { type: 'integer' } }),
    },
  }, async (request) => {
    const repo = requireItems(items);
    const { id } = request.params as { id: string };
    const { collection } = request.query as { collection: string };
    const patch = request.body as { name?: string; value?: unknown; mediaId?: string | null; status?: string; active?: boolean; order?: number };
    const row = await repo.updateInCollection(id, collection, { ...patch, updatedBy: request.adminAuth!.id });
    if (!row) throw new ApiError('CMS_ITEM_NOT_FOUND', 'Item não encontrado nesta coleção.', { statusCode: 404 });
    return envelope(request, { item: toApiShape(row) });
  });

  app.delete('/items/:id', {
    preHandler: guard,
    schema: { params: idParams, querystring: collectionQuery },
  }, async (request, reply) => {
    const repo = requireItems(items);
    const { id } = request.params as { id: string };
    const { collection } = request.query as { collection: string };
    const deleted = await repo.deleteInCollection(id, collection);
    if (!deleted) throw new ApiError('CMS_ITEM_NOT_FOUND', 'Item não encontrado nesta coleção.', { statusCode: 404 });
    return reply.status(204).send();
  });
}
