import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { InMemoryPhysicalCardRepository } from '../src/providers/sandbox/InMemoryPhysicalCardRepository.js';
import { InMemorySandboxAccountRepository } from '../src/providers/sandbox/InMemorySandboxAccountRepository.js';
import { InMemorySandboxLedgerRepository } from '../src/providers/sandbox/InMemorySandboxLedgerRepository.js';
import { InMemoryTransportCardRepository } from '../src/providers/sandbox/InMemoryTransportCardRepository.js';
import { SandboxCardProvider } from '../src/providers/sandbox/SandboxCardProvider.js';
import { SandboxChallengeProvider } from '../src/providers/sandbox/SandboxChallengeProvider.js';
import type { AuthContext } from '../src/providers/ports.js';
import type {
  CreateVirtualCardInput, UpdateVirtualCardInput, VirtualCardRecord, VirtualCardRepository, VirtualCardTransactionRecord,
} from '../src/repositories/VirtualCardRepository.js';

// Repositório em memória — testa o provider/rotas/validação de verdade sem
// precisar de Postgres, mesmo espírito de fakeItemsRepository em
// adminCms.test.ts. O repositório real (Drizzle) é exercitado ao vivo via
// uso manual + migração já aplicada (ver db/schema/sandboxCards.ts).
function fakeVirtualCardRepository(): VirtualCardRepository {
  const cards = new Map<string, VirtualCardRecord>();
  const transactions = new Map<string, VirtualCardTransactionRecord[]>();
  const repo = {
    listByAccount: async (accountId: string) => [...cards.values()].filter((row) => row.accountId === accountId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    findById: async (id: string, accountId: string) => { const row = cards.get(id); return row && row.accountId === accountId ? row : undefined; },
    create: async (input: CreateVirtualCardInput) => {
      // Mesma checagem que o índice único faz no Postgres (Etapa 5.1).
      if (input.idempotencyKey && [...cards.values()].some((row) => row.accountId === input.accountId && row.idempotencyKey === input.idempotencyKey)) {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
      }
      const now = new Date();
      const row: VirtualCardRecord = { ...input, usedMinor: 0, status: 'ACTIVE', createdAt: now, updatedAt: now };
      cards.set(row.id, row);
      return row;
    },
    findByIdempotencyKey: async (accountId: string, idempotencyKey: string) => [...cards.values()].find((row) => row.accountId === accountId && row.idempotencyKey === idempotencyKey),
    update: async (id: string, accountId: string, patch: UpdateVirtualCardInput) => {
      const row = cards.get(id);
      if (!row || row.accountId !== accountId) return undefined;
      const next = { ...row, ...patch, updatedAt: new Date() } as VirtualCardRecord;
      cards.set(id, next);
      return next;
    },
    listTransactions: async (cardId: string) => (transactions.get(cardId) ?? []).slice().sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()),
    deleteTransactions: async (cardId: string) => { transactions.delete(cardId); },
    createTransactions: async (rows: Array<Omit<VirtualCardTransactionRecord, 'createdAt'>>) => {
      for (const row of rows) {
        const cardId = row.cardId;
        const list = transactions.get(cardId) ?? [];
        list.push({ ...row, createdAt: new Date() });
        transactions.set(cardId, list);
      }
    },
  };
  return repo as unknown as VirtualCardRepository;
}

const CONTEXT: AuthContext = {
  sessionId: 'sbx_session_1', userId: 'sbx_user_1', accountId: 'sbx_account_1', deviceId: 'sbx_device_1',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { id: 'sbx_user_1', type: 'PF', displayName: 'Cliente Sandbox' },
  account: { id: 'sbx_account_1', type: 'PERSONAL', status: 'ACTIVE' },
};
const TEST_ENCRYPTION_KEY = randomBytes(32).toString('base64');

function buildProvider(options: { withPersistence?: boolean; challenges?: SandboxChallengeProvider } = {}) {
  const { withPersistence = true, challenges = new SandboxChallengeProvider('test') } = options;
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const physicalCards = new InMemoryPhysicalCardRepository();
  const transportCards = new InMemoryTransportCardRepository();
  const provider = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards, challenges, () => new Date(), withPersistence ? fakeVirtualCardRepository() : undefined, withPersistence ? TEST_ENCRYPTION_KEY : undefined);
  return { provider, accounts };
}

test('constructor is forbidden in production', () => {
  const accounts = new InMemorySandboxAccountRepository();
  assert.throws(() => new SandboxCardProvider('production', accounts, new InMemorySandboxLedgerRepository(accounts), new InMemoryPhysicalCardRepository(), new InMemoryTransportCardRepository()), /forbidden in production/);
});

test('virtual card methods fail closed (PROVIDER_NOT_CONFIGURED) without a repository/encryption key configured', async () => {
  const { provider } = buildProvider({ withPersistence: false });
  await assert.rejects(provider.listVirtualCards(CONTEXT), { code: 'PROVIDER_NOT_CONFIGURED' });
  await assert.rejects(provider.createVirtualCard(CONTEXT, { color: 'Roxo', limitMinor: 100 }, 'k', 'r'), { code: 'PROVIDER_NOT_CONFIGURED' });
});

test('virtual card limit pool starts fully available and shrinks on create', async () => {
  const { provider } = buildProvider();
  const before = await provider.getVirtualCardLimitPool(CONTEXT) as { totalMinor: number; allocatedMinor: number; availableMinor: number };
  assert.equal(before.allocatedMinor, 0);
  assert.equal(before.availableMinor, before.totalMinor);

  const card = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: 'Assinaturas', limitMinor: 500_000 }, 'key-1', 'req-1') as { id: string; status: string; limitMinor: number; availableMinor: number; lastFour: string };
  assert.equal(card.status, 'ACTIVE');
  assert.equal(card.limitMinor, 500_000);
  assert.equal(card.availableMinor, 500_000);
  assert.equal(card.lastFour.length, 4);

  const after = await provider.getVirtualCardLimitPool(CONTEXT) as { allocatedMinor: number; availableMinor: number };
  assert.equal(after.allocatedMinor, 500_000);
  assert.equal(after.availableMinor, before.availableMinor - 500_000);
});

test('create rejects an invalid color and a limit that exceeds the pool', async () => {
  const { provider } = buildProvider();
  await assert.rejects(provider.createVirtualCard(CONTEXT, { color: 'Rosa', nickname: null, limitMinor: 100 }, 'key-1', 'req-1'), { code: 'CARD_REQUEST_INVALID' });
  await assert.rejects(provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 10_000_000 }, 'key-2', 'req-2'), { code: 'CARD_LIMIT_EXCEEDS_POOL' });
});

test('create is idempotent for the same key+payload and conflicts on same key with a different payload', async () => {
  const { provider } = buildProvider();
  const first = await provider.createVirtualCard(CONTEXT, { color: 'Verde', nickname: null, limitMinor: 200_000 }, 'same-key', 'req-1');
  const replay = await provider.createVirtualCard(CONTEXT, { color: 'Verde', nickname: null, limitMinor: 200_000 }, 'same-key', 'req-2');
  assert.deepEqual(first, replay);
  await assert.rejects(provider.createVirtualCard(CONTEXT, { color: 'Verde', nickname: null, limitMinor: 300_000 }, 'same-key', 'req-3'), { code: 'IDEMPOTENCY_KEY_CONFLICT' });
  const pool = await provider.getVirtualCardLimitPool(CONTEXT) as { allocatedMinor: number };
  assert.equal(pool.allocatedMinor, 200_000); // só 1 cartão foi criado de verdade
});

test('block/unblock only succeed from the expected state, and are idempotent', async () => {
  const { provider } = buildProvider();
  const card = await provider.createVirtualCard(CONTEXT, { color: 'Preto', nickname: null, limitMinor: 100_000 }, 'k1', 'r1') as { id: string };
  const blocked = await provider.setVirtualCardBlocked(CONTEXT, card.id, true, 'k2', 'r2') as { status: string };
  assert.equal(blocked.status, 'BLOCKED');
  await assert.rejects(provider.setVirtualCardBlocked(CONTEXT, card.id, true, 'k3', 'r3'), { code: 'CARD_INVALID_STATE' });
  const unblocked = await provider.setVirtualCardBlocked(CONTEXT, card.id, false, 'k4', 'r4') as { status: string };
  assert.equal(unblocked.status, 'ACTIVE');
});

test('setVirtualCardLimit validates against used amount and pool availability', async () => {
  const { provider } = buildProvider();
  const card = await provider.createVirtualCard(CONTEXT, { color: 'Dourado', nickname: null, limitMinor: 100_000 }, 'k1', 'r1') as { id: string };
  const raised = await provider.setVirtualCardLimit(CONTEXT, card.id, { limitMinor: 400_000 }, 'k2', 'r2') as { limitMinor: number };
  assert.equal(raised.limitMinor, 400_000);
  await assert.rejects(provider.setVirtualCardLimit(CONTEXT, card.id, { limitMinor: 10_000_000 }, 'k3', 'r3'), { code: 'CARD_LIMIT_EXCEEDS_POOL' });
});

test('cancel frees the pool allocation and cannot be repeated', async () => {
  const { provider } = buildProvider();
  const card = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 500_000 }, 'k1', 'r1') as { id: string };
  const cancelled = await provider.cancelVirtualCard(CONTEXT, card.id, 'k2', 'r2') as { status: string };
  assert.equal(cancelled.status, 'CANCELLED');
  const pool = await provider.getVirtualCardLimitPool(CONTEXT) as { allocatedMinor: number };
  assert.equal(pool.allocatedMinor, 0);
  await assert.rejects(provider.cancelVirtualCard(CONTEXT, card.id, 'k3', 'r3'), { code: 'CARD_ALREADY_CANCELLED' });
});

test('operations on an unknown virtual card id return CARD_NOT_FOUND', async () => {
  const { provider } = buildProvider();
  await assert.rejects(provider.getVirtualCard(CONTEXT, 'sbx_card_vrt_doesnotexist'), { code: 'CARD_NOT_FOUND' });
  await assert.rejects(provider.cancelVirtualCard(CONTEXT, 'sbx_card_vrt_doesnotexist', 'k1', 'r1'), { code: 'CARD_NOT_FOUND' });
});

test('listVirtualCards reflects every created card, and never exposes a full number or CVV field', async () => {
  const { provider } = buildProvider();
  await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: 'A', limitMinor: 100_000 }, 'k1', 'r1');
  await provider.createVirtualCard(CONTEXT, { color: 'Verde', nickname: 'B', limitMinor: 100_000 }, 'k2', 'r2');
  const list = await provider.listVirtualCards(CONTEXT) as Record<string, unknown>[];
  assert.equal(list.length, 2);
  for (const card of list) {
    assert.equal('number' in card, false);
    assert.equal('pan' in card, false);
    assert.equal('cvv' in card, false);
    assert.equal('panEncrypted' in card, false);
    assert.equal('cvvEncrypted' in card, false);
  }
});

test('a different sandbox account can never see or touch another account\'s virtual card', async () => {
  const { provider } = buildProvider();
  const card = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 100_000 }, 'k1', 'r1') as { id: string };
  const otherAccount: AuthContext = { ...CONTEXT, accountId: 'sbx_account_2' };
  await assert.rejects(provider.getVirtualCard(otherAccount, card.id), { code: 'CARD_NOT_FOUND' });
  await assert.rejects(provider.cancelVirtualCard(otherAccount, card.id, 'k2', 'r2'), { code: 'CARD_NOT_FOUND' });
});

test('recreateVirtualCard keeps the same id/limit but changes the last four, resets usedMinor and reseeds transactions', async () => {
  const { provider } = buildProvider();
  const created = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: 'Assinaturas', limitMinor: 500_000 }, 'k1', 'r1') as { id: string; lastFour: string };
  const beforeTransactions = await provider.listVirtualCardTransactions(CONTEXT, created.id) as unknown[];
  assert.ok(beforeTransactions.length > 0);

  const recreated = await provider.recreateVirtualCard(CONTEXT, created.id, 'k2', 'r2') as { id: string; lastFour: string; limitMinor: number; usedMinor: number; nickname: string };
  assert.equal(recreated.id, created.id);
  assert.equal(recreated.limitMinor, 500_000);
  assert.equal(recreated.usedMinor, 0);
  assert.equal(recreated.nickname, 'Assinaturas');
  assert.notEqual(recreated.lastFour, created.lastFour); // extremamente improvável colidir, mas não é garantido — ver nota abaixo

  const afterTransactions = await provider.listVirtualCardTransactions(CONTEXT, created.id) as unknown[];
  assert.ok(afterTransactions.length > 0);
});

test('recreate is blocked on a cancelled card', async () => {
  const { provider } = buildProvider();
  const card = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 100_000 }, 'k1', 'r1') as { id: string };
  await provider.cancelVirtualCard(CONTEXT, card.id, 'k2', 'r2');
  await assert.rejects(provider.recreateVirtualCard(CONTEXT, card.id, 'k3', 'r3'), { code: 'CARD_INVALID_STATE' });
});

test('revealing PAN/CVV requires a verified challenge tied to the same card, and decrypts back to the original values', async () => {
  const challenges = new SandboxChallengeProvider('test');
  const { provider } = buildProvider({ challenges });
  const card = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 100_000 }, 'k1', 'r1') as { id: string };

  // Sem challenge nenhum: revelar falha.
  await assert.rejects(provider.revealVirtualCardData(CONTEXT, card.id, { challengeId: 'not-real' }, 'req-x'), { code: 'AUTH_CHALLENGE_INVALID' });

  const challenge = await provider.createRevealChallenge(CONTEXT, card.id) as { id: string };
  // Challenge criado mas ainda não verificado: revelar continua falhando.
  await assert.rejects(provider.revealVirtualCardData(CONTEXT, card.id, { challengeId: challenge.id }, 'req-y'), { code: 'AUTH_CHALLENGE_INVALID' });

  await challenges.verify(CONTEXT, challenge.id, { proof: '123456' });
  const revealed = await provider.revealVirtualCardData(CONTEXT, card.id, { challengeId: challenge.id }, 'req-z') as { number: string; cvv: string };
  assert.equal(revealed.number.length, 16);
  assert.equal(revealed.number.startsWith('4'), true); // prefixo Visa
  assert.equal(revealed.cvv.length, 3);
});

test('a challenge created for one card cannot reveal a different card', async () => {
  const challenges = new SandboxChallengeProvider('test');
  const { provider } = buildProvider({ challenges });
  const cardA = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 100_000 }, 'k1', 'r1') as { id: string };
  const cardB = await provider.createVirtualCard(CONTEXT, { color: 'Verde', nickname: null, limitMinor: 100_000 }, 'k2', 'r2') as { id: string };
  const challenge = await provider.createRevealChallenge(CONTEXT, cardA.id) as { id: string };
  await challenges.verify(CONTEXT, challenge.id, { proof: '123456' });
  await assert.rejects(provider.revealVirtualCardData(CONTEXT, cardB.id, { challengeId: challenge.id }, 'req-z'), { code: 'AUTH_CHALLENGE_INVALID' });
});

test('listVirtualCardTransactions returns the fictitious seeded transactions for the correct card only', async () => {
  const { provider } = buildProvider();
  const cardA = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 100_000 }, 'k1', 'r1') as { id: string };
  const cardB = await provider.createVirtualCard(CONTEXT, { color: 'Verde', nickname: null, limitMinor: 100_000 }, 'k2', 'r2') as { id: string };
  const transactionsA = await provider.listVirtualCardTransactions(CONTEXT, cardA.id) as Array<{ cardId: string }>;
  assert.ok(transactionsA.length > 0);
  assert.ok(transactionsA.every((item) => item.cardId === cardA.id));
  const transactionsB = await provider.listVirtualCardTransactions(CONTEXT, cardB.id) as Array<{ cardId: string }>;
  assert.ok(transactionsB.every((item) => item.cardId === cardB.id));
});

// ---- Cartão físico (Etapa 4) ---------------------------------------------

test('the physical card seeds once (available balance/status), and stays the same object on every subsequent read', async () => {
  const { provider } = buildProvider();
  const first = await provider.list(CONTEXT) as Array<{ id: string; status: string; availableMinor: number }>;
  assert.equal(first.length, 1);
  assert.equal(first[0]!.status, 'PENDING_ACTIVATION');
  assert.equal(first[0]!.availableMinor, 245_080);
  const second = await provider.list(CONTEXT) as Array<{ id: string }>;
  assert.equal(second[0]!.id, first[0]!.id); // mesmo cartão, não recria a cada chamada
});

test('activate → block → unblock persist through the repository (survives a fresh provider instance, same repos)', async () => {
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const physicalCards = new InMemoryPhysicalCardRepository();
  const transportCards = new InMemoryTransportCardRepository();
  const challenges = new SandboxChallengeProvider('test');
  const provider = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards, challenges, () => new Date());
  const card = (await provider.list(CONTEXT))[0]!;
  const challenge = await provider.createActivationChallenge(CONTEXT, card.id) as { id: string };
  await challenges.verify(CONTEXT, challenge.id, { proof: '123456' });
  await provider.activate(CONTEXT, card.id, { challengeId: challenge.id }, 'k1', 'r1');
  await provider.setBlocked(CONTEXT, card.id, true, 'k2', 'r2');

  // Simula um "restart do backend": instancia um provider NOVO sobre os
  // MESMOS repositórios (equivalente ao Postgres sobreviver ao restart —
  // ver teste manual ao vivo pra prova real contra Postgres).
  const providerAfterRestart = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards, challenges, () => new Date());
  const reloaded = (await providerAfterRestart.list(CONTEXT))[0]!;
  assert.equal(reloaded.id, card.id);
  assert.equal(reloaded.status, 'BLOCKED'); // não voltou a PENDING_ACTIVATION
});

test('recharge debits the REAL account balance atomically and credits the card — no parallel balance', async () => {
  const { provider, accounts } = buildProvider();
  const card = (await provider.list(CONTEXT))[0]!;
  // A conta ainda não existe até a primeira operação que a toca (mesmo
  // "ensure on first access" da Etapa 2/3) — recharge() é o que dispara
  // isso aqui, semeando o saldo padrão (125_000) antes de debitar.
  const recharge = await provider.recharge(CONTEXT, card.id, { amountMinor: 5_000, currency: 'BRL' }, 'k1', 'r1') as { newBalanceMinor: number };
  assert.equal(recharge.newBalanceMinor, 250_080); // 245_080 + 5_000

  const accountAfter = await accounts.findById(CONTEXT.accountId);
  assert.equal(accountAfter?.availableMinor, 120_000); // 125_000 (semeado) - 5_000, debitado da CONTA real

  const statement = await accounts.listTransactions(CONTEXT.accountId);
  assert.ok(statement.some((item) => item.amountMinor === 5_000 && item.type === 'CARD_RECHARGE'));
});

test('recharge is rejected when it would exceed the real account balance, and nothing is applied', async () => {
  const { provider, accounts } = buildProvider();
  const card = (await provider.list(CONTEXT))[0]!;
  // O teto de recarga por operação (100_000) é sempre menor que o saldo
  // semeado padrão (125_000) — pra exercitar de verdade o guard de saldo
  // insuficiente, baixamos o saldo da conta primeiro (equivalente a um
  // cliente que já gastou boa parte do saldo em PIX/transferências).
  await accounts.create({ id: CONTEXT.accountId, userId: CONTEXT.userId, currency: 'BRL', availableMinor: 1_000, ledgerMinor: 1_000, digitalAccountMinor: 1_000, blockedMinor: 0, investmentsMinor: 0, cardAccountMinor: 0, creditMinor: 0, foreignCurrencyMinor: 0 });
  await assert.rejects(provider.recharge(CONTEXT, card.id, { amountMinor: 5_000, currency: 'BRL' }, 'k1', 'r1'), { code: 'CARD_RECHARGE_INSUFFICIENT_FUNDS' });
  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 1_000); // saldo intacto
  const cardAfter = await provider.get(CONTEXT, card.id) as { availableMinor: number };
  assert.equal(cardAfter.availableMinor, 245_080); // cartão intacto
});

test('two different accounts get their own independent physical card (isolation)', async () => {
  const { provider } = buildProvider();
  const otherContext: AuthContext = { ...CONTEXT, accountId: 'sbx_account_physical_other', account: { ...CONTEXT.account, id: 'sbx_account_physical_other' } };
  const cardA = (await provider.list(CONTEXT))[0]!;
  const cardB = (await provider.list(otherContext))[0]!;
  assert.notEqual(cardA.id, cardB.id);
  await provider.recharge(CONTEXT, cardA.id, { amountMinor: 5_000, currency: 'BRL' }, 'k1', 'r1');
  const cardAAfter = await provider.get(CONTEXT, cardA.id) as { availableMinor: number };
  const cardBAfter = await provider.get(otherContext, cardB.id) as { availableMinor: number };
  assert.equal(cardAAfter.availableMinor, 250_080);
  assert.equal(cardBAfter.availableMinor, 245_080); // não afetado
});

test('the transport (TOP) card also persists through the repository and recharges from the real account balance', async () => {
  const { provider, accounts } = buildProvider();
  const before = await provider.getTransportCard(CONTEXT) as { balanceMinor: number };
  assert.equal(before.balanceMinor, 4_820);
  const recharge = await provider.rechargeTransport(CONTEXT, { amountMinor: 2_000, currency: 'BRL' }, 'k1', 'r1') as { newBalanceMinor: number };
  assert.equal(recharge.newBalanceMinor, 6_820);
  const after = await provider.getTransportCard(CONTEXT) as { balanceMinor: number };
  assert.equal(after.balanceMinor, 6_820);
  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 123_000); // 125_000 - 2_000
});

test('the physical card, virtual card and account balance never mix up between each other', async () => {
  const { provider, accounts } = buildProvider();
  const card = (await provider.list(CONTEXT))[0]!;
  await provider.recharge(CONTEXT, card.id, { amountMinor: 1_000, currency: 'BRL' }, 'k1', 'r1');
  const virtualCard = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 50_000 }, 'k2', 'r2') as { id: string; limitMinor: number };
  assert.equal(virtualCard.limitMinor, 50_000); // limite do cartão virtual é seu próprio "bolso", não a conta
  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 124_000); // só a recarga do cartão físico debitou a conta
});

// ---- Etapa 5.1 — Hardening financeiro (idempotência persistida) ---------

test('CRITICAL FIX: recharge replay with the same Idempotency-Key AFTER a simulated backend restart never double-debits', async () => {
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const physicalCards = new InMemoryPhysicalCardRepository();
  const transportCards = new InMemoryTransportCardRepository();
  const provider = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards);
  const card = (await provider.list(CONTEXT))[0]!;
  const first = await provider.recharge(CONTEXT, card.id, { amountMinor: 5_000, currency: 'BRL' }, 'idem-restart-recharge', 'r1') as { rechargeId: string; newBalanceMinor: number };
  assert.equal(first.newBalanceMinor, 250_080);

  // "Restart": provider novo, MESMOS repositórios — antes desta correção,
  // o cache de idempotência (Map() em memória) sumia aqui e o replay
  // executava a recarga uma SEGUNDA vez de verdade.
  const providerAfterRestart = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards);
  const replay = await providerAfterRestart.recharge(CONTEXT, card.id, { amountMinor: 5_000, currency: 'BRL' }, 'idem-restart-recharge', 'r2') as { rechargeId: string; newBalanceMinor: number; requestId: string };
  assert.equal(replay.rechargeId, first.rechargeId);
  assert.equal(replay.newBalanceMinor, 250_080); // não virou 255_080
  assert.equal(replay.requestId, 'r1'); // requestId congelado da requisição ORIGINAL

  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 120_000); // 125_000 - 5_000, debitado só UMA vez
  const cardAfter = await providerAfterRestart.get(CONTEXT, card.id) as { availableMinor: number };
  assert.equal(cardAfter.availableMinor, 250_080); // creditado só UMA vez
});

test('recharge replay AFTER restart with the SAME key but a DIFFERENT payload is a 409 conflict, not a silent re-execution', async () => {
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const physicalCards = new InMemoryPhysicalCardRepository();
  const transportCards = new InMemoryTransportCardRepository();
  const provider = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards);
  const card = (await provider.list(CONTEXT))[0]!;
  await provider.recharge(CONTEXT, card.id, { amountMinor: 5_000, currency: 'BRL' }, 'idem-restart-conflict', 'r1');

  const providerAfterRestart = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards);
  await assert.rejects(providerAfterRestart.recharge(CONTEXT, card.id, { amountMinor: 9_000, currency: 'BRL' }, 'idem-restart-conflict', 'r2'), { code: 'IDEMPOTENCY_KEY_CONFLICT' });
  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 120_000); // só o primeiro debito de 5_000 se aplicou
});

test('transport (TOP) recharge replay AFTER a simulated restart never double-debits (same fix as the physical card)', async () => {
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const physicalCards = new InMemoryPhysicalCardRepository();
  const transportCards = new InMemoryTransportCardRepository();
  const provider = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards);
  const first = await provider.rechargeTransport(CONTEXT, { amountMinor: 2_000, currency: 'BRL' }, 'idem-restart-top', 'r1') as { rechargeId: string; newBalanceMinor: number };
  assert.equal(first.newBalanceMinor, 6_820);

  const providerAfterRestart = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards);
  const replay = await providerAfterRestart.rechargeTransport(CONTEXT, { amountMinor: 2_000, currency: 'BRL' }, 'idem-restart-top', 'r2') as { rechargeId: string; newBalanceMinor: number };
  assert.equal(replay.rechargeId, first.rechargeId);
  assert.equal(replay.newBalanceMinor, 6_820);
  const account = await accounts.findById(CONTEXT.accountId);
  assert.equal(account?.availableMinor, 123_000); // 125_000 - 2_000, uma única vez
});

test('PRIORITY 3 FIX: creating a virtual card with a replayed Idempotency-Key AFTER a simulated restart never creates a second card', async () => {
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const physicalCards = new InMemoryPhysicalCardRepository();
  const transportCards = new InMemoryTransportCardRepository();
  const virtualCards = fakeVirtualCardRepository();
  const provider = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards, undefined, () => new Date(), virtualCards, TEST_ENCRYPTION_KEY);
  const first = await provider.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 100_000 }, 'idem-restart-vcard', 'r1') as { id: string };

  const providerAfterRestart = new SandboxCardProvider('test', accounts, ledger, physicalCards, transportCards, undefined, () => new Date(), virtualCards, TEST_ENCRYPTION_KEY);
  const replay = await providerAfterRestart.createVirtualCard(CONTEXT, { color: 'Roxo', nickname: null, limitMinor: 100_000 }, 'idem-restart-vcard', 'r2') as { id: string };
  assert.equal(replay.id, first.id);

  const list = await providerAfterRestart.listVirtualCards(CONTEXT) as unknown[];
  assert.equal(list.length, 1); // não duplicou
  const pool = await providerAfterRestart.getVirtualCardLimitPool(CONTEXT) as { allocatedMinor: number };
  assert.equal(pool.allocatedMinor, 100_000); // não alocou o limite duas vezes
});
