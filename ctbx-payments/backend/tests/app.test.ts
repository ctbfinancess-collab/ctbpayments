import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { redactSensitive } from '../src/observability/logger.js';
import type { ProviderRegistry } from '../src/providers/ports.js';
import { SandboxAccountProvider } from '../src/providers/sandbox/SandboxAccountProvider.js';
import { SANDBOX_EMAIL, SANDBOX_PASSWORD, SandboxAuthProvider } from '../src/providers/sandbox/SandboxAuthProvider.js';
import { SandboxCardProvider } from '../src/providers/sandbox/SandboxCardProvider.js';
import { SandboxChallengeProvider } from '../src/providers/sandbox/SandboxChallengeProvider.js';
import { SandboxDeviceBindingProvider } from '../src/providers/sandbox/SandboxDeviceBindingProvider.js';
import { SandboxPixProvider } from '../src/providers/sandbox/SandboxPixProvider.js';
import { SandboxPaymentProvider } from '../src/providers/sandbox/SandboxPaymentProvider.js';
import { SandboxSessionStore } from '../src/providers/sandbox/SandboxSessionStore.js';
import { SandboxTransferProvider } from '../src/providers/sandbox/SandboxTransferProvider.js';

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

test('card activation challenge and state transitions are simulated and controlled', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close()); const session = await login(app); const card = (await app.inject({ method: 'GET', url: '/v1/cards', headers: authHeaders(session) })).json().data[0];
  assert.equal(card.status, 'PENDING_ACTIVATION');
  const challenge = await app.inject({ method: 'POST', url: `/v1/cards/${card.id}/activation/challenge`, headers: authHeaders(session), payload: {} }); assert.equal(challenge.statusCode, 201);
  const wrong = await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.json().data.id}/verify`, headers: authHeaders(session), payload: { proof: '000000' } }); assert.equal(wrong.statusCode, 401);
  await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.json().data.id}/verify`, headers: authHeaders(session), payload: { proof: '123456' } });
  const activated = await app.inject({ method: 'POST', url: `/v1/cards/${card.id}/activate`, headers: { ...authHeaders(session), 'idempotency-key': 'idem-card-activate-01' }, payload: { challengeId: challenge.json().data.id } }); assert.equal(activated.statusCode, 200); assert.equal(activated.json().data.status, 'ACTIVE'); assert.equal(activated.json().data.simulated, true);
  const duplicate = await app.inject({ method: 'POST', url: `/v1/cards/${card.id}/activate`, headers: { ...authHeaders(session), 'idempotency-key': 'idem-card-activate-02' }, payload: { challengeId: challenge.json().data.id } }); assert.equal(duplicate.statusCode, 409); assert.equal(duplicate.json().error.code, 'CARD_ALREADY_ACTIVE');
  const blocked = await app.inject({ method: 'POST', url: `/v1/cards/${card.id}/block`, headers: { ...authHeaders(session), 'idempotency-key': 'idem-card-block-01' }, payload: {} }); assert.equal(blocked.json().data.status, 'BLOCKED');
  const invalid = await app.inject({ method: 'POST', url: `/v1/cards/${card.id}/block`, headers: { ...authHeaders(session), 'idempotency-key': 'idem-card-block-02' }, payload: {} }); assert.equal(invalid.statusCode, 409); assert.equal(invalid.json().error.code, 'CARD_INVALID_STATE');
  const unblocked = await app.inject({ method: 'POST', url: `/v1/cards/${card.id}/unblock`, headers: { ...authHeaders(session), 'idempotency-key': 'idem-card-unblock-01' }, payload: {} }); assert.equal(unblocked.json().data.status, 'ACTIVE');
});

test('card password never appears in response and card recharge is idempotent', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close()); const session = await login(app); const card = (await app.inject({ method: 'GET', url: '/v1/cards', headers: authHeaders(session) })).json().data[0];
  const invalid = await app.inject({ method: 'POST', url: `/v1/cards/${card.id}/password`, headers: { ...authHeaders(session), 'idempotency-key': 'idem-card-password-invalid' }, payload: { password: '12' } }); assert.equal(invalid.statusCode, 422);
  const changed = await app.inject({ method: 'POST', url: `/v1/cards/${card.id}/password`, headers: { ...authHeaders(session), 'idempotency-key': 'idem-card-password-01' }, payload: { password: '9876' } }); assert.equal(changed.statusCode, 200); assert.equal(changed.json().data.passwordChanged, true); assert.equal(JSON.stringify(changed.json()).includes('9876'), false);
  const headers = { ...authHeaders(session), 'idempotency-key': 'idem-card-recharge-01' }; const payload = { amountMinor: 5000, currency: 'BRL' };
  const [first, replay] = await Promise.all([app.inject({ method: 'POST', url: `/v1/cards/${card.id}/recharge`, headers, payload }), app.inject({ method: 'POST', url: `/v1/cards/${card.id}/recharge`, headers, payload })]); assert.equal(first.json().data.rechargeId, replay.json().data.rechargeId); assert.equal(first.json().data.newBalanceMinor, 250080);
  const conflict = await app.inject({ method: 'POST', url: `/v1/cards/${card.id}/recharge`, headers, payload: { amountMinor: 6000, currency: 'BRL' } }); assert.equal(conflict.statusCode, 409);
});

test('card request and TOP recharge are fictitious, idempotent and update memory balance', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close()); const session = await login(app);
  const request = await app.inject({ method: 'POST', url: '/v1/cards/requests', headers: { ...authHeaders(session), 'idempotency-key': 'idem-card-request-01' }, payload: { selectedColor: 'Roxo', termsAccepted: true } }); assert.equal(request.statusCode, 200); assert.equal(request.json().data.status, 'RECEIVED');
  const headers = { ...authHeaders(session), 'idempotency-key': 'idem-top-recharge-01' }; const payload = { amountMinor: 2000, currency: 'BRL' };
  const first = await app.inject({ method: 'POST', url: '/v1/transport-card/recharge', headers, payload }); const replay = await app.inject({ method: 'POST', url: '/v1/transport-card/recharge', headers, payload }); assert.equal(first.json().data.rechargeId, replay.json().data.rechargeId); assert.equal(first.json().data.newBalanceMinor, 6820);
  const top = await app.inject({ method: 'GET', url: '/v1/transport-card', headers: authHeaders(session) }); assert.equal(top.json().data.balanceMinor, 6820);
  const serialized = JSON.stringify({ request: request.json().data, recharge: first.json().data }).toLowerCase(); for (const forbidden of ['pan', 'cvv', 'pin', 'password', 'processortoken']) assert.equal(serialized.includes(forbidden), false);
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

test('PIX validation enforces beneficiary, integer amount, balance and schedule rules', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close()); const session = await login(app);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/pix/transfers/validate', payload: { beneficiaryId: 'sbx_pix_beneficiary_001', amountMinor: 100, currency: 'BRL' } })).statusCode, 401);
  const valid = await app.inject({ method: 'POST', url: '/v1/pix/transfers/validate', headers: authHeaders(session), payload: { beneficiaryId: 'sbx_pix_beneficiary_001', amountMinor: 12500, currency: 'BRL' } });
  assert.equal(valid.statusCode, 200); assert.equal(valid.json().data.status, 'VALIDATED'); assert.equal(valid.json().data.feeMinor, 0);
  const cases = [
    [{ beneficiaryId: 'sbx_pix_beneficiary_001', amountMinor: 0, currency: 'BRL' }, 'PIX_VALIDATION_FAILED', 422],
    [{ beneficiaryId: 'sbx_pix_beneficiary_001', amountMinor: 125001, currency: 'BRL' }, 'INSUFFICIENT_FUNDS', 422],
    [{ beneficiaryId: 'sbx_pix_beneficiary_001', amountMinor: 100, currency: 'BRL', scheduledFor: new Date(Date.now() - 86400000).toISOString() }, 'PIX_VALIDATION_FAILED', 422],
    [{ beneficiaryId: 'sbx_pix_beneficiary_other', amountMinor: 100, currency: 'BRL' }, 'PIX_BENEFICIARY_NOT_FOUND', 404],
  ] as const;
  for (const [payload, code, status] of cases) { const response = await app.inject({ method: 'POST', url: '/v1/pix/transfers/validate', headers: authHeaders(session), payload }); assert.equal(response.statusCode, status); assert.equal(response.json().error.code, code); }
});

test('verified OTP creates a simulated PIX, detail and structural receipt without sensitive identifiers', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close()); const session = await login(app);
  const validation = (await app.inject({ method: 'POST', url: '/v1/pix/transfers/validate', headers: authHeaders(session), payload: { beneficiaryId: 'sbx_pix_beneficiary_001', amountMinor: 12500, currency: 'BRL', description: 'PIX SANDBOX' } })).json().data;
  const challenge = (await app.inject({ method: 'POST', url: '/v1/security/challenges', headers: authHeaders(session), payload: { purpose: 'PIX', operationId: validation.validationId, type: 'OTP' } })).json().data;
  const wrong = await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.id}/verify`, headers: authHeaders(session), payload: { proof: '000000' } }); assert.equal(wrong.statusCode, 401);
  await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.id}/verify`, headers: authHeaders(session), payload: { proof: '123456' } });
  const otherValidation = (await app.inject({ method: 'POST', url: '/v1/pix/transfers/validate', headers: authHeaders(session), payload: { beneficiaryId: 'sbx_pix_beneficiary_001', amountMinor: 100, currency: 'BRL' } })).json().data;
  const wrongIntent = await app.inject({ method: 'POST', url: '/v1/pix/transfers', headers: { ...authHeaders(session), 'idempotency-key': 'idem-pix-wrong-intent-01' }, payload: { validationId: otherValidation.validationId, challengeId: challenge.id } }); assert.equal(wrongIntent.statusCode, 401);
  const payload = { validationId: validation.validationId, challengeId: challenge.id, description: 'PIX SANDBOX' }; const headers = { ...authHeaders(session), 'idempotency-key': 'idem-pix-submit-test-01' };
  const transfer = await app.inject({ method: 'POST', url: '/v1/pix/transfers', headers, payload }); assert.equal(transfer.statusCode, 200); assert.equal(transfer.json().data.status, 'COMPLETED'); assert.equal(transfer.json().data.simulated, true);
  const detail = await app.inject({ method: 'GET', url: `/v1/pix/transfers/${transfer.json().data.pixTransferId}`, headers: authHeaders(session) });
  const receipt = await app.inject({ method: 'GET', url: `/v1/pix/transfers/${transfer.json().data.pixTransferId}/receipt`, headers: { ...authHeaders(session), 'x-request-id': 'pix-receipt-test' } });
  assert.equal(detail.statusCode, 200); assert.equal(receipt.statusCode, 200); assert.equal(receipt.json().data.requestId, 'pix-receipt-test');
  const serialized = JSON.stringify({ transfer: transfer.json().data, receipt: receipt.json().data }).toLowerCase();
  for (const forbidden of ['endtoendid', 'e2eid', 'accountid', 'password', 'accesstoken', 'refreshtoken', '123456']) assert.equal(serialized.includes(forbidden), false);
  const missing = await app.inject({ method: 'GET', url: '/v1/pix/transfers/sbx_pix_transfer_other_account', headers: authHeaders(session) }); assert.equal(missing.statusCode, 404); assert.equal(missing.json().error.code, 'PIX_TRANSFER_NOT_FOUND');
});

test('PIX submit and schedule are idempotent simulated operations in memory', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close()); const session = await login(app);
  const prepare = async (scheduledFor?: string) => { const validation = (await app.inject({ method: 'POST', url: '/v1/pix/transfers/validate', headers: authHeaders(session), payload: { beneficiaryId: 'sbx_pix_beneficiary_001', amountMinor: 5000, currency: 'BRL', ...(scheduledFor ? { scheduledFor } : {}) } })).json().data; const challenge = (await app.inject({ method: 'POST', url: '/v1/security/challenges', headers: authHeaders(session), payload: { purpose: 'PIX', operationId: validation.validationId } })).json().data; await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.id}/verify`, headers: authHeaders(session), payload: { proof: '123456' } }); return { validation, challenge }; };
  const current = await prepare(); const headers = { ...authHeaders(session), 'idempotency-key': 'idem-pix-replay-test-01' }; const payload = { validationId: current.validation.validationId, challengeId: current.challenge.id };
  const first = await app.inject({ method: 'POST', url: '/v1/pix/transfers', headers, payload }); const replay = await app.inject({ method: 'POST', url: '/v1/pix/transfers', headers, payload }); assert.equal(first.json().data.pixTransferId, replay.json().data.pixTransferId);
  const conflict = await app.inject({ method: 'POST', url: '/v1/pix/transfers', headers, payload: { ...payload, description: 'diferente' } }); assert.equal(conflict.statusCode, 409); assert.equal(conflict.json().error.code, 'IDEMPOTENCY_KEY_CONFLICT');
  const scheduledFor = new Date(Date.now() + 86400000).toISOString(); const future = await prepare(scheduledFor); const scheduled = await app.inject({ method: 'POST', url: '/v1/pix/transfers/schedule', headers: { ...authHeaders(session), 'idempotency-key': 'idem-pix-schedule-test-01' }, payload: { validationId: future.validation.validationId, challengeId: future.challenge.id, scheduledFor } }); assert.equal(scheduled.statusCode, 200); assert.equal(scheduled.json().data.status, 'SCHEDULED'); assert.equal(scheduled.json().data.simulated, true);
});

test('transfer banks and favorites require authentication and contain only fictitious masked data', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  assert.equal((await app.inject({ method: 'GET', url: '/v1/transfers/banks' })).statusCode, 401);
  const session = await login(app);
  const banks = await app.inject({ method: 'GET', url: '/v1/transfers/banks', headers: authHeaders(session) });
  const favorites = await app.inject({ method: 'GET', url: '/v1/transfers/favorites', headers: authHeaders(session) });
  assert.equal(banks.statusCode, 200);
  assert.equal(favorites.statusCode, 200);
  assert.deepEqual(banks.json().data.map((item: { name: string }) => item.name), ['Banco Sandbox A', 'Banco Sandbox B']);
  assert.ok(favorites.json().data.every((item: { documentMasked: string; accountMasked: string }) => item.documentMasked.includes('*') && item.accountMasked.includes('*')));
  const serialized = JSON.stringify(favorites.json().data).toLowerCase();
  for (const forbidden of ['password', 'accesstoken', 'refreshtoken', 'providertoken']) assert.equal(serialized.includes(forbidden), false);
});

test('transfer beneficiary lookup supports phone, document and account fixtures', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const cases = [
    { type: 'INTERNAL_PHONE', phone: '+5511988880000' },
    { type: 'INTERNAL_DOCUMENT', document: '11144477735' },
    { type: 'INTERNAL_ACCOUNT', agency: '0001', account: '123456' },
    { type: 'EXTERNAL_ACCOUNT', bankId: 'sbx_bank_b', agency: '0002', account: '654321', accountDigit: '2' },
    { type: 'FAVORITE', favoriteId: 'sbx_favorite_external' },
  ];
  for (const payload of cases) {
    const response = await app.inject({ method: 'POST', url: '/v1/transfers/beneficiaries/lookup', headers: authHeaders(session), payload });
    assert.equal(response.statusCode, 200);
    assert.match(response.json().data.beneficiaryId, /^sbx_beneficiary_/);
  }
  const invalid = await app.inject({ method: 'POST', url: '/v1/transfers/beneficiaries/lookup', headers: authHeaders(session), payload: { type: 'INTERNAL_PHONE', phone: 'abc' } });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error.code, 'TRANSFER_BENEFICIARY_INVALID');
  const missing = await app.inject({ method: 'POST', url: '/v1/transfers/beneficiaries/lookup', headers: authHeaders(session), payload: { type: 'INTERNAL_PHONE', phone: '+5511977771111' } });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().error.code, 'TRANSFER_BENEFICIARY_NOT_FOUND');
});

test('transfer validation is structural, uses integer cents and enforces explicit SANDBOX rules', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const valid = await app.inject({ method: 'POST', url: '/v1/transfers/validate', headers: authHeaders(session), payload: { beneficiaryId: 'sbx_beneficiary_external', amountMinor: 12500, currency: 'BRL', scheduledFor: new Date(Date.now() + 86_400_000).toISOString() } });
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.json().data.status, 'VALIDATED');
  assert.equal(valid.json().data.amountMinor, 12500);
  assert.equal(valid.json().data.feeMinor, 0);
  assert.equal(valid.json().data.totalDebitMinor, 12500);
  assert.equal('operationId' in valid.json().data, false);
  const cases = [
    [{ beneficiaryId: 'sbx_beneficiary_external', amountMinor: 0, currency: 'BRL' }, 'TRANSFER_AMOUNT_INVALID'],
    [{ beneficiaryId: 'sbx_beneficiary_external', amountMinor: 125001, currency: 'BRL' }, 'TRANSFER_INSUFFICIENT_BALANCE'],
    [{ beneficiaryId: 'sbx_beneficiary_external', amountMinor: 100, currency: 'BRL', scheduledFor: new Date(Date.now() - 86_400_000).toISOString() }, 'TRANSFER_SCHEDULE_INVALID'],
    [{ beneficiaryId: 'sbx_beneficiary_other_account', amountMinor: 100, currency: 'BRL' }, 'TRANSFER_BENEFICIARY_NOT_FOUND'],
  ] as const;
  for (const [payload, code] of cases) {
    const response = await app.inject({ method: 'POST', url: '/v1/transfers/validate', headers: authHeaders(session), payload });
    assert.equal(response.statusCode, code === 'TRANSFER_BENEFICIARY_NOT_FOUND' ? 404 : 422);
    assert.equal(response.json().error.code, code);
  }
});

test('transfer reads reject device mismatch and sandbox provider is forbidden in production', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const response = await app.inject({ method: 'GET', url: '/v1/transfers/banks', headers: { authorization: `Bearer ${session.accessToken}`, 'x-device-id': 'sbx_dev_wrong' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'AUTH_DEVICE_MISMATCH');
  assert.throws(() => new SandboxTransferProvider('production'), /forbidden in production/);
});

test('verified OTP submits internal and external SANDBOX transfers with detail and receipt', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  for (const [beneficiaryId, expectedType] of [['sbx_beneficiary_internal', 'INTERNAL'], ['sbx_beneficiary_external', 'EXTERNAL']] as const) {
    const validation = (await app.inject({ method: 'POST', url: '/v1/transfers/validate', headers: authHeaders(session), payload: { beneficiaryId, amountMinor: 12500, currency: 'BRL', purpose: 'Outros', description: 'Transferência SANDBOX' } })).json().data;
    const challenge = (await app.inject({ method: 'POST', url: '/v1/security/challenges', headers: authHeaders(session), payload: { purpose: 'TRANSFER', operationId: validation.validationId, type: 'OTP' } })).json().data;
    const wrong = await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.id}/verify`, headers: authHeaders(session), payload: { proof: '000000' } });
    assert.equal(wrong.statusCode, 401); assert.equal(wrong.json().error.code, 'AUTH_CHALLENGE_INVALID');
    await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.id}/verify`, headers: authHeaders(session), payload: { proof: '123456' } });
    const response = await app.inject({ method: 'POST', url: '/v1/transfers', headers: { ...authHeaders(session), 'idempotency-key': `idem-transfer-${expectedType.toLowerCase()}-01` }, payload: { validationId: validation.validationId, challengeId: challenge.id, purpose: 'Outros', description: 'Transferência SANDBOX' } });
    assert.equal(response.statusCode, 200); assert.equal(response.json().data.transferType, expectedType); assert.equal(response.json().data.status, 'COMPLETED'); assert.equal(response.json().data.simulated, true);
    const detail = await app.inject({ method: 'GET', url: `/v1/transfers/${response.json().data.transferId}`, headers: authHeaders(session) });
    const receipt = await app.inject({ method: 'GET', url: `/v1/transfers/${response.json().data.transferId}/receipt`, headers: { ...authHeaders(session), 'x-request-id': `receipt-${expectedType}` } });
    assert.equal(detail.statusCode, 200); assert.equal(receipt.statusCode, 200); assert.equal(receipt.json().data.requestId, `receipt-${expectedType}`);
    const serialized = JSON.stringify({ transfer: response.json().data, receipt: receipt.json().data }).toLowerCase();
    for (const forbidden of ['accountid', 'password', 'accesstoken', 'refreshtoken', '123456', 'endtoendid', 'banktransactionid']) assert.equal(serialized.includes(forbidden), false);
  }
});

test('transfer submit enforces validation, challenge, idempotency and structural schedule', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close()); const session = await login(app);
  const missing = await app.inject({ method: 'POST', url: '/v1/transfers', headers: { ...authHeaders(session), 'idempotency-key': 'idem-transfer-missing-01' }, payload: { validationId: 'sbx_transfer_validation_missing', challengeId: 'sbx_challenge_missing' } });
  assert.equal(missing.statusCode, 404); assert.equal(missing.json().error.code, 'TRANSFER_VALIDATION_NOT_FOUND');
  const prepare = async (scheduledFor?: string) => {
    const validation = (await app.inject({ method: 'POST', url: '/v1/transfers/validate', headers: authHeaders(session), payload: { beneficiaryId: 'sbx_beneficiary_external', amountMinor: 5000, currency: 'BRL', ...(scheduledFor ? { scheduledFor } : {}) } })).json().data;
    const challenge = (await app.inject({ method: 'POST', url: '/v1/security/challenges', headers: authHeaders(session), payload: { purpose: 'TRANSFER', operationId: validation.validationId } })).json().data;
    await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.id}/verify`, headers: authHeaders(session), payload: { proof: '123456' } });
    return { validation, challenge };
  };
  const current = await prepare();
  const other = await prepare();
  const wrongIntent = await app.inject({ method: 'POST', url: '/v1/transfers', headers: { ...authHeaders(session), 'idempotency-key': 'idem-transfer-wrong-intent-01' }, payload: { validationId: other.validation.validationId, challengeId: current.challenge.id } });
  assert.equal(wrongIntent.statusCode, 401);
  const headers = { ...authHeaders(session), 'idempotency-key': 'idem-transfer-replay-01' }; const payload = { validationId: current.validation.validationId, challengeId: current.challenge.id };
  const [first, replay] = await Promise.all([app.inject({ method: 'POST', url: '/v1/transfers', headers, payload }), app.inject({ method: 'POST', url: '/v1/transfers', headers, payload })]);
  assert.equal(first.json().data.transferId, replay.json().data.transferId);
  const conflict = await app.inject({ method: 'POST', url: '/v1/transfers', headers, payload: { ...payload, description: 'diferente' } });
  assert.equal(conflict.statusCode, 409); assert.equal(conflict.json().error.code, 'IDEMPOTENCY_KEY_CONFLICT');
  const scheduledFor = new Date(Date.now() + 86400000).toISOString(); const future = await prepare(scheduledFor);
  const scheduled = await app.inject({ method: 'POST', url: '/v1/transfers/schedule', headers: { ...authHeaders(session), 'idempotency-key': 'idem-transfer-schedule-01' }, payload: { validationId: future.validation.validationId, challengeId: future.challenge.id, scheduledFor } });
  assert.equal(scheduled.statusCode, 200); assert.equal(scheduled.json().data.status, 'SCHEDULED'); assert.equal(scheduled.json().data.scheduledFor, scheduledFor);
  const unknown = await app.inject({ method: 'GET', url: '/v1/transfers/sbx_transfer_other_account', headers: authHeaders(session) }); assert.equal(unknown.statusCode, 404);
});

const sandboxBillCode = '00190500954014481606906809350314337370000000100';

test('payment lookup handles valid, invalid and missing SANDBOX bills securely', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  assert.equal((await app.inject({ method: 'POST', url: '/v1/payments/bills/lookup', payload: { code: sandboxBillCode } })).statusCode, 401);
  const session = await login(app);
  const valid = await app.inject({ method: 'POST', url: '/v1/payments/bills/lookup', headers: authHeaders(session), payload: { code: sandboxBillCode } });
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.json().data.billId, 'sbx_bill_001');
  assert.equal(valid.json().data.totalAmountMinor, 12500);
  assert.ok(['originalAmountMinor', 'discountMinor', 'interestMinor', 'fineMinor', 'totalAmountMinor'].every((field) => Number.isInteger(valid.json().data[field])));
  const invalid = await app.inject({ method: 'POST', url: '/v1/payments/bills/lookup', headers: authHeaders(session), payload: { code: 'abc' } });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error.code, 'PAYMENT_BARCODE_INVALID');
  const missing = await app.inject({ method: 'POST', url: '/v1/payments/bills/lookup', headers: authHeaders(session), payload: { code: '99999999999999999999999999999999999999999999999' } });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().error.code, 'PAYMENT_BILL_NOT_FOUND');
});

test('payment validation enforces amount, balance, ownership and future scheduling', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const valid = await app.inject({ method: 'POST', url: '/v1/payments/bills/validate', headers: authHeaders(session), payload: { billId: 'sbx_bill_001', amountMinor: 12500, currency: 'BRL' } });
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.json().data.status, 'VALIDATED');
  assert.equal(valid.json().data.totalDebitMinor, 12500);
  const scheduled = await app.inject({ method: 'POST', url: '/v1/payments/bills/validate', headers: authHeaders(session), payload: { billId: 'sbx_bill_001', amountMinor: 12500, currency: 'BRL', scheduledFor: new Date(Date.now() + 86_400_000).toISOString() } });
  assert.equal(scheduled.statusCode, 200);
  const cases = [
    [{ billId: 'sbx_bill_001', amountMinor: 0, currency: 'BRL' }, 'PAYMENT_VALIDATION_FAILED', 422],
    [{ billId: 'sbx_bill_001', amountMinor: 125001, currency: 'BRL' }, 'INSUFFICIENT_FUNDS', 422],
    [{ billId: 'sbx_bill_001', amountMinor: 100, currency: 'BRL', scheduledFor: new Date(Date.now() - 86_400_000).toISOString() }, 'PAYMENT_VALIDATION_FAILED', 422],
    [{ billId: 'sbx_bill_other_account', amountMinor: 100, currency: 'BRL' }, 'PAYMENT_BILL_NOT_FOUND', 404],
  ] as const;
  for (const [payload, code, status] of cases) { const response = await app.inject({ method: 'POST', url: '/v1/payments/bills/validate', headers: authHeaders(session), payload }); assert.equal(response.statusCode, status); assert.equal(response.json().error.code, code); }
});

test('SANDBOX OTP challenge authorizes simulated payment and receipt', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const validation = (await app.inject({ method: 'POST', url: '/v1/payments/bills/validate', headers: authHeaders(session), payload: { billId: 'sbx_bill_001', amountMinor: 12500, currency: 'BRL' } })).json().data;
  const challenge = await app.inject({ method: 'POST', url: '/v1/security/challenges', headers: authHeaders(session), payload: { purpose: 'PAYMENT', operationId: validation.validationId, type: 'OTP' } });
  assert.equal(challenge.statusCode, 201);
  const wrong = await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.json().data.id}/verify`, headers: authHeaders(session), payload: { proof: '000000' } });
  assert.equal(wrong.statusCode, 401);
  assert.equal(wrong.json().error.code, 'AUTH_CHALLENGE_INVALID');
  const verified = await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.json().data.id}/verify`, headers: authHeaders(session), payload: { proof: '123456' } });
  assert.equal(verified.statusCode, 200);
  const payload = { validationId: validation.validationId, challengeId: challenge.json().data.id, description: 'Pagamento SANDBOX' };
  const headers = { ...authHeaders(session), 'idempotency-key': 'idem-payment-test-0001' };
  const payment = await app.inject({ method: 'POST', url: '/v1/payments/bills', headers, payload });
  assert.equal(payment.statusCode, 200);
  assert.equal(payment.json().data.status, 'COMPLETED');
  assert.equal(payment.json().data.environment, 'SANDBOX');
  assert.equal(payment.json().data.simulated, true);
  const detail = await app.inject({ method: 'GET', url: `/v1/payments/${payment.json().data.paymentId}`, headers: authHeaders(session) });
  const receipt = await app.inject({ method: 'GET', url: `/v1/payments/${payment.json().data.paymentId}/receipt`, headers: { ...authHeaders(session), 'x-request-id': 'payment-receipt-test' } });
  assert.equal(detail.statusCode, 200);
  assert.equal(receipt.statusCode, 200);
  assert.equal(receipt.json().data.simulated, true);
  assert.equal(receipt.json().data.requestId, 'payment-receipt-test');
  const serialized = JSON.stringify({ payment: payment.json().data, receipt: receipt.json().data }).toLowerCase();
  for (const forbidden of ['cvv', 'pan', 'password', 'gatewaytoken', '123456']) assert.equal(serialized.includes(forbidden), false);
});

test('payment idempotency replays identical submits and rejects payload conflicts', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close());
  const session = await login(app);
  const validation = (await app.inject({ method: 'POST', url: '/v1/payments/bills/validate', headers: authHeaders(session), payload: { billId: 'sbx_bill_001', amountMinor: 12500, currency: 'BRL' } })).json().data;
  const challenge = (await app.inject({ method: 'POST', url: '/v1/security/challenges', headers: authHeaders(session), payload: { purpose: 'PAYMENT', operationId: validation.validationId } })).json().data;
  await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.id}/verify`, headers: authHeaders(session), payload: { proof: '123456' } });
  const headers = { ...authHeaders(session), 'idempotency-key': 'idem-payment-replay-0001' };
  const payload = { validationId: validation.validationId, challengeId: challenge.id };
  const first = await app.inject({ method: 'POST', url: '/v1/payments/bills', headers, payload });
  const replay = await app.inject({ method: 'POST', url: '/v1/payments/bills', headers, payload });
  assert.equal(replay.json().data.paymentId, first.json().data.paymentId);
  const conflict = await app.inject({ method: 'POST', url: '/v1/payments/bills', headers, payload: { ...payload, description: 'diferente' } });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json().error.code, 'IDEMPOTENCY_KEY_CONFLICT');
});

test('scheduled and installment SANDBOX payments remain simulated in memory', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close()); const session = await login(app);
  const scheduledFor = new Date(Date.now() + 86_400_000).toISOString();
  const validation = (await app.inject({ method: 'POST', url: '/v1/payments/bills/validate', headers: authHeaders(session), payload: { billId: 'sbx_bill_001', amountMinor: 12500, currency: 'BRL', scheduledFor } })).json().data;
  const challenge = (await app.inject({ method: 'POST', url: '/v1/security/challenges', headers: authHeaders(session), payload: { purpose: 'PAYMENT', operationId: validation.validationId } })).json().data;
  await app.inject({ method: 'POST', url: `/v1/security/challenges/${challenge.id}/verify`, headers: authHeaders(session), payload: { proof: '123456' } });
  const scheduled = await app.inject({ method: 'POST', url: '/v1/payments/bills/schedule', headers: { ...authHeaders(session), 'idempotency-key': 'idem-payment-schedule-01' }, payload: { validationId: validation.validationId, challengeId: challenge.id, scheduledFor } });
  assert.equal(scheduled.json().data.status, 'SCHEDULED');
  const simulation = await app.inject({ method: 'POST', url: '/v1/payments/installments/simulate', headers: authHeaders(session), payload: { billId: 'sbx_bill_001', amountMinor: 12500 } });
  assert.equal(simulation.statusCode, 200); assert.equal(simulation.json().data.options.length, 8);
  const option = simulation.json().data.options[1];
  const installmentChallenge = (await app.inject({ method: 'POST', url: '/v1/security/challenges', headers: authHeaders(session), payload: { purpose: 'PAYMENT', operationId: simulation.json().data.simulationId } })).json().data;
  await app.inject({ method: 'POST', url: `/v1/security/challenges/${installmentChallenge.id}/verify`, headers: authHeaders(session), payload: { proof: '123456' } });
  const installment = await app.inject({ method: 'POST', url: '/v1/payments/installments', headers: { ...authHeaders(session), 'idempotency-key': 'idem-payment-install-001' }, payload: { simulationId: simulation.json().data.simulationId, optionId: option.optionId, challengeId: installmentChallenge.id } });
  assert.equal(installment.statusCode, 200); assert.equal(installment.json().data.installments, 2); assert.equal(installment.json().data.simulated, true);
});

test('payment reads reject device mismatch and sandbox providers are forbidden in production', async (t) => {
  const app = await buildApp({ config: testConfig, logger: false }); t.after(() => app.close()); const session = await login(app);
  const mismatch = await app.inject({ method: 'POST', url: '/v1/payments/bills/lookup', headers: { authorization: `Bearer ${session.accessToken}`, 'x-device-id': 'sbx_dev_wrong' }, payload: { code: sandboxBillCode } });
  assert.equal(mismatch.statusCode, 401); assert.equal(mismatch.json().error.code, 'AUTH_DEVICE_MISMATCH');
  const challenge = new SandboxChallengeProvider('test');
  assert.throws(() => new SandboxPaymentProvider('production', challenge), /forbidden in production/);
  assert.throws(() => new SandboxChallengeProvider('production'), /forbidden in production/);
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
