import assert from 'node:assert/strict';
import test from 'node:test';
import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { registerErrorHandler } from '../src/middleware/errorHandler.js';
import { ADMIN_SESSION_COOKIE } from '../src/middleware/requireAdminSession.js';
import { adminCmsRoutes } from '../src/routes/adminCms.js';
import type { CmsItemRecord, CmsItemsRepository, CreateCmsItemInput, UpdateCmsItemInput } from '../src/repositories/CmsItemsRepository.js';
import type { AdminAuthService, AuthenticatedAdmin } from '../src/services/adminAuthService.js';

const COOKIE_SECRET = 'test-cookie-secret-not-real';
const VALID_TOKEN = 'valid-session-token';
const ADMIN: AuthenticatedAdmin = { id: 'admin-1', name: 'Ana Admin', email: 'ana@ctbxpayments.com', role: 'admin' };

function fakeAuthService(): AdminAuthService {
  return { validateSession: async (token: string) => (token === VALID_TOKEN ? ADMIN : null) } as unknown as AdminAuthService;
}

// Repositório em memória — testa as rotas/validação/guards de verdade sem
// precisar de Postgres. O repositório real (Drizzle) é testado ao vivo via
// scripts/seedBanners.ts e uso manual, já que este projeto não usa um banco
// de teste dedicado.
function fakeItemsRepository(seed: CmsItemRecord[] = []): CmsItemsRepository {
  const store = new Map(seed.map((row) => [row.id, row]));
  let counter = seed.length;
  const repo = {
    listByCollection: async (collection: string) => [...store.values()].filter((row) => row.collection === collection),
    findById: async (id: string) => store.get(id),
    findBySlug: async (slug: string) => [...store.values()].find((row) => row.slug === slug),
    create: async (input: CreateCmsItemInput) => {
      counter += 1;
      const row: CmsItemRecord = {
        id: `item-${counter}`, collection: input.collection, slug: input.slug ?? null, name: input.name, value: input.value,
        mediaId: null, status: input.status ?? 'draft', active: input.active ?? true, order: input.order ?? null,
        createdAt: new Date(), updatedAt: new Date(), updatedBy: input.updatedBy ?? null,
      };
      store.set(row.id, row);
      return row;
    },
    updateInCollection: async (id: string, collection: string, patch: UpdateCmsItemInput) => {
      const row = store.get(id);
      if (!row || row.collection !== collection) return undefined;
      const next = { ...row, ...patch, updatedAt: new Date() } as CmsItemRecord;
      store.set(id, next);
      return next;
    },
    deleteInCollection: async (id: string, collection: string) => {
      const row = store.get(id);
      if (!row || row.collection !== collection) return false;
      store.delete(id);
      return true;
    },
  };
  return repo as unknown as CmsItemsRepository;
}

// Sem valor default no 2º parâmetro de propósito: `buildTestApp(x, undefined)`
// precisa realmente resultar em authService undefined (guard fail-closed),
// e um parâmetro com default substituiria um undefined explícito mesmo
// assim — por isso cada chamada abaixo passa authService explicitamente.
async function buildTestApp(items: CmsItemsRepository | undefined, authService: AdminAuthService | undefined) {
  const app = Fastify({ logger: false });
  await app.register(cookie, { secret: COOKIE_SECRET });
  registerErrorHandler(app, false);
  await app.register(async (api) => adminCmsRoutes(api, { authService, items }), { prefix: '/v1/admin/cms' });
  await app.ready();
  return app;
}

function sessionCookieHeader(app: Awaited<ReturnType<typeof buildTestApp>>): string {
  return `${ADMIN_SESSION_COOKIE}=${app.signCookie(VALID_TOKEN)}`;
}

const sampleValue = { title: 'Super CTBX chegou', subtitle: 'Cashback', cta: 'Ir', link: '/x', position: 'Home', startDate: '01/08/2026', endDate: '31/08/2026', priority: 1 };

test('list route fails closed without authService/items configured', async (t) => {
  const app = await buildTestApp(undefined, undefined);
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/admin/cms/items?collection=banner' });
  assert.equal(response.statusCode, 503);
});

test('list route rejects an unauthenticated request', async (t) => {
  const app = await buildTestApp(fakeItemsRepository(), fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/admin/cms/items?collection=banner' });
  assert.equal(response.statusCode, 401);
});

test('list route rejects an unknown collection', async (t) => {
  const app = await buildTestApp(fakeItemsRepository(), fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/admin/cms/items?collection=not-a-real-collection', headers: { cookie: sessionCookieHeader(app) } });
  assert.equal(response.statusCode, 422);
});

test('create then list returns the flattened item, and update persists a change', async (t) => {
  const app = await buildTestApp(fakeItemsRepository(), fakeAuthService());
  t.after(() => app.close());
  const headers = { cookie: sessionCookieHeader(app) };

  const created = await app.inject({ method: 'POST', url: '/v1/admin/cms/items', headers, payload: { collection: 'banner', name: 'Super CTBX 2026', value: sampleValue, status: 'active', order: 1 } });
  assert.equal(created.statusCode, 200);
  const item = created.json().data.item;
  assert.equal(item.name, 'Super CTBX 2026');
  assert.equal(item.title, 'Super CTBX chegou'); // achatado do "value"
  assert.equal(item.status, 'active');

  const listed = await app.inject({ method: 'GET', url: '/v1/admin/cms/items?collection=banner', headers });
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.json().data.items.length, 1);

  const updated = await app.inject({
    method: 'PUT', url: `/v1/admin/cms/items/${item.id}?collection=banner`, headers,
    payload: { value: { ...sampleValue, title: 'Título editado' } },
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().data.item.title, 'Título editado');
});

test('update rejects a mismatched collection (id exists, but in a different collection)', async (t) => {
  const seeded: CmsItemRecord = {
    id: 'item-service-1', collection: 'service', slug: null, name: 'PIX', value: {}, mediaId: null,
    status: 'active', active: true, order: 1, createdAt: new Date(), updatedAt: new Date(), updatedBy: null,
  };
  const app = await buildTestApp(fakeItemsRepository([seeded]), fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({
    method: 'PUT', url: '/v1/admin/cms/items/item-service-1?collection=banner', headers: { cookie: sessionCookieHeader(app) }, payload: { name: 'Hacked' },
  });
  assert.equal(response.statusCode, 404);
});

test('delete removes the item, and a second delete returns 404', async (t) => {
  const app = await buildTestApp(fakeItemsRepository(), fakeAuthService());
  t.after(() => app.close());
  const headers = { cookie: sessionCookieHeader(app) };
  const created = await app.inject({ method: 'POST', url: '/v1/admin/cms/items', headers, payload: { collection: 'banner', name: 'Temp', value: sampleValue } });
  const id = created.json().data.item.id;

  const deleted = await app.inject({ method: 'DELETE', url: `/v1/admin/cms/items/${id}?collection=banner`, headers });
  assert.equal(deleted.statusCode, 204);

  const deletedAgain = await app.inject({ method: 'DELETE', url: `/v1/admin/cms/items/${id}?collection=banner`, headers });
  assert.equal(deletedAgain.statusCode, 404);
});
