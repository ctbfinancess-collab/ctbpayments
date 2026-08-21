import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';

const baseConfig: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};

const PAYLOAD = { name: 'Cliente Exemplo', document: '111.444.777-35', email: 'antigo@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

async function registerAndLogin(app: Awaited<ReturnType<typeof buildApp>>, payload = PAYLOAD) {
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload });
  const login = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: payload.email, password: payload.password } });
  return login.json().data as { token: string; expiresAt: string; customer: { id: string; email: string } };
}

// Troca de e-mail, em nível de rota HTTP — o CustomerEmailChangeService já
// era testado em detalhe (tests/customerEmailChange.test.ts); aqui o foco
// é o contrato HTTP. providers:{} de propósito: nenhum e-mail real sai
// daqui, o InMemoryEmailProvider é sempre usado.
test('POST /v1/customers/email/change requires a session (401 without a token)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/email/change', payload: { newEmail: 'novo@sandbox.invalid', currentPassword: PAYLOAD.password } });
  assert.equal(response.statusCode, 401);
});

test('POST /v1/customers/email/change with the correct password triggers the confirmation e-mail (200), without changing the e-mail yet', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app);
  const response = await app.inject({ method: 'POST', url: '/v1/customers/email/change', headers: { authorization: `Bearer ${token}` }, payload: { newEmail: 'novo@sandbox.invalid', currentPassword: PAYLOAD.password } });
  assert.equal(response.statusCode, 200);

  const session = await app.inject({ method: 'GET', url: '/v1/customers/session', headers: { authorization: `Bearer ${token}` } });
  assert.equal(session.json().data.customer.email, PAYLOAD.email);
});

test('POST /v1/customers/email/change with a wrong current password returns 401 CUSTOMER_EMAIL_CHANGE_INVALID', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app);
  const response = await app.inject({ method: 'POST', url: '/v1/customers/email/change', headers: { authorization: `Bearer ${token}` }, payload: { newEmail: 'novo@sandbox.invalid', currentPassword: 'senha-errada-999' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'CUSTOMER_EMAIL_CHANGE_INVALID');
});

test('POST /v1/customers/email/change/confirm rejects an unknown/invalid token with 400 CUSTOMER_EMAIL_CHANGE_TOKEN_INVALID', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/email/change/confirm', payload: { token: 'token-forjado-que-nunca-existiu' } });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, 'CUSTOMER_EMAIL_CHANGE_TOKEN_INVALID');
});

test('POST /v1/customers/email/change/confirm never requires a session (the link is opened from the new inbox, possibly on another device)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  // Sem header de Authorization nenhum — e ainda assim o schema/rota não
  // devolve 401 por falta de sessão, só o 400 esperado de token inválido.
  const response = await app.inject({ method: 'POST', url: '/v1/customers/email/change/confirm', payload: { token: 'qualquer-coisa' } });
  assert.notEqual(response.statusCode, 401);
});

test('POST /v1/customers/email/change is rate-limited after the configured threshold, with its own distinct code', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app);

  const attempts = [];
  for (let i = 0; i < 4; i += 1) {
    attempts.push(await app.inject({ method: 'POST', url: '/v1/customers/email/change', headers: { authorization: `Bearer ${token}` }, payload: { newEmail: `novo${i}@sandbox.invalid`, currentPassword: 'senha-errada-propositalmente' } }));
  }
  const statuses = attempts.map((r) => r.statusCode);
  assert.deepEqual(statuses.slice(0, 3), [401, 401, 401]); // senha errada de propósito, só pra não colidir com o cooldown do service
  assert.equal(statuses[3], 429);
  assert.equal(attempts[3]!.json().error.code, 'CUSTOMER_EMAIL_CHANGE_RATE_LIMITED');
});
