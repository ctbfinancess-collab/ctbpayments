import assert from 'node:assert/strict';
import test from 'node:test';
import * as argon2 from 'argon2';
import { InMemoryCustomerPasswordResetRepository } from '../src/repositories/InMemoryCustomerPasswordResetRepository.js';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { InMemoryCustomerSessionRepository } from '../src/repositories/InMemoryCustomerSessionRepository.js';
import { InMemoryEmailProvider } from '../src/providers/InMemoryEmailProvider.js';
import { CustomerAuthService } from '../src/services/customerAuthService.js';
import { CustomerPasswordResetService } from '../src/services/customerPasswordResetService.js';

// Recuperação de senha — mesmo espírito do teste de verificação de
// e-mail (customerEmailVerification.test.ts). Usa sempre o
// InMemoryEmailProvider — nenhum e-mail real é enviado por nenhum teste
// deste arquivo.
const PAYLOAD = { name: 'Cliente Exemplo', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-antiga-123' };

function setup(now: () => Date = () => new Date()) {
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const resets = new InMemoryCustomerPasswordResetRepository();
  const emailProvider = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, sessions, now);
  const resetService = new CustomerPasswordResetService(customers, resets, sessions, emailProvider, 'https://app.ctbxpayments.test', now);
  return { customers, sessions, resets, emailProvider, auth, resetService };
}

test('requestReset sends exactly one e-mail (via the InMemory provider), with a working link and no sensitive data', async () => {
  const { auth, resetService, emailProvider } = setup();
  await auth.register(PAYLOAD);
  await resetService.requestReset(PAYLOAD.email);

  assert.equal(emailProvider.sent.length, 1);
  const sent = emailProvider.sent[0]!;
  assert.equal(sent.to, PAYLOAD.email);
  assert.match(sent.subject, /redefini/i);
  assert.match(sent.html!, /REDEFINIR MINHA SENHA/);
  assert.match(sent.html!, /reset-password\?token=/);
  assert.match(sent.text!, /reset-password\?token=/);

  const raw = (sent.html! + sent.text!).toLowerCase();
  assert.equal(raw.includes('senha-antiga'), false);
  assert.equal(raw.includes('passwordhash'), false);
  assert.equal(raw.includes('$argon2'), false);
  assert.equal(raw.includes(PAYLOAD.document.replace(/\D/g, '')), false);
});

test('confirmReset with a valid token changes the password (old password stops working, new one works)', async () => {
  const { customers, auth, resetService, emailProvider } = setup();
  const customer = await auth.register(PAYLOAD);
  await resetService.requestReset(PAYLOAD.email);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

  await resetService.confirmReset(token, 'senha-nova-456');

  const row = await customers.findById(customer.id);
  assert.equal(await argon2.verify(row!.passwordHash, 'senha-antiga-123'), false);
  assert.equal(await argon2.verify(row!.passwordHash, 'senha-nova-456'), true);
});

test('confirmReset revokes every active session for that customer (a reset invalidates old logins)', async () => {
  const { auth, resetService, sessions, emailProvider } = setup();
  await auth.register(PAYLOAD);
  const login1 = (await auth.login(PAYLOAD.email, PAYLOAD.password))!;
  const login2 = (await auth.login(PAYLOAD.email, PAYLOAD.password))!;
  assert.ok(await auth.validateSession(login1.token));
  assert.ok(await auth.validateSession(login2.token));

  await resetService.requestReset(PAYLOAD.email);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
  await resetService.confirmReset(token, 'senha-nova-456');

  assert.equal(await auth.validateSession(login1.token), null);
  assert.equal(await auth.validateSession(login2.token), null);
  void sessions; // usado apenas via auth acima
});

test('confirmReset rejects an invalid/unknown token', async () => {
  const { resetService } = setup();
  await assert.rejects(
    resetService.confirmReset('token-que-nunca-existiu', 'senha-nova-456'),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_PASSWORD_RESET_INVALID',
  );
});

test('confirmReset rejects a token once it has already expired (using an injectable clock, no real sleep)', async () => {
  const realNow = Date.now();
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const resets = new InMemoryCustomerPasswordResetRepository();
  const emailProvider = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, sessions, () => new Date(realNow));
  const sendService = new CustomerPasswordResetService(customers, resets, sessions, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow));
  await auth.register(PAYLOAD);
  await sendService.requestReset(PAYLOAD.email);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

  const confirmServiceLater = new CustomerPasswordResetService(customers, resets, sessions, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow + 31 * 60_000));
  await assert.rejects(
    confirmServiceLater.confirmReset(token, 'senha-nova-456'),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_PASSWORD_RESET_INVALID',
  );
});

test('confirmReset rejects reusing an already-consumed token (single use)', async () => {
  const { auth, resetService, emailProvider } = setup();
  await auth.register(PAYLOAD);
  await resetService.requestReset(PAYLOAD.email);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

  await resetService.confirmReset(token, 'senha-nova-456');
  await assert.rejects(
    resetService.confirmReset(token, 'outra-senha-789'),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_PASSWORD_RESET_INVALID',
  );
});

test('requestReset never sends anything (and never throws) for a non-existent e-mail — indistinguishable from a real one', async () => {
  const { resetService, emailProvider } = setup();
  await assert.doesNotReject(resetService.requestReset('nunca-existiu@sandbox.invalid'));
  assert.equal(emailProvider.sent.length, 0);
});

test('requestReset respects the per-account cooldown — a second immediate request sends nothing', async () => {
  const { auth, resetService, emailProvider } = setup();
  await auth.register(PAYLOAD);
  await resetService.requestReset(PAYLOAD.email);
  await resetService.requestReset(PAYLOAD.email);
  assert.equal(emailProvider.sent.length, 1); // só o primeiro, o segundo caiu no cooldown
});

test('requestReset works again after the cooldown window passes (injectable clock)', async () => {
  const realNow = Date.now();
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const resets = new InMemoryCustomerPasswordResetRepository();
  const emailProvider = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, sessions, () => new Date(realNow));
  const serviceAtT0 = new CustomerPasswordResetService(customers, resets, sessions, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow));
  await auth.register(PAYLOAD);
  await serviceAtT0.requestReset(PAYLOAD.email);

  // 61 segundos depois — passou do cooldown de 60s.
  const serviceLater = new CustomerPasswordResetService(customers, resets, sessions, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow + 61_000));
  await serviceLater.requestReset(PAYLOAD.email);
  assert.equal(emailProvider.sent.length, 2);
});
