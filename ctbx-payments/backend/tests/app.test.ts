import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { redactSensitive } from '../src/observability/logger.js';
import type { ProviderRegistry } from '../src/providers/ports.js';
import { SandboxAccountProvider } from '../src/providers/sandbox/SandboxAccountProvider.js';
import { SANDBOX_EMAIL, SANDBOX_PASSWORD, SandboxAuthProvider } from '../src/providers/sandbox/SandboxAuthProvider.js';
import { SandboxCardProvider } from '../src/providers/sandbox/SandboxCardProvider.js';
import { SandboxDeviceBindingProvider } from '../src/providers/sandbox/SandboxDeviceBindingProvider.js';
import { SandboxPixProvider } from '../src/providers/sandbox/SandboxPixProvider.js';
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

test('authenticated statement uses relative dates and keeps money in minor units', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const response = await app.inject({ method: 'GET', url: '/v1/accounts/current/statement', headers: authHeaders(session) });
  assert.equal(response.statusCode, 200);
  const items = response.json().data;
  assert.ok(items.length >= 5);
  assert.ok(items.every((item: Record<string, unknown>) => item.status === 'COMPLETED'));
  assert.ok(items.every((item: Record<string, unknown>) => Number.isInteger(item.amountMinor) && Number.isInteger(item.feeMinor)));
  const dayOffsets = items.map((item: { occurredAt: string }) => Math.round((Date.now() - Date.parse(item.occurredAt)) / 86_400_000));
  assert.ok(dayOffsets.some((days: number) => Math.abs(days) <= 1));
  assert.ok(dayOffsets.some((days: number) => days >= 19 && days <= 21));
});

test('statement requires authentication', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/accounts/current/statement' });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'AUTH_REQUIRED');
});

test('future and blocked statements remain separated', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const future = await app.inject({ method: 'GET', url: '/v1/accounts/current/statement/future', headers: authHeaders(session) });
  const blocked = await app.inject({ method: 'GET', url: '/v1/accounts/current/statement/blocked', headers: authHeaders(session) });
  assert.equal(future.statusCode, 200);
  assert.equal(blocked.statusCode, 200);
  assert.ok(future.json().data.every((item: { status: string }) => item.status === 'SCHEDULED'));
  assert.ok(blocked.json().data.every((item: { status: string }) => item.status === 'UNDER_REVIEW'));
  assert.equal(blocked.json().data.length, 1);
});

test('transaction detail and structural receipt are available for a completed transaction', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const statement = await app.inject({ method: 'GET', url: '/v1/accounts/current/statement', headers: authHeaders(session) });
  const transaction = statement.json().data.find((item: { receiptAvailable: boolean }) => item.receiptAvailable);
  const detail = await app.inject({ method: 'GET', url: `/v1/accounts/current/transactions/${transaction.id}`, headers: authHeaders(session) });
  const receipt = await app.inject({ method: 'GET', url: `/v1/accounts/current/transactions/${transaction.id}/receipt`, headers: { ...authHeaders(session), 'x-request-id': 'statement-receipt-test' } });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().data.id, transaction.id);
  assert.equal(receipt.statusCode, 200);
  assert.equal(receipt.json().data.transactionId, transaction.id);
  assert.equal(receipt.json().data.requestId, 'statement-receipt-test');
  assert.equal(Number.isInteger(receipt.json().data.amountMinor), true);
});

test('unknown transaction returns a sanitized 404', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const response = await app.inject({ method: 'GET', url: '/v1/accounts/current/transactions/sbx_txn_unknown', headers: authHeaders(session) });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, 'TRANSACTION_NOT_FOUND');
  assert.equal('details' in response.json().error, false);
});

test('statement rejects a mismatched device', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const response = await app.inject({ method: 'GET', url: '/v1/accounts/current/statement', headers: { authorization: `Bearer ${session.accessToken}`, 'x-device-id': 'sbx_dev_wrong' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'AUTH_DEVICE_MISMATCH');
});

test('production statement has no sandbox provider', async (t) => {
  const app = await buildApp({ config: { ...testConfig, nodeEnv: 'production' }, logger: false }); t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/accounts/current/statement', headers: { authorization: 'Bearer unavailable', 'x-device-id': 'unavailable' } });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error.code, 'AUTH_PROVIDER_NOT_CONFIGURED');
});

test('authenticated card reads expose masked fictitious data and integer minor units', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const list = await app.inject({ method: 'GET', url: '/v1/cards', headers: authHeaders(session) });
  assert.equal(list.statusCode, 200);
  const card = list.json().data[0];
  assert.match(card.id, /^sbx_card_/);
  assert.match(card.lastFour, /^\d{4}$/);
  assert.equal(Number.isInteger(card.availableMinor), true);
  const serialized = JSON.stringify(card).toLowerCase();
  for (const forbidden of ['cvv', 'password', 'processortoken', 'pan']) assert.equal(serialized.includes(forbidden), false);
  const detail = await app.inject({ method: 'GET', url: `/v1/cards/${card.id}`, headers: authHeaders(session) });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().data.id, card.id);
});

test('card transactions use relative dates and support detail and receipts', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const card = (await app.inject({ method: 'GET', url: '/v1/cards', headers: authHeaders(session) })).json().data[0];
  const response = await app.inject({ method: 'GET', url: `/v1/cards/${card.id}/transactions`, headers: authHeaders(session) });
  assert.equal(response.statusCode, 200);
  const transactions = response.json().data;
  assert.equal(transactions.length, 5);
  assert.ok(transactions.every((item: { amountMinor: number }) => Number.isInteger(item.amountMinor)));
  const offsets = transactions.map((item: { occurredAt: string }) => Math.round((Date.now() - Date.parse(item.occurredAt)) / 86_400_000));
  for (const expected of [0, 1, 4, 12, 25]) assert.ok(offsets.some((value: number) => Math.abs(value - expected) <= 1));
  const transaction = transactions[0];
  const detail = await app.inject({ method: 'GET', url: `/v1/cards/${card.id}/transactions/${transaction.id}`, headers: authHeaders(session) });
  const receipts = await app.inject({ method: 'GET', url: `/v1/cards/${card.id}/receipts`, headers: authHeaders(session) });
  const receipt = await app.inject({ method: 'GET', url: `/v1/cards/${card.id}/transactions/${transaction.id}/receipt`, headers: { ...authHeaders(session), 'x-request-id': 'card-receipt-test' } });
  assert.equal(detail.statusCode, 200);
  assert.equal(receipts.statusCode, 200);
  assert.ok(receipts.json().data.length >= 1);
  assert.equal(receipt.statusCode, 200);
  assert.equal(receipt.json().data.transactionId, transaction.id);
  assert.equal(receipt.json().data.requestId, 'card-receipt-test');
});

test('transport card is authenticated and contains an integer balance', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const response = await app.inject({ method: 'GET', url: '/v1/transport-card', headers: authHeaders(session) });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.type, 'TRANSPORT');
  assert.equal(Number.isInteger(response.json().data.balanceMinor), true);
});

test('card reads reject missing auth, device mismatch and unknown resources', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  assert.equal((await app.inject({ method: 'GET', url: '/v1/cards' })).statusCode, 401);
  const session = await login(app);
  const mismatch = await app.inject({ method: 'GET', url: '/v1/cards', headers: { authorization: `Bearer ${session.accessToken}`, 'x-device-id': 'sbx_dev_wrong' } });
  assert.equal(mismatch.statusCode, 401);
  assert.equal(mismatch.json().error.code, 'AUTH_DEVICE_MISMATCH');
  const missing = await app.inject({ method: 'GET', url: '/v1/cards/sbx_card_missing', headers: authHeaders(session) });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().error.code, 'CARD_NOT_FOUND');
});

test('production forbids the sandbox card provider', () => {
  assert.throws(() => new SandboxCardProvider('production'), /forbidden in production/);
});

test('authenticated PIX key lookup supports every fictitious SANDBOX key type', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const fixtures = [
    ['11144477735', 'CPF'],
    ['11222333000181', 'CNPJ'],
    ['+5511999990000', 'PHONE'],
    ['recebedor@sandbox.invalid', 'EMAIL'],
    ['sbx-random-key-A7k2M9p4', 'RANDOM'],
  ];
  for (const [key, type] of fixtures) {
    const response = await app.inject({ method: 'POST', url: '/v1/pix/keys/lookup', headers: authHeaders(session), payload: { key } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.keyType, type);
    assert.equal(response.json().data.beneficiary.bankName, 'Banco SANDBOX');
  }
  const missing = await app.inject({ method: 'POST', url: '/v1/pix/keys/lookup', headers: authHeaders(session), payload: { key: 'nao-existe@sandbox.invalid' } });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().error.code, 'PIX_KEY_NOT_FOUND');
});

test('PIX QR lookup accepts only recognized SANDBOX payloads and keeps amounts in cents', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const valid = await app.inject({ method: 'POST', url: '/v1/pix/qr/lookup', headers: authHeaders(session), payload: { payload: 'CTBXPIX-SANDBOX|QR|12500' } });
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.json().data.amountMinor, 12500);
  assert.equal(Number.isInteger(valid.json().data.amountMinor), true);
  const invalid = await app.inject({ method: 'POST', url: '/v1/pix/qr/lookup', headers: authHeaders(session), payload: { payload: 'QR-NAO-RECONHECIDO' } });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error.code, 'PIX_QR_INVALID');
});

test('PIX own keys and receive QR are authenticated, masked and structural only', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  assert.equal((await app.inject({ method: 'GET', url: '/v1/pix/keys' })).statusCode, 401);
  const session = await login(app);
  const mismatch = await app.inject({ method: 'GET', url: '/v1/pix/keys', headers: { authorization: `Bearer ${session.accessToken}`, 'x-device-id': 'sbx_dev_wrong' } });
  assert.equal(mismatch.statusCode, 401);
  assert.equal(mismatch.json().error.code, 'AUTH_DEVICE_MISMATCH');
  const keys = await app.inject({ method: 'GET', url: '/v1/pix/keys', headers: authHeaders(session) });
  assert.equal(keys.statusCode, 200);
  assert.deepEqual(keys.json().data.map((item: { type: string }) => item.type), ['EMAIL', 'PHONE', 'RANDOM']);
  assert.ok(keys.json().data.every((item: { keyMasked: string }) => item.keyMasked.length > 0));
  const qr = await app.inject({ method: 'POST', url: '/v1/pix/receive/qr', headers: authHeaders(session), payload: { keyId: keys.json().data[0].id, amountMinor: 12500, description: 'Teste SANDBOX' } });
  assert.equal(qr.statusCode, 200);
  assert.equal(qr.json().data.amountMinor, 12500);
  assert.equal(qr.json().data.status, 'READY');
  assert.match(qr.json().data.copyPaste, /^CTBXPIX-SANDBOX\|RECEIVE\|/);
  const serialized = JSON.stringify({ lookup: keys.json().data, qr: qr.json().data }).toLowerCase();
  for (const forbidden of ['password', 'accesstoken', 'refreshtoken', 'privatekey', 'endtoendid']) assert.equal(serialized.includes(forbidden), false);
});

test('production forbids the sandbox PIX provider', () => {
  assert.throws(() => new SandboxPixProvider('production'), /forbidden in production/);
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
  ] as const;
  for (const request of requests) {
    const response = await app.inject(request);
    assert.equal(response.statusCode, 503, request.url);
    assert.equal(response.json().error.code, 'PROVIDER_NOT_CONFIGURED');
  }
});
