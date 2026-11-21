import assert from 'node:assert/strict';
import type { buildApp } from '../../src/app.js';
import type { InMemoryEmailProvider } from '../../src/providers/InMemoryEmailProvider.js';
import type { InMemoryStaffRepository } from '../../src/repositories/StaffRepository.js';
import { totpCode, totpStep } from '../../src/security/totp.js';
import { StaffAuthService } from '../../src/services/staffAuthService.js';
import { verifyEmail } from './verifyEmail.js';

// Passos reaproveitados pelos testes: equipe com 2 etapas, cliente com KYC
// enviado/aprovado. Tudo com dados fictícios e e-mail em memória.
type App = Awaited<ReturnType<typeof buildApp>>;
export const STAFF_PASSWORD = 'Senha-Forte-2026!';
export const outbox = (app: App) => (app as unknown as { testEmailOutbox: InMemoryEmailProvider }).testEmailOutbox;
const staffRepo = (app: App) => (app as unknown as { testStaffRepo: InMemoryStaffRepository }).testStaffRepo;
const linkToken = (text: string) => new URL(text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('foto-ficticia')]);
const PDF = Buffer.from('%PDF-1.7 comprovante-ficticio');

export async function staffSession(app: App, email = 'admin@sandbox.invalid'): Promise<{ authorization: string }> {
  await new StaffAuthService(staffRepo(app), Buffer.alloc(32, 1), outbox(app), 'https://admin.test').invite({ name: 'Admin Teste', email, role: 'ADMIN' });
  const mail = outbox(app).sent.filter((m) => m.to === email).at(-1)!;
  const acc = (await app.inject({ method: 'POST', url: '/v1/staff/invites/accept', payload: { token: linkToken(mail.text!), password: STAFF_PASSWORD } })).json().data;
  const step = totpStep(new Date());
  await app.inject({ method: 'POST', url: '/v1/staff/invites/confirm', payload: { enrollmentToken: acc.enrollmentToken, code: totpCode(acc.secret, step) } });
  const mfaToken = (await app.inject({ method: 'POST', url: '/v1/staff/auth/login', payload: { email, password: STAFF_PASSWORD } })).json().data.mfaToken;
  const r = await app.inject({ method: 'POST', url: '/v1/staff/auth/mfa', payload: { mfaToken, code: totpCode(acc.secret, step + 1) } });
  assert.equal(r.statusCode, 200, r.body);
  return { authorization: `Bearer ${r.json().data.token}` };
}

export interface CustomerInput { name: string; document: string; email: string; phone: string; password: string }

export async function customerSession(app: App, p: CustomerInput) {
  await app.inject({ method: 'POST', url: '/v1/customers/register', payload: p });
  await verifyEmail(app, p.email);
  const token = (await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: p.email, password: p.password } })).json().data.token as string;
  const h = { authorization: `Bearer ${token}` };
  const id = (await app.inject({ method: 'GET', url: '/v1/customers/me', headers: h })).json().data.profile.id as string;
  return { h, id };
}

export async function submitKyc(app: App, h: { authorization: string }) {
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/personal-info', headers: h, payload: { birthDate: '1990-05-15', motherName: 'Mãe Fictícia', nationality: 'Brasileira' } });
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/address', headers: h, payload: { cep: '01310100', street: 'Avenida Paulista', number: '1000', district: 'Bela Vista', city: 'São Paulo', state: 'SP' } });
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/declarations', headers: h, payload: { isPep: false, occupation: 'Empresária', incomeRange: 'ATE_2K' } });
  await app.inject({ method: 'PUT', url: '/v1/customers/kyc/document-type', headers: h, payload: { documentType: 'RG' } });
  for (const [kind, bytes] of [['ID_FRONT', JPEG], ['ID_BACK', JPEG], ['SELFIE', JPEG], ['PROOF_OF_ADDRESS', PDF]] as const) {
    await app.inject({ method: 'POST', url: `/v1/customers/kyc/documents/${kind}`, headers: { ...h, 'content-type': 'application/octet-stream' }, payload: bytes });
  }
  assert.equal((await app.inject({ method: 'POST', url: '/v1/customers/kyc/submit', headers: h, payload: {} })).statusCode, 200);
}

export async function approvedCustomer(app: App, staff: { authorization: string }, p: CustomerInput) {
  const c = await customerSession(app, p);
  await submitKyc(app, c.h);
  const r = await app.inject({ method: 'POST', url: `/v1/staff/kyc/cases/${c.id}/decision`, headers: staff, payload: { decision: 'APPROVED' } });
  assert.equal(r.statusCode, 200, r.body);
  return c;
}
