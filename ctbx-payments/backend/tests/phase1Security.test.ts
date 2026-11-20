import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config/env.js';
import type { EmailProvider } from '../src/providers/EmailProvider.js';
import { InMemoryEmailProvider } from '../src/providers/InMemoryEmailProvider.js';
import { InMemoryCustomerEmailChangeRepository } from '../src/repositories/InMemoryCustomerEmailChangeRepository.js';
import { InMemoryCustomerEmailVerificationRepository } from '../src/repositories/InMemoryCustomerEmailVerificationRepository.js';
import { InMemoryCustomerPasswordResetRepository } from '../src/repositories/InMemoryCustomerPasswordResetRepository.js';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { InMemoryCustomerSessionRepository } from '../src/repositories/InMemoryCustomerSessionRepository.js';
import { CustomerAuthService } from '../src/services/customerAuthService.js';
import { CustomerEmailChangeService } from '../src/services/customerEmailChangeService.js';
import { CustomerEmailVerificationService } from '../src/services/customerEmailVerificationService.js';
import { CustomerPasswordResetService } from '../src/services/customerPasswordResetService.js';
import { registered } from './helpers/verifyEmail.js';

// Fase 1 da Área do Cliente — testes das correções de segurança.
const PAYLOAD = { name: 'Cliente', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };
const tokenFrom = (text: string) => new URL(text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
const failingProvider: EmailProvider = { send: async () => { throw new Error('Resend fora do ar'); } };

test('a password-reset link cannot be used twice even by two simultaneous requests (atomic single use)', async () => {
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const outbox = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, sessions);
  const reset = new CustomerPasswordResetService(customers, new InMemoryCustomerPasswordResetRepository(), sessions, outbox, 'https://app.test');
  await registered(auth.register(PAYLOAD));
  await reset.requestReset(PAYLOAD.email);
  const token = tokenFrom(outbox.sent[0]!.text!);
  const results = await Promise.allSettled([reset.confirmReset(token, 'senha-nova-111'), reset.confirmReset(token, 'senha-nova-222')]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
});

test('an e-mail verification link cannot be used twice even by two simultaneous requests', async () => {
  const customers = new InMemoryCustomerRepository();
  const outbox = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, new InMemoryCustomerSessionRepository());
  const verify = new CustomerEmailVerificationService(customers, new InMemoryCustomerEmailVerificationRepository(), outbox, 'https://app.test');
  const customer = await registered(auth.register(PAYLOAD));
  await verify.sendVerification(customer.id);
  const token = tokenFrom(outbox.sent[0]!.text!);
  const results = await Promise.allSettled([verify.confirm(token), verify.confirm(token)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
});

test('requestReset and resend never throw when the e-mail provider fails (the answer must not reveal that the account exists)', async () => {
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const auth = new CustomerAuthService(customers, sessions);
  await registered(auth.register(PAYLOAD));
  const reset = new CustomerPasswordResetService(customers, new InMemoryCustomerPasswordResetRepository(), sessions, failingProvider, 'https://app.test');
  const verify = new CustomerEmailVerificationService(customers, new InMemoryCustomerEmailVerificationRepository(), failingProvider, 'https://app.test');
  await assert.doesNotReject(reset.requestReset(PAYLOAD.email));
  await assert.doesNotReject(verify.resend(PAYLOAD.email));
});

test('a password reset notifies the account owner (PASSWORD_CHANGED)', async () => {
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const outbox = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, sessions);
  const reset = new CustomerPasswordResetService(customers, new InMemoryCustomerPasswordResetRepository(), sessions, outbox, 'https://app.test');
  await registered(auth.register(PAYLOAD));
  await reset.requestReset(PAYLOAD.email);
  await reset.confirmReset(tokenFrom(outbox.sent[0]!.text!), 'senha-nova-456');
  assert.ok(outbox.sent.some((m) => m.to === PAYLOAD.email && /senha foi alterada/i.test(m.subject)));
});

test('confirming an e-mail change revokes every session and notifies the PREVIOUS address', async () => {
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const outbox = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, sessions);
  const change = new CustomerEmailChangeService(customers, new InMemoryCustomerEmailChangeRepository(), outbox, 'https://app.test', undefined, sessions);
  const customer = await registered(auth.register(PAYLOAD));
  await customers.markEmailVerified(customer.id, new Date());
  const login = (await auth.login(PAYLOAD.email, PAYLOAD.password))!;
  await change.requestChange(customer.id, 'novo@sandbox.invalid', PAYLOAD.password);
  await change.confirmChange(tokenFrom(outbox.sent.at(-1)!.text!));
  assert.equal(await auth.validateSession(login.token), null);
  assert.ok(outbox.sent.some((m) => m.to === PAYLOAD.email && /e-mail da sua conta foi alterado/i.test(m.subject)));
});

test('register treats a database unique violation (simultaneous sign-ups) as a silent duplicate, never a 500', async () => {
  const customers = new InMemoryCustomerRepository();
  customers.create = async () => { throw Object.assign(new Error('duplicate key'), { code: '23505' }); };
  const auth = new CustomerAuthService(customers, new InMemoryCustomerSessionRepository());
  const result = await auth.register(PAYLOAD);
  assert.equal(result.customer, null);
});

test('TRUST_PROXY is parsed safely (off by default; 1 for Railway; invalid values rejected)', () => {
  assert.equal(loadConfig({ NODE_ENV: 'test' }).trustProxy, false);
  assert.equal(loadConfig({ NODE_ENV: 'test', TRUST_PROXY: '1' }).trustProxy, 1);
  assert.equal(loadConfig({ NODE_ENV: 'test', TRUST_PROXY: 'true' }).trustProxy, true);
  assert.throws(() => loadConfig({ NODE_ENV: 'test', TRUST_PROXY: 'abc' }));
});
