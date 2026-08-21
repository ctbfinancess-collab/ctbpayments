import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryCustomerEmailVerificationRepository } from '../src/repositories/InMemoryCustomerEmailVerificationRepository.js';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { InMemoryCustomerSessionRepository } from '../src/repositories/InMemoryCustomerSessionRepository.js';
import { InMemoryEmailProvider } from '../src/providers/InMemoryEmailProvider.js';
import { CustomerAuthService } from '../src/services/customerAuthService.js';
import { CustomerEmailVerificationService } from '../src/services/customerEmailVerificationService.js';

// Customer Identity — Etapa 3 (verificação real de e-mail). Usa sempre o
// InMemoryEmailProvider — nenhum e-mail real é enviado por nenhum teste
// deste arquivo.
const PAYLOAD = { name: 'Cliente Exemplo', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };

function setup(now: () => Date = () => new Date()) {
  const customers = new InMemoryCustomerRepository();
  const verifications = new InMemoryCustomerEmailVerificationRepository();
  const emailProvider = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, new InMemoryCustomerSessionRepository(), now);
  const verificationService = new CustomerEmailVerificationService(customers, verifications, emailProvider, 'https://app.ctbxpayments.test', now);
  return { customers, verifications, emailProvider, auth, verificationService };
}

test('sendVerification sends exactly one e-mail (via the InMemory provider), with a working link and no sensitive data', async () => {
  const { customers, auth, verificationService, emailProvider } = setup();
  const customer = await auth.register(PAYLOAD);
  await verificationService.sendVerification(customer.id);

  assert.equal(emailProvider.sent.length, 1);
  const sent = emailProvider.sent[0]!;
  assert.equal(sent.to, PAYLOAD.email);
  assert.match(sent.subject, /verifique/i);
  assert.match(sent.html!, /VERIFICAR MEU E-MAIL/);
  assert.match(sent.html!, /verify-email\?token=/);
  assert.match(sent.text!, /verify-email\?token=/);

  const raw = (sent.html! + sent.text!).toLowerCase();
  assert.equal(raw.includes('senha-forte'), false);
  assert.equal(raw.includes('passwordhash'), false);
  assert.equal(raw.includes('$argon2'), false);
  assert.equal(raw.includes(PAYLOAD.document.replace(/\D/g, '')), false);

  const row = await customers.findById(customer.id);
  assert.equal(row!.emailVerifiedAt, null);
});

test('confirm with a valid token marks the customer e-mail as verified', async () => {
  const { customers, auth, verificationService, emailProvider } = setup();
  const customer = await auth.register(PAYLOAD);
  await verificationService.sendVerification(customer.id);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

  await verificationService.confirm(token);
  const row = await customers.findById(customer.id);
  assert.ok(row!.emailVerifiedAt instanceof Date);
});

test('confirm rejects an invalid/unknown token', async () => {
  const { verificationService } = setup();
  await assert.rejects(
    verificationService.confirm('token-que-nunca-existiu'),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_VERIFICATION_INVALID',
  );
});

test('confirm rejects a token once it has already expired (using an injectable clock, no real sleep)', async () => {
  const realNow = Date.now();
  const customers = new InMemoryCustomerRepository();
  const verifications = new InMemoryCustomerEmailVerificationRepository();
  const emailProvider = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, new InMemoryCustomerSessionRepository(), () => new Date(realNow));
  const sendService = new CustomerEmailVerificationService(customers, verifications, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow));
  const customer = await auth.register(PAYLOAD);
  await sendService.sendVerification(customer.id);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

  const confirmServiceLater = new CustomerEmailVerificationService(customers, verifications, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow + 31 * 60_000));
  await assert.rejects(
    confirmServiceLater.confirm(token),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_VERIFICATION_INVALID',
  );
});

test('confirm rejects reusing an already-consumed token (single use)', async () => {
  const { auth, verificationService, emailProvider } = setup();
  const customer = await auth.register(PAYLOAD);
  await verificationService.sendVerification(customer.id);
  const link = emailProvider.sent[0]!.text!;
  const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

  await verificationService.confirm(token);
  await assert.rejects(
    verificationService.confirm(token),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_VERIFICATION_INVALID',
  );
});

test('resend sends a new e-mail for an existing, unverified customer', async () => {
  const { auth, verificationService, emailProvider } = setup();
  await auth.register(PAYLOAD);
  await verificationService.resend(PAYLOAD.email);
  assert.equal(emailProvider.sent.length, 1);
});

test('resend never sends anything (and never throws) for a non-existent e-mail — indistinguishable from a real one', async () => {
  const { verificationService, emailProvider } = setup();
  await verificationService.resend('nunca-existiu@sandbox.invalid');
  assert.equal(emailProvider.sent.length, 0);
});

test('resend never sends anything for an already-verified e-mail', async () => {
  const { customers, auth, verificationService, emailProvider } = setup();
  const customer = await auth.register(PAYLOAD);
  await customers.markEmailVerified(customer.id, new Date());
  await verificationService.resend(PAYLOAD.email);
  assert.equal(emailProvider.sent.length, 0);
});

test('resend respects the per-account cooldown — a second immediate resend sends nothing', async () => {
  const { auth, verificationService, emailProvider } = setup();
  await auth.register(PAYLOAD);
  await verificationService.resend(PAYLOAD.email);
  await verificationService.resend(PAYLOAD.email);
  assert.equal(emailProvider.sent.length, 1); // só o primeiro, o segundo caiu no cooldown
});

test('resend works again after the cooldown window passes (injectable clock)', async () => {
  const realNow = Date.now();
  const customers = new InMemoryCustomerRepository();
  const verifications = new InMemoryCustomerEmailVerificationRepository();
  const emailProvider = new InMemoryEmailProvider();
  const auth = new CustomerAuthService(customers, new InMemoryCustomerSessionRepository(), () => new Date(realNow));
  const serviceAtT0 = new CustomerEmailVerificationService(customers, verifications, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow));
  await auth.register(PAYLOAD);
  await serviceAtT0.resend(PAYLOAD.email);

  // 61 segundos depois — passou do cooldown de 60s.
  const serviceLater = new CustomerEmailVerificationService(customers, verifications, emailProvider, 'https://app.ctbxpayments.test', () => new Date(realNow + 61_000));
  await serviceLater.resend(PAYLOAD.email);
  assert.equal(emailProvider.sent.length, 2);
});

// Item 6 do brief — a ROTA sempre devolve a mesma resposta, mas aqui
// confirmamos o comportamento do service em si (a peça que a rota chama):
// nenhum dos três casos "silenciosos" (inexistente, já verificado,
// cooldown) lança erro nem se distingue de fora.
test('resend never throws for any of the three silent cases (unknown e-mail, already verified, cooldown)', async () => {
  const { customers, auth, verificationService } = setup();
  const customer = await auth.register(PAYLOAD);
  await assert.doesNotReject(verificationService.resend('nunca-existiu@sandbox.invalid'));
  await customers.markEmailVerified(customer.id, new Date());
  await assert.doesNotReject(verificationService.resend(PAYLOAD.email));
});
