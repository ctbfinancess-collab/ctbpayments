import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { DemoAuthProvider } from '../src/providers/DemoAuthProvider.js';
import { redactSensitive } from '../src/observability/logger.js';

const testConfig: AppConfig = { nodeEnv: 'test', port: 3000, apiVersion: 'v1', logLevel: 'silent' };

test('GET /health responds and includes requestId', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.data.status, 'UP');
  assert.match(body.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(response.headers['x-request-id'], body.requestId);
});

test('safe X-Request-Id is propagated', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/health', headers: { 'x-request-id': 'test-request-1234' } });
  assert.equal(response.headers['x-request-id'], 'test-request-1234');
  assert.equal(response.json().requestId, 'test-request-1234');
});

test('validation errors use the standard envelope', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/pix/keys/lookup', payload: {} });
  assert.equal(response.statusCode, 422);
  const body = response.json();
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.equal(body.error.retryable, false);
  assert.ok(body.requestId);
});

test('financial command requires Idempotency-Key', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false });
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', url: '/v1/pix/transfers',
    payload: { beneficiaryToken: 'beneficiary_demo', amount: { amount: 100, currency: 'BRL' } },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, 'IDEMPOTENCY_KEY_REQUIRED');
});

test('financial route with valid input returns 503 when provider is absent', async (t) => {
  const app = await buildApp({ config: testConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', url: '/v1/pix/transfers', headers: { 'idempotency-key': 'idem-test-00000001' },
    payload: { beneficiaryToken: 'beneficiary_demo', amount: { amount: 100, currency: 'BRL' } },
  });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error.code, 'PROVIDER_NOT_CONFIGURED');
});

test('DemoAuthProvider cannot be constructed in production', () => {
  assert.throws(() => new DemoAuthProvider('production'), /forbidden in production/);
});

test('production app has no implicit demo auth provider', async (t) => {
  const app = await buildApp({
    config: { ...testConfig, nodeEnv: 'production' },
    logger: false,
  });
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', url: '/v1/auth/login',
    payload: { username: 'demo', password: 'DEMO_ONLY', device: { installationId: 'device-test', platform: 'ANDROID' } },
  });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error.code, 'AUTH_PROVIDER_NOT_CONFIGURED');
});

test('sensitive values are redacted before structured auxiliary logging', () => {
  const secret = 'must-not-appear';
  const sanitized = redactSensitive({ password: secret, nested: { otp: secret, label: 'safe' }, authorization: secret });
  const serialized = JSON.stringify(sanitized);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes('safe'), true);
});
