import assert from 'node:assert/strict';
import test from 'node:test';
import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { registerErrorHandler } from '../src/middleware/errorHandler.js';
import { ADMIN_SESSION_COOKIE } from '../src/middleware/requireAdminSession.js';
import { adminMediaRoutes } from '../src/routes/adminMedia.js';
import type { CreateMediaInput, MediaRecord, MediaRepository } from '../src/repositories/MediaRepository.js';
import type { AdminAuthService, AuthenticatedAdmin } from '../src/services/adminAuthService.js';

const CLOUDINARY_CONFIG = { cloudName: 'demo-cloud', apiKey: '123456789012345', apiSecret: 'test-secret-value-not-real' };
const COOKIE_SECRET = 'test-cookie-secret-not-real';
const VALID_TOKEN = 'valid-session-token';
const ADMIN: AuthenticatedAdmin = { id: 'admin-1', name: 'Ana Admin', email: 'ana@ctbxpayments.com', role: 'admin' };

// Fake em memória do AdminAuthService — testa o middleware requireAdminSession
// de verdade (cookie assinado real, via @fastify/cookie) sem precisar de
// Postgres. Um teste de integração com o serviço real fica coberto por
// tests/adminAuthService.test.ts (lógica) e tests/adminAuth.test.ts (rotas).
function fakeAuthService(): AdminAuthService {
  return {
    validateSession: async (token: string) => (token === VALID_TOKEN ? ADMIN : null),
  } as unknown as AdminAuthService;
}

// Repositório de mídia em memória — testa as rotas de verdade (validação,
// checagem de uso antes de excluir) sem precisar de Postgres.
function fakeMediaRepository(seed: MediaRecord[] = [], referencedIds: Set<string> = new Set()): MediaRepository {
  const store = new Map(seed.map((row) => [row.id, row]));
  let counter = seed.length;
  const repo = {
    list: async () => [...store.values()],
    findById: async (id: string) => store.get(id),
    findByPublicId: async (publicId: string) => [...store.values()].find((row) => row.publicId === publicId),
    create: async (input: CreateMediaInput) => {
      counter += 1;
      const row: MediaRecord = {
        id: `media-${counter}`, publicId: input.publicId, secureUrl: input.secureUrl, resourceType: input.resourceType,
        format: input.format ?? null, width: input.width ?? null, height: input.height ?? null, bytes: input.bytes ?? null,
        originalFilename: input.originalFilename ?? null, altText: null, createdAt: new Date(), updatedAt: new Date(),
      };
      store.set(row.id, row);
      return row;
    },
    delete: async (id: string) => { store.delete(id); },
    isReferenced: async (id: string) => referencedIds.has(id),
  };
  return repo as unknown as MediaRepository;
}

async function buildTestApp(authService: AdminAuthService | undefined, media: MediaRepository | undefined = fakeMediaRepository()) {
  const app = Fastify({ logger: false });
  await app.register(cookie, { secret: COOKIE_SECRET });
  registerErrorHandler(app, false);
  await app.register(async (api) => adminMediaRoutes(api, { cloudinary: CLOUDINARY_CONFIG, authService, media }), { prefix: '/v1/admin' });
  await app.ready();
  return app;
}

function sessionCookieHeader(app: Awaited<ReturnType<typeof buildTestApp>>, token = VALID_TOKEN): string {
  return `${ADMIN_SESSION_COOKIE}=${app.signCookie(token)}`;
}

test('sign route fails closed without an authService configured (no DATABASE_URL/ADMIN_SESSION_SECRET)', async (t) => {
  const app = await buildTestApp(undefined);
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/admin/media/sign', payload: {} });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error.code, 'PROVIDER_NOT_CONFIGURED');
});

test('sign route rejects a request with no session cookie at all', async (t) => {
  const app = await buildTestApp(fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/admin/media/sign', payload: {} });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'ADMIN_SESSION_REQUIRED');
});

test('sign route rejects an invalid or expired session', async (t) => {
  const app = await buildTestApp(fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', url: '/v1/admin/media/sign', payload: {}, headers: { cookie: sessionCookieHeader(app, 'expired-or-wrong-token') },
  });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'ADMIN_SESSION_INVALID');
});

test('sign route succeeds for an authenticated admin and never exposes the api secret', async (t) => {
  const app = await buildTestApp(fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', url: '/v1/admin/media/sign', payload: {}, headers: { cookie: sessionCookieHeader(app) },
  });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.data.cloudName, CLOUDINARY_CONFIG.cloudName);
  assert.equal(body.data.apiKey, CLOUDINARY_CONFIG.apiKey);
  assert.equal(body.data.folder, 'ctbx-payments/cms');
  assert.match(body.data.signature, /^[a-f0-9]{40}$/);
  assert.doesNotMatch(JSON.stringify(body), /test-secret-value-not-real/);
});

test('sign route rejects a folder outside the ctbx-payments namespace even when authenticated', async (t) => {
  const app = await buildTestApp(fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', url: '/v1/admin/media/sign', payload: { folder: 'other-app/uploads' }, headers: { cookie: sessionCookieHeader(app) },
  });
  assert.equal(response.statusCode, 422);
});

const samplePersist = {
  publicId: 'ctbx-payments/cms/banner-1', secureUrl: 'https://res.cloudinary.com/demo-cloud/image/upload/v1/ctbx-payments/cms/banner-1.png',
  resourceType: 'image', format: 'png', width: 1200, height: 480, bytes: 12345, originalFilename: 'banner.png',
};

test('POST /media persists the upload metadata and rejects a non-Cloudinary secureUrl', async (t) => {
  const app = await buildTestApp(fakeAuthService());
  t.after(() => app.close());
  const headers = { cookie: sessionCookieHeader(app) };

  const persisted = await app.inject({ method: 'POST', url: '/v1/admin/media', headers, payload: samplePersist });
  assert.equal(persisted.statusCode, 200);
  assert.equal(persisted.json().data.media.publicId, samplePersist.publicId);

  const rejected = await app.inject({
    method: 'POST', url: '/v1/admin/media', headers, payload: { ...samplePersist, secureUrl: 'https://evil.example.com/x.png' },
  });
  assert.equal(rejected.statusCode, 422);
});

test('GET /media lists persisted media (the real library, surviving a refresh)', async (t) => {
  const seeded: MediaRecord = {
    id: 'media-1', publicId: 'ctbx-payments/cms/banner-1', secureUrl: samplePersist.secureUrl, resourceType: 'image',
    format: 'png', width: 1200, height: 480, bytes: 12345, originalFilename: 'banner.png', altText: null,
    createdAt: new Date(), updatedAt: new Date(),
  };
  const app = await buildTestApp(fakeAuthService(), fakeMediaRepository([seeded]));
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/admin/media', headers: { cookie: sessionCookieHeader(app) } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.media.length, 1);
  assert.equal(response.json().data.media[0].publicId, 'ctbx-payments/cms/banner-1');
});

test('destroy route rejects an unauthenticated request', async (t) => {
  const app = await buildTestApp(fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/admin/media/destroy', payload: { publicId: 'ctbx-payments/cms/banner-1' } });
  assert.equal(response.statusCode, 401);
});

test('destroy route rejects a public_id outside the ctbx-payments namespace even when authenticated', async (t) => {
  const app = await buildTestApp(fakeAuthService());
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', url: '/v1/admin/media/destroy', payload: { publicId: 'some-other-folder/asset' }, headers: { cookie: sessionCookieHeader(app) },
  });
  assert.equal(response.statusCode, 422);
});

test('destroy route signs the request and returns the Cloudinary result for an authenticated admin', async (t) => {
  const app = await buildTestApp(fakeAuthService());
  t.after(() => app.close());
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ result: 'ok' }), { status: 200 }));
  const response = await app.inject({
    method: 'POST', url: '/v1/admin/media/destroy', payload: { publicId: 'ctbx-payments/cms/banner-1' }, headers: { cookie: sessionCookieHeader(app) },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.result, 'ok');
  const call = fetchMock.mock.calls[0];
  assert.ok(call);
  assert.equal(call.arguments[0], `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`);
});

test('destroy route refuses to delete a media still referenced by some content, and never calls Cloudinary', async (t) => {
  const seeded: MediaRecord = {
    id: 'media-in-use', publicId: 'ctbx-payments/cms/banner-1', secureUrl: samplePersist.secureUrl, resourceType: 'image',
    format: 'png', width: 1200, height: 480, bytes: 12345, originalFilename: 'banner.png', altText: null,
    createdAt: new Date(), updatedAt: new Date(),
  };
  const app = await buildTestApp(fakeAuthService(), fakeMediaRepository([seeded], new Set(['media-in-use'])));
  t.after(() => app.close());
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ result: 'ok' }), { status: 200 }));
  const response = await app.inject({
    method: 'POST', url: '/v1/admin/media/destroy', payload: { publicId: 'ctbx-payments/cms/banner-1' }, headers: { cookie: sessionCookieHeader(app) },
  });
  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error.code, 'MEDIA_IN_USE');
  assert.equal(fetchMock.mock.calls.length, 0);
});
