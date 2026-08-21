import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { InMemoryCustomerSessionRepository } from '../src/repositories/InMemoryCustomerSessionRepository.js';
import { CustomerAuthService } from '../src/services/customerAuthService.js';

const baseConfig: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};

const PAYLOAD = { name: 'Cliente Exemplo', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

// Etapa 2.5 — hardening da autenticação de cliente. Cobre exatamente os
// cenários de segurança pedidos: tentativas repetidas/rate limit, token
// inválido/expirado/revogado/ausente, customer correto, tentativa de
// cruzar identidade entre clientes, e o login sandbox continuando intacto.

test('repeated login attempts with a wrong password are rate-limited (brute force protection) after the configured threshold', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });

  const attempts = [];
  for (let i = 0; i < 6; i += 1) {
    attempts.push(await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: PAYLOAD.email, password: 'senha-errada' } }));
  }
  const statuses = attempts.map((r) => r.statusCode);
  // As 5 primeiras tentativas respondem normalmente (401, credencial
  // inválida); a 6ª estoura o limite (config: max 5/minuto).
  assert.deepEqual(statuses.slice(0, 5), [401, 401, 401, 401, 401]);
  assert.equal(statuses[5], 429);
  assert.equal(attempts[5]!.json().error.code, 'CUSTOMER_LOGIN_RATE_LIMITED');
});

test('the rate limit never reveals whether the e-mail exists — same behavior for a real and a fake e-mail', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });

  const withRealEmail = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: PAYLOAD.email, password: 'errada' } });
  const withFakeEmail = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: 'nunca-existiu@sandbox.invalid', password: 'errada' } });
  assert.equal(withRealEmail.statusCode, withFakeEmail.statusCode);
  assert.equal(withRealEmail.json().error.code, withFakeEmail.json().error.code);
});

test('an absent token is rejected with CUSTOMER_AUTH_REQUIRED (401)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/customers/session' });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'CUSTOMER_AUTH_REQUIRED');
});

test('an invalid/unknown token is rejected with CUSTOMER_SESSION_INVALID (401)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/customers/session', headers: { authorization: 'Bearer token-inventado-nunca-existiu' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'CUSTOMER_SESSION_INVALID');
});

test('a revoked (logged out) token is rejected with CUSTOMER_SESSION_INVALID (401)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });
  const login = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: PAYLOAD.email, password: PAYLOAD.password } });
  const token = login.json().data.token;
  await app.inject({ method: 'POST', url: '/v1/customers/logout', headers: { authorization: `Bearer ${token}` }, payload: {} });
  const afterLogout = await app.inject({ method: 'GET', url: '/v1/customers/session', headers: { authorization: `Bearer ${token}` } });
  assert.equal(afterLogout.statusCode, 401);
  assert.equal(afterLogout.json().error.code, 'CUSTOMER_SESSION_INVALID');
});

test('an expired token is rejected with CUSTOMER_SESSION_INVALID (401) — using an injectable clock, no real sleep needed', async () => {
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const realNow = Date.now();
  const authAtLogin = new CustomerAuthService(customers, sessions, () => new Date(realNow));
  await authAtLogin.register(PAYLOAD);
  const login = await authAtLogin.login(PAYLOAD.email, PAYLOAD.password);
  assert.ok(login);

  // 25h no futuro — passou da expiração de 24h da sessão.
  const authOneDayLater = new CustomerAuthService(customers, sessions, () => new Date(realNow + 25 * 60 * 60 * 1000));
  const validated = await authOneDayLater.validateSession(login!.token);
  assert.equal(validated, null);
});

test('the correctly authenticated customer is identified — session reflects exactly who logged in', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });
  const login = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: PAYLOAD.email, password: PAYLOAD.password } });
  const { token, customer } = login.json().data;
  const session = await app.inject({ method: 'GET', url: '/v1/customers/session', headers: { authorization: `Bearer ${token}` } });
  assert.equal(session.json().data.customer.id, customer.id);
  assert.equal(session.json().data.customer.email, PAYLOAD.email);
});

test('a customer can never see another customer\'s identity — session always reflects the TOKEN owner, ignoring any client-supplied id', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const payloadA = PAYLOAD;
  const payloadB = { name: 'Outro Cliente', document: '529.982.247-25', email: 'outro@sandbox.invalid', phone: '11988880000', password: 'outra-senha-123' };
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: payloadA });
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: payloadB });
  const loginA = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: payloadA.email, password: payloadA.password } });
  const loginB = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: payloadB.email, password: payloadB.password } });
  const tokenA = loginA.json().data.token;
  const customerIdB = loginB.json().data.customer.id;

  // Tenta "passar" o id de B via query string, usando o token de A — a
  // rota não lê query nem body pra decidir identidade, então isso nunca
  // deveria afetar o resultado.
  const response = await app.inject({ method: 'GET', url: `/v1/customers/session?customerId=${customerIdB}`, headers: { authorization: `Bearer ${tokenA}` } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.customer.email, payloadA.email);
  assert.notEqual(response.json().data.customer.id, customerIdB);
});

// Não existe rota de recuperação de senha, verificação de e-mail nem
// Resend nesta etapa — /v1/auth/login (SandboxAuthProvider) continua
// intocado e sem rate limit adicional (o rate limit desta etapa vive só
// no escopo /v1/customers, global:false).
test('the sandbox demo login remains completely intact — no rate limit, no behavior change', async (t) => {
  const app = await buildApp({ config: baseConfig, logger: false });
  t.after(() => app.close());
  for (let i = 0; i < 6; i += 1) {
    const response = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { username: 'demo@ctbx.local', password: 'DEMO_ONLY', device: { platform: 'ANDROID', installationId: `dev-${i}` } } });
    assert.equal(response.statusCode, 200);
  }
});
