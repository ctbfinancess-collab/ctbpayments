import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';

const baseConfig: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined,
};

// Sem DATABASE_URL/ADMIN_SESSION_SECRET (caso real hoje, sem banco
// provisionado), as rotas de auth do admin não existem — fail closed, sem
// precisar de um Postgres real para este teste. Um teste de integração
// completo (login real, sessão real) fica para quando DATABASE_URL existir.
test('admin auth routes do not exist without DATABASE_URL/ADMIN_SESSION_SECRET configured', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const login = await app.inject({ method: 'POST', url: '/v1/admin/auth/login', payload: { email: 'a@b.com', password: 'x'.repeat(12) } });
  assert.equal(login.statusCode, 404);
  const session = await app.inject({ method: 'GET', url: '/v1/admin/auth/session' });
  assert.equal(session.statusCode, 404);
});

test('admin auth routes stay absent with only one of the two required variables set', async (t) => {
  const app = await buildApp({ config: { ...baseConfig, databaseUrl: 'postgresql://placeholder/db' }, providers: {}, logger: false });
  t.after(() => app.close());
  const login = await app.inject({ method: 'POST', url: '/v1/admin/auth/login', payload: { email: 'a@b.com', password: 'x'.repeat(12) } });
  assert.equal(login.statusCode, 404);
});
