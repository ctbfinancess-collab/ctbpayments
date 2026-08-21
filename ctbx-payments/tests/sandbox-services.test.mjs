import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import apiClientModule from '../src/api/client.js';
import ApiErrorModule from '../src/api/ApiError.js';
import mapperModule from '../src/services/mappers/accountMapper.js';
import statementMapperModule from '../src/services/mappers/statementMapper.js';
import cardMapperModule from '../src/services/mappers/cardMapper.js';
import cardServiceModule from '../src/services/cardService.js';
import pixMapperModule from '../src/services/mappers/pixMapper.js';
import pixServiceModule from '../src/services/pixService.js';
import transferMapperModule from '../src/services/mappers/transferMapper.js';
import transferServiceModule from '../src/services/transferService.js';
import paymentMapperModule from '../src/services/mappers/paymentMapper.js';
import paymentServiceModule from '../src/services/paymentService.js';
import statementServiceModule from '../src/services/statementService.js';
import sandboxAuthModule from '../src/services/sandboxAuthClient.js';
import reducerModule from '../src/session/sessionReducer.js';
import statementUtilsModule from '../src/utils/statementUtils.js';
import investmentServiceModule from '../src/services/investmentService.js';
import billingServiceModule from '../src/services/billingService.js';
import consignedServiceModule from '../src/services/consignedService.js';
import investmentMapperModule from '../src/services/mappers/investmentMapper.js';
import billingMapperModule from '../src/services/mappers/billingMapper.js';
import consignedMapperModule from '../src/services/mappers/consignedMapper.js';

const { apiClient, buildAuthHeaders, configureApiClient } = apiClientModule;
const ApiError = ApiErrorModule.default || ApiErrorModule;
const { formatCents, mapSandboxAccount, mapSandboxBalances } = mapperModule;
const { mapSandboxReceipt, mapSandboxStatement, mapSandboxTransaction } = statementMapperModule;
const { mapSandboxCard, mapSandboxCardMutation, mapSandboxCardRecharge, mapSandboxCardReceipt, mapSandboxCardTransaction, mapSandboxCardTransactions, mapSandboxVirtualCard, mapSandboxVirtualCards, mapVirtualCardLimitPool } = cardMapperModule;
const { createCardService } = cardServiceModule;
const { mapSandboxPixKeys, mapSandboxPixLookup, mapSandboxPixReceipt, mapSandboxPixTransfer, mapSandboxPixValidation, mapSandboxQrLookup, mapSandboxReceiveQr } = pixMapperModule;
const { createPixService } = pixServiceModule;
const { mapSandboxBank, mapSandboxTransfer, mapSandboxTransferBeneficiary, mapSandboxTransferFavorites, mapSandboxTransferReceipt, mapSandboxTransferValidation } = transferMapperModule;
const { createTransferService } = transferServiceModule;
const { mapSandboxBill, mapSandboxInstallments, mapSandboxPayment, mapSandboxPaymentReceipt, mapSandboxPaymentValidation } = paymentMapperModule;
const { createPaymentService } = paymentServiceModule;
const { createStatementService } = statementServiceModule;
const { mapSandboxSession, refreshSandboxSession, sandboxLogin, logoutSandboxSession } = sandboxAuthModule;
const { initialSessionState, sessionReducer } = reducerModule;
const { filterTransactions } = statementUtilsModule;
const { createInvestmentService } = investmentServiceModule; const { createBillingService } = billingServiceModule; const { createConsignedService } = consignedServiceModule;
const { mapInvestmentSimulation, mapInvestmentPosition } = investmentMapperModule; const { mapBillingBill } = billingMapperModule; const { mapConsignedApplication } = consignedMapperModule;

const statementIso = (days, hour = 12) => { const value = new Date(); value.setDate(value.getDate() + days); value.setHours(hour, 0, 0, 0); return value.toISOString(); };
const rawStatementItem = (overrides = {}) => ({ id: 'sbx_txn_test', occurredAt: statementIso(0), type: 'PIX_RECEIVED', direction: 'CREDIT', description: 'Pix recebido', counterparty: 'Cliente Sandbox', amountMinor: 125050, currency: 'BRL', status: 'COMPLETED', category: 'Pix', feeMinor: 0, receiptAvailable: true, institution: 'Banco Sandbox', document: '***', ...overrides });

function readMode(mode) {
  const code = "import('./src/config/appMode.js').then((m) => console.log(JSON.stringify(m.default || m)))";
  return JSON.parse(execFileSync(process.execPath, ['--import', './backend/node_modules/tsx/dist/loader.mjs', '-e', code], {
    cwd: process.cwd(), env: { ...process.env, EXPO_PUBLIC_APP_MODE: mode }, encoding: 'utf8',
  }));
}

test('config distinguishes DEMO, SANDBOX and PRODUCTION', () => {
  assert.equal(readMode('DEMO').isDemoMode, true);
  assert.equal(readMode('SANDBOX').isSandboxMode, true);
  assert.equal(readMode('PRODUCTION').isProductionMode, true);
});

test('sandbox login maps BFF session without changing credentials', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: { user: { id: 'sbx_user' }, account: { id: 'sbx_account' }, sessionId: 'sbx_session', accessToken: 'access', refreshToken: 'refresh', expiresAt: '2099-01-01T00:00:00Z', deviceId: 'sbx_device' } };
  };
  const session = await sandboxLogin({ email: 'sandbox@example.invalid', password: 'secret-not-logged' }, { installationId: 'sbx_install', platform: 'ANDROID' }, client);
  assert.equal(call.path, '/v1/auth/login');
  assert.equal(call.body.username, 'sandbox@example.invalid');
  assert.equal(call.options.skipAuth, true);
  assert.equal(session.deviceId, 'sbx_device');
  assert.equal(session.sandboxMode, true);
});

test('API auth headers contain access token and device, never refresh token', () => {
  const headers = buildAuthHeaders({ Accept: 'application/json' }, 'access-only', 'device-only');
  assert.equal(headers.Authorization, 'Bearer access-only');
  assert.equal(headers['X-Device-Id'], 'device-only');
  assert.equal('refreshToken' in headers, false);
});

test('account mapper keeps integer cents as source and formats only presentation', () => {
  assert.equal(formatCents(125000), '1.250,00');
  assert.throws(() => formatCents(12.5), /integer cents/);
  const account = mapSandboxAccount({ id: 'sbx_account', maskedAgency: 'SBX-1', maskedNumber: 'SBX-2', accountType: 'CHECKING', currency: 'BRL', status: 'ACTIVE' });
  assert.equal(account.type, 'CHECKING');
  const balances = mapSandboxBalances({ available: { amount: 125000 }, components: { blocked: { amount: 5000 }, investments: { amount: 200000 }, cardAccount: { amount: 25000 }, credit: { amount: 75000 } } });
  assert.equal(balances[0].value, '1.250,00');
  assert.equal(balances[1].value, '2.000,00');
});

test('BFF balance envelope maps available cents to the Home balance presentation', () => {
  const response = {
    data: {
      available: { amount: 125000, currency: 'BRL' },
      ledger: { amount: 130000, currency: 'BRL' },
      components: {
        blocked: { amount: 5000, currency: 'BRL' },
        investments: { amount: 200000, currency: 'BRL' },
        cardAccount: { amount: 25000, currency: 'BRL' },
        credit: { amount: 75000, currency: 'BRL' },
      },
    },
    meta: {},
    requestId: 'test-request-id',
  };

  const homeBalances = mapSandboxBalances(response.data);
  const availableBalance = homeBalances[0];

  assert.equal(availableBalance.value, '1.250,00');
  assert.equal(`${availableBalance.tag} ${availableBalance.value}`, 'R$ 1.250,00');
  assert.equal(availableBalance.blockedValue, '50,00');
});

test('statement mapper preserves integer cents until presentation mapping', () => {
  const mapped = mapSandboxTransaction(rawStatementItem());
  assert.equal(mapped.amountMinor, 125050);
  assert.equal(mapped.amount, 1250.5);
  assert.equal(mapped.amountFormatted, '1.250,50');
  assert.equal(mapped.direction, 'entrada');
  assert.equal(mapped.status, 'Concluído');
  assert.throws(() => mapSandboxTransaction(rawStatementItem({ amountMinor: 12.5 })), /integer minor units/);
});

test('statement filters cover quick periods, custom dates, directions and categories', () => {
  const mapped = mapSandboxStatement([
    rawStatementItem({ id: 'today-credit', occurredAt: statementIso(0), direction: 'CREDIT', category: 'Pix' }),
    rawStatementItem({ id: 'seven-debit', occurredAt: statementIso(-6), direction: 'DEBIT', category: 'Pagamento' }),
    rawStatementItem({ id: 'fifteen', occurredAt: statementIso(-14) }),
    rawStatementItem({ id: 'thirty', occurredAt: statementIso(-29) }),
    rawStatementItem({ id: 'sixty', occurredAt: statementIso(-59) }),
    rawStatementItem({ id: 'ninety', occurredAt: statementIso(-89) }),
  ]);
  assert.equal(filterTransactions(mapped, { period: 1 }).length, 1);
  assert.equal(filterTransactions(mapped, { period: 7 }).length, 2);
  assert.equal(filterTransactions(mapped, { period: 15 }).length, 3);
  assert.equal(filterTransactions(mapped, { period: 30 }).length, 4);
  assert.equal(filterTransactions(mapped, { period: 60 }).length, 5);
  assert.equal(filterTransactions(mapped, { period: 90 }).length, 6);
  assert.equal(filterTransactions(mapped, { period: 90, direction: 'entrada' }).length, 5);
  assert.equal(filterTransactions(mapped, { period: 90, category: 'Pagamento' }).length, 1);
  assert.equal(filterTransactions(mapped, { period: 90, startDate: mapped[1].date, endDate: mapped[0].date }).length, 2);
});

test('statement service SANDBOX loads normal, future, blocked, detail and receipt routes', async () => {
  const calls = [];
  const normal = rawStatementItem();
  const future = rawStatementItem({ id: 'sbx_future', occurredAt: statementIso(3), status: 'SCHEDULED', direction: 'DEBIT', receiptAvailable: false });
  const blocked = rawStatementItem({ id: 'sbx_blocked', occurredAt: statementIso(-2), status: 'UNDER_REVIEW', direction: 'DEBIT', receiptAvailable: false });
  const receipt = { operationId: 'sbx_op_test', transactionId: normal.id, occurredAt: normal.occurredAt, amountMinor: normal.amountMinor, currency: 'BRL', payer: 'Origem Sandbox', payee: 'Destino Sandbox', institution: 'CTBX Sandbox', status: 'COMPLETED', requestId: 'request-test' };
  const responses = new Map([
    ['/v1/accounts/current/statement', [normal]],
    ['/v1/accounts/current/statement/future', [future]],
    ['/v1/accounts/current/statement/blocked', [blocked]],
    [`/v1/accounts/current/transactions/${normal.id}`, normal],
    [`/v1/accounts/current/transactions/${normal.id}/receipt`, receipt],
  ]);
  const client = async (path, options) => { calls.push({ path, options }); return { data: responses.get(path) }; };
  const service = createStatementService({ sandboxMode: true, client, balanceLoader: async () => [{ value: '1.250,00' }] });
  const data = await service.getStatementData();
  const detail = await service.getTransaction({ id: normal.id });
  const mappedReceipt = await service.getReceipt({ id: normal.id });
  assert.equal(data.balance, '1.250,00');
  assert.equal(data.transactions.length, 1);
  assert.equal(data.futureTransactions[0].status, 'Agendado');
  assert.equal(data.blockedTransactions[0].status, 'Em análise');
  assert.equal(detail.id, normal.id);
  assert.equal(mappedReceipt.operationId, 'sbx_op_test');
  assert.equal(mappedReceipt.amountFormatted, '1.250,50');
  assert.ok(calls.every((call) => call.options.retryOnUnauthorized === true));
});

test('statement service propagates sanitized 404 errors', async () => {
  const service = createStatementService({ sandboxMode: true, client: async () => { throw new ApiError('Movimentação não encontrada.', { code: 'TRANSACTION_NOT_FOUND', status: 404 }); } });
  await assert.rejects(service.getTransaction({ id: 'sbx_txn_missing' }), (error) => error.status === 404 && error.code === 'TRANSACTION_NOT_FOUND' && !error.details);
});

test('statement GET refreshes once after 401 and retries with the rotated access token', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; configureApiClient(); });
  let accessToken = 'expired-statement-token';
  let refreshCalls = 0;
  let statementCalls = 0;
  globalThis.fetch = async (_url, options) => {
    statementCalls += 1;
    if (options.headers.Authorization === 'Bearer expired-statement-token') {
      return new Response(JSON.stringify({ error: { code: 'AUTH_ACCESS_TOKEN_EXPIRED', message: 'expired' } }), { status: 401 });
    }
    assert.equal(options.headers.Authorization, 'Bearer rotated-statement-token');
    return new Response(JSON.stringify({ data: [rawStatementItem()] }), { status: 200 });
  };
  configureApiClient({
    getBaseURL: () => 'http://sandbox.test',
    getAccessToken: () => accessToken,
    getDeviceId: () => 'sandbox-device',
    onUnauthorized: async () => { refreshCalls += 1; accessToken = 'rotated-statement-token'; },
  });
  const service = createStatementService({ sandboxMode: true, client: apiClient });
  const items = await service.listTransactions();
  assert.equal(items.length, 1);
  assert.equal(refreshCalls, 1);
  assert.equal(statementCalls, 2);
});

test('statement modes preserve DEMO fixtures and reject unconfigured production', async () => {
  const demo = createStatementService({ demoMode: true });
  assert.ok((await demo.listTransactions()).length > 0);
  const production = createStatementService();
  await assert.rejects(production.listTransactions(), (error) => error.code === 'BACKEND_NOT_CONFIGURED');
});

test('receipt mapper produces the structural receipt presentation', () => {
  const receipt = mapSandboxReceipt({ operationId: 'sbx_op_test', transactionId: 'sbx_txn_test', occurredAt: statementIso(0), amountMinor: 9900, currency: 'BRL', payer: 'Pagador Sandbox', payee: 'Recebedor Sandbox', institution: 'CTBX Sandbox', status: 'COMPLETED', requestId: 'request-test' });
  assert.equal(receipt.amount, 99);
  assert.equal(receipt.amountFormatted, '99,00');
  assert.equal(receipt.counterparty, 'Recebedor Sandbox');
  assert.equal(receipt.requestId, 'request-test');
});

test('card mapper formats integer cents and rejects fractional minor units', () => {
  const card = mapSandboxCard({ id: 'sbx_card_test', type: 'PHYSICAL', lastFour: '4821', holderName: 'CLIENTE SANDBOX', expiryMonth: 8, expiryYear: 2029, status: 'ACTIVE', availableMinor: 245080, currency: 'BRL' });
  assert.equal(card.balance, 'R$ 2.450,80');
  assert.equal(card.holder, 'CLIENTE SANDBOX');
  assert.equal(card.expiry, '08/29');
  const transaction = mapSandboxCardTransaction({ id: 'sbx_ctx_test', cardId: card.id, occurredAt: new Date().toISOString(), direction: 'DEBIT', merchantName: 'Loja Sandbox', amountMinor: 8640, status: 'APPROVED', authorizationCodeMasked: 'SBX-**01', receiptAvailable: true });
  assert.equal(transaction.value, '- R$ 86,40');
  assert.equal(transaction.authorization, 'SBX-**01');
  assert.throws(() => mapSandboxCard({ availableMinor: 12.5 }), /integer minor units/);
});

test('card statement periods include relative transactions for 7, 15 and 30 days', () => {
  const now = Date.now();
  const items = mapSandboxCardTransactions([0, 1, 4, 12, 25].map((days, index) => ({ id: `sbx_ctx_${index}`, cardId: 'sbx_card_test', occurredAt: new Date(now - days * 86400000).toISOString(), direction: 'DEBIT', merchantName: `Loja ${index}`, amountMinor: 1000, status: 'APPROVED', authorizationCodeMasked: `SBX-**0${index}`, receiptAvailable: true })));
  const within = (period) => items.filter((item) => new Date(item.occurredAt).getTime() >= now - period * 86400000);
  assert.equal(within(7).length, 3);
  assert.equal(within(15).length, 4);
  assert.equal(within(30).length, 5);
});

test('card service SANDBOX loads cards, detail, statement, transaction, receipts and TOP', async () => {
  const card = { id: 'sbx_card_test', type: 'PHYSICAL', brand: 'Mastercard', lastFour: '4821', holderName: 'CLIENTE SANDBOX', expiryMonth: 8, expiryYear: 2029, status: 'ACTIVE', availableMinor: 245080, currency: 'BRL' };
  const top = { id: 'sbx_top_test', type: 'TRANSPORT', brand: 'TOP', lastFour: '9073', holderName: 'CLIENTE SANDBOX', status: 'ACTIVE', balanceMinor: 4820, currency: 'BRL' };
  const transaction = { id: 'sbx_ctx_test', cardId: card.id, occurredAt: new Date().toISOString(), direction: 'DEBIT', merchantName: 'Loja Sandbox', amountMinor: 8640, status: 'APPROVED', authorizationCodeMasked: 'SBX-**01', receiptAvailable: true };
  const receipt = { id: 'sbx_cr_test', operationId: 'sbx_cop_test', cardId: card.id, transactionId: transaction.id, occurredAt: transaction.occurredAt, merchantName: transaction.merchantName, amountMinor: transaction.amountMinor, currency: 'BRL', status: 'APPROVED', authorizationCodeMasked: transaction.authorizationCodeMasked, requestId: 'request-test' };
  const responses = new Map([['/v1/cards', [card]], ['/v1/transport-card', top], [`/v1/cards/${card.id}`, card], [`/v1/cards/${card.id}/transactions`, [transaction]], [`/v1/cards/${card.id}/transactions/${transaction.id}`, transaction], [`/v1/cards/${card.id}/receipts`, [receipt]], [`/v1/cards/${card.id}/transactions/${transaction.id}/receipt`, receipt]]);
  const calls = [];
  const service = createCardService({ sandboxMode: true, client: async (path, options) => { calls.push({ path, options }); return { data: responses.get(path) }; } });
  const cards = await service.getCards();
  assert.equal(cards.length, 2);
  assert.equal((await service.getCard(card.id)).id, card.id);
  assert.equal((await service.getCardTransactions(card.id))[0].id, transaction.id);
  assert.equal((await service.getCardTransaction(transaction)).id, transaction.id);
  assert.equal((await service.getCardReceipts(card.id))[0].transactionId, transaction.id);
  assert.equal((await service.getCardReceipt(transaction)).requestId, 'request-test');
  assert.equal((await service.getTransportCard()).balance, 'R$ 48,20');
  assert.ok(calls.every((call) => call.options.retryOnUnauthorized === true));
});

test('card service SANDBOX connects activation, status, password, recharge, request and TOP', async () => {
  const card = { id: 'sbx_card_test', availableMinor: 245080 };
  const calls = [];
  const client = async (path, options) => { calls.push({ path, options, body: options.body ? JSON.parse(options.body) : undefined }); if (path === '/v1/cards') return { data: [card] }; if (path.endsWith('/activation/challenge')) return { data: { id: 'challenge-card' } }; if (path.endsWith('/verify')) return { data: { status: 'VERIFIED' } }; if (path.endsWith('/activate')) return { data: { cardId: card.id, status: 'ACTIVE', environment: 'SANDBOX', simulated: true } }; if (path.endsWith('/block')) return { data: { cardId: card.id, status: 'BLOCKED', environment: 'SANDBOX', simulated: true } }; if (path.endsWith('/unblock')) return { data: { cardId: card.id, status: 'ACTIVE', environment: 'SANDBOX', simulated: true } }; if (path.endsWith('/password')) return { data: { cardId: card.id, passwordChanged: true, environment: 'SANDBOX', simulated: true } }; if (path === '/v1/cards/requests') return { data: { requestIdPublic: 'request', status: 'RECEIVED', environment: 'SANDBOX', simulated: true } }; if (path.endsWith('/recharge')) return { data: { rechargeId: 'recharge', amountMinor: 5000, newBalanceMinor: 250080, status: 'COMPLETED', environment: 'SANDBOX', simulated: true } }; throw new Error(path); };
  const sandbox = createCardService({ sandboxMode: true, client });
  const [activated, replay] = await Promise.all([sandbox.activateCard(card, '123456'), sandbox.activateCard(card, '123456')]); assert.equal(activated.statusLabel, 'Desbloqueado'); assert.equal(replay.statusLabel, 'Desbloqueado'); assert.equal(calls.filter((call) => call.path.endsWith('/activate')).length, 1);
  assert.equal((await sandbox.setBlocked(true, card)).statusLabel, 'Bloqueado'); assert.equal((await sandbox.setBlocked(false, card)).statusLabel, 'Desbloqueado');
  assert.equal((await sandbox.changePassword('9876', card)).passwordChanged, true); assert.equal((await sandbox.rechargeCard('50,00', { card })).newBalance, 'R$ 2.500,80'); assert.equal((await sandbox.rechargeTransportCard('50,00')).amount, '50,00'); assert.equal((await sandbox.requestCard({ color: 'Roxo' })).statusLabel, 'Recebida');
  assert.ok(calls.filter((call) => call.options.headers?.['Idempotency-Key']).length >= 6);
  assert.equal(calls.find((call) => call.path.endsWith('/password')).body.password, '9876');
  const demo = createCardService({ demoMode: true });
  assert.equal((await demo.getCards()).length, 2);
  assert.equal((await demo.setBlocked(true)).blocked, true);
});

test('card receipt mapper exposes only structural masked presentation fields', () => {
  const receipt = mapSandboxCardReceipt({ id: 'sbx_cr_test', transactionId: 'sbx_ctx_test', occurredAt: new Date().toISOString(), merchantName: 'Loja Sandbox', amountMinor: 9900, authorizationCodeMasked: 'SBX-**99' });
  assert.equal(receipt.value, '- R$ 99,00');
  assert.equal(receipt.authorization, 'SBX-**99');
});

test('card mutation mappers preserve cents and SANDBOX markers', () => {
  assert.equal(mapSandboxCardMutation({ status: 'BLOCKED', environment: 'SANDBOX', simulated: true }).statusLabel, 'Bloqueado');
  const recharge = mapSandboxCardRecharge({ amountMinor: 5000, newBalanceMinor: 250080, environment: 'SANDBOX', simulated: true }); assert.equal(recharge.amount, '50,00'); assert.equal(recharge.newBalance, 'R$ 2.500,80');
  assert.throws(() => mapSandboxCardRecharge({ amountMinor: 10.5, newBalanceMinor: 20 }), /integer minor units/);
});

test('virtual card mapper preserves the raw status enum (statusKey) alongside the pt-BR label, and formats limit/used', () => {
  const raw = { id: 'sbx_card_vrt_test', type: 'VIRTUAL', status: 'BLOCKED', nickname: 'Assinaturas', color: 'Roxo', lastFour: '4587', holderName: 'CLIENTE SANDBOX', expiryMonth: 8, expiryYear: 2030, limitMinor: 500000, usedMinor: 82000, availableMinor: 418000, currency: 'BRL', createdAt: new Date().toISOString() };
  const card = mapSandboxVirtualCard(raw);
  assert.equal(card.statusKey, 'BLOCKED');
  assert.equal(card.status, 'Bloqueado');
  assert.equal(card.limit, 'R$ 5.000,00');
  assert.equal(card.used, 'R$ 820,00');
  assert.equal(card.balance, 'R$ 4.180,00');
  assert.equal(mapSandboxVirtualCards([raw, raw]).length, 2);
});

test('virtual card limit pool mapper formats totals and rejects fractional minor units', () => {
  const pool = mapVirtualCardLimitPool({ totalMinor: 3000000, allocatedMinor: 500000, availableMinor: 2500000, currency: 'BRL' });
  assert.equal(pool.total, 'R$ 30.000,00');
  assert.equal(pool.allocated, 'R$ 5.000,00');
  assert.equal(pool.available, 'R$ 25.000,00');
  assert.throws(() => mapVirtualCardLimitPool({ totalMinor: 1.5, allocatedMinor: 0, availableMinor: 0 }), /integer minor units/);
});

test('card service SANDBOX connects the full virtual card lifecycle (list, create, limit, block/unblock, cancel)', async () => {
  const virtualCard = { id: 'sbx_card_vrt_test', type: 'VIRTUAL', status: 'ACTIVE', nickname: 'Assinaturas', color: 'Roxo', lastFour: '4587', holderName: 'CLIENTE SANDBOX', expiryMonth: 8, expiryYear: 2030, limitMinor: 500000, usedMinor: 0, availableMinor: 500000, currency: 'BRL', createdAt: new Date().toISOString() };
  const pool = { totalMinor: 3000000, allocatedMinor: 500000, availableMinor: 2500000, currency: 'BRL' };
  const calls = [];
  const client = async (path, options) => {
    calls.push({ path, options, body: options.body ? JSON.parse(options.body) : undefined });
    if (path === '/v1/cards/virtual') return { data: options.method === 'POST' ? virtualCard : [virtualCard] };
    if (path === '/v1/cards/virtual/limit-pool') return { data: pool };
    if (path === `/v1/cards/virtual/${virtualCard.id}`) return { data: virtualCard };
    if (path.endsWith('/limit')) return { data: { ...virtualCard, limitMinor: 800000, availableMinor: 800000 } };
    if (path.endsWith('/block')) return { data: { cardId: virtualCard.id, status: 'BLOCKED', environment: 'SANDBOX', simulated: true } };
    if (path.endsWith('/unblock')) return { data: { cardId: virtualCard.id, status: 'ACTIVE', environment: 'SANDBOX', simulated: true } };
    if (path.endsWith('/cancel')) return { data: { cardId: virtualCard.id, status: 'CANCELLED', environment: 'SANDBOX', simulated: true } };
    throw new Error(path);
  };
  const sandbox = createCardService({ sandboxMode: true, client });

  assert.equal((await sandbox.listVirtualCards())[0].id, virtualCard.id);
  assert.equal((await sandbox.getVirtualCard(virtualCard.id)).limit, 'R$ 5.000,00');
  assert.equal((await sandbox.getVirtualCardLimitPool()).available, 'R$ 25.000,00');
  const overview = await sandbox.getVirtualCardsOverview();
  assert.equal(overview.cards[0].id, virtualCard.id);
  assert.equal(overview.pool.available, 'R$ 25.000,00');

  const [created, replay] = await Promise.all([
    sandbox.createVirtualCard({ color: 'Roxo', nickname: 'Assinaturas', limit: '5.000,00' }),
    sandbox.createVirtualCard({ color: 'Roxo', nickname: 'Assinaturas', limit: '5.000,00' }),
  ]);
  assert.equal(created.id, virtualCard.id);
  assert.equal(replay.id, virtualCard.id);
  assert.equal(calls.filter((call) => call.path === '/v1/cards/virtual' && call.options.method === 'POST').length, 1); // idempotência dedup

  assert.equal((await sandbox.setVirtualCardLimit(virtualCard.id, '8.000,00')).limit, 'R$ 8.000,00');
  const limitCall = calls.find((call) => call.path.endsWith('/limit'));
  assert.equal(limitCall.options.method, 'PUT');
  assert.equal(limitCall.body.limitMinor, 800000);

  assert.equal((await sandbox.blockVirtualCard(virtualCard.id)).statusLabel, 'Bloqueado');
  assert.equal((await sandbox.unblockVirtualCard(virtualCard.id)).statusLabel, 'Desbloqueado');
  assert.equal((await sandbox.cancelVirtualCard(virtualCard.id)).statusLabel, 'Cancelado');
  assert.ok(calls.filter((call) => call.options.headers?.['Idempotency-Key']).length >= 5);

  const demo = createCardService({ demoMode: true });
  assert.ok((await demo.listVirtualCards()).length >= 1);
  assert.equal((await demo.getVirtualCardLimitPool()).available, 'R$ 25.000,00');
  assert.equal((await demo.cancelVirtualCard('demo-virtual-1')).status, 'CANCELLED');
});

test('card service SANDBOX connects recreate, transactions and the reveal (challenge + verify + reveal) flow', async () => {
  const cardId = 'sbx_card_vrt_test';
  const recreated = { id: cardId, type: 'VIRTUAL', status: 'ACTIVE', nickname: 'Assinaturas', color: 'Roxo', lastFour: '9012', holderName: 'CLIENTE SANDBOX', expiryMonth: 8, expiryYear: 2030, limitMinor: 500000, usedMinor: 0, availableMinor: 500000, currency: 'BRL', createdAt: new Date().toISOString() };
  const transactions = [{ id: 'sbx_vctx_1', cardId, occurredAt: new Date().toISOString(), merchantName: 'Streaming Sandbox', amountMinor: 3990, currency: 'BRL', status: 'APPROVED' }];
  const calls = [];
  const client = async (path, options) => {
    calls.push({ path, options, body: options.body ? JSON.parse(options.body) : undefined });
    if (path.endsWith('/recreate')) return { data: recreated };
    if (path.endsWith('/transactions')) return { data: transactions };
    if (path.endsWith('/reveal/challenge')) return { data: { id: 'sbx_challenge_reveal_1' } };
    if (path.endsWith('/verify')) return { data: { status: 'VERIFIED' } };
    if (path.endsWith('/reveal')) return { data: { cardId, number: '4111222233339012', cvv: '456' } };
    throw new Error(path);
  };
  const sandbox = createCardService({ sandboxMode: true, client });

  const result = await sandbox.recreateVirtualCard(cardId);
  assert.equal(result.lastFour, '9012');
  const recreateCall = calls.find((call) => call.path.endsWith('/recreate'));
  assert.equal(recreateCall.options.method, 'POST');
  assert.ok(recreateCall.options.headers['Idempotency-Key']);

  const cardTransactions = await sandbox.getVirtualCardTransactions(cardId);
  assert.equal(cardTransactions.length, 1);
  assert.equal(cardTransactions[0].value, '- R$ 39,90');
  assert.equal(cardTransactions[0].status, 'Aprovada');

  const revealed = await sandbox.revealVirtualCardData(cardId);
  assert.equal(revealed.number, '4111222233339012');
  assert.equal(revealed.cvv, '456');
  assert.ok(calls.some((call) => call.path.endsWith('/reveal/challenge')));
  assert.ok(calls.some((call) => call.path.endsWith('/verify') && call.body.proof === '123456'));
  assert.ok(calls.some((call) => call.path.endsWith('/reveal') && call.body.challengeId === 'sbx_challenge_reveal_1'));

  const demo = createCardService({ demoMode: true });
  assert.ok((await demo.recreateVirtualCard(cardId)).lastFour);
  assert.ok((await demo.getVirtualCardTransactions(cardId)).length >= 0);
  assert.ok((await demo.revealVirtualCardData(cardId)).number);
});

test('PIX mappers preserve cents and normalize SANDBOX reads for existing screens', () => {
  const beneficiary = { name: 'Cliente Recebedor SANDBOX', documentMasked: '***.***.***-**', bankName: 'Banco SANDBOX', branch: '0001', accountMasked: '******-0', accountType: 'Conta corrente' };
  const lookup = mapSandboxPixLookup({ key: 'recebedor@sandbox.invalid', keyType: 'EMAIL', beneficiary, status: 'ACTIVE', requestId: 'request-pix' });
  assert.equal(lookup.beneficiary.bank, 'Banco SANDBOX');
  assert.equal(lookup.beneficiary.document, '***.***.***-**');
  const qr = mapSandboxQrLookup({ payloadId: 'sbx_qr', key: 'recebedor@sandbox.invalid', keyType: 'EMAIL', beneficiary, amountMinor: 12500, currency: 'BRL', txId: 'SBXQR001', status: 'VALID' });
  assert.equal(qr.amountMinor, 12500);
  assert.equal(qr.amount, '125,00');
  const keys = mapSandboxPixKeys([{ id: 'sbx_key', type: 'PHONE', keyMasked: '+55 (**) *****-0000', status: 'ACTIVE' }]);
  assert.equal(keys[0].value, '+55 (**) *****-0000');
  const receive = mapSandboxReceiveQr({ qrId: 'sbx_receive', copyPaste: 'CTBXPIX-SANDBOX|RECEIVE', qrPayload: 'CTBXPIX-SANDBOX|RECEIVE', amountMinor: 5000, currency: 'BRL', status: 'READY' }, 'masked-key');
  assert.equal(receive.amount, '50,00');
});

test('PIX service SANDBOX connects key, QR, own keys and receive QR reads', async () => {
  const beneficiary = { name: 'Cliente Recebedor SANDBOX', documentMasked: '***.***.***-**', bankName: 'Banco SANDBOX', branch: '0001', accountMasked: '******-0', accountType: 'Conta corrente' };
  const responses = new Map([
    ['/v1/pix/keys/lookup', { key: 'recebedor@sandbox.invalid', keyType: 'EMAIL', beneficiary, status: 'ACTIVE', requestId: 'request-pix' }],
    ['/v1/pix/qr/lookup', { payloadId: 'sbx_qr', key: 'recebedor@sandbox.invalid', keyType: 'EMAIL', beneficiary, amountMinor: 12500, currency: 'BRL', txId: 'SBXQR001', status: 'VALID' }],
    ['/v1/pix/keys', [{ id: 'sbx_key', type: 'EMAIL', keyMasked: 'conta@sandbox.invalid', status: 'ACTIVE', createdAt: new Date().toISOString() }]],
    ['/v1/pix/receive/qr', { qrId: 'sbx_receive', copyPaste: 'CTBXPIX-SANDBOX|RECEIVE', qrPayload: 'CTBXPIX-SANDBOX|RECEIVE', amountMinor: 12500, currency: 'BRL', expiresAt: new Date().toISOString(), status: 'READY' }],
  ]);
  const calls = [];
  const client = async (path, options) => { calls.push({ path, options, body: options.body ? JSON.parse(options.body) : undefined }); return { data: responses.get(path) }; };
  const service = createPixService({ sandboxMode: true, client, balanceLoader: async () => [{ value: '1.250,00' }] });
  assert.equal((await service.lookupKey({ key: 'recebedor@sandbox.invalid' })).beneficiary.name, 'Cliente Recebedor SANDBOX');
  assert.equal((await service.lookupQrCode({ payload: 'CTBXPIX-SANDBOX|QR|12500' })).amount, '125,00');
  assert.equal((await service.getKeys())[0].type, 'E-mail');
  assert.equal((await service.generateReceiveQr({ keyId: 'sbx_key', keyValue: 'conta@sandbox.invalid', amount: '125,00' })).amountMinor, 12500);
  assert.equal((await service.getPixTransferData()).balance, '1.250,00');
  assert.equal(calls.find((call) => call.path === '/v1/pix/receive/qr').body.amountMinor, 12500);
  assert.ok(calls.every((call) => call.options.retryOnUnauthorized === true));
});

test('PIX transfer mappers preserve integer cents and explicit SANDBOX presentation', () => {
  const beneficiary = { beneficiaryId: 'sbx_pix_beneficiary_001', name: 'Cliente Recebedor SANDBOX', documentMasked: '***.***.***-**', bankName: 'Banco SANDBOX', branch: '0001', accountMasked: '******-0', accountType: 'Conta corrente' };
  const validation = mapSandboxPixValidation({ validationId: 'sbx_pix_val_1', beneficiary, amountMinor: 125000, currency: 'BRL', feeMinor: 0, totalDebitMinor: 125000, status: 'VALIDATED', scheduledFor: null });
  assert.equal(validation.amount, '1.250,00');
  assert.equal(validation.beneficiary.beneficiaryId, beneficiary.beneficiaryId);
  const transfer = mapSandboxPixTransfer({ pixTransferId: 'sbx_pix_tx_1', beneficiary, amountMinor: 12500, currency: 'BRL', status: 'COMPLETED', environment: 'SANDBOX', simulated: true, sandboxReference: 'SBX-PIX-**01' });
  assert.equal(transfer.amount, '125,00');
  assert.equal(transfer.sandboxMode, true);
  const receipt = mapSandboxPixReceipt({ receiptId: 'sbx_pix_receipt_1', pixTransferId: transfer.pixTransferId, beneficiary, amountMinor: 12500, currency: 'BRL', status: 'COMPLETED', simulated: true });
  assert.equal(receipt.amount, '125,00');
  assert.equal(receipt.simulated, true);
  assert.throws(() => mapSandboxPixValidation({ amountMinor: 12.5, feeMinor: 0, totalDebitMinor: 12.5 }), /integer minor units/);
});

test('PIX service SANDBOX validates, verifies OTP, submits once and loads receipt', async () => {
  const beneficiary = { beneficiaryId: 'sbx_pix_beneficiary_001', name: 'Cliente Recebedor SANDBOX', documentMasked: '***.***.***-**', bankName: 'Banco SANDBOX', branch: '0001', accountMasked: '******-0', accountType: 'Conta corrente' };
  const validation = { validationId: 'sbx_pix_val_1', beneficiary, amountMinor: 12500, currency: 'BRL', feeMinor: 0, totalDebitMinor: 12500, status: 'VALIDATED', requiresChallenge: true, warnings: [] };
  const transfer = { pixTransferId: 'sbx_pix_tx_1', validationId: validation.validationId, beneficiary, amountMinor: 12500, currency: 'BRL', status: 'COMPLETED', environment: 'SANDBOX', simulated: true, sandboxReference: 'SBX-PIX-**01' };
  const receipt = { receiptId: 'sbx_pix_receipt_1', pixTransferId: transfer.pixTransferId, beneficiary, amountMinor: 12500, currency: 'BRL', status: 'COMPLETED', environment: 'SANDBOX', simulated: true, sandboxReference: transfer.sandboxReference };
  const calls = [];
  const client = async (path, options) => {
    calls.push({ path, options, body: options.body ? JSON.parse(options.body) : undefined });
    if (path === '/v1/pix/transfers/validate') return { data: validation };
    if (path === '/v1/security/challenges') return { data: { id: 'sbx_challenge_1', status: 'PENDING' } };
    if (path === '/v1/security/challenges/sbx_challenge_1/verify') { assert.equal(JSON.parse(options.body).proof, '123456'); return { data: { id: 'sbx_challenge_1', status: 'VERIFIED' } }; }
    if (path === '/v1/pix/transfers') return { data: transfer };
    if (path === `/v1/pix/transfers/${transfer.pixTransferId}/receipt`) return { data: receipt };
    throw new Error(`Unexpected path ${path}`);
  };
  const service = createPixService({ sandboxMode: true, client });
  const validated = await service.validateTransfer({ beneficiary: { beneficiaryId: beneficiary.beneficiaryId }, amount: '125,00', message: 'Teste SANDBOX' });
  assert.equal(validated.amountMinor, 12500);
  const [first, replay] = await Promise.all([service.authorizeTransfer(validated, '123456'), service.authorizeTransfer(validated, '123456')]);
  assert.equal(first.pixTransferId, transfer.pixTransferId);
  assert.equal(replay.pixTransferId, transfer.pixTransferId);
  assert.equal(calls.filter((call) => call.path === '/v1/security/challenges').length, 1);
  assert.equal(calls.filter((call) => call.path === '/v1/pix/transfers').length, 1);
  assert.equal(calls.find((call) => call.path === '/v1/pix/transfers').options.headers['Idempotency-Key'], `ctbx-pix-${validation.validationId}`);
  assert.equal((await service.getReceipt(first)).simulated, true);
});

test('PIX service SANDBOX schedules a validated transfer through the dedicated route', async () => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const beneficiary = { beneficiaryId: 'sbx_pix_beneficiary_001', name: 'Cliente SANDBOX', documentMasked: '***', bankName: 'Banco SANDBOX', branch: '0001', accountMasked: '***', accountType: 'Conta corrente' };
  const calls = [];
  const client = async (path, options) => {
    calls.push(path);
    if (path === '/v1/security/challenges') return { data: { id: 'challenge-schedule' } };
    if (path.endsWith('/verify')) return { data: { status: 'VERIFIED' } };
    if (path === '/v1/pix/transfers/schedule') return { data: { pixTransferId: 'scheduled-pix', validationId: 'scheduled-validation', beneficiary, amountMinor: 5000, currency: 'BRL', status: 'SCHEDULED', scheduledFor: tomorrow, environment: 'SANDBOX', simulated: true, sandboxReference: 'SBX-PIX-**02' } };
    if (path.endsWith('/receipt')) return { data: { receiptId: 'scheduled-receipt', pixTransferId: 'scheduled-pix', beneficiary, amountMinor: 5000, currency: 'BRL', status: 'SCHEDULED', scheduledFor: tomorrow, environment: 'SANDBOX', simulated: true } };
    throw new Error(`Unexpected path ${path}`);
  };
  const result = await createPixService({ sandboxMode: true, client }).scheduleTransfer({ validationId: 'scheduled-validation', beneficiary: {}, amount: '50,00', scheduled: true, scheduledFor: tomorrow, idempotencyKey: 'ctbx-pix-scheduled-validation' }, '123456');
  assert.equal(result.status, 'SCHEDULED');
  assert.ok(calls.includes('/v1/pix/transfers/schedule'));
});

test('PIX SANDBOX propagates lookup/key-management errors and blocks only the still-unsupported createTransfer', async () => {
  const service = createPixService({ sandboxMode: true, client: async () => { throw new ApiError('Chave PIX não encontrada.', { code: 'PIX_KEY_NOT_FOUND', status: 404 }); } });
  await assert.rejects(service.lookupKey({ key: 'missing' }), (error) => error.code === 'PIX_KEY_NOT_FOUND' && error.status === 404);
  // createKey/deleteKey agora chamam o backend de verdade (Etapa 3 —
  // antes eram stubs "unavailable"), então propagam o erro real da API,
  // igual lookupKey — não mais um SANDBOX_OPERATION_UNAVAILABLE sintético.
  await assert.rejects(service.createKey({ type: 'E-mail', value: 'x@y.z' }), (error) => error.code === 'PIX_KEY_NOT_FOUND');
  await assert.rejects(service.deleteKey({ id: 'sbx_pix_key_x' }), (error) => error.code === 'PIX_KEY_NOT_FOUND');
  // createTransfer continua sem rota própria dedicada (o fluxo real é
  // validateTransfer + submitSandbox) — segue bloqueado como sempre foi.
  await assert.rejects(Promise.resolve().then(() => service.createTransfer({})), (error) => error.code === 'SANDBOX_OPERATION_UNAVAILABLE');
  const production = createPixService();
  await assert.rejects(production.getKeys(), (error) => error.code === 'BACKEND_NOT_CONFIGURED');
  const demo = createPixService({ demoMode: true });
  assert.ok((await demo.getKeys()).length > 0);
});

test('PIX SANDBOX createKey/deleteKey call the real backend routes with a deterministic Idempotency-Key', async () => {
  const calls = [];
  const client = async (path, options = {}) => {
    calls.push({ path, method: options.method, key: options.headers?.['Idempotency-Key'], body: options.body ? JSON.parse(options.body) : undefined });
    if (path === '/v1/pix/keys' && options.method === 'POST') return { data: { id: 'sbx_pix_key_new', type: 'EMAIL', keyMasked: 'no••@sandbox.invalid', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z' } };
    if (path === '/v1/pix/keys/sbx_pix_key_new' && options.method === 'DELETE') return { data: { id: 'sbx_pix_key_new', status: 'REMOVED' } };
    throw new Error(`Unexpected call ${path}`);
  };
  const service = createPixService({ sandboxMode: true, client });
  const created = await service.createKey({ type: 'E-mail', value: 'nova@sandbox.invalid' });
  assert.equal(created.id, 'sbx_pix_key_new');
  assert.equal(created.status, 'Ativo'); // mapeado pelo mesmo mapSandboxPixKeys usado em getKeys
  const createCall = calls.find((call) => call.method === 'POST');
  assert.equal(createCall.body.type, 'EMAIL'); // label "E-mail" convertido pro enum do backend
  assert.ok(createCall.key.length > 0);
  await service.deleteKey({ id: 'sbx_pix_key_new' });
  const deleteCall = calls.find((call) => call.method === 'DELETE');
  assert.equal(deleteCall.path, '/v1/pix/keys/sbx_pix_key_new');
  assert.ok(deleteCall.key.length > 0);
});

test('PIX lookup refreshes once after 401 and retries with the rotated access token', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; configureApiClient(); });
  let accessToken = 'expired-pix-token';
  let refreshCalls = 0;
  let lookupCalls = 0;
  globalThis.fetch = async (_url, options) => {
    lookupCalls += 1;
    if (options.headers.Authorization === 'Bearer expired-pix-token') return new Response(JSON.stringify({ error: { code: 'AUTH_ACCESS_TOKEN_EXPIRED', message: 'expired' } }), { status: 401 });
    assert.equal(options.headers.Authorization, 'Bearer rotated-pix-token');
    return new Response(JSON.stringify({ data: { key: 'recebedor@sandbox.invalid', keyType: 'EMAIL', beneficiary: { name: 'Cliente SANDBOX', documentMasked: '***', bankName: 'Banco SANDBOX', branch: '0001', accountMasked: '***', accountType: 'Conta corrente' }, status: 'ACTIVE', requestId: 'request-pix' } }), { status: 200 });
  };
  configureApiClient({ getBaseURL: () => 'http://sandbox.test', getAccessToken: () => accessToken, getDeviceId: () => 'sandbox-device', onUnauthorized: async () => { refreshCalls += 1; accessToken = 'rotated-pix-token'; } });
  const service = createPixService({ sandboxMode: true, client: apiClient });
  const result = await service.lookupKey({ key: 'recebedor@sandbox.invalid' });
  assert.equal(result.beneficiary.bank, 'Banco SANDBOX');
  assert.equal(refreshCalls, 1);
  assert.equal(lookupCalls, 2);
});

test('transfer mapper preserves masked beneficiary data and integer cents', () => {
  const bank = { id: 'sbx_bank_a', code: 'SBX001', name: 'Banco Sandbox A', status: 'ACTIVE' };
  assert.equal(mapSandboxBank(bank).active, true);
  const raw = { beneficiaryId: 'sbx_beneficiary_internal', name: 'Cliente SANDBOX', documentMasked: '***.***.***-**', bank, branch: '0001', accountMasked: '*****-1', accountType: 'Conta digital', transferType: 'INTERNAL', status: 'ACTIVE' };
  const beneficiary = mapSandboxTransferBeneficiary(raw);
  assert.equal(beneficiary.document, '***.***.***-**');
  assert.equal(beneficiary.mode, 'internal');
  assert.equal(mapSandboxTransferFavorites([{ id: 'favorite', ...raw }])[0].bank, 'Banco Sandbox A');
  const validation = mapSandboxTransferValidation({ validationId: 'validation', beneficiary: raw, amountMinor: 12500, currency: 'BRL', feeMinor: 0, totalDebitMinor: 12500, status: 'VALIDATED', requiresChallenge: true, warnings: [] });
  assert.equal(validation.amount, '125,00');
  assert.equal(validation.totalDebit, '125,00');
  const transfer = mapSandboxTransfer({ transferId: 'sbx_transfer_1', operationId: 'sbx_operation_1', beneficiary: raw, amountMinor: 12500, feeMinor: 0, totalDebitMinor: 12500, currency: 'BRL', transferType: 'INTERNAL', status: 'COMPLETED', environment: 'SANDBOX', simulated: true, sandboxReference: 'SBX-TRANSFER-1' });
  assert.equal(transfer.amount, '125,00'); assert.equal(transfer.mode, undefined); assert.equal(transfer.simulated, true);
  const receipt = mapSandboxTransferReceipt({ transferId: transfer.transferId, beneficiary: raw, amountMinor: 12500, feeMinor: 0, currency: 'BRL', status: 'COMPLETED', environment: 'SANDBOX', simulated: true });
  assert.equal(receipt.fee, '0,00'); assert.equal(receipt.beneficiary.mode, 'internal');
  assert.throws(() => mapSandboxTransferValidation({ amountMinor: 12.5, feeMinor: 0, totalDebitMinor: 12.5 }), /integer minor units/);
});

test('transfer service SANDBOX loads banks, favorites, lookup and structural validation', async () => {
  const bank = { id: 'sbx_bank_a', code: 'SBX001', name: 'Banco Sandbox A', status: 'ACTIVE' };
  const beneficiary = { beneficiaryId: 'sbx_beneficiary_internal', name: 'Cliente SANDBOX', documentMasked: '***.***.***-**', bank, branch: '0001', accountMasked: '*****-1', accountType: 'Conta digital', transferType: 'INTERNAL', status: 'ACTIVE' };
  const responses = new Map([
    ['/v1/transfers/banks', [bank]],
    ['/v1/transfers/favorites', [{ id: 'sbx_favorite', ...beneficiary }]],
    ['/v1/transfers/beneficiaries/lookup', beneficiary],
    ['/v1/transfers/validate', { validationId: 'sbx_validation', beneficiary, amountMinor: 12500, currency: 'BRL', feeMinor: 0, totalDebitMinor: 12500, scheduledFor: new Date(Date.now() + 86_400_000).toISOString(), status: 'VALIDATED', requiresChallenge: true, warnings: ['Agendamento validado no ambiente sandbox'] }],
  ]);
  const calls = [];
  const client = async (path, options) => { calls.push({ path, options, body: options.body ? JSON.parse(options.body) : undefined }); return { data: responses.get(path) }; };
  const service = createTransferService({ sandboxMode: true, client, balanceLoader: async () => [{ value: '1.250,00' }] });
  assert.equal((await service.getBanks())[0].name, 'Banco Sandbox A');
  assert.equal((await service.getFavorites())[0].mode, 'internal');
  assert.equal((await service.lookupBeneficiary('internal', { phone: '+55 (11) 98888-0000' })).beneficiaryId, 'sbx_beneficiary_internal');
  const validated = await service.validateTransfer({ beneficiary: mapSandboxTransferBeneficiary(beneficiary), amount: '125,00', scheduled: true, date: '31/12/2099', purpose: 'Outros' });
  assert.equal(validated.status, 'VALIDATED');
  assert.equal(validated.amountMinor, 12500);
  assert.equal(validated.scheduleNotice, 'Agendamento validado no ambiente sandbox');
  assert.equal((await service.getTransferDetailsData()).balance, '1.250,00');
  assert.equal(calls.find((call) => call.path === '/v1/transfers/validate').body.amountMinor, 12500);
  assert.ok(calls.every((call) => call.options.retryOnUnauthorized === true));
});

test('transfer service SANDBOX validates, verifies OTP, submits once and loads receipt', async () => {
  const bank = { id: 'sbx_bank_a', name: 'Banco Sandbox A' };
  const beneficiary = { beneficiaryId: 'sbx_beneficiary_internal', name: 'Cliente SANDBOX', documentMasked: '***', bank, branch: '0001', accountMasked: '*****-1', accountType: 'Conta digital', transferType: 'INTERNAL', status: 'ACTIVE' };
  const validation = { validationId: 'sbx_transfer_validation_1', beneficiary, amountMinor: 12500, feeMinor: 0, totalDebitMinor: 12500, currency: 'BRL', status: 'VALIDATED', requiresChallenge: true, warnings: [] };
  const transfer = { transferId: 'sbx_transfer_1', operationId: 'sbx_operation_1', beneficiary, amountMinor: 12500, feeMinor: 0, totalDebitMinor: 12500, currency: 'BRL', transferType: 'INTERNAL', status: 'COMPLETED', environment: 'SANDBOX', simulated: true, sandboxReference: 'SBX-TRANSFER-1' };
  const receipt = { operationId: transfer.operationId, transferId: transfer.transferId, beneficiary, amountMinor: 12500, feeMinor: 0, currency: 'BRL', transferType: 'INTERNAL', status: 'COMPLETED', environment: 'SANDBOX', simulated: true, sandboxReference: transfer.sandboxReference };
  const calls = [];
  const client = async (path, options) => {
    calls.push({ path, options });
    if (path === '/v1/transfers/validate') return { data: validation };
    if (path === '/v1/security/challenges') return { data: { id: 'challenge-transfer' } };
    if (path.endsWith('/verify')) { assert.equal(JSON.parse(options.body).proof, '123456'); return { data: { status: 'VERIFIED' } }; }
    if (path === '/v1/transfers') return { data: transfer };
    if (path.endsWith('/receipt')) return { data: receipt };
    throw new Error(`Unexpected path ${path}`);
  };
  const service = createTransferService({ sandboxMode: true, client });
  const validated = await service.validateTransfer({ beneficiary: mapSandboxTransferBeneficiary(beneficiary), amount: '125,00', purpose: 'Outros' });
  const [first, replay] = await Promise.all([service.authorizeTransfer(validated, '123456'), service.authorizeTransfer(validated, '123456')]);
  assert.equal(first.transferId, transfer.transferId); assert.equal(replay.transferId, transfer.transferId);
  assert.equal(calls.filter((call) => call.path === '/v1/security/challenges').length, 1);
  assert.equal(calls.filter((call) => call.path === '/v1/transfers').length, 1);
  assert.equal(calls.find((call) => call.path === '/v1/transfers').options.headers['Idempotency-Key'], `ctbx-transfer-${validation.validationId}`);
  assert.equal((await service.getReceipt(first)).simulated, true);
});

test('transfer service SANDBOX schedules through the dedicated route', async () => {
  const beneficiary = { beneficiaryId: 'sbx_beneficiary_external', name: 'Cliente SANDBOX', documentMasked: '***', bank: { id: 'bank', name: 'Banco Sandbox B' }, branch: '0002', accountMasked: '*****-2', accountType: 'Conta corrente', transferType: 'EXTERNAL', status: 'ACTIVE' };
  const future = new Date(Date.now() + 86400000).toISOString(); const calls = [];
  const client = async (path) => { calls.push(path); if (path === '/v1/security/challenges') return { data: { id: 'challenge' } }; if (path.endsWith('/verify')) return { data: {} }; if (path === '/v1/transfers/schedule') return { data: { transferId: 'scheduled', beneficiary, amountMinor: 5000, feeMinor: 0, totalDebitMinor: 5000, currency: 'BRL', transferType: 'EXTERNAL', status: 'SCHEDULED', scheduledFor: future, environment: 'SANDBOX', simulated: true, sandboxReference: 'SBX-SCHEDULED' } }; if (path.endsWith('/receipt')) return { data: { transferId: 'scheduled', beneficiary, amountMinor: 5000, feeMinor: 0, currency: 'BRL', transferType: 'EXTERNAL', status: 'SCHEDULED', scheduledFor: future, environment: 'SANDBOX', simulated: true } }; throw new Error(path); };
  const result = await createTransferService({ sandboxMode: true, client }).scheduleTransfer({ validationId: 'validation', beneficiary: {}, amount: '50,00', scheduled: true, scheduledFor: future, idempotencyKey: 'ctbx-transfer-validation' }, '123456');
  assert.equal(result.status, 'SCHEDULED'); assert.ok(calls.includes('/v1/transfers/schedule'));
});

test('transfer service preserves DEMO, propagates 404 and rejects unconfigured production', async () => {
  const demo = createTransferService({ demoMode: true });
  assert.ok((await demo.getBanks()).length > 0);
  assert.ok((await demo.getFavorites()).length > 0);
  const missing = createTransferService({ sandboxMode: true, client: async () => { throw new ApiError('Favorecido não encontrado.', { code: 'TRANSFER_BENEFICIARY_NOT_FOUND', status: 404 }); } });
  await assert.rejects(missing.lookupBeneficiary('internal', { phone: '+5511977771111' }), (error) => error.code === 'TRANSFER_BENEFICIARY_NOT_FOUND' && error.status === 404);
  await assert.rejects(createTransferService().getBanks(), (error) => error.code === 'BACKEND_NOT_CONFIGURED');
});

test('transfer lookup refreshes once after 401 and retries with rotated access token', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; configureApiClient(); });
  let accessToken = 'expired-transfer-token';
  let refreshCalls = 0;
  let lookupCalls = 0;
  globalThis.fetch = async (_url, options) => {
    lookupCalls += 1;
    if (options.headers.Authorization === 'Bearer expired-transfer-token') return new Response(JSON.stringify({ error: { code: 'AUTH_ACCESS_TOKEN_EXPIRED', message: 'expired' } }), { status: 401 });
    return new Response(JSON.stringify({ data: { beneficiaryId: 'sbx_beneficiary_internal', name: 'Cliente SANDBOX', documentMasked: '***', bank: { id: 'sbx_bank', name: 'Banco Sandbox A' }, branch: '0001', accountMasked: '***-1', accountType: 'Conta digital', transferType: 'INTERNAL', status: 'ACTIVE' } }), { status: 200 });
  };
  configureApiClient({ getBaseURL: () => 'http://sandbox.test', getAccessToken: () => accessToken, getDeviceId: () => 'sandbox-device', onUnauthorized: async () => { refreshCalls += 1; accessToken = 'rotated-transfer-token'; } });
  const result = await createTransferService({ sandboxMode: true, client: apiClient }).lookupBeneficiary('internal', { document: '11144477735' });
  assert.equal(result.mode, 'internal');
  assert.equal(refreshCalls, 1);
  assert.equal(lookupCalls, 2);
});

const rawSandboxBill = { billId: 'sbx_bill_001', barcode: '00190500954014481606906809350314337370000000100', digitableLine: '00190500954014481606906809350314337370000000100', beneficiary: { name: 'Empresa Beneficiária SANDBOX', documentMasked: '**.***.***/****-**' }, bankName: 'Banco Emissor SANDBOX', dueDate: '2099-12-30', originalAmountMinor: 12500, discountMinor: 0, interestMinor: 0, fineMinor: 0, totalAmountMinor: 12500, currency: 'BRL', status: 'OPEN' };

test('payment mapper normalizes bills, validation, installments, payment and receipt using integer cents', () => {
  const bill = mapSandboxBill(rawSandboxBill);
  assert.equal(bill.total, '125,00'); assert.equal(bill.beneficiary, 'Empresa Beneficiária SANDBOX');
  const validation = mapSandboxPaymentValidation({ validationId: 'sbx_validation', bill: rawSandboxBill, amountMinor: 12500, feeMinor: 0, totalDebitMinor: 12500, currency: 'BRL', status: 'VALIDATED', requiresChallenge: true, warnings: [] });
  assert.equal(validation.totalDebit, '125,00');
  const installments = mapSandboxInstallments({ simulationId: 'sbx_simulation', options: [{ optionId: 'sbx_option_2', installments: 2, installmentAmountMinor: 6325, totalAmountMinor: 12650, feeMinor: 150, currency: 'BRL' }] });
  assert.equal(installments[0].count, 2); assert.equal(installments[0].total, '126,50');
  assert.equal(mapSandboxPayment({ amountMinor: 12500, environment: 'SANDBOX', simulated: true }).amount, '125,00');
  assert.equal(mapSandboxPaymentReceipt({ amountMinor: 12500, beneficiary: rawSandboxBill.beneficiary, simulated: true }).beneficiaryName, 'Empresa Beneficiária SANDBOX');
  assert.throws(() => mapSandboxBill({ ...rawSandboxBill, totalAmountMinor: 12.5 }), /integer minor units/);
});

test('payment service SANDBOX completes lookup, validation, OTP submit and receipt', async () => {
  const validation = { validationId: 'sbx_validation', bill: rawSandboxBill, amountMinor: 12500, feeMinor: 0, totalDebitMinor: 12500, currency: 'BRL', status: 'VALIDATED', requiresChallenge: true, warnings: [] };
  const payment = { paymentId: 'sbx_payment', operationId: 'sbx_operation', requestId: 'request', environment: 'SANDBOX', simulated: true, status: 'COMPLETED', createdAt: new Date().toISOString(), amountMinor: 12500, currency: 'BRL', beneficiary: rawSandboxBill.beneficiary, barcodeMasked: '00190••••00100' };
  const receipt = { ...payment, requestId: 'receipt-request' };
  const calls = [];
  const client = async (path, options) => { calls.push({ path, options, body: options.body ? JSON.parse(options.body) : undefined }); if (path.endsWith('/lookup')) return { data: rawSandboxBill }; if (path.endsWith('/validate')) return { data: validation }; if (path === '/v1/security/challenges') return { data: { id: 'sbx_challenge' } }; if (path.includes('/verify')) return { data: { status: 'VERIFIED' } }; if (path.endsWith('/receipt')) return { data: receipt }; if (path === '/v1/payments/bills') return { data: payment }; throw new Error(path); };
  const service = createPaymentService({ sandboxMode: true, client, balanceLoader: async () => [{ value: '1.250,00' }] });
  const bill = await service.lookupBarcode(rawSandboxBill.barcode);
  const intent = await service.validatePayment({ bill, description: 'Teste', scheduled: false });
  const result = await service.authorizePayment(intent, '123456');
  assert.equal(result.simulated, true); assert.equal(result.receipt.simulated, true); assert.equal(result.bill.total, '125,00');
  assert.equal(calls.find((call) => call.path === '/v1/payments/bills/validate').body.amountMinor, 12500);
  assert.equal(calls.find((call) => call.path === '/v1/payments/bills').options.headers['Idempotency-Key'], `ctbx-payment-${validation.validationId}`);
  assert.ok(calls.every((call) => call.options.retryOnUnauthorized === true));
});

test('payment service supports installment simulation, scheduling and stable idempotent double submit', async () => {
  const future = '2099-12-31T12:00:00.000Z';
  const simulation = { simulationId: 'sbx_simulation', environment: 'SANDBOX', simulated: true, options: [{ optionId: 'sbx_option_2', installments: 2, installmentAmountMinor: 6325, totalAmountMinor: 12650, feeMinor: 150, currency: 'BRL' }] };
  const paymentResult = { paymentId: 'sbx_payment', operationId: 'sbx_operation', requestId: 'request', environment: 'SANDBOX', simulated: true, status: 'COMPLETED', createdAt: new Date().toISOString(), amountMinor: 12650, currency: 'BRL', beneficiary: rawSandboxBill.beneficiary, barcodeMasked: 'masked' };
  let submitCalls = 0; const keys = [];
  const client = async (path, options) => { if (path.endsWith('/simulate')) return { data: simulation }; if (path === '/v1/security/challenges') return { data: { id: 'challenge' } }; if (path.includes('/verify')) return { data: {} }; if (path.endsWith('/receipt')) return { data: paymentResult }; if (path === '/v1/payments/installments' || path === '/v1/payments/bills/schedule') { submitCalls += 1; keys.push(options.headers['Idempotency-Key']); return { data: { ...paymentResult, status: path.endsWith('schedule') ? 'SCHEDULED' : 'COMPLETED' } }; } throw new Error(path); };
  const service = createPaymentService({ sandboxMode: true, client });
  const installments = await service.getInstallments({ bill: mapSandboxBill(rawSandboxBill) });
  const intent = { bill: mapSandboxBill(rawSandboxBill), installmentData: installments[0] };
  const [first, second] = await Promise.all([service.authorizePayment(intent, '123456'), service.authorizePayment(intent, '123456')]);
  assert.equal(first.paymentId, second.paymentId); assert.equal(submitCalls, 1); assert.equal(keys[0], 'ctbx-payment-sbx_simulation-sbx_option_2');
  const scheduledService = createPaymentService({ sandboxMode: true, client });
  const scheduled = await scheduledService.schedulePayment({ bill: mapSandboxBill(rawSandboxBill), validationId: 'sbx_validation_schedule', idempotencyKey: 'ctbx-payment-schedule-stable', scheduled: true, scheduledFor: future, date: '31/12/2099' }, '123456');
  assert.equal(scheduled.status, 'SCHEDULED'); assert.equal(keys[1], 'ctbx-payment-schedule-stable');
});

test('payment service propagates errors, refreshes after 401 and keeps DEMO/PRODUCTION modes', async (t) => {
  const demo = createPaymentService({ demoMode: true }); assert.equal((await demo.lookupBarcode(rawSandboxBill.barcode)).code, rawSandboxBill.barcode); assert.ok((await demo.getInstallments('125,00')).length > 0);
  await assert.rejects(createPaymentService().lookupBarcode(rawSandboxBill.barcode), (error) => error.code === 'BACKEND_NOT_CONFIGURED');
  const missing = createPaymentService({ sandboxMode: true, client: async () => { throw new ApiError('Boleto não encontrado.', { code: 'PAYMENT_BILL_NOT_FOUND', status: 404 }); } });
  await assert.rejects(missing.lookupBarcode(rawSandboxBill.barcode), (error) => error.code === 'PAYMENT_BILL_NOT_FOUND');
  const originalFetch = globalThis.fetch; t.after(() => { globalThis.fetch = originalFetch; configureApiClient(); }); let token = 'expired-payment'; let refreshCalls = 0; let calls = 0;
  globalThis.fetch = async (_url, options) => { calls += 1; if (options.headers.Authorization === 'Bearer expired-payment') return new Response(JSON.stringify({ error: { code: 'AUTH_ACCESS_TOKEN_EXPIRED', message: 'expired' } }), { status: 401 }); return new Response(JSON.stringify({ data: rawSandboxBill }), { status: 200 }); };
  configureApiClient({ getBaseURL: () => 'http://sandbox.test', getAccessToken: () => token, getDeviceId: () => 'sandbox-device', onUnauthorized: async () => { refreshCalls += 1; token = 'rotated-payment'; } });
  assert.equal((await createPaymentService({ sandboxMode: true, client: apiClient }).lookupBarcode(rawSandboxBill.barcode)).id, 'sbx_bill_001');
  assert.equal(refreshCalls, 1); assert.equal(calls, 2);
});

test('refresh calls are deduplicated and rotate mapped session', async () => {
  let calls = 0;
  let resolveRequest;
  const client = () => {
    calls += 1;
    return new Promise((resolve) => { resolveRequest = resolve; });
  };
  const session = { refreshToken: 'old-refresh' };
  const first = refreshSandboxSession(session, client);
  const second = refreshSandboxSession(session, client);
  assert.equal(calls, 1);
  resolveRequest({ data: { user: {}, account: {}, sessionId: 'new-session', accessToken: 'new-access', refreshToken: 'new-refresh', expiresAt: '2099-01-01T00:00:00Z', deviceId: 'new-device' } });
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.sessionId, 'new-session');
  assert.equal(b.refreshToken, 'new-refresh');
});

test('concurrent 401 responses perform one refresh and retry each account GET once', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    configureApiClient();
  });

  let session = {
    ...initialSessionState,
    status: 'authenticated',
    accessToken: 'expired-access',
    refreshToken: 'old-refresh',
    deviceId: 'sandbox-device',
  };
  let refreshCalls = 0;
  const getCalls = new Map();

  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    getCalls.set(path, (getCalls.get(path) || 0) + 1);
    const token = options.headers.Authorization;
    if (token === 'Bearer expired-access') {
      return new Response(JSON.stringify({ error: { code: 'AUTH_ACCESS_TOKEN_EXPIRED', message: 'expired' } }), { status: 401 });
    }
    assert.equal(token, 'Bearer rotated-access');
    return new Response(JSON.stringify({ data: { path } }), { status: 200 });
  };

  configureApiClient({
    getBaseURL: () => 'http://sandbox.test',
    getAccessToken: () => session.accessToken,
    getDeviceId: () => session.deviceId,
    onUnauthorized: async () => {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      session = sessionReducer(session, {
        type: 'AUTHENTICATED',
        payload: { ...session, accessToken: 'rotated-access', refreshToken: 'rotated-refresh' },
      });
      return session;
    },
  });

  const [account, balances] = await Promise.all([
    apiClient('/v1/accounts/current', { method: 'GET', retryOnUnauthorized: true }),
    apiClient('/v1/accounts/current/balances', { method: 'GET', retryOnUnauthorized: true }),
  ]);

  assert.equal(refreshCalls, 1);
  assert.equal(getCalls.get('/v1/accounts/current'), 2);
  assert.equal(getCalls.get('/v1/accounts/current/balances'), 2);
  assert.equal(account.data.path, '/v1/accounts/current');
  assert.equal(balances.data.path, '/v1/accounts/current/balances');
  assert.equal(session.status, 'authenticated');
  assert.equal(session.accessToken, 'rotated-access');
  assert.equal(session.refreshToken, 'rotated-refresh');
});

test('reused refresh token clears the authenticated app session without a refresh loop', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    configureApiClient();
  });

  let session = { ...initialSessionState, status: 'authenticated', accessToken: 'expired-access', refreshToken: 'reused-refresh', deviceId: 'sandbox-device' };
  let refreshCalls = 0;
  let requestCalls = 0;
  globalThis.fetch = async () => {
    requestCalls += 1;
    return new Response(JSON.stringify({ error: { code: 'AUTH_ACCESS_TOKEN_EXPIRED', message: 'expired' } }), { status: 401 });
  };
  configureApiClient({
    getBaseURL: () => 'http://sandbox.test',
    getAccessToken: () => session.accessToken,
    getDeviceId: () => session.deviceId,
    onUnauthorized: async () => {
      refreshCalls += 1;
      session = sessionReducer(session, { type: 'LOGOUT', demoMode: false, sandboxMode: true });
      throw new ApiError('refresh reused', { code: 'AUTH_REFRESH_TOKEN_REUSED', status: 401 });
    },
  });

  await assert.rejects(
    apiClient('/v1/auth/session', { method: 'GET', retryOnUnauthorized: true }),
    (error) => error.code === 'AUTH_REFRESH_TOKEN_REUSED',
  );
  assert.equal(refreshCalls, 1);
  assert.equal(requestCalls, 1);
  assert.equal(session.status, 'unauthenticated');
  assert.equal(session.accessToken, null);
  assert.equal(session.refreshToken, null);
});

test('device mismatch invokes terminal cleanup and does not attempt refresh', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    configureApiClient();
  });

  let session = { ...initialSessionState, status: 'authenticated', accessToken: 'access', refreshToken: 'refresh', deviceId: 'wrong-device' };
  let refreshCalls = 0;
  let cleanupCalls = 0;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'AUTH_DEVICE_MISMATCH', message: 'device mismatch' } }), { status: 401 });
  configureApiClient({
    getBaseURL: () => 'http://sandbox.test',
    getAccessToken: () => session.accessToken,
    getDeviceId: () => session.deviceId,
    onUnauthorized: async () => { refreshCalls += 1; },
    onSessionInvalid: async () => {
      cleanupCalls += 1;
      session = sessionReducer(session, { type: 'LOGOUT', demoMode: false, sandboxMode: true });
    },
  });

  await assert.rejects(
    apiClient('/v1/auth/session', { method: 'GET', retryOnUnauthorized: true }),
    (error) => error.code === 'AUTH_DEVICE_MISMATCH',
  );
  assert.equal(cleanupCalls, 1);
  assert.equal(refreshCalls, 0);
  assert.equal(session.status, 'unauthenticated');
  assert.equal(session.accessToken, null);
});

test('logout calls BFF route and reducer cleanup removes all tokens', async () => {
  let called = false;
  await logoutSandboxSession(async (path, options) => { called = path === '/v1/auth/logout' && options.method === 'POST'; return null; });
  assert.equal(called, true);
  const authenticated = { ...initialSessionState, status: 'authenticated', accessToken: 'secret', refreshToken: 'secret', sessionId: 'session' };
  const clean = sessionReducer(authenticated, { type: 'LOGOUT', demoMode: false, sandboxMode: true });
  assert.equal(clean.status, 'unauthenticated');
  assert.equal(clean.accessToken, null);
  assert.equal(clean.refreshToken, null);
  assert.equal(clean.sandboxMode, true);
});

test('investment service SANDBOX simulates and submits one idempotent order',async()=>{const product={id:'p',name:'Renda SANDBOX',termDays:30,rateDisplay:'Demo',riskLabel:'Demo'},sim={simulationId:'s',product,amountMinor:10000,projectedGrossMinor:10100,projectedNetMinor:10085,termDays:30,rateDisplay:'Demo',simulated:true,environment:'SANDBOX',warnings:[]},order={orderId:'o',product,amountMinor:10000,status:'COMPLETED',simulated:true,environment:'SANDBOX'},calls=[];const client=async(path,options)=>{calls.push({path,options});if(path.endsWith('/products'))return{data:[product]};if(path.endsWith('/simulations'))return{data:sim};if(path.endsWith('/orders'))return{data:order};if(path.endsWith('/receipt'))return{data:{...order,receiptType:'INVESTMENT_SANDBOX'}};throw new Error(path)};const s=createInvestmentService({sandboxMode:true,client});assert.equal((await s.getProducts())[0].term,'30 dias');const x=await s.simulate(product,'100,00');const[a,b]=await Promise.all([s.order(x),s.order(x)]);assert.equal(a.orderId,b.orderId);assert.equal(calls.filter(x=>x.path.endsWith('/orders')).length,1);assert.equal(mapInvestmentSimulation(sim).projectedNet,'100,85');});

// Regressão: GET /v1/investments/positions devolve
// {positionId,orderId,product,investedMinor,currentMinor,status,...} — a
// tela (InvestmentsScreen/PositionRow) esperava o formato do mock DEMO
// (id,invested,yieldAmount,yieldPercent em reais) e quebrava com
// "Cannot read properties of undefined (reading 'toFixed')" ao calcular
// percent(position.yieldPercent). mapInvestmentPosition traduz só o que é
// real (nunca inventa rentabilidade/vencimento/indexador).
test('investment service SANDBOX maps real positions without inventing financial fields',async()=>{const product={id:'sbx_inv_liquidity_30',name:'Liquidez SANDBOX',termDays:30,rateDisplay:'Projeção demonstrativa A',riskLabel:'Risco não avaliado'},raw={positionId:'pos_1',orderId:'o1',product,investedMinor:100000,currentMinor:100000,status:'ACTIVE',simulated:true,environment:'SANDBOX'},client=async(path)=>path.endsWith('/positions')?{data:[raw]}:{data:[]},s=createInvestmentService({sandboxMode:true,client});const[position]=await s.getPositions();assert.equal(position.id,'pos_1');assert.equal(position.name,'Liquidez SANDBOX');assert.equal(position.rateLabel,'Projeção demonstrativa A');assert.equal(position.status,'Ativo');assert.equal(position.invested,1000);assert.equal(position.yieldAmount,0);assert.equal(position.yieldPercent,0);assert.equal(position.maturity,'—');assert.equal(typeof position.yieldPercent.toFixed(2),'string');});

test('mapInvestmentPosition never divides by zero and never invents a maturity/indexer',()=>{const mapped=mapInvestmentPosition({positionId:'p',orderId:'o',product:{name:'X',rateDisplay:'Y'},investedMinor:0,currentMinor:0,status:'ACTIVE'});assert.equal(mapped.yieldPercent,0);assert.equal(mapped.invested,0);assert.equal(mapped.maturity,'—');assert.equal(mapped.indexer,'—');});

test('billing service SANDBOX issues unequivocally fake bill and receipt',async()=>{const payer={payerId:'payer',name:'SANDBOX'},bill={billId:'bill',payer,amountMinor:12500,digitableLineSandbox:'SANDBOX-NOT-A-BANK-BILL',simulated:true,environment:'SANDBOX'},client=async(path)=>path.endsWith('/payers')?{data:[payer]}:path.endsWith('/receipt')?{data:{...bill,receiptType:'BILLING_SANDBOX_NOT_BANK_BILL'}}:{data:bill},s=createBillingService({sandboxMode:true,client});const x=await s.issueBill({payerId:'payer',value:'125,00',dueDate:new Date(Date.now()+86400000).toISOString()});assert.equal(x.value,'125,00');assert.match(x.code,/SANDBOX/);assert.equal(mapBillingBill(bill).simulated,true);});

test('consigned service SANDBOX creates under-review simulated application',async()=>{const product={id:'p',name:'Consignado SANDBOX',installmentOptions:[6],rateDisplay:'Demo'},application={applicationId:'a',product,amountMinor:20000,installments:6,status:'UNDER_REVIEW',simulated:true,environment:'SANDBOX'},calls=[];const client=async(path)=>{calls.push(path);if(path.endsWith('/products'))return{data:[product]};if(path.endsWith('/applications'))return{data:application};return{data:[]}},s=createConsignedService({sandboxMode:true,client});assert.equal((await s.getProducts())[0].rate,'Demo');const[a,b]=await Promise.all([s.apply({productId:'p',value:'200,00',months:'6'}),s.apply({productId:'p',value:'200,00',months:'6'})]);assert.equal(a.status,'UNDER_REVIEW');assert.equal(a.applicationId,b.applicationId);assert.equal(calls.filter(x=>x.endsWith('/applications')).length,1);assert.equal(mapConsignedApplication(application).value,'200,00');await assert.rejects(createConsignedService().getProducts(),e=>e.code==='BACKEND_NOT_CONFIGURED');});

test('terminal device mismatch is represented as session cleanup action', () => {
  const clean = sessionReducer({ ...initialSessionState, accessToken: 'secret' }, { type: 'LOGOUT', demoMode: false, sandboxMode: true });
  assert.equal(clean.accessToken, null);
  assert.equal(clean.status, 'unauthenticated');
});
