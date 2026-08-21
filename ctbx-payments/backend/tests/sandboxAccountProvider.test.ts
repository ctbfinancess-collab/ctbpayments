import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemorySandboxAccountRepository } from '../src/providers/sandbox/InMemorySandboxAccountRepository.js';
import { SandboxAccountProvider } from '../src/providers/sandbox/SandboxAccountProvider.js';
import type { AuthContext } from '../src/providers/ports.js';

// Mesmo espírito de sandboxSessionStore.test.ts (Etapa 1): testa a lógica
// de verdade (seed, saldo, extrato, isolamento por conta) contra um
// repositório fake em memória — a prova de que sobrevive a um restart real
// é feita ao vivo (curl + restart do backend), não aqui.

const CONTEXT: AuthContext = {
  sessionId: 'sbx_session_1', userId: 'sbx_usr_1', accountId: 'sbx_acc_1', deviceId: 'sbx_device_1',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { id: 'sbx_usr_1', type: 'PF', displayName: 'Cliente Sandbox' },
  account: { id: 'sbx_acc_1', type: 'PERSONAL', status: 'ACTIVE' },
};

function buildProvider() { return new SandboxAccountProvider('test', new InMemorySandboxAccountRepository()); }

test('constructor is forbidden in production', () => {
  assert.throws(() => new SandboxAccountProvider('production', new InMemorySandboxAccountRepository()), /forbidden in production/);
});

test('getCurrent returns the account straight from the auth context (no DB round-trip needed)', async () => {
  const provider = buildProvider();
  assert.deepEqual(await provider.getCurrent(CONTEXT), CONTEXT.account);
});

test('getBalances seeds the account on first access, with the same values the app always showed', async () => {
  const provider = buildProvider();
  const balances = await provider.getBalances(CONTEXT) as any;
  assert.equal(balances.available.amount, 125_000);
  assert.equal(balances.ledger.amount, 130_000);
  assert.equal(balances.components.blocked.amount, 5_000);
  assert.equal(balances.components.investments.amount, 200_000);
  assert.equal(balances.components.cardAccount.amount, 25_000);
});

test('listStatement returns only COMPLETED transactions, filtered by direction/date range (test 1 e 2: carregar conta+saldo, consultar extrato)', async () => {
  const provider = buildProvider();
  const statement = await provider.listStatement(CONTEXT) as any[];
  assert.ok(statement.length >= 5);
  assert.ok(statement.every((item) => item.status === 'COMPLETED'));
  const credits = await provider.listStatement(CONTEXT, { direction: 'CREDIT' }) as any[];
  assert.ok(credits.every((item) => item.direction === 'CREDIT'));
});

test('listFutureTransactions and listBlockedTransactions return only their own status', async () => {
  const provider = buildProvider();
  const future = await provider.listFutureTransactions(CONTEXT) as any[];
  assert.ok(future.length >= 1);
  assert.ok(future.every((item) => item.status === 'SCHEDULED'));
  const blocked = await provider.listBlockedTransactions(CONTEXT) as any[];
  assert.ok(blocked.length >= 1);
  assert.ok(blocked.every((item) => item.status === 'UNDER_REVIEW'));
});

test('getTransaction finds a seeded transaction by id, and 404s for an unknown one', async () => {
  const provider = buildProvider();
  const transaction = await provider.getTransaction(CONTEXT, `sbx_txn_${CONTEXT.accountId}_a7K2mP9q`) as any;
  assert.equal(transaction.description, 'Pix recebido');
  await assert.rejects(provider.getTransaction(CONTEXT, 'sbx_txn_does_not_exist'), { code: 'TRANSACTION_NOT_FOUND' });
});

test('getTransactionReceipt only works for a COMPLETED transaction with a receipt available', async () => {
  const provider = buildProvider();
  const receipt = await provider.getTransactionReceipt(CONTEXT, `sbx_txn_${CONTEXT.accountId}_a7K2mP9q`, 'req-1') as any;
  assert.equal(receipt.transactionId, `sbx_txn_${CONTEXT.accountId}_a7K2mP9q`);
  // sbx_txn_e1Y7kC4u tem receiptAvailable:false no seed
  await assert.rejects(provider.getTransactionReceipt(CONTEXT, `sbx_txn_${CONTEXT.accountId}_e1Y7kC4u`, 'req-2'), { code: 'RECEIPT_NOT_FOUND' });
});

test('creating a sandbox test movement and adjusting the balance persists both (test 3 e 4)', async () => {
  const repository = new InMemorySandboxAccountRepository();
  const provider = new SandboxAccountProvider('test', repository);
  await provider.getBalances(CONTEXT); // garante que a conta já foi semeada

  await repository.createTransaction({
    id: 'sbx_txn_test_movement', accountId: CONTEXT.accountId, occurredAt: new Date(), type: 'TEST_MOVEMENT',
    direction: 'CREDIT', description: 'Movimentação de teste', counterparty: 'Teste Sandbox', amountMinor: 1_000,
    currency: 'BRL', status: 'COMPLETED', category: 'Teste', feeMinor: 0, receiptAvailable: false,
    institution: 'CTBX Payments Sandbox', document: '—', reason: null,
  });
  const before = await provider.getBalances(CONTEXT) as any;
  await repository.updateBalances(CONTEXT.accountId, { availableMinor: before.available.amount + 1_000 });

  const after = await provider.getBalances(CONTEXT) as any;
  assert.equal(after.available.amount, before.available.amount + 1_000);
  const transaction = await provider.getTransaction(CONTEXT, 'sbx_txn_test_movement') as any;
  assert.equal(transaction.amountMinor, 1_000);
});

test('two different accounts get their own independent seeded balance/statement, correctly linked by accountId', async () => {
  const repository = new InMemorySandboxAccountRepository();
  const provider = new SandboxAccountProvider('test', repository);
  const contextB: AuthContext = { ...CONTEXT, accountId: 'sbx_acc_2', userId: 'sbx_usr_2', account: { id: 'sbx_acc_2', type: 'PERSONAL', status: 'ACTIVE' }, user: { id: 'sbx_usr_2', type: 'PF', displayName: 'Outro Cliente' } };

  await provider.getBalances(CONTEXT);
  await repository.updateBalances(CONTEXT.accountId, { availableMinor: 999_999 });

  const balancesA = await provider.getBalances(CONTEXT) as any;
  const balancesB = await provider.getBalances(contextB) as any; // primeiro acesso — semeia do zero, não herda nada da conta A
  assert.equal(balancesA.available.amount, 999_999);
  assert.equal(balancesB.available.amount, 125_000); // valor padrão, não o 999_999 da outra conta

  const accountA = await repository.findById(CONTEXT.accountId);
  const accountB = await repository.findById(contextB.accountId);
  assert.equal(accountA!.userId, 'sbx_usr_1');
  assert.equal(accountB!.userId, 'sbx_usr_2');
});

test('an account never sees another account\'s transactions (test 8: isolamento)', async () => {
  const repository = new InMemorySandboxAccountRepository();
  const provider = new SandboxAccountProvider('test', repository);
  const contextB: AuthContext = { ...CONTEXT, accountId: 'sbx_acc_2', account: { id: 'sbx_acc_2', type: 'PERSONAL', status: 'ACTIVE' } };

  await provider.getBalances(CONTEXT);
  await provider.getBalances(contextB);

  const statementA = await provider.listStatement(CONTEXT) as any[];
  const statementB = await provider.listStatement(contextB) as any[];
  assert.ok(statementA.length > 0 && statementB.length > 0);
  // mesmos ids de transação (seed idêntico), mas cada um só enxerga o seu:
  await assert.rejects((async () => { const t = await repository.findTransaction(contextB.accountId, `sbx_txn_${CONTEXT.accountId}_a7K2mP9q`); if (!t) throw new Error('not found for account B — that id belongs to a different account row entirely'); })(), /not found/);
});
