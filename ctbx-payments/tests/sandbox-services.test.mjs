import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import apiClientModule from '../src/api/client.js';
import mapperModule from '../src/services/mappers/accountMapper.js';
import sandboxAuthModule from '../src/services/sandboxAuthClient.js';
import reducerModule from '../src/session/sessionReducer.js';

const { buildAuthHeaders } = apiClientModule;
const { formatCents, mapSandboxAccount, mapSandboxBalances } = mapperModule;
const { mapSandboxSession, refreshSandboxSession, sandboxLogin, logoutSandboxSession } = sandboxAuthModule;
const { initialSessionState, sessionReducer } = reducerModule;

function readMode(mode) {
  const code = "import('./src/config/appMode.js').then((m) => console.log(JSON.stringify(m.default || m)))";
  return JSON.parse(execFileSync(process.execPath, ['--import', './backend/node_modules/tsx/dist/loader.mjs', '-e', code], {
    cwd: process.cwd(), env: { ...process.env, EXPO_PUBLIC_APP_MODE: mode }, encoding: 'utf8',
  }));
}

test('config distinguishes DEMO, SANDBOX and PRODUCTION', () => {
  assert.equal(readMode('DEMO').isDemoMode, true);
  assert.equal(readMode('SANDBOX').isSandboxMode, true);
  assert.equal(readMode('PRODUCTION').isProductionMode, true);
});

test('sandbox login maps BFF session without changing credentials', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: { user: { id: 'sbx_user' }, account: { id: 'sbx_account' }, sessionId: 'sbx_session', accessToken: 'access', refreshToken: 'refresh', expiresAt: '2099-01-01T00:00:00Z', deviceId: 'sbx_device' } };
  };
  const session = await sandboxLogin({ email: 'sandbox@example.invalid', password: 'secret-not-logged' }, { installationId: 'sbx_install', platform: 'ANDROID' }, client);
  assert.equal(call.path, '/v1/auth/login');
  assert.equal(call.body.username, 'sandbox@example.invalid');
  assert.equal(call.options.skipAuth, true);
  assert.equal(session.deviceId, 'sbx_device');
  assert.equal(session.sandboxMode, true);
});

test('API auth headers contain access token and device, never refresh token', () => {
  const headers = buildAuthHeaders({ Accept: 'application/json' }, 'access-only', 'device-only');
  assert.equal(headers.Authorization, 'Bearer access-only');
  assert.equal(headers['X-Device-Id'], 'device-only');
  assert.equal('refreshToken' in headers, false);
});

test('account mapper keeps integer cents as source and formats only presentation', () => {
  assert.equal(formatCents(125000), '1.250,00');
  assert.throws(() => formatCents(12.5), /integer cents/);
  const account = mapSandboxAccount({ id: 'sbx_account', maskedAgency: 'SBX-1', maskedNumber: 'SBX-2', accountType: 'CHECKING', currency: 'BRL', status: 'ACTIVE' });
  assert.equal(account.type, 'CHECKING');
  const balances = mapSandboxBalances({ available: { amount: 125000 }, components: { blocked: { amount: 5000 }, investments: { amount: 200000 }, cardAccount: { amount: 25000 }, credit: { amount: 75000 } } });
  assert.equal(balances[0].value, '1.250,00');
  assert.equal(balances[1].value, '2.000,00');
});

test('refresh calls are deduplicated and rotate mapped session', async () => {
  let calls = 0;
  let resolveRequest;
  const client = () => {
    calls += 1;
    return new Promise((resolve) => { resolveRequest = resolve; });
  };
  const session = { refreshToken: 'old-refresh' };
  const first = refreshSandboxSession(session, client);
  const second = refreshSandboxSession(session, client);
  assert.equal(calls, 1);
  resolveRequest({ data: { user: {}, account: {}, sessionId: 'new-session', accessToken: 'new-access', refreshToken: 'new-refresh', expiresAt: '2099-01-01T00:00:00Z', deviceId: 'new-device' } });
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.sessionId, 'new-session');
  assert.equal(b.refreshToken, 'new-refresh');
});

test('logout calls BFF route and reducer cleanup removes all tokens', async () => {
  let called = false;
  await logoutSandboxSession(async (path, options) => { called = path === '/v1/auth/logout' && options.method === 'POST'; return null; });
  assert.equal(called, true);
  const authenticated = { ...initialSessionState, status: 'authenticated', accessToken: 'secret', refreshToken: 'secret', sessionId: 'session' };
  const clean = sessionReducer(authenticated, { type: 'LOGOUT', demoMode: false, sandboxMode: true });
  assert.equal(clean.status, 'unauthenticated');
  assert.equal(clean.accessToken, null);
  assert.equal(clean.refreshToken, null);
  assert.equal(clean.sandboxMode, true);
});

test('terminal device mismatch is represented as session cleanup action', () => {
  const clean = sessionReducer({ ...initialSessionState, accessToken: 'secret' }, { type: 'LOGOUT', demoMode: false, sandboxMode: true });
  assert.equal(clean.accessToken, null);
  assert.equal(clean.status, 'unauthenticated');
});
