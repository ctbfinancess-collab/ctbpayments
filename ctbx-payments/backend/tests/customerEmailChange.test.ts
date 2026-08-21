import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryCustomerEmailChangeRepository } from '../src/repositories/InMemoryCustomerEmailChangeRepository.js';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { InMemoryCustomerSessionRepository } from '../src/repositories/InMemoryCustomerSessionRepository.js';
import { InMemoryEmailProvider } from '../src/providers/InMemoryEmailProvider.js';
import { CustomerAuthService } from '../src/services/customerAuthService.js';
import { CustomerEmailChangeService } from '../src/services/customerEmailChangeService.js';

// Troca de e-mail autenticada — mesmo espírito de customerPasswordReset.test.ts,
// mas com erros EXPLÍCITOS (é ação sobre a própria conta já logada, não
// um fluxo público/silencioso). Usa sempre o InMemoryEmailProvider —
// nenhum e-mail real é enviado por nenhum teste deste arquivo.
const PAYLOAD = { name: 'Cliente Exemplo', document: '111.444.777-35', email: 'antigo@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

function setup(now: () => Date = () => new Date()) {
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const changes = new InMemoryCustomerEmailChangeRepository();
  const emailProvider = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, sessions, now);
  const changeService = new CustomerEmailChangeService(customers, changes, emailProvider, 'https://app.ctbxpayments.test', now);
  return { customers, changes, emailProvider, auth, changeService };
}

test('requestChange sends exactly one e-mail to the NEW address (never the old one), with a working link', async () => {
  const { customers, auth, changeService, emailProvider } = setup();
  const customer = await auth.register(PAYLOAD);
  await changeService.requestChange(customer.id, 'novo@sandbox.invalid', PAYLOAD.password);

  assert.equal(emailProvider.sent.length, 1);
  const sent = emailProvider.sent[0]!;
  assert.equal(sent.to, 'novo@sandbox.invalid');
  assert.match(sent.subject, /confirme seu novo e-mail/i);
  assert.match(sent.html!, /CONFIRMAR NOVO E-MAIL/);
  assert.match(sent.html!, /confirm-email-change\?token=/);

  const row = await customers.findById(customer.id);
  assert.equal(row!.email, PAYLOAD.email); // e-mail atual não mudou ainda
});

test('requestChange rejects an incorrect current password (no e-mail sent, nothing changed)', async () => {
  const { auth, changeService, emailProvider } = setup();
  const customer = await auth.register(PAYLOAD);
  await assert.rejects(
    changeService.requestChange(customer.id, 'novo@sandbox.invalid', 'senha-errada-999'),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_CHANGE_INVALID',
  );
  assert.equal(emailProvider.sent.length, 0);
});

test('requestChange rejects a new e-mail that is the same as the current one', async () => {
  const { auth, changeService } = setup();
  const customer = await auth.register(PAYLOAD);
  await assert.rejects(
    changeService.requestChange(customer.id, PAYLOAD.email, PAYLOAD.password),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_CHANGE_SAME_EMAIL',
  );
});

test('requestChange rejects a new e-mail already registered by another customer', async () => {
  const { auth, changeService } = setup();
  const customer = await auth.register(PAYLOAD);
  await auth.register({ name: 'Outro Cliente', document: '529.982.247-25', email: 'ja-existe@sandbox.invalid', phone: '11988880000', password: 'outra-senha-123' });
  await assert.rejects(
    changeService.requestChange(customer.id, 'ja-existe@sandbox.invalid', PAYLOAD.password),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_ALREADY_REGISTERED',
  );
});

test('confirmChange with a valid token actually changes the e-mail (and marks it verified)', async () => {
  const { customers, auth, changeService, emailProvider } = setup();
  const customer = await auth.register(PAYLOAD);
  await changeService.requestChange(customer.id, 'novo@sandbox.invalid', PAYLOAD.password);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

  await changeService.confirmChange(token);
  const row = await customers.findById(customer.id);
  assert.equal(row!.email, 'novo@sandbox.invalid');
  assert.ok(row!.emailVerifiedAt instanceof Date);

  const oldLoginStillFinds = await customers.findByEmail(PAYLOAD.email);
  assert.equal(oldLoginStillFinds, undefined);
});

test('confirmChange rejects an invalid/unknown token', async () => {
  const { changeService } = setup();
  await assert.rejects(
    changeService.confirmChange('token-que-nunca-existiu'),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_CHANGE_TOKEN_INVALID',
  );
});

test('confirmChange rejects reusing an already-consumed token (single use)', async () => {
  const { auth, changeService, emailProvider } = setup();
  const customer = await auth.register(PAYLOAD);
  await changeService.requestChange(customer.id, 'novo@sandbox.invalid', PAYLOAD.password);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

  await changeService.confirmChange(token);
  await assert.rejects(
    changeService.confirmChange(token),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_CHANGE_TOKEN_INVALID',
  );
});

test('confirmChange rejects a token once it has already expired (using an injectable clock, no real sleep)', async () => {
  const realNow = Date.now();
  const customers = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const changes = new InMemoryCustomerEmailChangeRepository();
  const emailProvider = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, sessions, () => new Date(realNow));
  const sendService = new CustomerEmailChangeService(customers, changes, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow));
  const customer = await auth.register(PAYLOAD);
  await sendService.requestChange(customer.id, 'novo@sandbox.invalid', PAYLOAD.password);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

  const confirmServiceLater = new CustomerEmailChangeService(customers, changes, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow + 31 * 60_000));
  await assert.rejects(
    confirmServiceLater.confirmChange(token),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_CHANGE_TOKEN_INVALID',
  );
});

test('requestChange respects the per-account cooldown — a second immediate request is rejected', async () => {
  const { auth, changeService } = setup();
  const customer = await auth.register(PAYLOAD);
  await changeService.requestChange(customer.id, 'novo@sandbox.invalid', PAYLOAD.password);
  await assert.rejects(
    changeService.requestChange(customer.id, 'outro-novo@sandbox.invalid', PAYLOAD.password),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_CHANGE_COOLDOWN',
  );
});
