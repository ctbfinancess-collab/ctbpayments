import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import type { InMemorySecurityAuditRepository } from '../src/repositories/SecurityAuditRepository.js';
import { approvedCustomer, customerSession, outbox, staffSession, submitKyc } from './helpers/kycFlow.js';

// Fase 5 — pedido de conta PJ (KYB): regras antifraude, etapas, análise da
// equipe com consulta à Receita (simulada), decisões e auditoria.
const config: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: 'https://app.test',
  staff: { enabled: true, appBaseUrl: 'https://admin.test', totpEncryptionKey: undefined },
};
const CNPJ = '11.222.333/0001-81'; // CNPJ fictício com dígitos válidos
const ANA = { name: 'Ana Fictícia', document: '111.444.777-35', email: 'ana@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };
const BETO = { name: 'Beto Fictício', document: '529.982.247-25', email: 'beto@sandbox.invalid', phone: '11988880000', password: 'senha-forte-456' };
const DATA = { legalName: 'Empresa Fictícia LTDA', tradeName: 'Fictícia', openingDate: '2015-03-10', legalNature: '206-2 - Sociedade Empresária Limitada', mainActivity: '6201-5/01 - Desenvolvimento de software', businessEmail: 'financeiro@empresa.invalid', businessPhone: '(11) 3333-4444', annualRevenueRange: 'DE_360K_A_4_8M', applicantPosition: 'SOCIO_ADMINISTRADOR' };
const ADDRESS = { cep: '01310-100', street: 'Avenida Paulista', number: '2000', complement: 'Conj. 10', district: 'Bela Vista', city: 'São Paulo', state: 'SP' };
const PDF = Buffer.from('%PDF-1.7 contrato-social-ficticio');
const receita = async () => ({ ok: true, situacao: 'ATIVA', razaoSocial: 'EMPRESA FICTICIA LTDA', socios: ['ANA FICTICIA'] });

async function setup() {
  const app = await buildApp({ config, providers: {}, logger: false, cnpjLookup: receita });
  const staff = await staffSession(app);
  const audit = (app as unknown as { testAuditLog: InMemorySecurityAuditRepository }).testAuditLog;
  return { app, staff, audit };
}

async function fullApplication(app: Awaited<ReturnType<typeof buildApp>>, h: { authorization: string }, position = 'SOCIO_ADMINISTRADOR') {
  const created = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: h, payload: { cnpj: CNPJ } });
  assert.equal(created.statusCode, 201, created.body);
  const id = created.json().data.company.id as string;
  assert.equal((await app.inject({ method: 'PUT', url: `/v1/customers/companies/${id}/data`, headers: h, payload: { ...DATA, applicantPosition: position } })).statusCode, 200);
  assert.equal((await app.inject({ method: 'PUT', url: `/v1/customers/companies/${id}/address`, headers: h, payload: ADDRESS })).statusCode, 200);
  for (const kind of ['SOCIAL_CONTRACT', 'ADDRESS_PROOF']) {
    const up = await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/documents/${kind}`, headers: { ...h, 'content-type': 'application/pdf' }, payload: PDF });
    assert.equal(up.statusCode, 201, up.body);
  }
  return id;
}

test('only customers with an APPROVED identity can request a PJ account; CNPJ is validated', async (t) => {
  const { app, staff } = await setup();
  t.after(() => app.close());
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/companies', payload: { cnpj: CNPJ } })).statusCode, 401);
  const pending = await customerSession(app, ANA);
  const r = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: pending.h, payload: { cnpj: CNPJ } });
  assert.equal(r.statusCode, 403);
  assert.equal(r.json().error.code, 'COMPANY_KYC_REQUIRED');
  await submitKyc(app, pending.h);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: pending.h, payload: { cnpj: CNPJ } })).json().error.code, 'COMPANY_KYC_REQUIRED'); // em análise ainda não basta
  await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${pending.id}/decision`, headers: staff, payload: { decision: 'APPROVED' } });
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: pending.h, payload: { cnpj: '11.222.333/0001-80' } })).json().error.code, 'COMPANY_CNPJ_INVALID');
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: pending.h, payload: { cnpj: CNPJ } })).statusCode, 201);
});

test('full application: data → address → documents → submit; locked while in review; withdraw and resubmit', async (t) => {
  const { app, staff } = await setup();
  t.after(() => app.close());
  const ana = await approvedCustomer(app, staff, ANA);
  const created = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: ana.h, payload: { cnpj: CNPJ } });
  const id = created.json().data.company.id;
  assert.deepEqual(created.json().data.company.missing, ['COMPANY_DATA', 'COMPANY_ADDRESS', 'SOCIAL_CONTRACT', 'ADDRESS_PROOF']);
  assert.equal((await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/submit`, headers: ana.h, payload: {} })).json().error.code, 'COMPANY_INCOMPLETE');
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: ana.h, payload: { cnpj: CNPJ } })).statusCode, 409);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/customers/companies', headers: ana.h })).json().data.companies.length, 1);
  await app.inject({ method: 'PUT', url: `/v1/customers/companies/${id}/data`, headers: ana.h, payload: DATA });
  await app.inject({ method: 'PUT', url: `/v1/customers/companies/${id}/address`, headers: ana.h, payload: ADDRESS });
  for (const kind of ['SOCIAL_CONTRACT', 'ADDRESS_PROOF']) await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/documents/${kind}`, headers: { ...ana.h, 'content-type': 'application/pdf' }, payload: PDF });
  const ready = (await app.inject({ method: 'GET', url: `/v1/customers/companies/${id}`, headers: ana.h })).json().data.company;
  assert.deepEqual(ready.missing, []);
  assert.equal(ready.data.businessPhone, '1133334444');
  assert.equal(ready.address.state, 'SP');
  assert.equal((await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/submit`, headers: ana.h, payload: {} })).json().data.company.status, 'SUBMITTED');
  assert.equal((await app.inject({ method: 'PUT', url: `/v1/customers/companies/${id}/address`, headers: ana.h, payload: ADDRESS })).json().error.code, 'COMPANY_LOCKED');
  assert.equal((await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/withdraw`, headers: ana.h, payload: {} })).json().data.company.status, 'DRAFT');
  assert.equal((await app.inject({ method: 'PUT', url: `/v1/customers/companies/${id}/address`, headers: ana.h, payload: { ...ADDRESS, number: '2010' } })).statusCode, 200);
  assert.equal((await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/submit`, headers: ana.h, payload: {} })).json().data.company.status, 'SUBMITTED');
});

test('an attorney (procurador) must also send the power of attorney', async (t) => {
  const { app, staff } = await setup();
  t.after(() => app.close());
  const ana = await approvedCustomer(app, staff, ANA);
  const id = await fullApplication(app, ana.h, 'PROCURADOR');
  const c = (await app.inject({ method: 'GET', url: `/v1/customers/companies/${id}`, headers: ana.h })).json().data.company;
  assert.deepEqual(c.missing, ['POWER_OF_ATTORNEY']);
  assert.equal(c.documents.powerOfAttorneyRequired, true);
});

test('nobody can see or change another person\'s application (404), and the same CNPJ never reveals other customers', async (t) => {
  const { app, staff } = await setup();
  t.after(() => app.close());
  const ana = await approvedCustomer(app, staff, ANA);
  const beto = await approvedCustomer(app, staff, BETO);
  const anaId = await fullApplication(app, ana.h);
  assert.equal((await app.inject({ method: 'GET', url: `/v1/customers/companies/${anaId}`, headers: beto.h })).statusCode, 404);
  assert.equal((await app.inject({ method: 'PUT', url: `/v1/customers/companies/${anaId}/address`, headers: beto.h, payload: ADDRESS })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/customers/companies', headers: beto.h })).json().data.companies.length, 0);
  // Beto pede o MESMO CNPJ: aceito igual (não revela que a Ana já pediu).
  const betoReq = await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: beto.h, payload: { cnpj: CNPJ } });
  assert.equal(betoReq.statusCode, 201);
  // A mesma pessoa não abre dois pedidos do mesmo CNPJ.
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: ana.h, payload: { cnpj: CNPJ } })).json().error.code, 'COMPANY_ALREADY_REQUESTED');
});

test('staff review: queue, case with Receita lookup and conflict alert, documents, approve; only ONE approval per CNPJ', async (t) => {
  const { app, staff } = await setup();
  t.after(() => app.close());
  const ana = await approvedCustomer(app, staff, ANA);
  const beto = await approvedCustomer(app, staff, BETO);
  const anaId = await fullApplication(app, ana.h);
  const betoId = await fullApplication(app, beto.h);
  await app.inject({ method: 'POST', url: `/v1/customers/companies/${anaId}/submit`, headers: ana.h, payload: {} });
  await app.inject({ method: 'POST', url: `/v1/customers/companies/${betoId}/submit`, headers: beto.h, payload: {} });
  const queue = (await app.inject({ method: 'GET', url: '/v1/staff/companies/queue', headers: staff })).json().data.items;
  assert.equal(queue.length, 2);
  const kase = (await app.inject({ method: 'GET', url: `/v1/staff/companies/cases/${anaId}`, headers: staff })).json().data.case;
  assert.equal(kase.receita.situacao, 'ATIVA');
  assert.deepEqual(kase.receita.socios, ['ANA FICTICIA']);
  assert.equal(kase.conflicts.otherApplications, 1);
  assert.equal(kase.applicant.kycStatus, 'APPROVED');
  const doc = await app.inject({ method: 'GET', url: `/v1/staff/companies/cases/${anaId}/documents/${kase.documents[0].id}`, headers: staff });
  assert.deepEqual(doc.rawPayload, PDF);
  assert.equal(doc.headers['cache-control'], 'no-store, private');
  const ok = await app.inject({ method: 'POST', url: `/v1/staff/companies/cases/${anaId}/decision`, headers: staff, payload: { decision: 'APPROVED' } });
  assert.equal(ok.json().data.status, 'APPROVED');
  assert.ok(outbox(app).sent.some((m) => m.to === ANA.email && /Conta PJ aprovada/.test(m.subject)));
  assert.equal((await app.inject({ method: 'GET', url: `/v1/customers/companies/${anaId}`, headers: ana.h })).json().data.company.status, 'APPROVED');
  const dup = await app.inject({ method: 'POST', url: `/v1/staff/companies/cases/${betoId}/decision`, headers: staff, payload: { decision: 'APPROVED' } });
  assert.equal(dup.statusCode, 409);
  assert.equal(dup.json().error.code, 'COMPANY_CNPJ_ALREADY_APPROVED');
  assert.equal((await app.inject({ method: 'GET', url: `/v1/staff/companies/cases/${betoId}`, headers: staff })).json().data.case.conflicts.approvedElsewhere, true);
});

test('request changes (editable, reason shown) and rejection (final, reason shown, link never active)', async (t) => {
  const { app, staff } = await setup();
  t.after(() => app.close());
  const ana = await approvedCustomer(app, staff, ANA);
  const id = await fullApplication(app, ana.h);
  await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/submit`, headers: ana.h, payload: {} });
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/companies/cases/${id}/decision`, headers: staff, payload: { decision: 'CHANGES_REQUESTED' } })).json().error.code, 'KYC_REASON_REQUIRED');
  const reason = 'O contrato social enviado está incompleto. Envie a última alteração consolidada.';
  await app.inject({ method: 'POST', url: `/v1/staff/companies/cases/${id}/decision`, headers: staff, payload: { decision: 'CHANGES_REQUESTED', reason } });
  const c1 = (await app.inject({ method: 'GET', url: `/v1/customers/companies/${id}`, headers: ana.h })).json().data.company;
  assert.equal(c1.status, 'CHANGES_REQUESTED');
  assert.equal(c1.editable, true);
  assert.equal(c1.review.reason, reason);
  await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/documents/SOCIAL_CONTRACT`, headers: { ...ana.h, 'content-type': 'application/pdf' }, payload: PDF });
  await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/submit`, headers: ana.h, payload: {} });
  const rej = 'A empresa está com a situação cadastral inapta na Receita Federal.';
  await app.inject({ method: 'POST', url: `/v1/staff/companies/cases/${id}/decision`, headers: staff, payload: { decision: 'REJECTED', reason: rej } });
  const c2 = (await app.inject({ method: 'GET', url: `/v1/customers/companies/${id}`, headers: ana.h })).json().data.company;
  assert.equal(c2.status, 'REJECTED');
  assert.equal(c2.editable, false);
  assert.equal(c2.review.reason, rej);
  assert.ok(outbox(app).sent.some((m) => m.to === ANA.email && /não aprovado/.test(m.subject)));
  // Depois de recusado, a pessoa pode fazer um pedido novo do mesmo CNPJ.
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: ana.h, payload: { cnpj: CNPJ } })).statusCode, 201);
});

test('audit: every PJ step and staff access is recorded — never the CNPJ, company name, address or file', async (t) => {
  const { app, staff, audit } = await setup();
  t.after(() => app.close());
  const ana = await approvedCustomer(app, staff, ANA);
  const id = await fullApplication(app, ana.h);
  await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/submit`, headers: ana.h, payload: {} });
  const kase = (await app.inject({ method: 'GET', url: `/v1/staff/companies/cases/${id}`, headers: staff })).json().data.case;
  await app.inject({ method: 'GET', url: `/v1/staff/companies/cases/${id}/documents/${kase.documents[0].id}`, headers: staff });
  await app.inject({ method: 'POST', url: `/v1/staff/companies/cases/${id}/decision`, headers: staff, payload: { decision: 'APPROVED' } });
  for (const name of ['COMPANY_APPLICATION_CREATE', 'COMPANY_DATA_UPDATE', 'COMPANY_ADDRESS_UPDATE', 'COMPANY_DOCUMENT_UPLOAD', 'COMPANY_SUBMIT', 'STAFF_COMPANY_CASE_VIEW', 'STAFF_COMPANY_DOCUMENT_VIEW', 'STAFF_COMPANY_DECISION']) {
    assert.ok(audit.events.some((e) => e.event === name && e.outcome === 'SUCCESS'), name);
  }
  assert.equal(audit.events.find((e) => e.event === 'STAFF_COMPANY_DECISION')!.details!.companyId, id);
  const dump = JSON.stringify(audit.events);
  for (const secret of ['11222333000181', '11.222.333', 'Empresa Fictícia', 'Avenida Paulista', 'contrato-social-ficticio', 'financeiro@empresa.invalid']) assert.equal(dump.includes(secret), false, secret);
});

test('the customer gets a "we received it" e-mail when sending the identity verification and the PJ application', async (t) => {
  const { app, staff } = await setup();
  t.after(() => app.close());
  const ana = await approvedCustomer(app, staff, ANA);
  assert.ok(outbox(app).sent.some((m) => m.to === ANA.email && /Recebemos a sua verificação de identidade/.test(m.subject)));
  const id = await fullApplication(app, ana.h);
  await app.inject({ method: 'POST', url: `/v1/customers/companies/${id}/submit`, headers: ana.h, payload: {} });
  const mail = outbox(app).sent.find((m) => m.to === ANA.email && /Recebemos o seu pedido de conta PJ/.test(m.subject));
  assert.ok(mail);
  assert.match(mail!.text!, /Fictícia/);
  assert.match(mail!.text!, new RegExp(`/empresas/${id}`));
});
