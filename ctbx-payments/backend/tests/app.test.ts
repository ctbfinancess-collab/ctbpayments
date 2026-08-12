import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { redactSensitive } from '../src/observability/logger.js';
import type { ProviderRegistry } from '../src/providers/ports.js';
import { SandboxAccountProvider } from '../src/providers/sandbox/SandboxAccountProvider.js';
import { SANDBOX_EMAIL, SANDBOX_PASSWORD, SandboxAuthProvider } from '../src/providers/sandbox/SandboxAuthProvider.js';
import { SandboxDeviceBindingProvider } from '../src/providers/sandbox/SandboxDeviceBindingProvider.js';
import { SandboxSessionStore } from '../src/providers/sandbox/SandboxSessionStore.js';

const testConfig: AppConfig = { nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent' };
const loginPayload = { username: SANDBOX_EMAIL, password: SANDBOX_PASSWORD, device: { installationId: 'sbx-installation-test', platform: 'ANDROID' } };

function createProviders(options: { now?: () => number; accessTtlMs?: number } = {}): ProviderRegistry {
  const sessions = new SandboxSessionStore({ environment: 'test', ...options });
  const deviceBinding = new SandboxDeviceBindingProvider('test');
  return { sessions, deviceBinding, auth: new SandboxAuthProvider(sessions, deviceBinding, 'test'), account: new SandboxAccountProvider('test') };
}

async function login(app: Awaited<ReturnType<typeof buildApp>>) {
  const response = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: loginPayload });
  assert.equal(response.statusCode, 200);
  return response.json().data as { accessToken: string; refreshToken: string; sessionId: string; deviceId: string; expiresAt: string };
}

const authHeaders = (session: { accessToken: string; deviceId: string }) => ({ authorization: `Bearer ${session.accessToken}`, 'x-device-id': session.deviceId });

test('health and requestId are available', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/health', headers: { 'x-request-id': 'test-request-1234' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['x-request-id'], 'test-request-1234');
  assert.equal(response.json().requestId, 'test-request-1234');
});

test('sandbox login returns opaque expiring session tokens', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  assert.match(session.accessToken, /^sbx_at_[A-Za-z0-9_-]+$/);
  assert.match(session.refreshToken, /^sbx_rt_[A-Za-z0-9_-]+$/);
  assert.match(session.sessionId, /^sbx_ses_/);
  assert.match(session.deviceId, /^sbx_dev_/);
  assert.ok(Date.parse(session.expiresAt) > Date.now());
});

test('incorrect sandbox login is rejected', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { ...loginPayload, password: 'NOT_THE_DEMO_PASSWORD' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'AUTH_INVALID_CREDENTIALS');
});

test('session without token is rejected', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/auth/session' });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'AUTH_REQUIRED');
});

test('session with matching token and device returns sanitized context', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const response = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: authHeaders(session) });
  assert.equal(response.statusCode, 200);
  const data = response.json().data;
  assert.equal(data.session.environment, 'sandbox');
  assert.equal(data.session.deviceId, session.deviceId);
  assert.equal('refreshToken' in data, false);
});

test('expired access token is rejected', async (t) => {
  let now = Date.now();
  const providers = createProviders({ now: () => now, accessTtlMs: 100 });
  const app = await buildApp({ config: testConfig, providers, logger: false }); t.after(() => app.close());
  const session = await login(app); now += 101;
  const response = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: authHeaders(session) });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'AUTH_ACCESS_TOKEN_EXPIRED');
});

test('refresh rotates both tokens and invalidates the previous refresh token', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const first = await login(app);
  const refreshed = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: first.refreshToken } });
  assert.equal(refreshed.statusCode, 200);
  const second = refreshed.json().data;
  assert.notEqual(second.accessToken, first.accessToken);
  assert.notEqual(second.refreshToken, first.refreshToken);
  assert.notEqual(second.sessionId, first.sessionId);
  const reused = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: first.refreshToken } });
  assert.equal(reused.statusCode, 401);
  assert.equal(reused.json().error.code, 'AUTH_REFRESH_TOKEN_REUSED');
});

test('expired access token can refresh once and only the rotated access token remains valid', async (t) => {
  let now = Date.now();
  const providers = createProviders({ now: () => now, accessTtlMs: 100 });
  const app = await buildApp({ config: testConfig, providers, logger: false }); t.after(() => app.close());
  const first = await login(app);
  now += 101;

  const expired = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: authHeaders(first) });
  assert.equal(expired.statusCode, 401);
  assert.equal(expired.json().error.code, 'AUTH_ACCESS_TOKEN_EXPIRED');

  const refreshed = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: first.refreshToken } });
  assert.equal(refreshed.statusCode, 200);
  const second = refreshed.json().data as { accessToken: string; refreshToken: string; sessionId: string; deviceId: string };
  assert.notEqual(second.accessToken, first.accessToken);
  assert.notEqual(second.refreshToken, first.refreshToken);

  const oldAccess = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: authHeaders(first) });
  assert.equal(oldAccess.statusCode, 401);
  assert.equal(oldAccess.json().error.code, 'AUTH_ACCESS_TOKEN_INVALID');
  const active = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: authHeaders(second) });
  assert.equal(active.statusCode, 200);
});

test('logout revokes the active session', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const logout = await app.inject({ method: 'POST', url: '/v1/auth/logout', headers: authHeaders(session), payload: {} });
  assert.equal(logout.statusCode, 204);
  const after = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: authHeaders(session) });
  assert.equal(after.statusCode, 401);
  assert.equal(after.json().error.code, 'AUTH_ACCESS_TOKEN_INVALID');
});

test('device mismatch is rejected', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const response = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { authorization: `Bearer ${session.accessToken}`, 'x-device-id': 'sbx_dev_other-device' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'AUTH_DEVICE_MISMATCH');
});

test('account current returns only sandbox account data', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const response = await app.inject({ method: 'GET', url: '/v1/accounts/current', headers: authHeaders(session) });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.accountType, 'CHECKING');
  assert.equal(response.json().data.currency, 'BRL');
  assert.match(response.json().data.id, /^sbx_/);
});

test('balances use integer cents and BRL', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const response = await app.inject({ method: 'GET', url: '/v1/accounts/current/balances', headers: authHeaders(session) });
  assert.equal(response.statusCode, 200);
  const balances = response.json().data;
  assert.equal(Number.isInteger(balances.available.amount), true);
  assert.equal(balances.available.currency, 'BRL');
  assert.equal(Number.isInteger(balances.components.blocked.amount), true);
  assert.equal(Number.isInteger(balances.components.investments.amount), true);
});

test('production refuses sandbox auth and account providers', () => {
  const sessions = new SandboxSessionStore({ environment: 'test' });
  const devices = new SandboxDeviceBindingProvider('test');
  assert.throws(() => new SandboxAuthProvider(sessions, devices, 'production'), /forbidden in production/);
  assert.throws(() => new SandboxAccountProvider('production'), /forbidden in production/);
  assert.throws(() => new SandboxSessionStore({ environment: 'production' }), /forbidden in production/);
  assert.throws(() => new SandboxDeviceBindingProvider('production'), /forbidden in production/);
});

test('production app does not initialize sandbox providers', async (t) => {
  const app = await buildApp({ config: { ...testConfig, nodeEnv: 'production' }, logger: false }); t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: loginPayload });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error.code, 'AUTH_PROVIDER_NOT_CONFIGURED');
});

test('password and tokens are removed by structured redaction', () => {
  const secret = 'must-not-appear';
  const serialized = JSON.stringify(redactSensitive({ password: secret, accessToken: secret, refreshToken: secret, nested: { otp: secret, label: 'safe' } }));
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes('safe'), true);
});

test('transactional domains remain unavailable', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const requests = [
    { method: 'POST', url: '/v1/pix/transfers', headers: { 'idempotency-key': 'idem-test-pix-0001' }, payload: { beneficiaryToken: 'sbx_beneficiary', amount: { amount: 100, currency: 'BRL' } } },
    { method: 'POST', url: '/v1/transfers', headers: { 'idempotency-key': 'idem-test-transfer-0001' }, payload: { type: 'INTERNAL', beneficiaryId: 'sbx_beneficiary', amount: { amount: 100, currency: 'BRL' } } },
    { method: 'POST', url: '/v1/payments/bills', headers: { 'idempotency-key': 'idem-test-payment-0001' }, payload: { billId: 'sbx_bill', amount: { amount: 100, currency: 'BRL' } } },
    { method: 'GET', url: '/v1/cards' },
  ] as const;
  for (const request of requests) {
    const response = await app.inject(request);
    assert.equal(response.statusCode, 503, request.url);
    assert.equal(response.json().error.code, 'PROVIDER_NOT_CONFIGURED');
  }
});
