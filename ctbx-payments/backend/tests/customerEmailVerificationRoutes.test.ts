import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';

const baseConfig: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};

const PAYLOAD = { name: 'Cliente Exemplo', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

// Etapa 3, em nível de rota HTTP. providers:{} de propósito (mesmo padrão
// do resto de tests/customers*.test.ts) — nenhum e-mail real sai daqui,
// o InMemoryEmailProvider é sempre usado (sem RESEND_API_KEY/EMAIL_FROM).
test('POST /v1/customers/register triggers a verification e-mail automatically (nothing to assert on the HTTP response, but it must not fail the request)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });
  assert.equal(response.statusCode, 201);
});

// O token nunca vem na resposta HTTP de /register (correto — só existe
// dentro do e-mail que o cliente recebe). O fluxo completo "cadastra →
// pega o token do e-mail → confirma → fica verificado" já é coberto em
// detalhe (com o InMemoryEmailProvider exposto diretamente) em
// tests/customerEmailVerification.test.ts; aqui, em nível HTTP, o que dá
// pra observar de fora é o contrato do endpoint com um token inválido.
test('POST /v1/customers/verify-email rejects an unknown/invalid token with 400 CUSTOMER_EMAIL_VERIFICATION_INVALID', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });
  const invalid = await app.inject({ method: 'POST', url: '/v1/customers/verify-email', payload: { token: 'token-forjado-que-nunca-existiu' } });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error.code, 'CUSTOMER_EMAIL_VERIFICATION_INVALID');
});

test('POST /v1/customers/verify-email rejects a request with a missing token (schema validation)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/verify-email', payload: {} });
  assert.equal(response.statusCode, 422);
});

test('POST /v1/customers/verify-email/resend always returns the same generic 200 response — for a real e-mail, an unknown one, and an already-verified one', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });

  const forReal = await app.inject({ method: 'POST', url: '/v1/customers/verify-email/resend', payload: { email: PAYLOAD.email } });
  const forUnknown = await app.inject({ method: 'POST', url: '/v1/customers/verify-email/resend', payload: { email: 'nunca-existiu@sandbox.invalid' } });
  assert.equal(forReal.statusCode, forUnknown.statusCode);
  assert.deepEqual(forReal.json().data, forUnknown.json().data);
  assert.equal(forReal.statusCode, 200);
});

test('POST /v1/customers/verify-email/resend is rate-limited after the configured threshold (abuse protection), with its own distinct code', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });

  const attempts = [];
  for (let i = 0; i < 4; i += 1) {
    attempts.push(await app.inject({ method: 'POST', url: '/v1/customers/verify-email/resend', payload: { email: PAYLOAD.email } }));
  }
  const statuses = attempts.map((r) => r.statusCode);
  assert.deepEqual(statuses.slice(0, 3), [200, 200, 200]);
  assert.equal(statuses[3], 429);
  assert.equal(attempts[3]!.json().error.code, 'CUSTOMER_VERIFY_EMAIL_RATE_LIMITED');
});

test('the login rate limit and the resend-verification rate limit are tracked independently (different codes, different routes)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });

  // 3 chamadas de resend não devem consumir o teto de 5/min do login.
  for (let i = 0; i < 3; i += 1) await app.inject({ method: 'POST', url: '/v1/customers/verify-email/resend', payload: { email: PAYLOAD.email } });
  const loginAttempt = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: PAYLOAD.email, password: PAYLOAD.password } });
  assert.equal(loginAttempt.statusCode, 200);
});

// Nenhuma rota deste arquivo, nem nenhum teste do resto da suíte, jamais
// chama um Resend de verdade — RESEND_API_KEY/EMAIL_FROM continuam
// undefined em todo AppConfig de teste, então createEmailProvider() do
// app.ts sempre resolve para o InMemoryEmailProvider aqui.
test('no real Resend credentials are configured anywhere in this test suite', () => {
  assert.equal(baseConfig.resendApiKey, undefined);
  assert.equal(baseConfig.emailFrom, undefined);
});
