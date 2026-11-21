import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { InMemoryCustomerKycRepository } from '../src/repositories/InMemoryCustomerKycRepository.js';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { InMemoryCustomerSessionRepository } from '../src/repositories/InMemoryCustomerSessionRepository.js';
import type { InMemorySecurityAuditRepository } from '../src/repositories/SecurityAuditRepository.js';
import { CustomerAuthService, LEGAL_TERMS_VERSION } from '../src/services/customerAuthService.js';
import { CustomerKycService, isAdult } from '../src/services/customerKycService.js';
import { registered } from './helpers/verifyEmail.js';

// Fase 7 — aceite dos Termos e da Política no cadastro e bloqueio de
// menores de 18 anos (itens da auditoria da Política de Privacidade).
const config: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};
const BASE = { name: 'Cliente Fictício', document: '111.444.777-35', email: 'aceite@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

test('cadastro sem aceite dos Termos e da Política é recusado (rota e serviço)', async () => {
  const app = await buildApp({ config, providers: {}, logger: false });
  const semCampo = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: BASE });
  assert.equal(semCampo.statusCode, 422);
  const recusado = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: { ...BASE, acceptTerms: false } });
  assert.equal(recusado.statusCode, 422);
  assert.equal(recusado.json().error.code, 'CUSTOMER_TERMS_REQUIRED');
  await app.close();

  const repo = new InMemoryCustomerRepository();
  const svc = new CustomerAuthService(repo, new InMemoryCustomerSessionRepository());
  await assert.rejects(svc.register({ ...BASE, acceptTerms: false }), /aceite os Termos/);
  assert.equal(await repo.findByEmail(BASE.email), undefined);
});

test('cadastro com aceite grava quando e qual versão foi aceita, e a auditoria registra a versão', async () => {
  const repo = new InMemoryCustomerRepository();
  const now = new Date('2026-11-21T12:00:00.000Z');
  const svc = new CustomerAuthService(repo, new InMemoryCustomerSessionRepository(), () => now);
  const customer = await registered(svc.register({ ...BASE, acceptTerms: true }));
  const row = await repo.findById(customer.id);
  assert.equal(row?.termsVersion, LEGAL_TERMS_VERSION);
  assert.equal(row?.termsAcceptedAt?.toISOString(), now.toISOString());

  const app = await buildApp({ config, providers: {}, logger: false });
  const ok = await app.inject({ method: 'POST', url: '/v1/customers/register', payload: { ...BASE, acceptTerms: true } });
  assert.equal(ok.statusCode, 202);
  const audit = (app as unknown as { testAuditLog: InMemorySecurityAuditRepository }).testAuditLog;
  const event = (await audit.query({ limit: 100 })).find((e) => e.event === 'CUSTOMER_REGISTER');
  assert.equal((event?.details as { termsVersion?: string } | undefined)?.termsVersion, LEGAL_TERMS_VERSION);
  await app.close();
});

test('isAdult: 18 anos completos no próprio dia do aniversário, nunca um dia antes', () => {
  const today = new Date('2026-11-21T12:00:00.000Z');
  assert.equal(isAdult('2008-11-21', today), true);
  assert.equal(isAdult('2008-11-22', today), false);
  assert.equal(isAdult('1990-01-01', today), true);
  // Nascido em 29/02: completa 18 anos em 01/03 num ano não bissexto.
  assert.equal(isAdult('2008-02-29', new Date('2026-02-28T12:00:00.000Z')), false);
  assert.equal(isAdult('2008-02-29', new Date('2026-03-01T00:00:00.000Z')), true);
});

test('KYC recusa data de nascimento de menor de 18 anos e aceita quem já completou 18', async () => {
  const customers = new InMemoryCustomerRepository();
  const kyc = new InMemoryCustomerKycRepository();
  const service = new CustomerKycService(customers, kyc, () => new Date('2026-11-21T12:00:00.000Z'));
  const c = await customers.create({ type: 'PF', name: 'X', document: '11144477735', email: 'x@sandbox.invalid', phone: '11999990000', passwordHash: 'h' });
  await assert.rejects(
    service.savePersonalInfo(c.id, { birthDate: '2008-11-22', motherName: 'Mãe Fictícia', nationality: 'Brasileira' }),
    (error: unknown) => (error as { code?: string }).code === 'KYC_UNDERAGE',
  );
  const saved = await service.savePersonalInfo(c.id, { birthDate: '2008-11-21', motherName: 'Mãe Fictícia', nationality: 'Brasileira' });
  assert.equal(saved.birthDate, '2008-11-21');
});
