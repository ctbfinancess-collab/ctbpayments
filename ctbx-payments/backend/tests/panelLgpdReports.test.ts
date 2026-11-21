import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import type { InMemoryEmailProvider } from '../src/providers/InMemoryEmailProvider.js';
import type { InMemoryStaffRepository } from '../src/repositories/StaffRepository.js';
import { totpCode, totpStep } from '../src/security/totp.js';
import { StaffAuthService } from '../src/services/staffAuthService.js';
import { monthKey } from '../src/utils/monthKey.js';
import { verifyEmail } from './helpers/verifyEmail.js';

// Etapa D do painel: solicitações LGPD e relatório mensal (só administradores).
const config: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: 'https://app.test',
  staff: { enabled: true, appBaseUrl: 'https://admin.test', totpEncryptionKey: undefined },
};
type App = Awaited<ReturnType<typeof buildApp>>;
const outbox = (app: App) => (app as unknown as { testEmailOutbox: InMemoryEmailProvider }).testEmailOutbox;
const repo = (app: App) => (app as unknown as { testStaffRepo: InMemoryStaffRepository }).testStaffRepo;
const tokenOf = (t: string) => new URL(t.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

async function staffLogin(app: App, email: string, role: 'ADMIN' | 'ANALYST', inviterToken?: string) {
  if (inviterToken) await app.inject({ method: 'POST', url: '/v1/staff/users', headers: { authorization: `Bearer ${inviterToken}` }, payload: { name: `Pessoa ${role}`, email, role } });
  else await new StaffAuthService(repo(app), Buffer.alloc(32, 1), outbox(app), 'https://admin.test').invite({ name: 'Ana Admin', email, role });
  const mail = outbox(app).sent.filter((m) => m.to === email).at(-1)!;
  const acc = (await app.inject({ method: 'POST', url: '/v1/staff/invites/accept', payload: { token: tokenOf(mail.text!), password: 'Senha-Forte-2026!' } })).json().data;
  await app.inject({ method: 'POST', url: '/v1/staff/invites/confirm', payload: { enrollmentToken: acc.enrollmentToken, code: totpCode(acc.secret, totpStep(new Date())) } });
  repo(app).users.find((u) => u.email === email)!.totpLastStep = null;
  const l = (await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email, password: 'Senha-Forte-2026!' } })).json().data;
  return (await app.inject({ method: 'POST', url: '/v1/staff/auth/mfa', payload: { mfaToken: l.mfaToken, code: totpCode(acc.secret, totpStep(new Date())) } })).json().data.token as string;
}

const base = (over: Record<string, unknown> = {}) => ({ right: 'CONFIRMATION_ACCESS', channel: 'EMAIL', requesterName: 'Titular Fictício', requesterContact: 'titular@sandbox.invalid', description: 'Quer saber quais dados temos sobre ele.', receivedAt: new Date().toISOString(), ...over });

test('LGPD: registra com protocolo e prazo de 15 dias, liga ao cliente, histórico e encerramento definitivo', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const admin = await staffLogin(app, 'ana@sandbox.invalid', 'ADMIN');
  const h = { authorization: `Bearer ${admin}` };
  const reg = { name: 'Cliente Fictício', document: '111.444.777-35', email: 'cli@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123', acceptTerms: true };
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: reg });
  await verifyEmail(app, reg.email);

  const notFound = await app.inject({ method: 'POST', url: '/v1/staff/lgpd/requests', headers: h, payload: base({ customerLookup: 'ninguem@sandbox.invalid' }) });
  assert.equal(notFound.json().error.code, 'LGPD_CUSTOMER_NOT_FOUND');
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/lgpd/requests', headers: h, payload: base({ right: 'QUALQUER' }) })).json().error.code, 'LGPD_RIGHT_INVALID');

  const received = new Date(Date.now() - 3 * 24 * 3_600_000);
  const c = await app.inject({ method: 'POST', url: '/v1/staff/lgpd/requests', headers: h, payload: base({ customerLookup: '111.444.777-35', receivedAt: received.toISOString() }) });
  assert.equal(c.statusCode, 201, c.body);
  const r = c.json().data.request;
  assert.match(r.protocol, /^LGPD-\d{4}-[0-9A-F]{6}$/);
  assert.equal(new Date(r.dueAt).getTime() - received.getTime(), 15 * 24 * 3_600_000);
  assert.equal(r.daysLeft, 12);
  assert.equal(r.customer.name, 'Cliente Fictício');
  assert.equal(r.status, 'OPEN');

  // atender exige identidade confirmada
  const early = await app.inject({ method: 'POST', url: `/v1/staff/lgpd/requests/${r.id}/close`, headers: h, payload: { outcome: 'ANSWERED', response: 'Enviamos a lista de dados.' } });
  assert.equal(early.json().error.code, 'LGPD_IDENTITY_REQUIRED');
  const u = await app.inject({ method: 'POST', url: `/v1/staff/lgpd/requests/${r.id}/update`, headers: h, payload: { inProgress: true, identityVerified: true, note: 'Confirmado pelo e-mail cadastrado.' } });
  assert.equal(u.json().data.request.status, 'IN_PROGRESS');
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/badges', headers: h })).json().data.badges.lgpd.open, 1);

  const closed = await app.inject({ method: 'POST', url: `/v1/staff/lgpd/requests/${r.id}/close`, headers: h, payload: { outcome: 'ANSWERED', response: 'Enviamos a declaração completa dos dados.' } });
  const done = closed.json().data.request;
  assert.equal(done.status, 'ANSWERED');
  assert.equal(done.overdue, false);
  assert.deepEqual(done.events.map((e: { action: string }) => e.action), ['CREATED', 'IN_PROGRESS', 'IDENTITY_VERIFIED', 'NOTE', 'ANSWERED']);
  // encerrado é definitivo
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/lgpd/requests/${r.id}/update`, headers: h, payload: { note: 'tentativa' } })).statusCode, 409);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/lgpd/requests?filter=open', headers: h })).json().data.requests.length, 0);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/lgpd/requests?filter=closed', headers: h })).json().data.requests.length, 1);

  // auditoria: protocolo e cliente vinculado, nunca o conteúdo do pedido
  const audit = (await app.inject({ method: 'GET', url: '/v1/staff/audit?event=STAFF_LGPD_CREATE', headers: h })).json().data;
  const ev = (audit.events ?? audit.items)[0];
  assert.equal(ev.details.protocol, r.protocol);
  assert.ok(ev.customerId);
  assert.doesNotMatch(JSON.stringify(audit), /Quer saber|titular@sandbox/);
  await app.close();
});

test('LGPD: pedido atrasado aparece como atrasado; data de recebimento inválida é recusada', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const h = { authorization: `Bearer ${await staffLogin(app, 'ana@sandbox.invalid', 'ADMIN')}` };
  const r = (await app.inject({ method: 'POST', url: '/v1/staff/lgpd/requests', headers: h, payload: base({ right: 'ANONYMIZATION_DELETION', receivedAt: new Date(Date.now() - 20 * 24 * 3_600_000).toISOString() }) })).json().data.request;
  assert.equal(r.overdue, true);
  assert.equal(r.daysLeft, -5);
  assert.deepEqual((await app.inject({ method: 'GET', url: '/v1/staff/badges', headers: h })).json().data.badges.lgpd, { open: 1, overdue: 1 });
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/lgpd/requests', headers: h, payload: base({ receivedAt: new Date(Date.now() + 5 * 24 * 3_600_000).toISOString() }) })).json().error.code, 'LGPD_RECEIVED_INVALID');
  // não atendido também precisa de justificativa
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/lgpd/requests/${r.id}/close`, headers: h, payload: { outcome: 'DENIED', response: 'curto' } })).json().error.code, 'LGPD_RESPONSE_INVALID');
  await app.close();
});

test('LGPD e relatórios: só administradores; analista recebe 403 e não vê o contador', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const admin = await staffLogin(app, 'ana@sandbox.invalid', 'ADMIN');
  const analyst = await staffLogin(app, 'beto@sandbox.invalid', 'ANALYST', admin);
  const h = { authorization: `Bearer ${analyst}` };
  for (const [method, url] of [['GET', '/v1/staff/lgpd/requests'], ['POST', '/v1/staff/lgpd/requests'], ['GET', '/v1/staff/reports/monthly']] as const) {
    const res = await app.inject({ method, url, headers: h, ...(method === 'POST' ? { payload: base() } : {}) });
    assert.equal(res.statusCode, 403, `${method} ${url}`);
  }
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/badges', headers: h })).json().data.badges.lgpd, undefined);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/lgpd/requests' })).statusCode, 401);
  await app.close();
});

test('relatório mensal: 12 meses, só números, mês atual com os cadastros e solicitações', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const h = { authorization: `Bearer ${await staffLogin(app, 'ana@sandbox.invalid', 'ADMIN')}` };
  const reg = { name: 'Cliente Relatório', document: '529.982.247-25', email: 'rel@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123', acceptTerms: true };
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: reg });
  await app.inject({ method: 'POST', url: '/v1/staff/lgpd/requests', headers: h, payload: base() });
  const rep = (await app.inject({ method: 'GET', url: '/v1/staff/reports/monthly', headers: h })).json().data.report;
  assert.equal(rep.months.length, 12);
  assert.equal(rep.months[0].month, monthKey(new Date()));
  assert.equal(rep.months[0].newCustomers, 1);
  assert.equal(rep.months[0].lgpd.received, 1);
  assert.equal(rep.totals.newCustomers, 1);
  assert.doesNotMatch(JSON.stringify(rep), /Cliente Relatório|rel@sandbox|52998224725|Titular/);
  await app.close();
});
