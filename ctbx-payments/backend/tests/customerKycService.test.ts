import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryCustomerKycRepository } from '../src/repositories/InMemoryCustomerKycRepository.js';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { CustomerKycService } from '../src/services/customerKycService.js';
import { ApiError } from '../src/errors/ApiError.js';

const CUSTOMER_INPUT = { type: 'PF' as const, name: 'Cliente KYC', document: '11144477735', email: 'kyc@sandbox.invalid', phone: '11999990000', passwordHash: 'hash' };

function setup(now: () => Date = () => new Date('2024-06-01T00:00:00.000Z')) {
  const customers = new InMemoryCustomerRepository();
  const kyc = new InMemoryCustomerKycRepository();
  return { customers, kyc, service: new CustomerKycService(customers, kyc, now) };
}

test('getPersonalInfo prefills name/document/email/phone from customers and starts NOT_STARTED with no KYC data', async () => {
  const { customers, service } = setup();
  const customer = await customers.create(CUSTOMER_INPUT);
  const view = await service.getPersonalInfo(customer.id);
  assert.equal(view.status, 'NOT_STARTED');
  assert.equal(view.name, 'Cliente KYC');
  assert.equal(view.document, '11144477735');
  assert.equal(view.email, 'kyc@sandbox.invalid');
  assert.equal(view.phone, '11999990000');
  assert.equal(view.birthDate, null);
  assert.equal(view.motherName, null);
  assert.equal(view.nationality, null);
  assert.equal(view.personalInfoCompletedAt, null);
});

test('getPersonalInfo rejects an unknown customerId (never trusts an arbitrary id)', async () => {
  const { service } = setup();
  await assert.rejects(() => service.getPersonalInfo('00000000-0000-0000-0000-000000000000'), (error: unknown) => error instanceof ApiError && error.code === 'CUSTOMER_NOT_FOUND');
});

test('savePersonalInfo accepts a partial patch, moves status to IN_PROGRESS, and leaves personalInfoCompletedAt unset while fields are missing', async () => {
  const { customers, service } = setup();
  const customer = await customers.create(CUSTOMER_INPUT);
  const view = await service.savePersonalInfo(customer.id, { birthDate: '1990-05-20' });
  assert.equal(view.status, 'IN_PROGRESS');
  assert.equal(view.birthDate, '1990-05-20');
  assert.equal(view.motherName, null);
  assert.equal(view.nationality, null);
  assert.equal(view.personalInfoCompletedAt, null);
});

test('savePersonalInfo merges across calls — a later call completing the missing fields never erases what was already saved ("salvar o progresso" / "sair e continuar depois")', async () => {
  const { customers, service } = setup();
  const customer = await customers.create(CUSTOMER_INPUT);
  await service.savePersonalInfo(customer.id, { birthDate: '1990-05-20' });
  await service.savePersonalInfo(customer.id, { motherName: 'Maria da Silva' });
  const view = await service.savePersonalInfo(customer.id, { nationality: 'Brasileira' });
  assert.equal(view.birthDate, '1990-05-20');
  assert.equal(view.motherName, 'Maria da Silva');
  assert.equal(view.nationality, 'Brasileira');
  assert.ok(view.personalInfoCompletedAt);
});

test('savePersonalInfo keeps personalInfoCompletedAt stable once set (does not shift on later unrelated saves)', async () => {
  const { customers, service } = setup();
  const customer = await customers.create(CUSTOMER_INPUT);
  const first = await service.savePersonalInfo(customer.id, { birthDate: '1990-05-20', motherName: 'Maria da Silva', nationality: 'Brasileira' });
  const second = await service.savePersonalInfo(customer.id, { nationality: 'Brasileira' });
  assert.equal(second.personalInfoCompletedAt, first.personalInfoCompletedAt);
});

test('savePersonalInfo rejects an invalid birthDate format', async () => {
  const { customers, service } = setup();
  const customer = await customers.create(CUSTOMER_INPUT);
  await assert.rejects(() => service.savePersonalInfo(customer.id, { birthDate: '20-05-1990' }), (error: unknown) => error instanceof ApiError && error.code === 'KYC_BIRTH_DATE_INVALID');
});

test('savePersonalInfo rejects a calendar-invalid birthDate (e.g. Feb 30th)', async () => {
  const { customers, service } = setup();
  const customer = await customers.create(CUSTOMER_INPUT);
  await assert.rejects(() => service.savePersonalInfo(customer.id, { birthDate: '2024-02-30' }), (error: unknown) => error instanceof ApiError && error.code === 'KYC_BIRTH_DATE_INVALID');
});

test('savePersonalInfo rejects a birthDate in the future', async () => {
  const { customers, service } = setup(() => new Date('2024-06-01T00:00:00.000Z'));
  const customer = await customers.create(CUSTOMER_INPUT);
  await assert.rejects(() => service.savePersonalInfo(customer.id, { birthDate: '2030-01-01' }), (error: unknown) => error instanceof ApiError && error.code === 'KYC_BIRTH_DATE_INVALID');
});

test('savePersonalInfo rejects a too-short motherName/nationality', async () => {
  const { customers, service } = setup();
  const customer = await customers.create(CUSTOMER_INPUT);
  await assert.rejects(() => service.savePersonalInfo(customer.id, { motherName: 'M' }), (error: unknown) => error instanceof ApiError && error.code === 'KYC_MOTHER_NAME_INVALID');
  await assert.rejects(() => service.savePersonalInfo(customer.id, { nationality: 'B' }), (error: unknown) => error instanceof ApiError && error.code === 'KYC_NATIONALITY_INVALID');
});

test('savePersonalInfo rejects an unknown customerId (never trusts an arbitrary id)', async () => {
  const { service } = setup();
  await assert.rejects(() => service.savePersonalInfo('00000000-0000-0000-0000-000000000000', { nationality: 'Brasileira' }), (error: unknown) => error instanceof ApiError && error.code === 'CUSTOMER_NOT_FOUND');
});
