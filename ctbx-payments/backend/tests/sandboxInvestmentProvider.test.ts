import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthContext } from '../src/providers/ports.js';
import { InMemorySandboxAccountRepository } from '../src/providers/sandbox/InMemorySandboxAccountRepository.js';
import { InMemorySandboxInvestmentSimulationRepository } from '../src/providers/sandbox/InMemorySandboxInvestmentSimulationRepository.js';
import { InMemorySandboxLedgerRepository } from '../src/providers/sandbox/InMemorySandboxLedgerRepository.js';
import { SandboxInvestmentProvider } from '../src/providers/sandbox/SandboxInvestmentProvider.js';

const CONTEXT: AuthContext = {
  sessionId: 'sbx_session_1', userId: 'sbx_user_1', accountId: 'sbx_account_inv_1', deviceId: 'sbx_device_1',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { id: 'sbx_user_1', type: 'PF', displayName: 'Cliente Sandbox' },
  account: { id: 'sbx_account_inv_1', type: 'PERSONAL', status: 'ACTIVE' },
};

function build() {
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const simulations = new InMemorySandboxInvestmentSimulationRepository();
  const provider = new SandboxInvestmentProvider('test', accounts, ledger, simulations);
  return { provider, accounts, ledger, simulations };
}

test('constructor is forbidden in production', () => {
  const accounts = new InMemorySandboxAccountRepository();
  assert.throws(() => new SandboxInvestmentProvider('production', accounts, new InMemorySandboxLedgerRepository(accounts), new InMemorySandboxInvestmentSimulationRepository()), /forbidden in production/);
});

test('createOrder debits the REAL account balance atomically, records the order and derives the position from it', async () => {
  const { provider, accounts } = build();
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string }>;
  const simulation = await provider.simulate(CONTEXT, { productId: products[0]!.id, amountMinor: 20_000 }) as { simulationId: string; projectedNetMinor: number };
  assert.ok(Number.isInteger(simulation.projectedNetMinor));
  const order = await provider.createOrder(CONTEXT, { simulationId: simulation.simulationId, termsAccepted: true }, 'k1', 'r1') as { orderId: string; status: string; amountMinor: number };
  assert.equal(order.status, 'COMPLETED');
  assert.equal(order.amountMinor, 20_000);

  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 105_000); // 125_000 semeado - 20_000

  const statement = await accounts.listTransactions(CONTEXT.accountId);
  assert.ok(statement.some((item) => item.amountMinor === 20_000 && item.type === 'INVESTMENT_ORDER'));

  const positions = await provider.listPositions(CONTEXT) as Array<{ orderId: string; investedMinor: number }>;
  assert.equal(positions.length, 1);
  assert.equal(positions[0]!.orderId, order.orderId);
  assert.equal(positions[0]!.investedMinor, 20_000);
});

test('createOrder is rejected when it would exceed the real account balance, and nothing is applied', async () => {
  const { provider, accounts } = build();
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string; maximumAmountMinor: number }>;
  const bigProduct = products.find((item) => item.maximumAmountMinor > 200_000)!;
  const simulation = await provider.simulate(CONTEXT, { productId: bigProduct.id, amountMinor: 200_000 }) as { simulationId: string };
  await assert.rejects(provider.createOrder(CONTEXT, { simulationId: simulation.simulationId, termsAccepted: true }, 'k1', 'r1'), { code: 'INVESTMENT_INSUFFICIENT_FUNDS' });
  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 125_000); // saldo intacto
  const positions = await provider.listPositions(CONTEXT);
  assert.equal(positions.length, 0); // nenhuma ordem foi criada
});

test('a completed order and its simulation survive a fresh provider instance over the same repositories (simulates a backend restart)', async () => {
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const simulations = new InMemorySandboxInvestmentSimulationRepository();
  const provider = new SandboxInvestmentProvider('test', accounts, ledger, simulations);
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string }>;
  const simulation = await provider.simulate(CONTEXT, { productId: products[0]!.id, amountMinor: 15_000 }) as { simulationId: string };

  // "Restart": provider novo, MESMOS repositórios — a simulação não pode
  // depender de Map()/memória do processo pra "aplicar" continuar
  // funcionando (requisito explícito da Etapa 5).
  const providerAfterRestart = new SandboxInvestmentProvider('test', accounts, ledger, simulations);
  const order = await providerAfterRestart.createOrder(CONTEXT, { simulationId: simulation.simulationId, termsAccepted: true }, 'k1', 'r1') as { orderId: string; status: string };
  assert.equal(order.status, 'COMPLETED');

  const providerAgain = new SandboxInvestmentProvider('test', accounts, ledger, simulations);
  const fetched = await providerAgain.getOrder(CONTEXT, order.orderId) as { status: string };
  assert.equal(fetched.status, 'COMPLETED');
});

test('createOrder replay with the same idempotency key never double-debits', async () => {
  const { provider, accounts } = build();
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string }>;
  const simulation = await provider.simulate(CONTEXT, { productId: products[0]!.id, amountMinor: 10_000 }) as { simulationId: string };
  const payload = { simulationId: simulation.simulationId, termsAccepted: true };
  const first = await provider.createOrder(CONTEXT, payload, 'idem-01', 'r1') as { orderId: string };
  const replay = await provider.createOrder(CONTEXT, payload, 'idem-01', 'r2') as { orderId: string };
  assert.equal(first.orderId, replay.orderId);
  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 115_000); // debitado só uma vez
  await assert.rejects(provider.createOrder(CONTEXT, { ...payload, termsAccepted: false }, 'idem-01', 'r3'), { code: 'IDEMPOTENCY_KEY_CONFLICT' });
});

test('replaying createOrder with the same idempotency key AFTER a simulated restart still never double-debits (idempotency is persisted, not just in-memory)', async () => {
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const simulations = new InMemorySandboxInvestmentSimulationRepository();
  const provider = new SandboxInvestmentProvider('test', accounts, ledger, simulations);
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string }>;
  const simulation = await provider.simulate(CONTEXT, { productId: products[0]!.id, amountMinor: 10_000 }) as { simulationId: string };
  const payload = { simulationId: simulation.simulationId, termsAccepted: true };
  const first = await provider.createOrder(CONTEXT, payload, 'idem-restart-01', 'r1') as { orderId: string };

  // "Restart": provider novo (o cache de idempotência em memória de um
  // provider antigo, se existisse, teria sumido) — porém a simulação
  // FICA persistida, então sem a idempotência também persistida, este
  // replay chegaria até o ledger e debitaria uma segunda vez.
  const providerAfterRestart = new SandboxInvestmentProvider('test', accounts, ledger, simulations);
  const replay = await providerAfterRestart.createOrder(CONTEXT, payload, 'idem-restart-01', 'r2') as { orderId: string };
  assert.equal(replay.orderId, first.orderId);

  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 115_000); // 125_000 - 10_000, debitado só UMA vez
  const positions = await providerAfterRestart.listPositions(CONTEXT);
  assert.equal(positions.length, 1); // não duplicou a posição
});

test('two different accounts never see each other\'s simulations, orders or positions', async () => {
  const { provider } = build();
  const otherContext: AuthContext = { ...CONTEXT, accountId: 'sbx_account_inv_2', account: { ...CONTEXT.account, id: 'sbx_account_inv_2' } };
  const products = await provider.listProducts(CONTEXT) as Array<{ id: string }>;
  const simulation = await provider.simulate(CONTEXT, { productId: products[0]!.id, amountMinor: 10_000 }) as { simulationId: string };
  await assert.rejects(provider.createOrder(otherContext, { simulationId: simulation.simulationId, termsAccepted: true }, 'k1', 'r1'), { code: 'INVESTMENT_SIMULATION_NOT_FOUND' });
  const order = await provider.createOrder(CONTEXT, { simulationId: simulation.simulationId, termsAccepted: true }, 'k1', 'r1') as { orderId: string };
  await assert.rejects(provider.getOrder(otherContext, order.orderId), { code: 'INVESTMENT_ORDER_NOT_FOUND' });
  assert.equal((await provider.listPositions(otherContext)).length, 0);
  assert.equal((await provider.listPositions(CONTEXT)).length, 1);
});
