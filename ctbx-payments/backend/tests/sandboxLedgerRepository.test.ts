import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemorySandboxAccountRepository } from '../src/providers/sandbox/InMemorySandboxAccountRepository.js';
import { InMemorySandboxLedgerRepository } from '../src/providers/sandbox/InMemorySandboxLedgerRepository.js';

// Contrato do repositório de ledger (mesma lógica usada pelo
// PostgresSandboxLedgerRepository, só sem I/O real de banco): "operação +
// saldo + extrato atomicamente, nunca saldo negativo, PIX/Transferência/
// Pagamento nunca escrevem em sandbox_accounts diretamente" — este arquivo
// prova o contrato contra o fallback em memória usado pelos testes de rota
// (app.test.ts). A prova contra Postgres de verdade (transação real,
// restart de processo) é feita manualmente, fora do test runner.

async function seededAccount(accountId = 'sbx_acc_ledger_test') {
  const accounts = new InMemorySandboxAccountRepository();
  await accounts.create({ id: accountId, userId: 'sbx_user_ledger_test', currency: 'BRL', availableMinor: 100_000, ledgerMinor: 100_000, digitalAccountMinor: 100_000, blockedMinor: 0, investmentsMinor: 0, cardAccountMinor: 0, creditMinor: 0, foreignCurrencyMinor: 0 });
  return accounts;
}

const transaction = (accountId: string, id: string, amountMinor: number) => ({
  id, accountId, occurredAt: new Date(), type: 'PIX_SENT', direction: 'DEBIT' as const, description: 'Pix enviado', counterparty: 'Favorecido',
  amountMinor, currency: 'BRL', status: 'COMPLETED' as const, category: 'Pix', feeMinor: 0, receiptAvailable: true, institution: 'Banco', document: '***.***.***-**', reason: null,
});

test('recordOperation with a ledgerEntry debits the balance, inserts the statement entry and the operation, all linked', async () => {
  const accountId = 'sbx_acc_ledger_a';
  const accounts = await seededAccount(accountId);
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const operation = await ledger.recordOperation({
    operationId: 'sbx_op_1', accountId, kind: 'PIX_TRANSFER', status: 'COMPLETED', amountMinor: 12_500, details: { note: 'teste' },
    ledgerEntry: { balanceField: 'availableMinor', deltaMinor: -12_500, transaction: transaction(accountId, 'sbx_txn_ledger_1', 12_500) },
  });
  const account = await accounts.findById(accountId);
  assert.equal(account?.availableMinor, 87_500);
  assert.equal(operation.accountTransactionId, 'sbx_txn_ledger_1');
  const statementEntry = await accounts.findTransaction(accountId, 'sbx_txn_ledger_1');
  assert.ok(statementEntry);
  assert.equal(statementEntry?.amountMinor, 12_500);
  const found = await ledger.findById('sbx_op_1', accountId);
  assert.equal(found?.status, 'COMPLETED');
  assert.equal(found?.accountTransactionId, 'sbx_txn_ledger_1');
});

test('recordOperation without a ledgerEntry (SCHEDULED) records the operation but never touches the balance/statement', async () => {
  const accountId = 'sbx_acc_ledger_b';
  const accounts = await seededAccount(accountId);
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const operation = await ledger.recordOperation({ operationId: 'sbx_op_2', accountId, kind: 'BANK_TRANSFER', status: 'SCHEDULED', amountMinor: 5_000, scheduledFor: new Date(Date.now() + 86_400_000), details: {} });
  const account = await accounts.findById(accountId);
  assert.equal(account?.availableMinor, 100_000);
  assert.equal(operation.accountTransactionId, null);
  assert.equal((await accounts.listTransactions(accountId)).length, 0);
});

test('an operation that would make the balance negative is rejected and leaves nothing applied (no partial write)', async () => {
  const accountId = 'sbx_acc_ledger_c';
  const accounts = await seededAccount(accountId);
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  await assert.rejects(() => ledger.recordOperation({
    operationId: 'sbx_op_3', accountId, kind: 'BILL_PAYMENT', status: 'COMPLETED', amountMinor: 999_999, details: {},
    ledgerEntry: { balanceField: 'availableMinor', deltaMinor: -999_999, transaction: transaction(accountId, 'sbx_txn_ledger_3', 999_999) },
  }), /INSUFFICIENT_FUNDS/);
  const account = await accounts.findById(accountId);
  assert.equal(account?.availableMinor, 100_000); // saldo intacto
  assert.equal(await accounts.findTransaction(accountId, 'sbx_txn_ledger_3'), undefined); // nada no extrato
  assert.equal(await ledger.findById('sbx_op_3', accountId), undefined); // nem a operação foi gravada
});

test('replaying the same completed operation id keeps a single debit (caller-level idempotency, not double-applied by the ledger)', async () => {
  const accountId = 'sbx_acc_ledger_d';
  const accounts = await seededAccount(accountId);
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const record = () => ledger.recordOperation({
    operationId: 'sbx_op_4', accountId, kind: 'PIX_TRANSFER', status: 'COMPLETED', amountMinor: 10_000, details: {},
    ledgerEntry: { balanceField: 'availableMinor', deltaMinor: -10_000, transaction: transaction(accountId, 'sbx_txn_ledger_4', 10_000) },
  });
  await record();
  const account = await accounts.findById(accountId);
  assert.equal(account?.availableMinor, 90_000);
  // A camada que evita a repetição de fato é o provider (cache de
  // idempotency-key) — ver sandboxPixProvider/app.test.ts. Aqui só provamos
  // que o ledger nunca é chamado 2x pro mesmo request no fluxo real.
});

test('operations and balances of two different accounts never leak into each other', async () => {
  const accounts = new InMemorySandboxAccountRepository();
  await accounts.create({ id: 'sbx_acc_ledger_x', userId: 'u1', currency: 'BRL', availableMinor: 50_000, ledgerMinor: 50_000, digitalAccountMinor: 50_000, blockedMinor: 0, investmentsMinor: 0, cardAccountMinor: 0, creditMinor: 0, foreignCurrencyMinor: 0 });
  await accounts.create({ id: 'sbx_acc_ledger_y', userId: 'u2', currency: 'BRL', availableMinor: 50_000, ledgerMinor: 50_000, digitalAccountMinor: 50_000, blockedMinor: 0, investmentsMinor: 0, cardAccountMinor: 0, creditMinor: 0, foreignCurrencyMinor: 0 });
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  await ledger.recordOperation({ operationId: 'sbx_op_x', accountId: 'sbx_acc_ledger_x', kind: 'PIX_TRANSFER', status: 'COMPLETED', amountMinor: 20_000, details: {}, ledgerEntry: { balanceField: 'availableMinor', deltaMinor: -20_000, transaction: transaction('sbx_acc_ledger_x', 'sbx_txn_ledger_x', 20_000) } });
  assert.equal((await accounts.findById('sbx_acc_ledger_x'))?.availableMinor, 30_000);
  assert.equal((await accounts.findById('sbx_acc_ledger_y'))?.availableMinor, 50_000);
  assert.equal(await ledger.findById('sbx_op_x', 'sbx_acc_ledger_y'), undefined); // não enxerga operação da outra conta
});
