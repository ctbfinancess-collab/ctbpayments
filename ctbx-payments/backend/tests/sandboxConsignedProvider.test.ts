import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthContext } from '../src/providers/ports.js';
import { InMemorySandboxConsignedRepository } from '../src/providers/sandbox/InMemorySandboxConsignedRepository.js';
import { SandboxConsignedProvider } from '../src/providers/sandbox/SandboxConsignedProvider.js';

const CONTEXT: AuthContext = {
  sessionId: 'sbx_session_1', userId: 'sbx_user_1', accountId: 'sbx_account_con_1', deviceId: 'sbx_device_1',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { id: 'sbx_user_1', type: 'PF', displayName: 'Cliente Sandbox' },
  account: { id: 'sbx_account_con_1', type: 'PERSONAL', status: 'ACTIVE' },
};

test('constructor is forbidden in production', () => {
  assert.throws(() => new SandboxConsignedProvider('production', new InMemorySandboxConsignedRepository()), /forbidden in production/);
});

test('apply persists the application, and it survives a fresh provider instance over the same repository (simulates a backend restart)', async () => {
  const applications = new InMemorySandboxConsignedRepository();
  const provider = new SandboxConsignedProvider('test', applications);
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string; minAmountMinor: number; installmentOptions: number[] }>;
  const product = products[0]!;
  const created = await provider.apply(CONTEXT, { productId: product.id, amountMinor: product.minAmountMinor, installments: product.installmentOptions[0], termsAccepted: true, documentsAcknowledged: true }, 'k1', 'r1') as { applicationId: string; status: string };
  assert.equal(created.status, 'UNDER_REVIEW');

  const providerAfterRestart = new SandboxConsignedProvider('test', applications);
  const fetched = await providerAfterRestart.getApplication(CONTEXT, created.applicationId) as { status: string };
  assert.equal(fetched.status, 'UNDER_REVIEW');
  const list = await providerAfterRestart.listApplications(CONTEXT) as unknown[];
  assert.equal(list.length, 1);
});

test('apply is idempotent for the same key+payload and rejects invalid amounts/installments', async () => {
  const provider = new SandboxConsignedProvider('test', new InMemorySandboxConsignedRepository());
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string; minAmountMinor: number; maxAmountMinor: number; installmentOptions: number[] }>;
  const product = products[0]!;
  const payload = { productId: product.id, amountMinor: product.minAmountMinor, installments: product.installmentOptions[0], termsAccepted: true, documentsAcknowledged: true };
  const first = await provider.apply(CONTEXT, payload, 'idem-01', 'r1') as { applicationId: string };
  const replay = await provider.apply(CONTEXT, payload, 'idem-01', 'r2') as { applicationId: string };
  assert.equal(first.applicationId, replay.applicationId);
  await assert.rejects(provider.apply(CONTEXT, { ...payload, amountMinor: product.maxAmountMinor + 1 }, 'idem-02', 'r3'), { code: 'CONSIGNED_APPLICATION_INVALID' });
  await assert.rejects(provider.apply(CONTEXT, { ...payload, installments: 999 }, 'idem-03', 'r4'), { code: 'CONSIGNED_APPLICATION_INVALID' });
});

test('replaying apply with the same idempotency key AFTER a simulated restart never creates a second application (idempotency is persisted, not just in-memory)', async () => {
  const applications = new InMemorySandboxConsignedRepository();
  const provider = new SandboxConsignedProvider('test', applications);
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string; minAmountMinor: number; installmentOptions: number[] }>;
  const product = products[0]!;
  const payload = { productId: product.id, amountMinor: product.minAmountMinor, installments: product.installmentOptions[0], termsAccepted: true, documentsAcknowledged: true };
  const first = await provider.apply(CONTEXT, payload, 'idem-restart-01', 'r1') as { applicationId: string };

  // "Restart": provider novo sobre o MESMO repositório — sem a
  // idempotência persistida, este replay recriaria a solicitação do zero.
  const providerAfterRestart = new SandboxConsignedProvider('test', applications);
  const replay = await providerAfterRestart.apply(CONTEXT, payload, 'idem-restart-01', 'r2') as { applicationId: string };
  assert.equal(replay.applicationId, first.applicationId);
  assert.equal((await providerAfterRestart.listApplications(CONTEXT)).length, 1); // não duplicou
});

test('two different accounts never see each other\'s consigned applications', async () => {
  const provider = new SandboxConsignedProvider('test', new InMemorySandboxConsignedRepository());
  const otherContext: AuthContext = { ...CONTEXT, accountId: 'sbx_account_con_2', account: { ...CONTEXT.account, id: 'sbx_account_con_2' } };
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string; minAmountMinor: number; installmentOptions: number[] }>;
  const product = products[0]!;
  const created = await provider.apply(CONTEXT, { productId: product.id, amountMinor: product.minAmountMinor, installments: product.installmentOptions[0], termsAccepted: true, documentsAcknowledged: true }, 'k1', 'r1') as { applicationId: string };
  await assert.rejects(provider.getApplication(otherContext, created.applicationId), { code: 'CONSIGNED_APPLICATION_NOT_FOUND' });
  assert.equal((await provider.listApplications(otherContext)).length, 0);
  assert.equal((await provider.listApplications(CONTEXT)).length, 1);
});
