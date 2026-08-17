import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { SANDBOX_EMAIL, SANDBOX_PASSWORD } from '../src/providers/sandbox/SandboxAuthProvider.js';

const baseConfig: AppConfig = { nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [] };
const loginPayload = { username: SANDBOX_EMAIL, password: SANDBOX_PASSWORD, device: { installationId: 'sbx-installation-cors-test', platform: 'ANDROID' } };

test('staging loads the sandbox providers just like development', async (t) => {
  const app = await buildApp({ config: { ...baseConfig, nodeEnv: 'staging' }, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: loginPayload });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.state, 'AUTHENTICATED');
});

test('staging honors CORS_ORIGINS and allows a listed origin', async (t) => {
  const app = await buildApp({ config: { ...baseConfig, nodeEnv: 'staging', corsOrigins: ['http://localhost:19006'] }, logger: false });
  t.after(() => app.close());
  const preflight = await app.inject({
    method: 'OPTIONS',
    url: '/v1/auth/login',
    headers: { origin: 'http://localhost:19006', 'access-control-request-method': 'POST' },
  });
  assert.equal(preflight.statusCode, 204);
  assert.equal(preflight.headers['access-control-allow-origin'], 'http://localhost:19006');

  const actual = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'http://localhost:19006' } });
  assert.equal(actual.headers['access-control-allow-origin'], 'http://localhost:19006');
});

test('staging blocks an origin that is not in CORS_ORIGINS', async (t) => {
  const app = await buildApp({ config: { ...baseConfig, nodeEnv: 'staging', corsOrigins: ['http://localhost:19006'] }, logger: false });
  t.after(() => app.close());
  const preflight = await app.inject({
    method: 'OPTIONS',
    url: '/v1/auth/login',
    headers: { origin: 'http://evil.example.com', 'access-control-request-method': 'POST' },
  });
  assert.equal(preflight.statusCode, 204);
  assert.equal('access-control-allow-origin' in preflight.headers, false);
});

test('staging never falls back to the permissive development localhost regex', async (t) => {
  // CORS_ORIGINS vazio em staging não deve reabrir a regex de localhost — só
  // porque a porta é "localhost" não significa que deve ser aceita sem estar
  // explicitamente na lista.
  const app = await buildApp({ config: { ...baseConfig, nodeEnv: 'staging', corsOrigins: [] }, logger: false });
  t.after(() => app.close());
  const preflight = await app.inject({
    method: 'OPTIONS',
    url: '/v1/auth/login',
    headers: { origin: 'http://localhost:19006', 'access-control-request-method': 'POST' },
  });
  assert.equal('access-control-allow-origin' in preflight.headers, false);
});

test('production without sandbox providers still rejects unlisted origins', async (t) => {
  const app = await buildApp({ config: { ...baseConfig, nodeEnv: 'production', corsOrigins: [] }, logger: false });
  t.after(() => app.close());
  const preflight = await app.inject({
    method: 'OPTIONS',
    url: '/v1/auth/login',
    headers: { origin: 'http://localhost:19006', 'access-control-request-method': 'POST' },
  });
  assert.equal(preflight.statusCode, 204);
  assert.equal('access-control-allow-origin' in preflight.headers, false);
});

test('production honors an explicit CORS_ORIGINS allow-list', async (t) => {
  const app = await buildApp({ config: { ...baseConfig, nodeEnv: 'production', corsOrigins: ['https://app.ctbxpayments.com'] }, logger: false });
  t.after(() => app.close());
  const allowed = await app.inject({
    method: 'OPTIONS',
    url: '/v1/auth/login',
    headers: { origin: 'https://app.ctbxpayments.com', 'access-control-request-method': 'POST' },
  });
  assert.equal(allowed.headers['access-control-allow-origin'], 'https://app.ctbxpayments.com');

  const blocked = await app.inject({
    method: 'OPTIONS',
    url: '/v1/auth/login',
    headers: { origin: 'http://localhost:19006', 'access-control-request-method': 'POST' },
  });
  assert.equal('access-control-allow-origin' in blocked.headers, false);
});
