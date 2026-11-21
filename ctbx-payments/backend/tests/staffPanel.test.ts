import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import type { InMemoryEmailProvider } from '../src/providers/InMemoryEmailProvider.js';
import type { InMemorySecurityAuditRepository } from '../src/repositories/SecurityAuditRepository.js';
import { InMemoryStaffRepository } from '../src/repositories/StaffRepository.js';
import { totpCode, totpStep } from '../src/security/totp.js';
import { StaffAuthService } from '../src/services/staffAuthService.js';
import { verifyEmail } from './helpers/verifyEmail.js';

// Painel da equipe — análise de KYC: convite, 2 etapas, bloqueios,
// permissões, fluxo de decisão, notificações e auditoria.
const config: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: 'https://app.test',
  staff: { enabled: true, appBaseUrl: 'https://admin.test', totpEncryptionKey: undefined },
};
const PASSWORD = 'Senha-Forte-2026!';
const CUSTOMER = { name: 'Cliente Fictício', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('foto-ficticia')]);
const PDF = Buffer.from('%PDF-1.7 comprovante-ficticio');

type App = Awaited<ReturnType<typeof buildApp>>;
const outbox = (app: App) => (app as unknown as { testEmailOutbox: InMemoryEmailProvider }).testEmailOutbox;
const auditLog = (app: App) => (app as unknown as { testAuditLog: InMemorySecurityAuditRepository }).testAuditLog;
const staffRepo = (app: App) => (app as unknown as { testStaffRepo: InMemoryStaffRepository }).testStaffRepo;
const linkToken = (text: string) => new URL(text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
const code = (secret: string, offset = 0) => totpCode(secret, totpStep(new Date()) + offset);

// Convida um usuário da equipe pela API (sessão de um ADMIN).
async function createStaff(app: App, email: string, role: 'ADMIN' | 'ANALYST', inviter: string) {
  const r = await app.inject({ method: 'POST', url: '/v1/staff/users', headers: { authorization: `Bearer ${inviter}` }, payload: { name: `Pessoa ${role}`, email, role } });
  assert.equal(r.statusCode, 201, r.body);
  return email;
}

async function acceptAndLogin(app: App, email: string): Promise<{ token: string; secret: string }> {
  const mail = outbox(app).sent.filter((m) => m.to === email).at(-1)!;
  assert.match(mail.subject, /Convite para o painel/);
  const accepted = await app.inject({ method: 'POST', url: '/v1/staff/invites/accept', payload: { token: linkToken(mail.text!), password: PASSWORD } });
  assert.equal(accepted.statusCode, 200, accepted.body);
  const { enrollmentToken, secret, otpauthUrl } = accepted.json().data;
  assert.match(otpauthUrl, /^otpauth:\/\/totp\//);
  const confirm = await app.inject({ method: 'POST', url: '/v1/staff/invites/confirm', payload: { enrollmentToken, code: code(secret) } });
  assert.equal(confirm.statusCode, 204, confirm.body);
  const login = await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email, password: PASSWORD } });
  assert.equal(login.statusCode, 200, login.body);
  const mfa = await app.inject({ method: 'POST', url: '/v1/staff/auth/mfa', payload: { mfaToken: login.json().data.mfaToken, code: code(secret, 1) } });
  assert.equal(mfa.statusCode, 200, mfa.body);
  return { token: mfa.json().data.token, secret };
}

// Primeiro admin via serviço real (igual ao script), já com convite enviado.
async function bootstrapAdmin(app: App, email = 'admin@sandbox.invalid') {
  const repo = staffRepo(app);
  // O serviço das rotas usa uma chave temporária própria; para o convite
  // basta o token de convite, então reproduzimos o envio pelo mesmo
  // repositório usando um serviço local com e-mail do app.
  const local = new StaffAuthService(repo, Buffer.alloc(32, 1), outbox(app), 'https://admin.test');
  await local.invite({ name: 'Primeira Admin', email, role: 'ADMIN' });
  return email;
}

async function customerWithSubmittedKyc(app: App, p = CUSTOMER) {
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
  const sub = await app.inject({ method: 'POST', url: '/v1/customers/kyc/submit', headers: h, payload: {} });
  assert.equal(sub.statusCode, 200, sub.body);
  const me = (await app.inject({ method: 'GET', url: '/v1/customers/me', headers: h })).json().data.profile;
  return { token, h, customerId: me.id as string };
}

test('invite → strong password → authenticator → login always in two steps', async (t) => {
  const app = await buildApp({ config, providers: {}, logger: false });
  t.after(() => app.close());
  const email = await bootstrapAdmin(app);
  // Senha fraca recusada (o convite continua válido).
  const mail = outbox(app).sent.at(-1)!;
  const weak = await app.inject({ method: 'POST', url: '/v1/staff/invites/accept', payload: { token: linkToken(mail.text!), password: 'curta123' } });
  assert.equal(weak.json().error.code, 'STAFF_PASSWORD_WEAK');
  // Convite de outra chave não serve para este app: o aceite usa a chave do app.
  const accepted = await app.inject({ method: 'POST', url: '/v1/staff/invites/accept', payload: { token: linkToken(mail.text!), password: PASSWORD } });
  assert.equal(accepted.statusCode, 200);
  // O convite é de uso único.
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/invites/accept', payload: { token: linkToken(mail.text!), password: PASSWORD } })).json().error.code, 'STAFF_INVITE_INVALID');
  const { enrollmentToken, secret } = accepted.json().data;
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/invites/confirm', payload: { enrollmentToken, code: '000000' } })).statusCode, 401);
  // Sem confirmar o autenticador, não entra.
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email, password: PASSWORD } })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/invites/confirm', payload: { enrollmentToken, code: code(secret) } })).statusCode, 204);
  const login = await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email, password: PASSWORD } });
  assert.deepEqual(Object.keys(login.json().data), ['mfaToken']); // senha certa ainda NÃO dá acesso
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/kyc/queue', headers: { authorization: `Bearer ${login.json().data.mfaToken}` } })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/auth/mfa', payload: { mfaToken: login.json().data.mfaToken, code: '123456' } })).statusCode, 401);
  const mfa = await app.inject({ method: 'POST', url: '/v1/staff/auth/mfa', payload: { mfaToken: login.json().data.mfaToken, code: code(secret, 1) } });
  assert.equal(mfa.statusCode, 200);
  assert.equal(mfa.json().data.staff.role, 'ADMIN');
  // O mesmo código não vale de novo, nem em outro login.
  const again = await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email, password: PASSWORD } });
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/auth/mfa', payload: { mfaToken: again.json().data.mfaToken, code: code(secret, 1) } })).statusCode, 401);
  // Segredo do autenticador guardado criptografado.
  const stored = staffRepo(app).users[0]!;
  assert.equal(stored.totpSecretEnc!.includes(secret), false);
  assert.ok(stored.passwordHash!.startsWith('$argon2'));
});

test('wrong e-mail and wrong password look the same; 5 errors lock the account, revealed only to who knows the password', async (t) => {
  const app = await buildApp({ config, providers: {}, logger: false });
  t.after(() => app.close());
  const email = await bootstrapAdmin(app);
  await acceptAndLogin(app, email);
  const nobody = await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email: 'ninguem@sandbox.invalid', password: 'x' } });
  const wrong = await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email, password: 'errada' } });
  assert.equal(nobody.statusCode, wrong.statusCode);
  assert.equal(nobody.json().error.code, wrong.json().error.code);
  for (let i = 0; i < 3; i += 1) await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email, password: 'errada' } });
  // 5ª tentativa (passa do limite de 5/min por IP também, então usa o serviço direto)
  const repo = staffRepo(app);
  const user = repo.users[0]!;
  user.failedAttempts = 4;
  const svc = new StaffAuthService(repo, Buffer.alloc(32, 2), undefined, 'https://admin.test');
  await assert.rejects(svc.login(email, 'errada'), (e: unknown) => (e as { code?: string }).code === 'STAFF_LOGIN_INVALID');
  assert.ok(user.lockedUntil && user.lockedUntil > new Date());
  await assert.rejects(svc.login(email, 'errada'), (e: unknown) => (e as { code?: string }).code === 'STAFF_LOGIN_INVALID'); // estranho: nada revelado
  await assert.rejects(svc.login(email, PASSWORD), (e: unknown) => (e as { code?: string }).code === 'STAFF_LOCKED'); // dono da senha: avisado
});

test('sessions end after 30 minutes idle and after 8 hours at most', async () => {
  const repo = new InMemoryStaffRepository();
  let now = new Date('2026-11-21T10:00:00Z');
  const sent: { text?: string }[] = [];
  const svc = new StaffAuthService(repo, Buffer.alloc(32, 3), { send: async (m) => { sent.push(m); return { id: 'x' }; } }, 'https://admin.test', () => now);
  await svc.invite({ name: 'Ana Analista', email: 'a@sandbox.invalid', role: 'ANALYST' });
  const { enrollmentToken, secret } = await svc.acceptInvite(linkToken(sent[0]!.text!), PASSWORD);
  await svc.confirmEnrollment(enrollmentToken, totpCode(secret, totpStep(now)));
  const login = async () => {
    now = new Date(now.getTime() + 60_000);
    const { mfaToken } = await svc.login('a@sandbox.invalid', PASSWORD);
    return (await svc.verifyMfa(mfaToken, totpCode(secret, totpStep(now)))).token;
  };
  const t1 = await login();
  now = new Date(now.getTime() + 29 * 60_000);
  assert.ok(await svc.validateSession(t1));
  now = new Date(now.getTime() + 31 * 60_000);
  assert.equal(await svc.validateSession(t1), null); // ociosa demais
  const t2 = await login();
  for (let i = 0; i < 16; i += 1) { now = new Date(now.getTime() + 29 * 60_000); assert.ok(await svc.validateSession(t2), `hora ${i}`); }
  now = new Date(now.getTime() + 29 * 60_000);
  assert.equal(await svc.validateSession(t2), null); // passou de 8 horas
});

test('permissions: analyst reviews but cannot manage the team; nobody without a staff session gets in', async (t) => {
  const app = await buildApp({ config, providers: {}, logger: false });
  t.after(() => app.close());
  const admin = await acceptAndLogin(app, await bootstrapAdmin(app));
  await createStaff(app, 'analista@sandbox.invalid', 'ANALYST', admin.token);
  const analyst = await acceptAndLogin(app, 'analista@sandbox.invalid');
  const asAnalyst = { authorization: `Bearer ${analyst.token}` };
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/kyc/queue', headers: asAnalyst })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/users', headers: asAnalyst })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/users', headers: asAnalyst, payload: { name: 'X', email: 'x@sandbox.invalid', role: 'ADMIN' } })).statusCode, 403);
  // Cliente logado não tem acesso ao painel.
  const { token: customerToken, customerId } = await customerWithSubmittedKyc(app);
  for (const url of ['/v1/staff/kyc/queue', `/v1/staff/kyc/cases/${customerId}`]) {
    assert.equal((await app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${customerToken}` } })).statusCode, 401);
    assert.equal((await app.inject({ method: 'GET', url })).statusCode, 401);
  }
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${customerId}/decision`, headers: { authorization: `Bearer ${customerToken}` }, payload: { decision: 'APPROVED' } })).statusCode, 401);
  // Admin desativa o analista: sessões encerradas na hora; não pode desativar a si mesma.
  const analystId = staffRepo(app).users.find((u) => u.email === 'analista@sandbox.invalid')!.id;
  const adminId = staffRepo(app).users.find((u) => u.role === 'ADMIN')!.id;
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/users/${adminId}/disable`, headers: { authorization: `Bearer ${admin.token}` }, payload: {} })).statusCode, 409);
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/users/${analystId}/disable`, headers: { authorization: `Bearer ${admin.token}` }, payload: {} })).statusCode, 204);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/kyc/queue', headers: asAnalyst })).statusCode, 401);
});

test('full review: queue → case → documents (decrypted, no-store) → request changes → customer fixes and resubmits → approve', async (t) => {
  const app = await buildApp({ config, providers: {}, logger: false });
  t.after(() => app.close());
  const admin = await acceptAndLogin(app, await bootstrapAdmin(app));
  await createStaff(app, 'analista@sandbox.invalid', 'ANALYST', admin.token);
  const analyst = await acceptAndLogin(app, 'analista@sandbox.invalid');
  const s = { authorization: `Bearer ${analyst.token}` };
  const { h, customerId } = await customerWithSubmittedKyc(app);

  const queue = (await app.inject({ method: 'GET', url: '/v1/staff/kyc/queue', headers: s })).json().data.items;
  assert.equal(queue.length, 1);
  assert.equal(queue[0].documentMasked, '***.444.***-**');
  const kase = (await app.inject({ method: 'GET', url: `/v1/staff/kyc/cases/${customerId}`, headers: s })).json().data.case;
  assert.equal(kase.customer.document, '11144477735'); // analista vê o CPF completo para conferir o documento
  assert.equal(kase.documents.length, 4);
  const selfie = kase.documents.find((d: { kind: string }) => d.kind === 'SELFIE');
  const file = await app.inject({ method: 'GET', url: `/v1/staff/kyc/cases/${customerId}/documents/${selfie.id}`, headers: s });
  assert.equal(file.statusCode, 200);
  assert.deepEqual(file.rawPayload, JPEG); // exatamente o arquivo enviado
  assert.equal(file.headers['cache-control'], 'no-store, private');
  assert.equal(file.headers['content-type'], 'image/jpeg');
  // Documento de outro cliente pelo caminho errado: não abre.
  assert.equal((await app.inject({ method: 'GET', url: `/v1/staff/kyc/cases/00000000-0000-4000-8000-000000000000/documents/${selfie.id}`, headers: s })).statusCode, 404);

  // Pedir ajustes exige motivo.
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${customerId}/decision`, headers: s, payload: { decision: 'CHANGES_REQUESTED' } })).json().error.code, 'KYC_REASON_REQUIRED');
  const reason = 'A foto do documento está desfocada. Envie uma foto nítida da frente.';
  const changes = await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${customerId}/decision`, headers: s, payload: { decision: 'CHANGES_REQUESTED', reason } });
  assert.equal(changes.statusCode, 200);
  assert.equal(changes.json().data.notified, true);
  assert.ok(outbox(app).sent.some((m) => m.to === CUSTOMER.email && /ajuste/i.test(m.subject) && m.text!.includes(reason)));
  // O cliente vê o motivo, corrige e reenvia.
  const kyc1 = (await app.inject({ method: 'GET', url: '/v1/customers/kyc', headers: h })).json().data.kyc;
  assert.equal(kyc1.status, 'CHANGES_REQUESTED');
  assert.equal(kyc1.editable, true);
  assert.equal(kyc1.review.reason, reason);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/kyc/documents/ID_FRONT', headers: { ...h, 'content-type': 'image/jpeg' }, payload: JPEG })).statusCode, 201);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/kyc/submit', headers: h, payload: {} })).json().data.kyc.status, 'SUBMITTED');
  // Aprovação.
  const ok = await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${customerId}/decision`, headers: s, payload: { decision: 'APPROVED' } });
  assert.equal(ok.json().data.status, 'APPROVED');
  assert.ok(outbox(app).sent.some((m) => m.to === CUSTOMER.email && /verificada/i.test(m.subject)));
  // Uma segunda decisão no mesmo caso é recusada (ninguém decide duas vezes).
  assert.equal((await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${customerId}/decision`, headers: s, payload: { decision: 'REJECTED', reason: 'Tentativa de decidir de novo.' } })).statusCode, 409);
  const kyc2 = (await app.inject({ method: 'GET', url: '/v1/customers/kyc', headers: h })).json().data.kyc;
  assert.equal(kyc2.status, 'APPROVED');
  assert.equal(kyc2.editable, false);
  const history = (await app.inject({ method: 'GET', url: `/v1/staff/kyc/cases/${customerId}`, headers: s })).json().data.case.reviews;
  assert.deepEqual(history.map((r: { decision: string }) => r.decision), ['APPROVED', 'CHANGES_REQUESTED']);
  assert.equal(history[0].staffName, 'Pessoa ANALYST');
});

test('approval does NOT unlock any financial operation', async (t) => {
  const app = await buildApp({ config, providers: {}, logger: false });
  t.after(() => app.close());
  const admin = await acceptAndLogin(app, await bootstrapAdmin(app));
  const { h, customerId } = await customerWithSubmittedKyc(app);
  await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${customerId}/decision`, headers: { authorization: `Bearer ${admin.token}` }, payload: { decision: 'APPROVED' } });
  for (const url of ['/v1/accounts/current', '/v1/accounts/current/balances', '/v1/cards']) {
    const r = await app.inject({ method: 'GET', url, headers: h });
    assert.ok(r.statusCode >= 400, `${url} respondeu ${r.statusCode}`);
  }
});

test('a rejection is final for the customer and shows the reason', async (t) => {
  const app = await buildApp({ config, providers: {}, logger: false });
  t.after(() => app.close());
  const admin = await acceptAndLogin(app, await bootstrapAdmin(app));
  const { h, customerId } = await customerWithSubmittedKyc(app);
  const reason = 'Documento apresentado não corresponde aos dados informados.';
  await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${customerId}/decision`, headers: { authorization: `Bearer ${admin.token}` }, payload: { decision: 'REJECTED', reason } });
  const kyc = (await app.inject({ method: 'GET', url: '/v1/customers/kyc', headers: h })).json().data.kyc;
  assert.equal(kyc.status, 'REJECTED');
  assert.equal(kyc.editable, false);
  assert.equal(kyc.review.reason, reason);
  assert.equal((await app.inject({ method: 'PUT', url: '/v1/customers/kyc/address', headers: h, payload: { cep: '01310100', street: 'Rua', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP' } })).json().error.code, 'KYC_LOCKED');
  assert.ok(outbox(app).sent.some((m) => m.to === CUSTOMER.email && /Não foi possível verificar/.test(m.subject)));
});

test('every staff access and decision is audited with who, which customer and outcome — never the reason, CPF or file', async (t) => {
  const app = await buildApp({ config, providers: {}, logger: false });
  t.after(() => app.close());
  const admin = await acceptAndLogin(app, await bootstrapAdmin(app));
  const s = { authorization: `Bearer ${admin.token}` };
  const { customerId } = await customerWithSubmittedKyc(app);
  const kase = (await app.inject({ method: 'GET', url: `/v1/staff/kyc/cases/${customerId}`, headers: s })).json().data.case;
  await app.inject({ method: 'GET', url: `/v1/staff/kyc/cases/${customerId}/documents/${kase.documents[0].id}`, headers: s });
  const reason = 'Motivo detalhado com dados do cliente 111.444.777-35 que não pode ir para o log.';
  await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${customerId}/decision`, headers: s, payload: { decision: 'CHANGES_REQUESTED', reason } });
  const events = auditLog(app).events.filter((e) => e.event.startsWith('STAFF_'));
  const adminId = staffRepo(app).users[0]!.id;
  for (const name of ['STAFF_LOGIN_PASSWORD', 'STAFF_LOGIN_MFA', 'STAFF_KYC_CASE_VIEW', 'STAFF_KYC_DOCUMENT_VIEW', 'STAFF_KYC_DECISION']) {
    const e = events.find((x) => x.event === name && x.outcome === 'SUCCESS');
    assert.ok(e, name);
    assert.equal(e!.staffId, adminId, name);
  }
  assert.equal(events.find((e) => e.event === 'STAFF_KYC_DOCUMENT_VIEW')!.customerId, customerId);
  assert.equal(events.find((e) => e.event === 'STAFF_KYC_DECISION')!.details!.decision, 'CHANGES_REQUESTED');
  const dump = JSON.stringify(auditLog(app).events);
  for (const secret of [reason, '11144477735', '111.444.777-35', PASSWORD, admin.token, 'foto-ficticia']) assert.equal(dump.includes(secret), false, secret);
});

test('in production the staff panel stays OFF unless explicitly enabled and configured', async (t) => {
  const app = await buildApp({ config: { ...config, nodeEnv: 'production', staff: { enabled: false, appBaseUrl: 'https://admin.test', totpEncryptionKey: Buffer.alloc(32, 9).toString('base64') } }, providers: {}, logger: false });
  t.after(() => app.close());
  assert.equal((await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email: 'a@b.c', password: 'x' } })).statusCode, 404);
  const app2 = await buildApp({ config: { ...config, nodeEnv: 'production', staff: { enabled: true, appBaseUrl: 'https://admin.test', totpEncryptionKey: undefined } }, providers: {}, logger: false });
  t.after(() => app2.close());
  assert.equal((await app2.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email: 'a@b.c', password: 'x' } })).statusCode, 404);
});
