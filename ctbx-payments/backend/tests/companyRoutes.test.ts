import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';

const baseConfig: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};

// CNPJs válidos usados nos testes (mesmo algoritmo de src/utils/cnpj.ts,
// mesmos valores já usados em tests/companyService.test.ts).
const VALID_CNPJ = '11.222.333/0001-81';
const VALID_CNPJ_2 = '11.444.777/0001-61';

const CUSTOMER_A = { name: 'Cliente A', document: '111.444.777-35', email: 'a@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };
const CUSTOMER_B = { name: 'Cliente B', document: '529.982.247-25', email: 'b@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

async function registerAndLogin(app: Awaited<ReturnType<typeof buildApp>>, payload: typeof CUSTOMER_A) {
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload });
  const login = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: payload.email, password: payload.password } });
  return login.json().data as { token: string; expiresAt: string; customer: { id: string; email: string } };
}

// Estrutura PJ, em nível de rota HTTP — o CompanyService já era testado
// em detalhe (tests/companyService.test.ts); aqui o foco é o contrato
// HTTP (autenticação, autorização por papel, formato da resposta).
test('POST /v1/customers/companies requires a session (401 without a token)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/v1/customers/companies', payload: { cnpj: VALID_CNPJ, legalName: 'Empresa Exemplo' } });
  assert.equal(response.statusCode, 401);
});

test('POST /v1/customers/companies registers the company and links the caller as ADMIN (identity comes from the session, never from the body)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app, CUSTOMER_A);

  const response = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: { authorization: `Bearer ${token}` }, payload: { cnpj: VALID_CNPJ, legalName: 'Empresa Exemplo LTDA', tradeName: 'Exemplo' } });
  assert.equal(response.statusCode, 201);
  const { company } = response.json().data;
  assert.equal(company.legalName, 'Empresa Exemplo LTDA');
  assert.equal(company.cnpj, '11222333000181');
});

test('POST /v1/customers/companies rejects an invalid CNPJ with 422 COMPANY_CNPJ_INVALID', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const { token } = await registerAndLogin(app, CUSTOMER_A);
  const response = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: { authorization: `Bearer ${token}` }, payload: { cnpj: '11.222.333/0001-82', legalName: 'Empresa' } });
  assert.equal(response.statusCode, 422);
  assert.equal(response.json().error.code, 'COMPANY_CNPJ_INVALID');
});

test('GET /v1/customers/companies lists only the companies the authenticated customer represents', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const customerA = await registerAndLogin(app, CUSTOMER_A);
  const customerB = await registerAndLogin(app, CUSTOMER_B);
  await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: { authorization: `Bearer ${customerA.token}` }, payload: { cnpj: VALID_CNPJ, legalName: 'Empresa de A' } });
  await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: { authorization: `Bearer ${customerB.token}` }, payload: { cnpj: VALID_CNPJ_2, legalName: 'Empresa de B' } });

  const responseA = await app.inject({ method: 'GET', url: '/v1/customers/companies', headers: { authorization: `Bearer ${customerA.token}` } });
  const { companies } = responseA.json().data;
  assert.equal(companies.length, 1);
  assert.equal(companies[0].company.legalName, 'Empresa de A');
  assert.equal(companies[0].role, 'ADMIN');
});

test('an ADMIN representative can add a new representative to their company', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const customerA = await registerAndLogin(app, CUSTOMER_A);
  const customerB = await registerAndLogin(app, CUSTOMER_B);
  const created = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: { authorization: `Bearer ${customerA.token}` }, payload: { cnpj: VALID_CNPJ, legalName: 'Empresa' } });
  const companyId = created.json().data.company.id;

  const response = await app.inject({
    method: 'POST', url: `/v1/customers/companies/${companyId}/representatives`,
    headers: { authorization: `Bearer ${customerA.token}` }, payload: { customerId: customerB.customer.id, role: 'MEMBER' },
  });
  assert.equal(response.statusCode, 201);

  const listResponse = await app.inject({ method: 'GET', url: `/v1/customers/companies/${companyId}/representatives`, headers: { authorization: `Bearer ${customerA.token}` } });
  assert.deepEqual(new Set(listResponse.json().data.representativeIds), new Set([customerA.customer.id, customerB.customer.id]));
});

// Item de segurança central desta etapa: um cliente autenticado, mas que
// NÃO representa a empresa, não pode adicionar representantes só por
// conhecer o companyId (nem listar quem já representa) — sem essa
// checagem seria um IDOR.
test('a customer who does not represent the company cannot add a representative to it (403 COMPANY_FORBIDDEN)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const customerA = await registerAndLogin(app, CUSTOMER_A);
  const customerB = await registerAndLogin(app, CUSTOMER_B);
  const created = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: { authorization: `Bearer ${customerA.token}` }, payload: { cnpj: VALID_CNPJ, legalName: 'Empresa' } });
  const companyId = created.json().data.company.id;

  const response = await app.inject({
    method: 'POST', url: `/v1/customers/companies/${companyId}/representatives`,
    headers: { authorization: `Bearer ${customerB.token}` }, payload: { customerId: customerB.customer.id },
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error.code, 'COMPANY_FORBIDDEN');
});

test('a customer who does not represent the company cannot list its representatives (403 COMPANY_FORBIDDEN)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const customerA = await registerAndLogin(app, CUSTOMER_A);
  const customerB = await registerAndLogin(app, CUSTOMER_B);
  const created = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: { authorization: `Bearer ${customerA.token}` }, payload: { cnpj: VALID_CNPJ, legalName: 'Empresa' } });
  const companyId = created.json().data.company.id;

  const response = await app.inject({ method: 'GET', url: `/v1/customers/companies/${companyId}/representatives`, headers: { authorization: `Bearer ${customerB.token}` } });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error.code, 'COMPANY_FORBIDDEN');
});

// A role MEMBER pode ver, mas não pode adicionar outros representantes —
// só ADMIN gerencia quem representa a empresa.
test('a MEMBER representative can view representatives but cannot add a new one (403 COMPANY_FORBIDDEN)', async (t) => {
  const app = await buildApp({ config: baseConfig, providers: {}, logger: false });
  t.after(() => app.close());
  const customerA = await registerAndLogin(app, CUSTOMER_A);
  const customerB = await registerAndLogin(app, CUSTOMER_B);
  const created = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: { authorization: `Bearer ${customerA.token}` }, payload: { cnpj: VALID_CNPJ, legalName: 'Empresa' } });
  const companyId = created.json().data.company.id;
  await app.inject({ method: 'POST', url: `/v1/customers/companies/${companyId}/representatives`, headers: { authorization: `Bearer ${customerA.token}` }, payload: { customerId: customerB.customer.id, role: 'MEMBER' } });

  const viewResponse = await app.inject({ method: 'GET', url: `/v1/customers/companies/${companyId}/representatives`, headers: { authorization: `Bearer ${customerB.token}` } });
  assert.equal(viewResponse.statusCode, 200);

  const CUSTOMER_C = { name: 'Cliente C', document: '734.912.658-19', email: 'c@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };
  const customerC = await registerAndLogin(app, CUSTOMER_C);
  const addResponse = await app.inject({
    method: 'POST', url: `/v1/customers/companies/${companyId}/representatives`,
    headers: { authorization: `Bearer ${customerB.token}` }, payload: { customerId: customerC.customer.id },
  });
  assert.equal(addResponse.statusCode, 403);
  assert.equal(addResponse.json().error.code, 'COMPANY_FORBIDDEN');
});
