import assert from 'node:assert/strict';
import test from 'node:test';
import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { registerErrorHandler } from '../src/middleware/errorHandler.js';
import { ADMIN_SESSION_COOKIE } from '../src/middleware/requireAdminSession.js';
import { adminCmsSectionsRoutes } from '../src/routes/adminCmsSections.js';
import type { CmsSectionRecord, CmsSectionsRepository, UpdateCmsSectionInput } from '../src/repositories/CmsSectionsRepository.js';
import type { AdminAuthService, AuthenticatedAdmin } from '../src/services/adminAuthService.js';

const COOKIE_SECRET = 'test-cookie-secret-not-real';
const VALID_TOKEN = 'valid-session-token';
const ADMIN: AuthenticatedAdmin = { id: 'admin-1', name: 'Ana Admin', email: 'ana@ctbxpayments.com', role: 'admin' };

function fakeAuthService(): AdminAuthService {
  return { validateSession: async (token: string) => (token === VALID_TOKEN ? ADMIN : null) } as unknown as AdminAuthService;
}

// Mesmo espírito de fakeItemsRepository em adminCms.test.ts: repositório em
// memória, sem Postgres — o repositório real (Drizzle) é exercitado ao vivo
// via scripts/seedCmsSections.ts e uso manual.
function fakeSectionsRepository(seed: CmsSectionRecord[] = []): CmsSectionsRepository {
  const store = new Map(seed.map((row) => [row.id, row]));
  const repo = {
    listBySection: async (section: string) => [...store.values()].filter((row) => row.section === section),
    findById: async (id: string) => store.get(id),
    findBySectionKey: async (section: string, key: string) => [...store.values()].find((row) => row.section === section && row.key === key),
    updateInSection: async (id: string, section: string, patch: UpdateCmsSectionInput) => {
      const row = store.get(id);
      if (!row || row.section !== section) return undefined;
      const next = { ...row, ...patch, updatedAt: new Date() } as CmsSectionRecord;
      store.set(id, next);
      return next;
    },
  };
  return repo as unknown as CmsSectionsRepository;
}

// Sem valor default de propósito (mesmo motivo do adminCms.test.ts): cada
// chamada abaixo passa authService explicitamente.
async function buildTestApp(sections: CmsSectionsRepository | undefined, authService: AdminAuthService | undefined) {
  const app = Fastify({ logger: false });
  await app.register(cookie, { secret: COOKIE_SECRET });
  registerErrorHandler(app, false);
  await app.register(async (api) => adminCmsSectionsRoutes(api, { authService, sections }), { prefix: '/v1/admin/cms' });
  await app.ready();
  return app;
}

function sessionCookieHeader(app: Awaited<ReturnType<typeof buildTestApp>>): string {
  return `${ADMIN_SESSION_COOKIE}=${app.signCookie(VALID_TOKEN)}`;
}

const seededRow: CmsSectionRecord = {
  id: 'section-1', section: 'home', key: 'home-1', label: 'Título principal',
  value: { text: 'Bem-vindo à CTBX Payments', description: 'Título de destaque exibido no topo da Home.' },
  mediaId: null, status: 'published', active: true, order: 1, updatedAt: new Date(), updatedBy: null,
};

test('list route fails closed without authService/sections configured', async (t) => {
  const app = await buildTestApp(undefined, undefined);
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/admin/cms/sections?section=home' });
  assert.equal(response.statusCode, 503);
});

test('list route rejects an unauthenticated request', async (t) => {
  const app = await buildTestApp(fakeSectionsRepository([seededRow]), fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/admin/cms/sections?section=home' });
  assert.equal(response.statusCode, 401);
});

test('list route rejects an unknown section', async (t) => {
  const app = await buildTestApp(fakeSectionsRepository(), fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/admin/cms/sections?section=not-a-real-section', headers: { cookie: sessionCookieHeader(app) } });
  assert.equal(response.statusCode, 422);
});

test('list returns the flattened section item, and update persists a change', async (t) => {
  const app = await buildTestApp(fakeSectionsRepository([seededRow]), fakeAuthService());
  t.after(() => app.close());
  const headers = { cookie: sessionCookieHeader(app) };

  const listed = await app.inject({ method: 'GET', url: '/v1/admin/cms/sections?section=home', headers });
  assert.equal(listed.statusCode, 200);
  const items = listed.json().data.items;
  assert.equal(items.length, 1);
  assert.equal(items[0].text, 'Bem-vindo à CTBX Payments'); // achatado do "value"

  const updated = await app.inject({
    method: 'PUT', url: '/v1/admin/cms/sections/section-1?section=home', headers,
    payload: { value: { text: 'Texto editado', description: 'Título de destaque exibido no topo da Home.' } },
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().data.item.text, 'Texto editado');
});

test('update rejects a mismatched section (id exists, but in a different section)', async (t) => {
  const app = await buildTestApp(fakeSectionsRepository([seededRow]), fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({
    method: 'PUT', url: '/v1/admin/cms/sections/section-1?section=login', headers: { cookie: sessionCookieHeader(app) }, payload: { value: { text: 'Hacked' } },
  });
  assert.equal(response.statusCode, 404);
});

test('sections routes do not expose create or delete (structural fields only)', async (t) => {
  const app = await buildTestApp(fakeSectionsRepository([seededRow]), fakeAuthService());
  t.after(() => app.close());
  const headers = { cookie: sessionCookieHeader(app) };
  const postAttempt = await app.inject({ method: 'POST', url: '/v1/admin/cms/sections', headers, payload: {} });
  assert.equal(postAttempt.statusCode, 404);
  const deleteAttempt = await app.inject({ method: 'DELETE', url: '/v1/admin/cms/sections/section-1?section=home', headers });
  assert.equal(deleteAttempt.statusCode, 404);
});
