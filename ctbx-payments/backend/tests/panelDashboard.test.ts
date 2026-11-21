import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import type { InMemoryEmailProvider } from '../src/providers/InMemoryEmailProvider.js';
import type { InMemoryStaffRepository } from '../src/repositories/StaffRepository.js';
import { totpCode, totpStep } from '../src/security/totp.js';
import { StaffAuthService } from '../src/services/staffAuthService.js';
import { monthKey } from '../src/utils/monthKey.js';
import { maskIp } from '../src/security/maskIp.js';
import { verifyEmail } from './helpers/verifyEmail.js';

// Etapa A do painel: Dashboard com números reais e contadores do menu.
const config: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: 'https://app.test',
  staff: { enabled: true, appBaseUrl: 'https://admin.test', totpEncryptionKey: undefined },
};
type App = Awaited<ReturnType<typeof buildApp>>;
const outbox = (app: App) => (app as unknown as { testEmailOutbox: InMemoryEmailProvider }).testEmailOutbox;
const repo = (app: App) => (app as unknown as { testStaffRepo: InMemoryStaffRepository }).testStaffRepo;
const tokenOf = (t: string) => new URL(t.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('foto-ficticia')]);
const PDF = Buffer.from('%PDF-1.7 comprovante-ficticio');

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

async function submittedCustomer(app: App, n: number) {
  const p = { name: `Cliente Fictício ${n}`, document: ['111.444.777-35', '529.982.247-25'][n]!, email: `c${n}@sandbox.invalid`, phone: '11999990000', password: 'senha-forte-123', acceptTerms: true };
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: p });
  await verifyEmail(app, p.email);
  const token = (await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: p.email, password: p.password } })).json().data.token as string;
  const h = { authorization: `Bearer ${token}` };
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: h, payload: { birthDate: '1990-05-15', motherName: 'Mãe Fictícia', nationality: 'Brasileira' } });
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/address', headers: h, payload: { cep: '01310100', street: 'Avenida Paulista', number: '1000', district: 'Bela Vista', city: 'São Paulo', state: 'SP' } });
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/declarations', headers: h, payload: { isPep: false, occupation: 'Analista', incomeRange: 'ATE_2K' } });
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/document-type', headers: h, payload: { documentType: 'RG' } });
  for (const [kind, bytes] of [['ID_FRONT', JPEG], ['ID_BACK', JPEG], ['SELFIE', JPEG], ['PROOF_OF_ADDRESS', PDF]] as const) {
    await app.inject({ method: 'POST', url: `/v1/customers/kyc/documents/${kind}`, headers: { ...h, 'content-type': 'application/octet-stream' }, payload: bytes });
  }
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/kyc/submit', headers: h, payload: {} })).statusCode, 200);
  return (await app.inject({ method: 'GET', url: '/v1/customers/me', headers: h })).json().data.profile.id as string;
}

test('Dashboard: números reais, 12 meses, pendências mais antigas primeiro, atividade sem IP', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const admin = await staffLogin(app, 'ana@sandbox.invalid', 'ADMIN');
  const first = await submittedCustomer(app, 0);
  const second = await submittedCustomer(app, 1);
  const h = { authorization: `Bearer ${admin}` };
  const decision = await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${second}/decision`, headers: h, payload: { decision: 'APPROVED' } });
  assert.equal(decision.statusCode, 200, decision.body);

  const r = await app.inject({ method: 'GET', url: '/v1/staff/dashboard', headers: h });
  assert.equal(r.statusCode, 200, r.body);
  const d = r.json().data.dashboard;
  assert.equal(d.customers, 2);
  assert.equal(d.newCustomers30d, 2);
  assert.equal(d.pending.kyc, 1);
  assert.equal(d.kyc.APPROVED, 1);
  assert.equal(d.series.length, 12);
  assert.equal(d.series.at(-1).month, monthKey(new Date()));
  assert.equal(d.series.at(-1).pf, 2);
  assert.equal(d.review.last30Days, 1);
  assert.ok(typeof d.review.avgHours === 'number' && d.review.avgHours >= 0);
  assert.deepEqual(d.priorities.map((p: { id: string; kind: string }) => [p.kind, p.id]), [['KYC', first]]);
  assert.equal(d.priorities[0].name, 'Cliente Fictício 0');
  const act = d.activity.find((a: { event: string }) => a.event === 'STAFF_KYC_DECISION');
  assert.equal(act.decision, 'APPROVED');
  assert.equal(act.subject, 'Cliente Fictício 1');
  assert.equal(act.staffName, 'Ana Admin');
  assert.doesNotMatch(JSON.stringify(d), /"ip"|127\.0\.0\.1/);

  const b = await app.inject({ method: 'GET', url: '/v1/staff/badges', headers: h });
  assert.deepEqual(b.json().data.badges, { kyc: 1, companies: 0 });
  await app.close();
});

test('Dashboard e contadores exigem login da equipe; analista também vê (só leitura)', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/dashboard' })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/badges' })).statusCode, 401);
  const admin = await staffLogin(app, 'ana@sandbox.invalid', 'ADMIN');
  const analyst = await staffLogin(app, 'beto@sandbox.invalid', 'ANALYST', admin);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/dashboard', headers: { authorization: `Bearer ${analyst}` } })).statusCode, 200);
  await app.close();
});

test('mês no fuso de Brasília: 1º de dezembro às 01:00 UTC ainda é novembro', () => {
  assert.equal(monthKey(new Date('2026-12-01T01:00:00Z')), '2026-11');
  assert.equal(monthKey(new Date('2026-12-01T04:00:00Z')), '2026-12');
});

// Etapa B: IP completo só para administradores.
test('maskIp: IPv4, IPv4 mapeado, IPv6 e vazio', () => {
  assert.equal(maskIp('189.45.120.33'), '189.45.•••.•••');
  assert.equal(maskIp('::ffff:10.1.2.3'), '10.1.•••.•••');
  assert.equal(maskIp('2804:14c:65a1:4021::1'), '2804:14c:•••');
  assert.equal(maskIp(null), null);
  assert.equal(maskIp('lixo'), '•••');
});

test('ficha do cliente: analista recebe IP mascarado; administrador, completo', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const admin = await staffLogin(app, 'ana@sandbox.invalid', 'ADMIN');
  const analyst = await staffLogin(app, 'beto@sandbox.invalid', 'ANALYST', admin);
  const id = await submittedCustomer(app, 0);
  const asAdmin = (await app.inject({ method: 'GET', url: `/v1/staff/customers/${id}`, headers: { authorization: `Bearer ${admin}` } })).json().data.customer.recentEvents;
  const asAnalyst = (await app.inject({ method: 'GET', url: `/v1/staff/customers/${id}`, headers: { authorization: `Bearer ${analyst}` } })).json().data.customer.recentEvents;
  assert.ok(asAdmin.length > 0 && asAnalyst.length >= asAdmin.length); // a ficha aberta pelo admin também vira evento
  assert.ok(asAdmin.some((e: { ip: string | null }) => e.ip === '127.0.0.1'));
  for (const e of asAnalyst) assert.ok(e.ip === null || e.ip === '127.0.•••.•••', e.ip);
  assert.doesNotMatch(JSON.stringify(asAnalyst), /127\.0\.0\.1/);
  // a auditoria completa continua exclusiva de administradores
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/audit', headers: { authorization: `Bearer ${analyst}` } })).statusCode, 403);
  await app.close();
});
