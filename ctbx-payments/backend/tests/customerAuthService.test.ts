import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { InMemoryCustomerSessionRepository } from '../src/repositories/InMemoryCustomerSessionRepository.js';
import { CustomerAuthService } from '../src/services/customerAuthService.js';

// Customer Identity — Etapa 1 (cadastro real PF). CPF válido usado nos
// testes (dígito verificador correto, mesmo algoritmo de src/utils/cpf.ts).
const VALID_CPF = '111.444.777-35';
const VALID_CPF_2 = '529.982.247-25';

function service() {
  return new CustomerAuthService(new InMemoryCustomerRepository(), new InMemoryCustomerSessionRepository());
}

test('register creates a customer with a hashed password (never the plain one) and a masked document', async () => {
  const svc = service();
  const customer = await svc.register({ name: 'Cliente Exemplo', document: VALID_CPF, email: 'Cliente@Exemplo.COM', phone: '11999990000', password: 'senha-forte-123' });
  assert.equal(customer.type, 'PF');
  assert.equal(customer.name, 'Cliente Exemplo');
  assert.equal(customer.email, 'cliente@exemplo.com'); // normalizado (trim + lowercase)
  assert.match(customer.documentMasked, /^\*\*\*\.\d{3}\.\*\*\*-\*\*$/);
  assert.equal(customer.status, 'ACTIVE');
  assert.ok(!('passwordHash' in customer));
  assert.ok(!('password' in customer));
});

test('register rejects an invalid CPF (wrong check digit)', async () => {
  const svc = service();
  await assert.rejects(
    svc.register({ name: 'Cliente', document: '111.444.777-36', email: 'a@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' }),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_DOCUMENT_INVALID',
  );
});

test('register rejects a repeated (all-same-digit) CPF', async () => {
  const svc = service();
  await assert.rejects(
    svc.register({ name: 'Cliente', document: '111.111.111-11', email: 'a@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' }),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_DOCUMENT_INVALID',
  );
});

test('register rejects a duplicate e-mail (case-insensitive) even with a different valid CPF', async () => {
  const svc = service();
  await svc.register({ name: 'Cliente A', document: VALID_CPF, email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' });
  await assert.rejects(
    svc.register({ name: 'Cliente B', document: VALID_CPF_2, email: 'CLIENTE@sandbox.invalid', phone: '11988880000', password: 'outra-senha-123' }),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_EMAIL_ALREADY_REGISTERED',
  );
});

test('register rejects a duplicate CPF even with a different e-mail', async () => {
  const svc = service();
  await svc.register({ name: 'Cliente A', document: VALID_CPF, email: 'a@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' });
  await assert.rejects(
    svc.register({ name: 'Cliente B', document: VALID_CPF, email: 'b@sandbox.invalid', phone: '11988880000', password: 'outra-senha-123' }),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_DOCUMENT_ALREADY_REGISTERED',
  );
});

test('register rejects an empty name or phone', async () => {
  const svc = service();
  await assert.rejects(
    svc.register({ name: '   ', document: VALID_CPF, email: 'a@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' }),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_NAME_INVALID',
  );
  await assert.rejects(
    svc.register({ name: 'Cliente', document: VALID_CPF_2, email: 'b@sandbox.invalid', phone: '   ', password: 'senha-forte-123' }),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_PHONE_INVALID',
  );
});

test('two different customers get their own independent record, isolated from each other', async () => {
  const repo = new InMemoryCustomerRepository();
  const svc = new CustomerAuthService(repo, new InMemoryCustomerSessionRepository());
  const a = await svc.register({ name: 'Cliente A', document: VALID_CPF, email: 'a@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' });
  const b = await svc.register({ name: 'Cliente B', document: VALID_CPF_2, email: 'b@sandbox.invalid', phone: '11988880000', password: 'outra-senha-123' });
  assert.notEqual(a.id, b.id);
  const rowA = await repo.findById(a.id);
  const rowB = await repo.findById(b.id);
  assert.equal(rowA!.email, 'a@sandbox.invalid');
  assert.equal(rowB!.email, 'b@sandbox.invalid');
  assert.notEqual(rowA!.passwordHash, rowB!.passwordHash);
});

test('a registered customer survives a fresh service instance over the same repository (simulates a backend restart)', async () => {
  const repo = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const svc = new CustomerAuthService(repo, sessions);
  const created = await svc.register({ name: 'Cliente', document: VALID_CPF, email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' });

  const svcAfterRestart = new CustomerAuthService(repo, sessions);
  await assert.rejects(
    svcAfterRestart.register({ name: 'Outro', document: VALID_CPF, email: 'outro@sandbox.invalid', phone: '11988880000', password: 'senha-forte-123' }),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_DOCUMENT_ALREADY_REGISTERED',
  );
  const row = await repo.findById(created.id);
  assert.equal(row!.name, 'Cliente');
});

// Troca de senha autenticada — diferente da recuperação (aquela usa um
// token de e-mail; esta exige a senha ATUAL de quem já está logado).
test('changePassword with the correct current password changes the password and returns a fresh valid session', async () => {
  const repo = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const svc = new CustomerAuthService(repo, sessions);
  await svc.register({ name: 'Cliente', document: VALID_CPF, email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-antiga-123' });
  const login = (await svc.login('cliente@sandbox.invalid', 'senha-antiga-123'))!;

  const result = await svc.changePassword(login.customer.id, 'senha-antiga-123', 'senha-nova-456');
  assert.ok(await svc.validateSession(result.token));
  assert.equal(await svc.login('cliente@sandbox.invalid', 'senha-antiga-123'), null);
  assert.ok(await svc.login('cliente@sandbox.invalid', 'senha-nova-456'));
});

test('changePassword revokes every session that existed before the change (including the one used to call it)', async () => {
  const repo = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const svc = new CustomerAuthService(repo, sessions);
  await svc.register({ name: 'Cliente', document: VALID_CPF, email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-antiga-123' });
  const login1 = (await svc.login('cliente@sandbox.invalid', 'senha-antiga-123'))!;
  const login2 = (await svc.login('cliente@sandbox.invalid', 'senha-antiga-123'))!;

  await svc.changePassword(login1.customer.id, 'senha-antiga-123', 'senha-nova-456');
  assert.equal(await svc.validateSession(login1.token), null);
  assert.equal(await svc.validateSession(login2.token), null);
});

test('changePassword rejects an incorrect current password and leaves the password untouched', async () => {
  const repo = new InMemoryCustomerRepository();
  const sessions = new InMemoryCustomerSessionRepository();
  const svc = new CustomerAuthService(repo, sessions);
  const customer = await svc.register({ name: 'Cliente', document: VALID_CPF, email: 'cliente@sandbox.invalid', phone: '11999990000', password: 'senha-antiga-123' });

  await assert.rejects(
    svc.changePassword(customer.id, 'senha-errada-999', 'senha-nova-456'),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'CUSTOMER_PASSWORD_CHANGE_INVALID',
  );
  assert.ok(await svc.login('cliente@sandbox.invalid', 'senha-antiga-123'));
});
