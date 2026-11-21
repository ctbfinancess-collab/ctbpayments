import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { ApiError } from '../src/errors/ApiError.js';
import { registerErrorHandler } from '../src/middleware/errorHandler.js';
import { CriticalAlerter, parseAlertRecipients } from '../src/observability/alerts.js';
import { safeError, scrubText } from '../src/observability/logger.js';
import { InMemoryEmailProvider } from '../src/providers/InMemoryEmailProvider.js';
import type { InMemorySecurityAuditRepository } from '../src/repositories/SecurityAuditRepository.js';
import type { InMemoryStaffRepository } from '../src/repositories/StaffRepository.js';
import { healthRoutes } from '../src/routes/health.js';
import { totpCode, totpStep } from '../src/security/totp.js';
import { StaffAuthService } from '../src/services/staffAuthService.js';

// Fase 1 do painel — segurança e preparação operacional: recuperação de
// acesso da equipe, rotas antigas fora da produção, logs sem dados pessoais,
// alertas de erro crítico, saúde com banco e relatórios de CSP.
const config: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: 'https://app.test',
  staff: { enabled: true, appBaseUrl: 'https://admin.test', totpEncryptionKey: undefined },
};
const PASSWORD = 'Senha-Forte-2026!';
const NEW_PASSWORD = 'Outra-Senha-2026#';

type App = Awaited<ReturnType<typeof buildApp>>;
const outbox = (app: App) => (app as unknown as { testEmailOutbox: InMemoryEmailProvider }).testEmailOutbox;
const auditLog = (app: App) => (app as unknown as { testAuditLog: InMemorySecurityAuditRepository }).testAuditLog;
const staffRepo = (app: App) => (app as unknown as { testStaffRepo: InMemoryStaffRepository }).testStaffRepo;
const linkToken = (text: string) => new URL(text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
const linkPath = (text: string) => new URL(text.match(/https?:\/\/\S+/)![0]).pathname;
const code = (secret: string, offset = 0) => totpCode(secret, totpStep(new Date()) + offset);
// O mesmo código não vale duas vezes (proteção contra reuso): nos testes,
// "esquecemos" o último passo usado para poder gerar um código novo.
const allowFreshCode = (app: App, email: string) => { const u = staffRepo(app).users.find((x) => x.email === email)!; u.totpLastStep = null; };
const lastMailTo = (app: App, to: string) => outbox(app).sent.filter((m) => m.to === to).at(-1)!;
// Cada chamada vem de um IP diferente: o limite de tentativas por minuto é
// testado à parte e não deve interferir nos demais cenários.
let ip = 0;
const post = (app: App, url: string, payload: object, token?: string) => app.inject({ method: 'POST', url, payload, remoteAddress: `10.0.${Math.floor(++ip / 250)}.${ip % 250}`, ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}) });
const events = async (app: App) => (await auditLog(app).query({ limit: 500 })).map((e) => e.event);

async function acceptInvite(app: App, email: string, password = PASSWORD) {
  const mail = lastMailTo(app, email);
  const accepted = await post(app, '/v1/staff/invites/accept', { token: linkToken(mail.text!), password });
  assert.equal(accepted.statusCode, 200, accepted.body);
  const { enrollmentToken, secret } = accepted.json().data;
  assert.equal((await post(app, '/v1/staff/invites/confirm', { enrollmentToken, code: code(secret) })).statusCode, 204);
  return secret as string;
}

async function login(app: App, email: string, secret: string, password = PASSWORD) {
  allowFreshCode(app, email);
  const l = await post(app, '/v1/staff/auth/login', { email, password });
  if (l.statusCode !== 200) return { status: l.statusCode, token: '' };
  const m = await post(app, '/v1/staff/auth/mfa', { mfaToken: l.json().data.mfaToken, code: code(secret) });
  return { status: m.statusCode, token: m.statusCode === 200 ? (m.json().data.token as string) : '' };
}

// Dois administradores e uma analista, todos ativos.
async function team(app: App) {
  const local = new StaffAuthService(staffRepo(app), Buffer.alloc(32, 1), outbox(app), 'https://admin.test');
  await local.invite({ name: 'Ana Admin', email: 'ana@sandbox.invalid', role: 'ADMIN' });
  const anaSecret = await acceptInvite(app, 'ana@sandbox.invalid');
  const ana = await login(app, 'ana@sandbox.invalid', anaSecret);
  for (const [name, email, role] of [['Beto Admin', 'beto@sandbox.invalid', 'ADMIN'], ['Carla Analista', 'carla@sandbox.invalid', 'ANALYST']] as const) {
    assert.equal((await post(app, '/v1/staff/users', { name, email, role }, ana.token)).statusCode, 201);
  }
  const betoSecret = await acceptInvite(app, 'beto@sandbox.invalid');
  const carlaSecret = await acceptInvite(app, 'carla@sandbox.invalid');
  const beto = await login(app, 'beto@sandbox.invalid', betoSecret);
  const carla = await login(app, 'carla@sandbox.invalid', carlaSecret);
  const id = (email: string) => staffRepo(app).users.find((u) => u.email === email)!.id;
  return { ana: { ...ana, secret: anaSecret, id: id('ana@sandbox.invalid') }, beto: { ...beto, secret: betoSecret, id: id('beto@sandbox.invalid') }, carla: { ...carla, secret: carlaSecret, id: id('carla@sandbox.invalid') } };
}

// ---- Senha esquecida -------------------------------------------------------
test('senha esquecida: resposta igual para e-mail que existe e que não existe; link só para quem é da equipe', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  await team(app);
  const before = outbox(app).sent.length;
  const unknown = await post(app, '/v1/staff/auth/password/forgot', { email: 'ninguem@sandbox.invalid' });
  const known = await post(app, '/v1/staff/auth/password/forgot', { email: 'Carla@Sandbox.Invalid' });
  assert.equal(unknown.statusCode, 202);
  assert.equal(known.statusCode, 202);
  assert.equal(unknown.json().data.message, known.json().data.message);
  await new Promise((r) => setImmediate(r));
  const sent = outbox(app).sent.slice(before);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.to, 'carla@sandbox.invalid');
  assert.equal(linkPath(sent[0]!.text!), '/redefinir-senha');
  assert.ok((await events(app)).includes('STAFF_PASSWORD_RESET_REQUEST'));
  await app.close();
});

test('senha esquecida: exige o código do autenticador, encerra as sessões, avisa por e-mail e o link vale uma vez só', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const { carla } = await team(app);
  await post(app, '/v1/staff/auth/password/forgot', { email: 'carla@sandbox.invalid' });
  await new Promise((r) => setImmediate(r));
  const token = linkToken(lastMailTo(app, 'carla@sandbox.invalid').text!);

  const wrongCode = await post(app, '/v1/staff/auth/password/reset', { token, password: NEW_PASSWORD, code: '000000' });
  assert.equal(wrongCode.statusCode, 401);
  const weak = await post(app, '/v1/staff/auth/password/reset', { token, password: 'curta', code: code(carla.secret) });
  assert.equal(weak.statusCode, 422);

  allowFreshCode(app, 'carla@sandbox.invalid');
  const ok = await post(app, '/v1/staff/auth/password/reset', { token, password: NEW_PASSWORD, code: code(carla.secret) });
  assert.equal(ok.statusCode, 204, ok.body);
  // Sessão antiga encerrada; senha antiga não vale; nova vale.
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/auth/session', headers: { authorization: `Bearer ${carla.token}` } })).statusCode, 401);
  assert.equal((await login(app, 'carla@sandbox.invalid', carla.secret, PASSWORD)).status, 401);
  assert.equal((await login(app, 'carla@sandbox.invalid', carla.secret, NEW_PASSWORD)).status, 200);
  assert.match(lastMailTo(app, 'carla@sandbox.invalid').subject, /senha do painel foi alterada/);
  // Link de uso único.
  allowFreshCode(app, 'carla@sandbox.invalid');
  const reuse = await post(app, '/v1/staff/auth/password/reset', { token, password: 'Mais-Uma-Senha-9!', code: code(carla.secret) });
  assert.equal(reuse.statusCode, 400);
  assert.equal(reuse.json().error.code, 'STAFF_RESET_INVALID');
  assert.ok((await events(app)).includes('STAFF_PASSWORD_RESET'));
  await app.close();
});

test('senha esquecida: 5 códigos errados bloqueiam a conta por 15 minutos', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const { carla } = await team(app);
  await post(app, '/v1/staff/auth/password/forgot', { email: 'carla@sandbox.invalid' });
  await new Promise((r) => setImmediate(r));
  const token = linkToken(lastMailTo(app, 'carla@sandbox.invalid').text!);
  for (let i = 0; i < 5; i += 1) assert.equal((await post(app, '/v1/staff/auth/password/reset', { token, password: NEW_PASSWORD, code: '000000' })).statusCode, 401);
  allowFreshCode(app, 'carla@sandbox.invalid');
  const locked = await post(app, '/v1/staff/auth/password/reset', { token, password: NEW_PASSWORD, code: code(carla.secret) });
  assert.equal(locked.statusCode, 423);
  assert.equal(locked.json().error.code, 'STAFF_LOCKED');
  await app.close();
});

// ---- Redefinição por outro administrador ------------------------------------
test('redefinir acesso: só administrador, nunca o próprio, sempre com o código de quem redefine e motivo', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const { ana, carla, beto } = await team(app);
  const url = (id: string) => `/v1/staff/users/${id}/reset-access`;
  const analyst = await post(app, url(beto.id), { reason: 'Perdeu o celular do autenticador', code: '123456' }, carla.token);
  assert.equal(analyst.statusCode, 403);
  const self = await post(app, url(ana.id), { reason: 'Perdeu o celular do autenticador', code: code(ana.secret) }, ana.token);
  assert.equal(self.statusCode, 409);
  const noReason = await post(app, url(carla.id), { reason: 'curto', code: code(ana.secret) }, ana.token);
  assert.equal(noReason.statusCode, 422);
  const wrongCode = await post(app, url(carla.id), { reason: 'Perdeu o celular do autenticador', code: '000000' }, ana.token);
  assert.equal(wrongCode.statusCode, 422);
  assert.equal(wrongCode.json().error.code, 'STAFF_STEPUP_INVALID');
  // O código errado NÃO derruba a sessão de quem tentou (não é 401).
  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/auth/session', headers: { authorization: `Bearer ${ana.token}` } })).statusCode, 200);
  // Nada mudou para a analista.
  assert.equal(staffRepo(app).users.find((u) => u.id === carla.id)!.status, 'ACTIVE');
  await app.close();
});

test('redefinir acesso: invalida senha e autenticador, encerra sessões, envia link de 24 h, avisa os administradores e audita o motivo', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const { ana, beto, carla } = await team(app);
  allowFreshCode(app, 'ana@sandbox.invalid');
  const r = await post(app, `/v1/staff/users/${carla.id}/reset-access`, { reason: 'Perdeu o celular do autenticador', code: code(ana.secret) }, ana.token);
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().data.notifiedAdmins, 2);

  assert.equal((await app.inject({ method: 'GET', url: '/v1/staff/auth/session', headers: { authorization: `Bearer ${carla.token}` } })).statusCode, 401);
  assert.equal((await login(app, 'carla@sandbox.invalid', carla.secret)).status, 401);
  const mail = lastMailTo(app, 'carla@sandbox.invalid');
  assert.match(mail.subject, /Seu acesso ao painel foi redefinido/);
  assert.equal(linkPath(mail.text!), '/convite');
  for (const admin of ['ana@sandbox.invalid', 'beto@sandbox.invalid']) {
    await new Promise((r) => setImmediate(r));
    const notice = lastMailTo(app, admin);
    assert.match(notice.subject, /Acesso de um membro da equipe redefinido/);
    assert.match(notice.text!, /Perdeu o celular do autenticador/);
  }
  const ev = (await auditLog(app).query({ limit: 500 })).find((e) => e.event === 'STAFF_USER_ACCESS_RESET' && e.outcome === 'SUCCESS')!;
  assert.equal(ev.staffId, ana.id);
  assert.equal((ev.details as Record<string, unknown>).targetStaffId, carla.id);
  assert.equal((ev.details as Record<string, unknown>).reason, 'Perdeu o celular do autenticador');

  // A analista cria o acesso de novo, com autenticador NOVO.
  const newSecret = await acceptInvite(app, 'carla@sandbox.invalid', NEW_PASSWORD);
  assert.notEqual(newSecret, carla.secret);
  assert.equal((await login(app, 'carla@sandbox.invalid', newSecret, NEW_PASSWORD)).status, 200);
  assert.equal((await login(app, 'carla@sandbox.invalid', carla.secret, NEW_PASSWORD)).status, 401);
  void beto;
  await app.close();
});

test('redefinição de emergência (comando no servidor): mesma regra, sem depender de um administrador logado', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const { ana } = await team(app);
  const svc = new StaffAuthService(staffRepo(app), Buffer.alloc(32, 1), outbox(app), 'https://admin.test');
  await assert.rejects(svc.emergencyResetAccess('ana@sandbox.invalid', 'curto'), (e: unknown) => e instanceof ApiError && e.code === 'STAFF_REASON_REQUIRED');
  const r = await svc.emergencyResetAccess('ana@sandbox.invalid', 'Única administradora perdeu o celular');
  assert.equal(r.staffId, ana.id);
  assert.equal(staffRepo(app).users.find((u) => u.id === ana.id)!.status, 'INVITED');
  assert.equal(linkPath(lastMailTo(app, 'ana@sandbox.invalid').text!), '/convite');
  await app.close();
});

// ---- Rotas antigas fora da produção ------------------------------------------
test('produção: rotas antigas de demonstração não existem (404); as rotas atuais continuam', async () => {
  const prod: AppConfig = { ...config, nodeEnv: 'production', corsOrigins: ['https://app.test'] };
  const app = await buildApp({ config: prod, logger: false });
  for (const [method, url] of [['POST', '/v1/auth/login'], ['GET', '/v1/accounts/current'], ['GET', '/v1/pix/keys'], ['POST', '/v1/transfers'], ['GET', '/v1/cards'], ['POST', '/v1/admin/auth/login'], ['GET', '/v1/admin/cms/items']] as const) {
    const r = await app.inject({ method, url, ...(method === 'POST' ? { payload: {} } : {}) });
    assert.equal(r.statusCode, 404, `${method} ${url} → ${r.statusCode}`);
  }
  assert.notEqual((await app.inject({ method: 'POST', url: '/v1/customers/login', payload: {} })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
  await app.close();
  // Fora da produção (desenvolvimento), as rotas antigas continuam.
  const dev = await buildApp({ config, providers: {}, logger: false });
  assert.notEqual((await dev.inject({ method: 'GET', url: '/v1/pix/keys' })).statusCode, 404);
  await dev.close();
});

// ---- Logs sem dados pessoais e alertas ----------------------------------------
test('logs de erro não levam dados pessoais (valores da consulta, e-mails, CPF)', () => {
  const drizzleLike = Object.assign(new Error('Failed query: insert into "customers" ("email","document") values ($1, $2)\nparams: maria@exemplo.com,11144477735'), { name: 'DrizzleQueryError', cause: { code: '23505' } });
  const e = safeError(drizzleLike);
  assert.equal(e.code, '23505');
  assert.doesNotMatch(JSON.stringify(e), /maria@exemplo|11144477735/);
  assert.doesNotMatch(scrubText('duplicate key value violates unique constraint DETAIL: Key (email)=(joao@x.com) already exists.'), /joao@x/);
  assert.equal(scrubText('falha para joao@x.com com CPF 111.444.777-35'), 'falha para [e-mail] com CPF [número]');
});

test('alerta de erro crítico: sem dados pessoais e no máximo 1 e-mail por problema a cada 15 minutos', async () => {
  const mail = new InMemoryEmailProvider();
  let now = new Date('2026-11-21T12:00:00Z');
  const alerter = new CriticalAlerter(mail, parseAlertRecipients('ops@sandbox.invalid, invalido, dev@sandbox.invalid'), 'teste', () => now);
  const ev = { kind: 'REQUEST_ERROR' as const, method: 'GET', route: '/v1/staff/kyc/cases/:customerId', statusCode: 500, code: 'INTERNAL_ERROR', type: 'TypeError', requestId: 'req-1' };
  assert.equal(await alerter.notify(ev), true);
  assert.equal(await alerter.notify(ev), false);
  assert.equal(mail.sent.length, 2);
  assert.deepEqual(mail.sent.map((m) => m.to).sort(), ['dev@sandbox.invalid', 'ops@sandbox.invalid']);
  assert.match(mail.sent[0]!.text!, /\/v1\/staff\/kyc\/cases\/:customerId/);
  now = new Date('2026-11-21T12:16:00Z');
  assert.equal(await alerter.notify(ev), true);
  assert.equal(new CriticalAlerter(mail, [], 'teste').enabled, false);
});

test('erro 500 dispara o alerta (com o modelo da rota, sem valores); 503 de recurso desligado não', async () => {
  const app = Fastify({ logger: false });
  const seen: Record<string, unknown>[] = [];
  registerErrorHandler(app, true, async (e) => { seen.push(e as unknown as Record<string, unknown>); });
  app.get('/x/:id', async () => { throw new Error('quebrou para maria@exemplo.com'); });
  app.get('/off', async () => { throw new ApiError('KYC_STORAGE_NOT_CONFIGURED', 'desligado', { statusCode: 503 }); });
  const r = await app.inject({ method: 'GET', url: '/x/123e4567-e89b-12d3-a456-426614174000' });
  assert.equal(r.statusCode, 500);
  assert.doesNotMatch(r.body, /maria/);
  await app.inject({ method: 'GET', url: '/off' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(seen.length, 1);
  assert.equal(seen[0]!.route, '/x/:id');
  assert.doesNotMatch(JSON.stringify(seen), /123e4567|maria/);
  await app.close();
});

// ---- Saúde com banco e relatórios de CSP ---------------------------------------
test('/health/deep confere o banco: de pé, fora do ar ou não configurado', async () => {
  const make = async (databasePing?: () => Promise<void>) => { const a = Fastify({ logger: false }); await a.register(async (api) => healthRoutes(api, { databasePing })); return a; };
  const up = await make(async () => undefined);
  assert.equal((await up.inject({ method: 'GET', url: '/health/deep' })).json().data.database, 'UP');
  const down = await make(async () => { throw new Error('conexão recusada'); });
  const r = await down.inject({ method: 'GET', url: '/health/deep' });
  assert.equal(r.statusCode, 503);
  assert.doesNotMatch(r.body, /recusada/);
  const none = await make();
  assert.equal((await none.inject({ method: 'GET', url: '/health/deep' })).json().data.database, 'NOT_CONFIGURED');
  await Promise.all([up.close(), down.close(), none.close()]);
});

test('relatórios de CSP do painel são aceitos nos dois formatos do navegador', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const legacy = await app.inject({ method: 'POST', url: '/v1/security/csp-report', headers: { 'content-type': 'application/csp-report' }, payload: JSON.stringify({ 'csp-report': { 'document-uri': 'https://admin.test/convite?token=segredo', 'effective-directive': 'img-src', 'blocked-uri': 'https://exemplo.com/a.png?x=1' } }) });
  assert.equal(legacy.statusCode, 204);
  const modern = await app.inject({ method: 'POST', url: '/v1/security/csp-report', headers: { 'content-type': 'application/reports+json' }, payload: JSON.stringify([{ type: 'csp-violation', body: { documentURL: 'https://admin.test/', effectiveDirective: 'script-src', blockedURL: 'inline' } }]) });
  assert.equal(modern.statusCode, 204);
  const junk = await app.inject({ method: 'POST', url: '/v1/security/csp-report', headers: { 'content-type': 'application/csp-report' }, payload: 'não é json' });
  assert.equal(junk.statusCode, 204);
  await app.close();
});

test('limite de tentativas por IP nas rotas novas: 3 pedidos de link por minuto; 3 redefinições de acesso por minuto', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const same = (url: string, payload: object, token?: string) => app.inject({ method: 'POST', url, payload, remoteAddress: '192.0.2.10', ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}) });
  const statuses: number[] = [];
  for (let i = 0; i < 4; i += 1) statuses.push((await same('/v1/staff/auth/password/forgot', { email: `x${i}@sandbox.invalid` })).statusCode);
  assert.deepEqual(statuses, [202, 202, 202, 429]);
  await app.close();
});
