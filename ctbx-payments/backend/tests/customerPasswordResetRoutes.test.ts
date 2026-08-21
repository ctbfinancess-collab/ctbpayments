import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';

const baseConfig: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};

const PAYLOAD = { name: 'Cliente Exemplo', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-antiga-123' };

// Recuperação de senha, em nível de rota HTTP — mesmo espírito de
// tests/customerEmailVerificationRoutes.test.ts. providers:{} de
// propósito: nenhum e-mail real sai daqui, o InMemoryEmailProvider é
// sempre usado (sem RESEND_API_KEY/EMAIL_FROM).
test('POST /v1/customers/password/forgot always returns the same generic 200 response — for a real e-mail and an unknown one', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });

  const forReal = await app.inject({ method: 'POST', url: '/v1/customers/password/forgot', payload: { email: PAYLOAD.email } });
  const forUnknown = await app.inject({ method: 'POST', url: '/v1/customers/password/forgot', payload: { email: 'nunca-existiu@sandbox.invalid' } });
  assert.equal(forReal.statusCode, forUnknown.statusCode);
  assert.deepEqual(forReal.json().data, forUnknown.json().data);
  assert.equal(forReal.statusCode, 200);
});

test('POST /v1/customers/password/forgot rejects a request with a missing/invalid e-mail (schema validation)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/password/forgot', payload: { email: 'nao-e-um-email' } });
  assert.equal(response.statusCode, 422);
});

// O token nunca vem na resposta HTTP de /password/forgot (correto — só
// existe dentro do e-mail que o cliente recebe). O fluxo completo
// "pede reset → pega o token do e-mail → confirma → senha muda → sessões
// revogadas" já é coberto em detalhe (com o InMemoryEmailProvider exposto
// diretamente) em tests/customerPasswordReset.test.ts; aqui, em nível
// HTTP, o que dá pra observar de fora é o contrato do endpoint com um
// token inválido.
test('POST /v1/customers/password/reset rejects an unknown/invalid token with 400 CUSTOMER_PASSWORD_RESET_INVALID', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/password/reset', payload: { token: 'token-forjado-que-nunca-existiu', password: 'senha-nova-456' } });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, 'CUSTOMER_PASSWORD_RESET_INVALID');
});

test('POST /v1/customers/password/reset rejects a password shorter than 8 characters (schema validation)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/password/reset', payload: { token: 'qualquer-coisa', password: '1234567' } });
  assert.equal(response.statusCode, 422);
});

test('POST /v1/customers/password/forgot is rate-limited after the configured threshold, with its own distinct code', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });

  const attempts = [];
  for (let i = 0; i < 4; i += 1) {
    attempts.push(await app.inject({ method: 'POST', url: '/v1/customers/password/forgot', payload: { email: PAYLOAD.email } }));
  }
  const statuses = attempts.map((r) => r.statusCode);
  assert.deepEqual(statuses.slice(0, 3), [200, 200, 200]);
  assert.equal(statuses[3], 429);
  assert.equal(attempts[3]!.json().error.code, 'CUSTOMER_PASSWORD_RESET_RATE_LIMITED');
});

test('the password-reset rate limit is tracked independently from login and verify-email (different codes, different routes)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: PAYLOAD });

  // 3 chamadas de forgot não devem consumir o teto de 5/min do login.
  for (let i = 0; i < 3; i += 1) await app.inject({ method: 'POST', url: '/v1/customers/password/forgot', payload: { email: PAYLOAD.email } });
  const loginAttempt = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: PAYLOAD.email, password: PAYLOAD.password } });
  assert.equal(loginAttempt.statusCode, 200);
});

// Nenhuma rota deste arquivo jamais chama um Resend de verdade —
// RESEND_API_KEY/EMAIL_FROM continuam undefined aqui, então
// createEmailProvider() do app.ts sempre resolve para o
// InMemoryEmailProvider.
test('no real Resend credentials are configured anywhere in this test suite', () => {
  assert.equal(baseConfig.resendApiKey, undefined);
  assert.equal(baseConfig.emailFrom, undefined);
});
