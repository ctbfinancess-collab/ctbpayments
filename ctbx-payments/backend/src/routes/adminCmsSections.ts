import type { FastifyInstance } from 'fastify';
import { ApiError, providerNotConfigured } from '../errors/ApiError.js';
import { requireAdminSession } from '../middleware/requireAdminSession.js';
import type { CmsSectionRecord, CmsSectionsRepository } from '../repositories/CmsSectionsRepository.js';
import type { AdminAuthService } from '../services/adminAuthService.js';
import { envelope } from '../utils/envelope.js';
import { idSchema, objectSchema } from '../validation/schemas.js';

export interface AdminCmsSectionsOptions {
  authService: AdminAuthService | undefined;
  sections: CmsSectionsRepository | undefined;
}

// Home/Login/Tema/SEO — campos estruturais (ver comentário em
// CmsSectionsRepository). Só GET (listar por seção) e PUT (editar um campo
// existente) — sem POST/DELETE, porque cada "key" corresponde a um
// elemento fixo de UI, não a um item que o admin cria/remove livremente.
const KNOWN_SECTIONS = ['home', 'login', 'theme', 'seo'] as const;
const sectionSchema = { type: 'string', enum: KNOWN_SECTIONS } as const;

const cmsSectionValueSchema = {
  type: 'object', maxProperties: 20,
  additionalProperties: { type: ['string', 'number', 'boolean', 'null'], maxLength: 2048 },
} as const;
const idParams = { type: 'object', additionalProperties: false, required: ['id'], properties: { id: idSchema } } as const;
const sectionQuery = objectSchema(['section'], { section: sectionSchema });
const nullableMediaIdSchema = { anyOf: [idSchema, { type: 'null' }] } as const;

function requireSections(sections: CmsSectionsRepository | undefined): CmsSectionsRepository {
  if (!sections) throw providerNotConfigured('de seções do CMS');
  return sections;
}

// Achata "value" (jsonb) no nível raiz, mesmo formato de toApiShape em
// adminCms.ts — o frontend trata cada campo como um objeto plano.
function toApiShape(row: CmsSectionRecord) {
  const value = (row.value && typeof row.value === 'object') ? (row.value as Record<string, unknown>) : {};
  return {
    id: row.id, section: row.section, key: row.key, label: row.label, ...value,
    mediaId: row.mediaId, status: row.status, active: row.active, order: row.order,
    updatedAt: row.updatedAt.toISOString(), updatedBy: row.updatedBy,
  };
}

export async function adminCmsSectionsRoutes(app: FastifyInstance, options: AdminCmsSectionsOptions): Promise<void> {
  const { authService, sections } = options;
  const guard = requireAdminSession(authService);

  app.get('/sections', { preHandler: guard, schema: { querystring: sectionQuery } }, async (request) => {
    const repo = requireSections(sections);
    const { section } = request.query as { section: string };
    const rows = await repo.listBySection(section);
    return envelope(request, { items: rows.map(toApiShape) });
  });

  app.put('/sections/:id', {
    preHandler: guard,
    schema: {
      params: idParams,
      querystring: sectionQuery,
      body: objectSchema([], { value: cmsSectionValueSchema, mediaId: nullableMediaIdSchema, status: { type: 'string', minLength: 1, maxLength: 200 } }),
    },
  }, async (request) => {
    const repo = requireSections(sections);
    const { id } = request.params as { id: string };
    const { section } = request.query as { section: string };
    const patch = request.body as { value?: unknown; mediaId?: string | null; status?: string };
    const row = await repo.updateInSection(id, section, { ...patch, updatedBy: request.adminAuth!.id });
    if (!row) throw new ApiError('CMS_SECTION_NOT_FOUND', 'Campo não encontrado nesta seção.', { statusCode: 404 });
    return envelope(request, { item: toApiShape(row) });
  });
}
