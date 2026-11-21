import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import type { InMemorySecurityAuditRepository } from '../src/repositories/SecurityAuditRepository.js';
import { approvedCustomer, customerSession, outbox, staffSession, submitKyc } from './helpers/kycFlow.js';

// Fase 6 — painel administrativo: visão geral, clientes (busca, ficha,
// suspender/reativar, encerrar sessões) e auditoria, com permissões.
const config: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: 'https://app.test',
  staff: { enabled: true, appBaseUrl: 'https://admin.test', totpEncryptionKey: undefined },
};
const ANA = { name: 'Ana Fictícia Souza', document: '111.444.777-35', email: 'ana@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };
const BETO = { name: 'Beto Fictício Lima', document: '529.982.247-25', email: 'beto@sandbox.invalid', phone: '11988880000', password: 'senha-forte-456' };

async function setup() {
  const app = await buildApp({ config, providers: {}, logger: false, cnpjLookup: async () => ({ ok: false, error: 'teste' }) });
  const admin = await staffSession(app, 'admin@sandbox.invalid');
  const audit = (app as unknown as { testAuditLog: InMemorySecurityAuditRepository }).testAuditLog;
  return { app, admin, audit };
}

async function analystSession(app: Awaited<ReturnType<typeof buildApp>>, admin: { authorization: string }) {
  // Convite pela API (perfil ANALYST) e acesso com 2 etapas.
  const { totpCode, totpStep } = await import('../src/security/totp.js');
  await app.inject({ method: 'POST', url: '/v1/staff/users', headers: admin, payload: { name: 'Analista Teste', email: 'analista@sandbox.invalid', role: 'ANALYST' } });
  const mail = outbox(app).sent.filter((m) => m.to === 'analista@sandbox.invalid').at(-1)!;
  const token = new URL(mail.text!.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
  const acc = (await app.inject({ method: 'POST', url: '/v1/staff/invites/accept', payload: { token, password: 'Senha-Forte-2026!' } })).json().data;
  const step = totpStep(new Date());
  await app.inject({ method: 'POST', url: '/v1/staff/invites/confirm', payload: { enrollmentToken: acc.enrollmentToken, code: totpCode(acc.secret, step) } });
  const mfaToken = (await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email: 'analista@sandbox.invalid', password: 'Senha-Forte-2026!' } })).json().data.mfaToken;
  const r = await app.inject({ method: 'POST', url: '/v1/staff/auth/mfa', payload: { mfaToken, code: totpCode(acc.secret, step + 1) } });
  return { authorization: `Bearer ${r.json().data.token}` };
}

test('overview counts customers, KYC and PJ by status, with the pending queues', async (t) => {
  const { app, admin } = await setup();
  t.after(() => app.close());
  await approvedCustomer(app, admin, ANA);
  const beto = await customerSession(app, BETO);
  await submitKyc(app, beto.h);
  const o = (await app.inject({ method: 'GET', url: '/v1/staff/overview', headers: admin })).json().data.overview;
  assert.equal(o.customers, 2);
  assert.equal(o.kyc.APPROVED, 1);
  assert.equal(o.pending.kyc, 1);
  assert.equal(o.pending.companies, 0);
});

test('customer search by full CPF, part of the e-mail or part of the name — wildcards never list everyone', async (t) => {
  const { app, admin } = await setup();
  t.after(() => app.close());
  await customerSession(app, ANA);
  await customerSession(app, BETO);
  const q = async (term: string) => app.inject({ method: 'GET', url: `/v1/staff/customers?q=${encodeURIComponent(term)}`, headers: admin });
  assert.deepEqual((await q('111.444.777-35')).json().data.items.map((i: { name: string }) => i.name), [ANA.name]);
  assert.deepEqual((await q('beto@')).json().data.items.map((i: { name: string }) => i.name), [BETO.name]);
  assert.deepEqual((await q('fictíc')).json().data.items.length, 2);
  assert.equal((await q('%%%')).json().data.items.length, 0);
  assert.equal((await q('ab')).json().error.code, 'STAFF_SEARCH_TOO_SHORT');
  assert.equal((await q('ana')).json().data.items[0].documentMasked, '***.444.***-**'); // lista mascarada; CPF completo só na ficha
});

test('customer detail shows registration, KYC, companies, status history and recent security events', async (t) => {
  const { app, admin } = await setup();
  t.after(() => app.close());
  const ana = await approvedCustomer(app, admin, ANA);
  await app.inject({ method: 'POST', url: '/v1/customers/companies', headers: ana.h, payload: { cnpj: '11.222.333/0001-81' } });
  const d = (await app.inject({ method: 'GET', url: `/v1/staff/customers/${ana.id}`, headers: admin })).json().data.customer;
  assert.equal(d.customer.document, '11144477735');
  assert.equal(d.kyc.status, 'APPROVED');
  assert.equal(d.companies.length, 1);
  assert.equal(d.companies[0].linkStatus, 'PENDING');
  assert.ok(d.recentEvents.some((e: { event: string }) => e.event === 'CUSTOMER_LOGIN'));
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/customers/00000000-0000-4000-8000-000000000000', headers: admin })).statusCode, 404);
});

test('permissions: an analyst reads customers but cannot suspend, end sessions or see the audit trail', async (t) => {
  const { app, admin } = await setup();
  t.after(() => app.close());
  const ana = await customerSession(app, ANA);
  const analyst = await analystSession(app, admin);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/overview', headers: analyst })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: `/v1/staff/customers/${ana.id}`, headers: analyst })).statusCode, 200);
  for (const [method, url, payload] of [['POST', `/v1/staff/customers/${ana.id}/block`, { reason: 'Motivo de teste suficiente.' }], ['POST', `/v1/staff/customers/${ana.id}/revoke-sessions`, {}], ['GET', '/v1/staff/audit', undefined]] as const) {
    const r = await app.inject({ method, url, headers: analyst, ...(payload ? { payload } : {}) });
    assert.equal(r.statusCode, 403, url);
  }
  // Cliente comum não entra em nada do painel.
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/overview', headers: ana.h })).statusCode, 401);
});

test('suspending ends the customer sessions, blocks login (revealed only with the right password) and e-mails the customer; reactivating restores access', async (t) => {
  const { app, admin } = await setup();
  t.after(() => app.close());
  const ana = await customerSession(app, ANA);
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/customers/${ana.id}/block`, headers: admin, payload: { reason: 'curto' } })).json().error.code, 'STAFF_REASON_REQUIRED');
  const reason = 'Indício de uso indevido identificado pela equipe de prevenção à fraude.';
  const b = await app.inject({ method: 'POST', url: `/v1/staff/customers/${ana.id}/block`, headers: admin, payload: { reason } });
  assert.equal(b.json().data.status, 'BLOCKED');
  assert.equal((await app.inject({ method: 'GET', url: '/v1/customers/me', headers: ana.h })).statusCode, 401); // sessão encerrada
  const wrong = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: ANA.email, password: 'errada-123' } });
  assert.equal(wrong.json().error.code, 'CUSTOMER_LOGIN_INVALID'); // estranho: nada revelado
  const right = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: ANA.email, password: ANA.password } });
  assert.equal(right.json().error.code, 'CUSTOMER_BLOCKED');
  const mail = outbox(app).sent.find((m) => m.to === ANA.email && /suspensa/.test(m.subject))!;
  assert.ok(mail);
  assert.equal(mail.text!.includes(reason), false); // o motivo interno não vai para o cliente
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/customers/${ana.id}/block`, headers: admin, payload: { reason } })).json().error.code, 'CUSTOMER_ALREADY_BLOCKED');
  await app.inject({ method: 'POST', url: `/v1/staff/customers/${ana.id}/unblock`, headers: admin, payload: { reason: 'Verificação concluída, sem irregularidade.' } });
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: ANA.email, password: ANA.password } })).statusCode, 200);
  assert.ok(outbox(app).sent.some((m) => m.to === ANA.email && /reativada/.test(m.subject)));
  const hist = (await app.inject({ method: 'GET', url: `/v1/staff/customers/${ana.id}`, headers: admin })).json().data.customer.statusHistory;
  assert.deepEqual(hist.map((h: { action: string }) => h.action), ['UNBLOCK', 'BLOCK']);
  assert.equal(hist[1].reason, reason);
});

test('admin can end all sessions of a customer', async (t) => {
  const { app, admin } = await setup();
  t.after(() => app.close());
  const ana = await customerSession(app, ANA);
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/customers/${ana.id}/revoke-sessions`, headers: admin, payload: {} })).statusCode, 204);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/customers/me', headers: ana.h })).statusCode, 401);
});

test('audit trail: admin can filter it, the consultation itself is audited, and searched terms never enter the log', async (t) => {
  const { app, admin, audit } = await setup();
  t.after(() => app.close());
  const ana = await customerSession(app, ANA);
  await app.inject({ method: 'GET', url: `/v1/staff/customers?q=${encodeURIComponent('Ana Fictícia')}`, headers: admin });
  await app.inject({ method: 'GET', url: '/v1/staff/customers?q=11144477735', headers: admin });
  const all = (await app.inject({ method: 'GET', url: '/v1/staff/audit', headers: admin })).json().data.events;
  assert.ok(all.length > 0);
  assert.ok(all[0].occurredAt >= all.at(-1).occurredAt); // mais novos primeiro
  const logins = (await app.inject({ method: 'GET', url: `/v1/staff/audit?event=CUSTOMER_LOGIN&customerId=${ana.id}`, headers: admin })).json().data.events;
  assert.ok(logins.length >= 1);
  assert.ok(logins.every((e: { event: string; customerId: string }) => e.event === 'CUSTOMER_LOGIN' && e.customerId === ana.id));
  assert.ok(audit.events.some((e) => e.event === 'STAFF_AUDIT_VIEW' && e.outcome === 'SUCCESS' && e.details!.filter === 'CUSTOMER_LOGIN' && e.details!.byCustomer === true));
  const searches = audit.events.filter((e) => e.event === 'STAFF_CUSTOMER_SEARCH');
  assert.deepEqual(searches.map((e) => e.details!.kind), ['name', 'cpf']);
  const dump = JSON.stringify(audit.events);
  for (const secret of ['Ana Fictícia', '11144477735']) assert.equal(dump.includes(secret), false, secret);
});

test('audit shows WHO each customer event is about (name and e-mail at read time), including failed and blocked logins', async (t) => {
  const { app, admin, audit } = await setup();
  t.after(() => app.close());
  const ana = await customerSession(app, ANA);
  await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: ANA.email, password: 'errada-999' } });
  await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: 'ninguem@sandbox.invalid', password: 'errada-999' } });
  await app.inject({ method: 'POST', url: `/v1/staff/customers/${ana.id}/block`, headers: admin, payload: { reason: 'Teste de suspensão para a auditoria.' } });
  const blocked = await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: ANA.email, password: ANA.password } });
  assert.equal(blocked.json().error.code, 'CUSTOMER_BLOCKED');
  const logins = (await app.inject({ method: 'GET', url: '/v1/staff/audit?event=CUSTOMER_LOGIN', headers: admin })).json().data.events;
  const [blockedLogin, unknown, wrongPw] = logins;
  assert.equal(blockedLogin.outcome, 'BLOCKED');
  assert.equal(blockedLogin.customerName, ANA.name);
  assert.equal(unknown.customerId, null); // e-mail inexistente: sem conta
  assert.equal(wrongPw.customerName, ANA.name); // senha errada: sabemos de qual conta foi a tentativa
  assert.equal(wrongPw.customerEmail, ANA.email);
  // (A resposta idêntica para e-mail existente/inexistente é coberta em customerAuthHardening.test.ts.)
  // A trilha gravada continua sem nomes nem e-mails.
  const dump = JSON.stringify(audit.events);
  assert.equal(dump.includes(ANA.name) || dump.includes(ANA.email), false);
});
