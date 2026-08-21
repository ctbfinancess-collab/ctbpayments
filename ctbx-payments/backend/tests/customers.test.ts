import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';

const baseConfig: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};

const REGISTER_PAYLOAD = { name: 'Cliente Exemplo', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

async function registerAndLogin(app: Awaited<ReturnType<typeof buildApp>>, payload = REGISTER_PAYLOAD) {
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload });
  const login = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: payload.email, password: payload.password } });
  return login.json().data as { token: string; expiresAt: string; customer: { id: string; email: string } };
}

// Customer Identity — Etapa 1 (cadastro real PF), em nível de rota HTTP.
// Diferente do admin, esta rota NUNCA é fail-closed: funciona mesmo sem
// DATABASE_URL (cai pro InMemoryCustomerRepository) — ver app.ts.
test('POST /v1/customers/register creates a customer and never leaks the password/hash in the response', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: REGISTER_PAYLOAD });
  assert.equal(response.statusCode, 201);
  const body = response.json();
  assert.equal(body.data.customer.email, 'cliente@sandbox.invalid');
  assert.equal(body.data.customer.status, 'ACTIVE');
  assert.match(body.data.customer.documentMasked, /^\*\*\*\.\d{3}\.\*\*\*-\*\*$/);
  const raw = JSON.stringify(body).toLowerCase();
  assert.equal(raw.includes('senha-forte'), false);
  assert.equal(raw.includes('passwordhash'), false);
  assert.equal(raw.includes('$argon2'), false);
});

test('POST /v1/customers/register rejects a duplicate e-mail with 409', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const payload = { name: 'Cliente', document: '111.444.777-35', email: 'duplicado@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };
  const first = await app.inject({ method: 'POST', url: '/v1/customers/register', payload });
  assert.equal(first.statusCode, 201);
  const second = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: { ...payload, document: '529.982.247-25' } });
  assert.equal(second.statusCode, 409);
  assert.equal(second.json().error.code, 'CUSTOMER_EMAIL_ALREADY_REGISTERED');
});

test('POST /v1/customers/register rejects an invalid CPF with 422', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', url: '/v1/customers/register',
    payload: { name: 'Cliente', document: '111.444.777-36', email: 'a@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' },
  });
  assert.equal(response.statusCode, 422);
  assert.equal(response.json().error.code, 'CUSTOMER_DOCUMENT_INVALID');
});

test('POST /v1/customers/register rejects a request with missing fields (schema validation)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: { name: 'Cliente' } });
  assert.equal(response.statusCode, 422);
});

test('POST /v1/customers/register rejects a password shorter than 8 characters (schema validation)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', url: '/v1/customers/register',
    payload: { name: 'Cliente', document: '111.444.777-35', email: 'a@sandbox.invalid', phone: '11999990000', password: '1234567' },
  });
  assert.equal(response.statusCode, 422);
});

// ---- Etapa 2 — login real ----

test('POST /v1/customers/login with correct credentials returns a token and never leaks the password/hash', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: REGISTER_PAYLOAD });
  const response = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: REGISTER_PAYLOAD.email, password: REGISTER_PAYLOAD.password } });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.ok(body.data.token);
  assert.ok(body.data.expiresAt);
  assert.equal(body.data.customer.email, REGISTER_PAYLOAD.email);
  const raw = JSON.stringify(body).toLowerCase();
  assert.equal(raw.includes('passwordhash'), false);
  assert.equal(raw.includes('$argon2'), false);
});

test('POST /v1/customers/login normalizes the e-mail (different case still logs in)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: REGISTER_PAYLOAD });
  const response = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: 'Cliente@Sandbox.Invalid', password: REGISTER_PAYLOAD.password } });
  assert.equal(response.statusCode, 200);
});

test('POST /v1/customers/login with a wrong password returns 401 CUSTOMER_LOGIN_INVALID (same code as an unknown e-mail)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: REGISTER_PAYLOAD });
  const response = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: REGISTER_PAYLOAD.email, password: 'senha-errada-999' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'CUSTOMER_LOGIN_INVALID');
});

test('POST /v1/customers/login with a non-existent e-mail returns the exact same 401/code as a wrong password (never reveals which one failed)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: 'nao-existe@sandbox.invalid', password: 'qualquer-coisa-123' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'CUSTOMER_LOGIN_INVALID');
});

test('GET /v1/customers/session with a valid token returns the authenticated customer', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token, customer } = await registerAndLogin(app);
  const response = await app.inject({ method: 'GET', url: '/v1/customers/session', headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.customer.id, customer.id);
});

test('GET /v1/customers/session without a token is rejected (401)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/customers/session' });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'CUSTOMER_AUTH_REQUIRED');
});

test('GET /v1/customers/session with an invalid/unknown token is rejected (401)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/customers/session', headers: { authorization: 'Bearer token-que-nunca-existiu' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'CUSTOMER_SESSION_INVALID');
});

test('POST /v1/customers/logout revokes the session — the same token stops working right after', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app);
  const logout = await app.inject({ method: 'POST', url: '/v1/customers/logout', headers: { authorization: `Bearer ${token}` }, payload: {} });
  assert.equal(logout.statusCode, 204);
  const afterLogout = await app.inject({ method: 'GET', url: '/v1/customers/session', headers: { authorization: `Bearer ${token}` } });
  assert.equal(afterLogout.statusCode, 401);
  assert.equal(afterLogout.json().error.code, 'CUSTOMER_SESSION_INVALID');
});

// Troca de senha autenticada, em nível de rota HTTP.
test('POST /v1/customers/password/change requires a session (401 without a token)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/password/change', payload: { currentPassword: REGISTER_PAYLOAD.password, newPassword: 'senha-nova-456' } });
  assert.equal(response.statusCode, 401);
});

test('POST /v1/customers/password/change with the correct current password returns a fresh token and the old password stops working', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app);
  const response = await app.inject({ method: 'POST', url: '/v1/customers/password/change', headers: { authorization: `Bearer ${token}` }, payload: { currentPassword: REGISTER_PAYLOAD.password, newPassword: 'senha-nova-456' } });
  assert.equal(response.statusCode, 200);
  assert.ok(response.json().data.token);

  const oldLogin = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: REGISTER_PAYLOAD.email, password: REGISTER_PAYLOAD.password } });
  assert.equal(oldLogin.statusCode, 401);
  const newLogin = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: REGISTER_PAYLOAD.email, password: 'senha-nova-456' } });
  assert.equal(newLogin.statusCode, 200);
});

test('POST /v1/customers/password/change with a wrong current password returns 401 and never changes the password', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app);
  const response = await app.inject({ method: 'POST', url: '/v1/customers/password/change', headers: { authorization: `Bearer ${token}` }, payload: { currentPassword: 'senha-errada-999', newPassword: 'senha-nova-456' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'CUSTOMER_PASSWORD_CHANGE_INVALID');

  const stillWorks = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: REGISTER_PAYLOAD.email, password: REGISTER_PAYLOAD.password } });
  assert.equal(stillWorks.statusCode, 200);
});

test('a session created before a simulated backend restart is still valid after it (persisted, not just in-memory)', async (t) => {
  // Sem providers:{} de propósito: repositórios reais em memória
  // compartilhados manualmente entre duas instâncias de app simula o
  // mesmo efeito de "restart" já usado no resto deste backend quando não
  // há Postgres disponível — o dado sobrevive porque está no
  // repositório, não na instância do serviço/app.
  const { InMemoryCustomerRepository } = await import('../src/repositories/InMemoryCustomerRepository.js');
  const { InMemoryCustomerSessionRepository } = await import('../src/repositories/InMemoryCustomerSessionRepository.js');
  const { CustomerAuthService } = await import('../src/services/customerAuthService.js');
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const before = new CustomerAuthService(customers, sessions);
  await before.register(REGISTER_PAYLOAD);
  const login = await before.login(REGISTER_PAYLOAD.email, REGISTER_PAYLOAD.password);
  assert.ok(login);

  const afterRestart = new CustomerAuthService(customers, sessions);
  const validated = await afterRestart.validateSession(login!.token);
  assert.ok(validated);
  assert.equal(validated!.email, REGISTER_PAYLOAD.email);
});

// Não existe rota de recuperação de senha, verificação de e-mail nem
// Resend nesta etapa — /v1/auth/login (SandboxAuthProvider) continua
// intocado, os dois logins convivem.
test('the existing /v1/auth/login (sandbox demo login) is completely unaffected by this stage', async (t) => {
  const app = await buildApp({ config: baseConfig, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { username: 'demo@ctbx.local', password: 'DEMO_ONLY', device: { platform: 'ANDROID', installationId: 'dev-1' } } });
  assert.equal(response.statusCode, 200);
});
