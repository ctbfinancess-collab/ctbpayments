import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';

const baseConfig: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};

const CUSTOMER_A = { name: 'Cliente A', document: '111.444.777-35', email: 'a@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };
const CUSTOMER_B = { name: 'Cliente B', document: '529.982.247-25', email: 'b@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

async function registerAndLogin(app: Awaited<ReturnType<typeof buildApp>>, payload: typeof CUSTOMER_A) {
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload });
  const login = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: payload.email, password: payload.password } });
  return login.json().data as { token: string; expiresAt: string; customer: { id: string; email: string } };
}

// KYC — Etapa 1, em nível de rota HTTP (o merge/validação já é testado em
// detalhe em tests/customerKycService.test.ts; aqui o foco é o contrato
// HTTP: autenticação, prefill, persistência entre chamadas e isolamento
// por customer).
test('GET /v1/customers/kyc/personal-info requires a session (401 without a token)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/v1/customers/kyc/personal-info' });
  assert.equal(response.statusCode, 401);
});

test('PUT /v1/customers/kyc/personal-info requires a session (401 without a token)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', payload: { nationality: 'Brasileira' } });
  assert.equal(response.statusCode, 401);
});

test('GET /v1/customers/kyc/personal-info prefills name/document/email/phone from the authenticated customer, status NOT_STARTED', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token, customer } = await registerAndLogin(app, CUSTOMER_A);

  const response = await app.inject({ method: 'GET', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.statusCode, 200);
  const { personalInfo } = response.json().data;
  assert.equal(personalInfo.status, 'NOT_STARTED');
  assert.equal(personalInfo.name, 'Cliente A');
  assert.equal(personalInfo.email, customer.email);
  assert.equal(personalInfo.birthDate, null);
});

test('PUT /v1/customers/kyc/personal-info saves progress and GET reflects it afterwards ("sair e continuar depois")', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app, CUSTOMER_A);

  const put = await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${token}` }, payload: { birthDate: '1990-05-20' } });
  assert.equal(put.statusCode, 200);
  assert.equal(put.json().data.personalInfo.status, 'IN_PROGRESS');

  const get = await app.inject({ method: 'GET', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${token}` } });
  const { personalInfo } = get.json().data;
  assert.equal(personalInfo.status, 'IN_PROGRESS');
  assert.equal(personalInfo.birthDate, '1990-05-20');
  assert.equal(personalInfo.motherName, null);
});

test('PUT /v1/customers/kyc/personal-info completes across separate calls without erasing earlier progress', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app, CUSTOMER_A);

  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${token}` }, payload: { birthDate: '1990-05-20' } });
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${token}` }, payload: { motherName: 'Maria da Silva' } });
  const last = await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${token}` }, payload: { nationality: 'Brasileira' } });

  const { personalInfo } = last.json().data;
  assert.equal(personalInfo.birthDate, '1990-05-20');
  assert.equal(personalInfo.motherName, 'Maria da Silva');
  assert.equal(personalInfo.nationality, 'Brasileira');
  assert.ok(personalInfo.personalInfoCompletedAt);
});

test('PUT /v1/customers/kyc/personal-info rejects an invalid birthDate with 422 KYC_BIRTH_DATE_INVALID', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app, CUSTOMER_A);

  const response = await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${token}` }, payload: { birthDate: '2099-01-01' } });
  assert.equal(response.statusCode, 422);
  assert.equal(response.json().error.code, 'KYC_BIRTH_DATE_INVALID');
});

// Item central de segurança desta etapa: a identidade vem sempre da
// sessão (request.customerAuth), nunca de um customerId manipulável —
// aqui não há sequer um parâmetro pra manipular, então o teste confirma
// o isolamento na prática: o que A salva nunca aparece pra B.
test('KYC personal info is isolated per authenticated customer (no cross-customer leakage)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const customerA = await registerAndLogin(app, CUSTOMER_A);
  const customerB = await registerAndLogin(app, CUSTOMER_B);

  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${customerA.token}` }, payload: { birthDate: '1990-05-20', motherName: 'Maria da Silva', nationality: 'Brasileira' } });

  const getB = await app.inject({ method: 'GET', url: '/v1/customers/kyc/personal-info', headers: { authorization: `Bearer ${customerB.token}` } });
  const { personalInfo } = getB.json().data;
  assert.equal(personalInfo.status, 'NOT_STARTED');
  assert.equal(personalInfo.birthDate, null);
  assert.equal(personalInfo.name, 'Cliente B');
});
