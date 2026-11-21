import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import type { InMemorySecurityAuditRepository } from '../src/repositories/SecurityAuditRepository.js';
import { verifyEmail } from './helpers/verifyEmail.js';

// Fase 2 — registro de auditoria de autenticação e alterações sensíveis.
const config: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};
const P = { name: 'Cliente Fictício', document: '111.444.777-35', email: 'ficticio@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

async function setup() {
  const app = await buildApp({ config, providers: {}, logger: false });
  const log = (app as unknown as { testAuditLog: InMemorySecurityAuditRepository }).testAuditLog;
  return { app, log };
}

test('login success, wrong password, unverified e-mail and rate limit are each audited with the right outcome', async (t) => {
  const { app, log } = await setup();
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: P });
  await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: P.email, password: P.password } }); // não confirmado
  await verifyEmail(app, P.email);
  const ok = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: P.email, password: P.password } });
  for (let i = 0; i < 4; i += 1) await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: P.email, password: 'errada' } });

  const logins = log.events.filter((e) => e.event === 'CUSTOMER_LOGIN');
  assert.deepEqual(logins.map((e) => e.outcome), ['BLOCKED', 'SUCCESS', 'FAILURE', 'FAILURE', 'FAILURE', 'BLOCKED']);
  assert.equal(logins[1]!.customerId, ok.json().data.customer.id);
  assert.equal(logins[5]!.details!.statusCode, 429);
  assert.ok(log.events.some((e) => e.event === 'CUSTOMER_EMAIL_VERIFY' && e.outcome === 'SUCCESS' && e.customerId === ok.json().data.customer.id));
  assert.ok(logins.every((e) => e.ip && e.requestId));
});

test('the audit log never stores the password, e-mail, CPF, name, phone or any token', async (t) => {
  const { app, log } = await setup();
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: P, headers: { 'user-agent': 'TesteAgente/1.0' } });
  await verifyEmail(app, P.email);
  const login = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: P.email, password: P.password } });
  const token = login.json().data.token as string;
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${token}` }, payload: { motherName: 'Mãe Fictícia', nationality: 'Brasileira' } });
  await app.inject({ method: 'POST', url: '/v1/customers/password/forgot', payload: { email: P.email } });

  const dump = JSON.stringify(log.events);
  for (const secret of [P.password, P.email, '11144477735', '111.444.777-35', P.name, P.phone, token, 'Mãe Fictícia', 'Brasileira']) {
    assert.equal(dump.includes(secret), false, `vazou no registro de auditoria: ${secret}`);
  }
  const kyc = log.events.find((e) => e.event === 'CUSTOMER_KYC_PERSONAL_INFO_UPDATE')!;
  assert.equal(kyc.details!.fields, 'motherName,nationality'); // só QUAIS campos, nunca os valores
  assert.ok(log.events.some((e) => e.event === 'CUSTOMER_PASSWORD_RESET_REQUEST'));
});

test('register is audited (accountCreated true/false) while the HTTP answer stays identical', async (t) => {
  const { app, log } = await setup();
  t.after(() => app.close());
  const first = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: P });
  const duplicate = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: P });
  assert.equal(first.statusCode, duplicate.statusCode);
  assert.equal(first.json().data.message, duplicate.json().data.message);
  const regs = log.events.filter((e) => e.event === 'CUSTOMER_REGISTER');
  assert.deepEqual(regs.map((e) => e.details!.accountCreated), [true, false]);
  assert.ok(regs[0]!.customerId);
  assert.equal(regs[1]!.customerId, null);
});

test('a failure while writing the audit log never breaks the customer request', async (t) => {
  const { app, log } = await setup();
  t.after(() => app.close());
  log.record = async () => { throw new Error('banco de auditoria fora do ar'); };
  const response = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: P });
  assert.equal(response.statusCode, 202);
});

test('read-only routes (GET) are not audited', async (t) => {
  const { app, log } = await setup();
  t.after(() => app.close());
  await app.inject({ method: 'GET', url: '/v1/customers/session' });
  assert.equal(log.events.length, 0);
});

test('GET /me returns the dashboard profile with CPF and phone masked, plus the KYC status', async (t) => {
  const { app } = await setup();
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: P });
  await verifyEmail(app, P.email);
  const token = (await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: P.email, password: P.password } })).json().data.token;
  const me = await app.inject({ method: 'GET', url: '/v1/customers/me', headers: { authorization: `Bearer ${token}` } });
  assert.equal(me.statusCode, 200);
  const { profile, kyc } = me.json().data;
  assert.equal(profile.documentMasked, '***.444.***-**');
  assert.equal(profile.phoneMasked, '(11) *****-0000');
  assert.equal(profile.emailVerified, true);
  assert.equal(kyc.status, 'NOT_STARTED');
  const raw = me.body;
  assert.equal(raw.includes('11144477735') || raw.includes('11999990000') || raw.includes('passwordHash'), false);
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${token}` }, payload: { nationality: 'Brasileira' } });
  const after = await app.inject({ method: 'GET', url: '/v1/customers/me', headers: { authorization: `Bearer ${token}` } });
  assert.equal(after.json().data.kyc.status, 'IN_PROGRESS');
  assert.equal((await app.inject({ method: 'GET', url: '/v1/customers/me' })).statusCode, 401);
});
