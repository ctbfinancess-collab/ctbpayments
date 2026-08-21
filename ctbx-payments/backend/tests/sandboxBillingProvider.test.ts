import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthContext } from '../src/providers/ports.js';
import { InMemorySandboxBillingRepository } from '../src/providers/sandbox/InMemorySandboxBillingRepository.js';
import { SandboxBillingProvider } from '../src/providers/sandbox/SandboxBillingProvider.js';

const CONTEXT: AuthContext = {
  sessionId: 'sbx_session_1', userId: 'sbx_user_1', accountId: 'sbx_account_bill_1', deviceId: 'sbx_device_1',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { id: 'sbx_user_1', type: 'PF', displayName: 'Cliente Sandbox' },
  account: { id: 'sbx_account_bill_1', type: 'PERSONAL', status: 'ACTIVE' },
};

test('constructor is forbidden in production', () => {
  assert.throws(() => new SandboxBillingProvider('production', new InMemorySandboxBillingRepository()), /forbidden in production/);
});

// Prioridade 4 — antes 100% em memória (dois Map() do processo).
test('PRIORITY 4 FIX: payers and bills created by the client survive a simulated backend restart', async () => {
  const repository = new InMemorySandboxBillingRepository();
  const provider = new SandboxBillingProvider('test', repository);
  const payer = await provider.createPayer(CONTEXT, { name: 'Sacado Fictício' }, 'idem-payer-01') as { payerId: string };
  const due = new Date(Date.now() + 86_400_000).toISOString();
  const bill = await provider.createBill(CONTEXT, { payerId: payer.payerId, dueDate: due, amountMinor: 12_500, description: 'Teste' }, 'idem-bill-01', 'r1') as { billId: string };

  // "Restart": provider novo sobre o MESMO repositório.
  const providerAfterRestart = new SandboxBillingProvider('test', repository);
  const payers = await providerAfterRestart.listPayers(CONTEXT) as Array<{ payerId: string }>;
  assert.ok(payers.some((item) => item.payerId === payer.payerId));
  const bills = await providerAfterRestart.listBills(CONTEXT) as Array<{ billId: string }>;
  assert.ok(bills.some((item) => item.billId === bill.billId));
  const fetchedBill = await providerAfterRestart.getBill(CONTEXT, bill.billId) as { amountMinor: number };
  assert.equal(fetchedBill.amountMinor, 12_500);
});

test('createPayer/createBill replay with the same Idempotency-Key AFTER a simulated restart never creates a duplicate', async () => {
  const repository = new InMemorySandboxBillingRepository();
  const provider = new SandboxBillingProvider('test', repository);
  const firstPayer = await provider.createPayer(CONTEXT, { name: 'Sacado A' }, 'idem-payer-restart') as { payerId: string };
  const due = new Date(Date.now() + 86_400_000).toISOString();
  const firstBill = await provider.createBill(CONTEXT, { payerId: firstPayer.payerId, dueDate: due, amountMinor: 5_000, description: '' }, 'idem-bill-restart', 'r1') as { billId: string };

  const providerAfterRestart = new SandboxBillingProvider('test', repository);
  const replayPayer = await providerAfterRestart.createPayer(CONTEXT, { name: 'Sacado A' }, 'idem-payer-restart') as { payerId: string };
  assert.equal(replayPayer.payerId, firstPayer.payerId);
  const replayBill = await providerAfterRestart.createBill(CONTEXT, { payerId: firstPayer.payerId, dueDate: due, amountMinor: 5_000, description: '' }, 'idem-bill-restart', 'r2') as { billId: string };
  assert.equal(replayBill.billId, firstBill.billId);

  assert.equal((await providerAfterRestart.listPayers(CONTEXT)).length, 2); // sacado semeado + o criado (não duplicou o criado)
  assert.equal((await providerAfterRestart.listBills(CONTEXT)).length, 1);

  await assert.rejects(providerAfterRestart.createBill(CONTEXT, { payerId: firstPayer.payerId, dueDate: due, amountMinor: 9_999, description: '' }, 'idem-bill-restart', 'r3'), { code: 'IDEMPOTENCY_KEY_CONFLICT' });
});

test('createBill validates amount, due date and payer ownership', async () => {
  const repository = new InMemorySandboxBillingRepository();
  const provider = new SandboxBillingProvider('test', repository);
  const payer = await provider.createPayer(CONTEXT, { name: 'Sacado' }, 'idem-01') as { payerId: string };
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();
  await assert.rejects(provider.createBill(CONTEXT, { payerId: payer.payerId, dueDate: past, amountMinor: 1000 }, 'idem-02', 'r2'), { code: 'BILLING_BILL_INVALID' });
  await assert.rejects(provider.createBill(CONTEXT, { payerId: payer.payerId, dueDate: future, amountMinor: 0 }, 'idem-03', 'r3'), { code: 'BILLING_BILL_INVALID' });
  await assert.rejects(provider.createBill(CONTEXT, { payerId: 'does-not-exist', dueDate: future, amountMinor: 1000 }, 'idem-04', 'r4'), { code: 'BILLING_PAYER_NOT_FOUND' });
});

test('two different accounts never see each other\'s payers or bills', async () => {
  const repository = new InMemorySandboxBillingRepository();
  const provider = new SandboxBillingProvider('test', repository);
  const otherContext: AuthContext = { ...CONTEXT, accountId: 'sbx_account_bill_2', account: { ...CONTEXT.account, id: 'sbx_account_bill_2' } };
  const payer = await provider.createPayer(CONTEXT, { name: 'Sacado' }, 'idem-01') as { payerId: string };
  await assert.rejects(provider.updatePayer(otherContext, payer.payerId, { name: 'Hackeado' }), { code: 'BILLING_PAYER_NOT_FOUND' });
  await assert.rejects(provider.deletePayer(otherContext, payer.payerId), { code: 'BILLING_PAYER_NOT_FOUND' });
  const otherPayers = await provider.listPayers(otherContext) as unknown[];
  // A própria conta "otherContext" recebe SEU PRÓPRIO sacado semeado (ensurePayerSeeded), mas nunca o da primeira conta.
  assert.ok(!otherPayers.some((item) => (item as { payerId: string }).payerId === payer.payerId));
});
