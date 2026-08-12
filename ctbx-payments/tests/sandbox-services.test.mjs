import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import apiClientModule from '../src/api/client.js';
import ApiErrorModule from '../src/api/ApiError.js';
import mapperModule from '../src/services/mappers/accountMapper.js';
import sandboxAuthModule from '../src/services/sandboxAuthClient.js';
import reducerModule from '../src/session/sessionReducer.js';

const { apiClient, buildAuthHeaders, configureApiClient } = apiClientModule;
const ApiError = ApiErrorModule.default || ApiErrorModule;
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

test('BFF balance envelope maps available cents to the Home balance presentation', () => {
  const response = {
    data: {
      available: { amount: 125000, currency: 'BRL' },
      ledger: { amount: 130000, currency: 'BRL' },
      components: {
        blocked: { amount: 5000, currency: 'BRL' },
        investments: { amount: 200000, currency: 'BRL' },
        cardAccount: { amount: 25000, currency: 'BRL' },
        credit: { amount: 75000, currency: 'BRL' },
      },
    },
    meta: {},
    requestId: 'test-request-id',
  };

  const homeBalances = mapSandboxBalances(response.data);
  const availableBalance = homeBalances[0];

  assert.equal(availableBalance.value, '1.250,00');
  assert.equal(`${availableBalance.tag} ${availableBalance.value}`, 'R$ 1.250,00');
  assert.equal(availableBalance.blockedValue, '50,00');
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

test('concurrent 401 responses perform one refresh and retry each account GET once', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    configureApiClient();
  });

  let session = {
    ...initialSessionState,
    status: 'authenticated',
    accessToken: 'expired-access',
    refreshToken: 'old-refresh',
    deviceId: 'sandbox-device',
  };
  let refreshCalls = 0;
  const getCalls = new Map();

  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    getCalls.set(path, (getCalls.get(path) || 0) + 1);
    const token = options.headers.Authorization;
    if (token === 'Bearer expired-access') {
      return new Response(JSON.stringify({ error: { code: 'AUTH_ACCESS_TOKEN_EXPIRED', message: 'expired' } }), { status: 401 });
    }
    assert.equal(token, 'Bearer rotated-access');
    return new Response(JSON.stringify({ data: { path } }), { status: 200 });
  };

  configureApiClient({
    getBaseURL: () => 'http://sandbox.test',
    getAccessToken: () => session.accessToken,
    getDeviceId: () => session.deviceId,
    onUnauthorized: async () => {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      session = sessionReducer(session, {
        type: 'AUTHENTICATED',
        payload: { ...session, accessToken: 'rotated-access', refreshToken: 'rotated-refresh' },
      });
      return session;
    },
  });

  const [account, balances] = await Promise.all([
    apiClient('/v1/accounts/current', { method: 'GET', retryOnUnauthorized: true }),
    apiClient('/v1/accounts/current/balances', { method: 'GET', retryOnUnauthorized: true }),
  ]);

  assert.equal(refreshCalls, 1);
  assert.equal(getCalls.get('/v1/accounts/current'), 2);
  assert.equal(getCalls.get('/v1/accounts/current/balances'), 2);
  assert.equal(account.data.path, '/v1/accounts/current');
  assert.equal(balances.data.path, '/v1/accounts/current/balances');
  assert.equal(session.status, 'authenticated');
  assert.equal(session.accessToken, 'rotated-access');
  assert.equal(session.refreshToken, 'rotated-refresh');
});

test('reused refresh token clears the authenticated app session without a refresh loop', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    configureApiClient();
  });

  let session = { ...initialSessionState, status: 'authenticated', accessToken: 'expired-access', refreshToken: 'reused-refresh', deviceId: 'sandbox-device' };
  let refreshCalls = 0;
  let requestCalls = 0;
  globalThis.fetch = async () => {
    requestCalls += 1;
    return new Response(JSON.stringify({ error: { code: 'AUTH_ACCESS_TOKEN_EXPIRED', message: 'expired' } }), { status: 401 });
  };
  configureApiClient({
    getBaseURL: () => 'http://sandbox.test',
    getAccessToken: () => session.accessToken,
    getDeviceId: () => session.deviceId,
    onUnauthorized: async () => {
      refreshCalls += 1;
      session = sessionReducer(session, { type: 'LOGOUT', demoMode: false, sandboxMode: true });
      throw new ApiError('refresh reused', { code: 'AUTH_REFRESH_TOKEN_REUSED', status: 401 });
    },
  });

  await assert.rejects(
    apiClient('/v1/auth/session', { method: 'GET', retryOnUnauthorized: true }),
    (error) => error.code === 'AUTH_REFRESH_TOKEN_REUSED',
  );
  assert.equal(refreshCalls, 1);
  assert.equal(requestCalls, 1);
  assert.equal(session.status, 'unauthenticated');
  assert.equal(session.accessToken, null);
  assert.equal(session.refreshToken, null);
});

test('device mismatch invokes terminal cleanup and does not attempt refresh', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    configureApiClient();
  });

  let session = { ...initialSessionState, status: 'authenticated', accessToken: 'access', refreshToken: 'refresh', deviceId: 'wrong-device' };
  let refreshCalls = 0;
  let cleanupCalls = 0;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'AUTH_DEVICE_MISMATCH', message: 'device mismatch' } }), { status: 401 });
  configureApiClient({
    getBaseURL: () => 'http://sandbox.test',
    getAccessToken: () => session.accessToken,
    getDeviceId: () => session.deviceId,
    onUnauthorized: async () => { refreshCalls += 1; },
    onSessionInvalid: async () => {
      cleanupCalls += 1;
      session = sessionReducer(session, { type: 'LOGOUT', demoMode: false, sandboxMode: true });
    },
  });

  await assert.rejects(
    apiClient('/v1/auth/session', { method: 'GET', retryOnUnauthorized: true }),
    (error) => error.code === 'AUTH_DEVICE_MISMATCH',
  );
  assert.equal(cleanupCalls, 1);
  assert.equal(refreshCalls, 0);
  assert.equal(session.status, 'unauthenticated');
  assert.equal(session.accessToken, null);
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
