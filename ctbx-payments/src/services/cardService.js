import { ApiError, apiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { MOCK_CARD_TRANSACTIONS, MOCK_FINANCIAL_CARD, MOCK_TRANSPORT_CARD, MOCK_VIRTUAL_CARDS, MOCK_VIRTUAL_LIMIT_POOL } from '../data/cardMockData';
import { mapSandboxCard, mapSandboxCardMutation, mapSandboxCardRecharge, mapSandboxCardReceipts, mapSandboxCardRequest, mapSandboxCardTransaction, mapSandboxCardTransactions, mapSandboxVirtualCard, mapSandboxVirtualCards, mapVirtualCardLimitPool } from './mappers/cardMapper';
import { parseCurrency } from '../utils/pixValidation';

const notConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };

export function createCardService({ demoMode = false, sandboxMode = false, client = apiClient } = {}) {
  const get = async (path) => client(path, { method: 'GET', retryOnUnauthorized: true });
  const requests = new Map();
  const post = async (path, body = {}, key) => client(path, { method: 'POST', retryOnUnauthorized: true, ...(key ? { headers: { 'Idempotency-Key': key } } : {}), body: JSON.stringify(body) });
  const put = async (path, body = {}, key) => client(path, { method: 'PUT', retryOnUnauthorized: true, ...(key ? { headers: { 'Idempotency-Key': key } } : {}), body: JSON.stringify(body) });
  const financialId = async (card) => card?.id || (await get('/v1/cards')).data[0]?.id;
  const once = (key, factory) => { if (requests.has(key)) return requests.get(key); const promise = factory(); requests.set(key, promise); promise.catch(() => requests.delete(key)); return promise; };
  const getCards = async () => {
    if (demoMode) return [MOCK_FINANCIAL_CARD, MOCK_TRANSPORT_CARD];
    if (!sandboxMode) return notConfigured();
    const [cards, transport] = await Promise.all([get('/v1/cards'), get('/v1/transport-card')]);
    return [...cards.data.map(mapSandboxCard), mapSandboxCard(transport.data)];
  };
  const getCard = async (cardId) => {
    if (demoMode) return MOCK_FINANCIAL_CARD;
    if (!sandboxMode) return notConfigured();
    const resolvedId = cardId || (await get('/v1/cards')).data[0]?.id;
    if (!resolvedId) return null;
    return mapSandboxCard((await get(`/v1/cards/${encodeURIComponent(resolvedId)}`)).data);
  };
  const getCardTransactions = async (cardId) => {
    if (demoMode) return MOCK_CARD_TRANSACTIONS;
    if (!sandboxMode) return notConfigured();
    const resolvedId = cardId || (await get('/v1/cards')).data[0]?.id;
    if (!resolvedId) return [];
    return mapSandboxCardTransactions((await get(`/v1/cards/${encodeURIComponent(resolvedId)}/transactions`)).data);
  };
  const getCardTransaction = async (transaction) => {
    if (demoMode) return transaction || null;
    if (!sandboxMode) return notConfigured();
    if (!transaction?.id || !transaction?.cardId) return null;
    return mapSandboxCardTransaction((await get(`/v1/cards/${encodeURIComponent(transaction.cardId)}/transactions/${encodeURIComponent(transaction.id)}`)).data);
  };
  const getCardReceipts = async (cardId) => {
    if (demoMode) return MOCK_CARD_TRANSACTIONS.filter((item) => item.value.startsWith('-'));
    if (!sandboxMode) return notConfigured();
    const resolvedId = cardId || (await get('/v1/cards')).data[0]?.id;
    if (!resolvedId) return [];
    return mapSandboxCardReceipts((await get(`/v1/cards/${encodeURIComponent(resolvedId)}/receipts`)).data);
  };
  const getCardReceipt = async (transaction) => {
    if (demoMode) return transaction || null;
    if (!sandboxMode) return notConfigured();
    if (!transaction?.id || !transaction?.cardId) return null;
    return mapSandboxCardReceipts([(await get(`/v1/cards/${encodeURIComponent(transaction.cardId)}/transactions/${encodeURIComponent(transaction.id)}/receipt`)).data])[0];
  };
  const getTransportCard = async () => demoMode ? MOCK_TRANSPORT_CARD : sandboxMode ? mapSandboxCard((await get('/v1/transport-card')).data) : notConfigured();
  const activateCard = async (card = {}, otp = '123456') => { if (demoMode) return { ...card, status: 'Demonstração' }; if (!sandboxMode) return notConfigured(); const cardId = await financialId(card); return once(`activate:${cardId}`, async () => { const challenge = (await post(`/v1/cards/${cardId}/activation/challenge`)).data; await post(`/v1/security/challenges/${challenge.id}/verify`, { proof: otp }); return mapSandboxCardMutation((await post(`/v1/cards/${cardId}/activate`, { challengeId: challenge.id }, `ctbx-card-activate-${cardId}`)).data); }); };
  const setBlocked = async (blocked, card) => { if (demoMode) return { blocked }; if (!sandboxMode) return notConfigured(); const cardId = await financialId(card); return mapSandboxCardMutation((await post(`/v1/cards/${cardId}/${blocked ? 'block' : 'unblock'}`, {}, `ctbx-card-${blocked ? 'block' : 'unblock'}-${cardId}`)).data); };
  const changePassword = async (password, card) => { if (demoMode) return true; if (!sandboxMode) return notConfigured(); const cardId = await financialId(card); return mapSandboxCardMutation((await post(`/v1/cards/${cardId}/password`, { password }, `ctbx-card-password-${cardId}`)).data); };
  const rechargeCard = async (value, options = {}) => { if (demoMode) return { value, demoMode: true }; if (!sandboxMode) return notConfigured(); const amountMinor = Math.round(parseCurrency(value) * 100); if (options.transport) return mapSandboxCardRecharge((await post('/v1/transport-card/recharge', { amountMinor, currency: 'BRL' }, `ctbx-top-recharge-${amountMinor}`)).data); const cardId = await financialId(options.card); return mapSandboxCardRecharge((await post(`/v1/cards/${cardId}/recharge`, { amountMinor, currency: 'BRL' }, `ctbx-card-recharge-${cardId}-${amountMinor}`)).data); };
  const requestCard = async (options) => demoMode ? { ...options, demoMode: true } : sandboxMode ? mapSandboxCardRequest((await post('/v1/cards/requests', { selectedColor: options.color, termsAccepted: true }, `ctbx-card-request-${options.color}`)).data) : notConfigured();

  // Cartão virtual — mesma família visual/estrutural do físico, endpoints
  // próprios em /v1/cards/virtual (ver backend/src/routes/v1.ts).
  const listVirtualCards = async () => demoMode ? MOCK_VIRTUAL_CARDS : sandboxMode ? mapSandboxVirtualCards((await get('/v1/cards/virtual')).data) : notConfigured();
  const getVirtualCard = async (cardId) => {
    if (demoMode) return MOCK_VIRTUAL_CARDS.find((item) => item.id === cardId) || MOCK_VIRTUAL_CARDS[0] || null;
    if (!sandboxMode) return notConfigured();
    return mapSandboxVirtualCard((await get(`/v1/cards/virtual/${encodeURIComponent(cardId)}`)).data);
  };
  const getVirtualCardLimitPool = async () => demoMode ? MOCK_VIRTUAL_LIMIT_POOL : sandboxMode ? mapVirtualCardLimitPool((await get('/v1/cards/virtual/limit-pool')).data) : notConfigured();
  // Uma chamada só pra alimentar a aba Virtual (cartões + bolso de limite
  // juntos), mesmo espírito do Promise.all já usado em getCards() acima.
  const getVirtualCardsOverview = async () => {
    if (demoMode) return { cards: MOCK_VIRTUAL_CARDS, pool: MOCK_VIRTUAL_LIMIT_POOL };
    if (!sandboxMode) return notConfigured();
    const [cards, pool] = await Promise.all([get('/v1/cards/virtual'), get('/v1/cards/virtual/limit-pool')]);
    return { cards: mapSandboxVirtualCards(cards.data), pool: mapVirtualCardLimitPool(pool.data) };
  };
  const createVirtualCard = async ({ color, nickname, limit }) => {
    if (demoMode) return { ...MOCK_VIRTUAL_CARDS[0], id: `demo-virtual-${Date.now()}`, color, nickname: nickname || null };
    if (!sandboxMode) return notConfigured();
    const limitMinor = Math.round(parseCurrency(limit) * 100);
    // Chave determinística (mesmo padrão de requestCard/billingService acima)
    // — mesma cor+apelido+limite em sequência é tratado como retry, não
    // como um segundo cartão; ver comentário em SandboxCardProvider.
    const key = `virtual-card-create:${color}:${nickname || ''}:${limitMinor}`;
    return once(key, async () => mapSandboxVirtualCard((await post('/v1/cards/virtual', { color, ...(nickname ? { nickname } : {}), limitMinor }, `ctbx-${key}`)).data));
  };
  const setVirtualCardLimit = async (cardId, limit) => {
    if (demoMode) return { ...MOCK_VIRTUAL_CARDS[0], id: cardId, limit };
    if (!sandboxMode) return notConfigured();
    const limitMinor = Math.round(parseCurrency(limit) * 100);
    return mapSandboxVirtualCard((await put(`/v1/cards/virtual/${encodeURIComponent(cardId)}/limit`, { limitMinor }, `ctbx-virtual-limit-${cardId}-${limitMinor}`)).data);
  };
  const setVirtualCardBlocked = async (blocked, cardId) => {
    if (demoMode) return { cardId, status: blocked ? 'BLOCKED' : 'ACTIVE' };
    if (!sandboxMode) return notConfigured();
    return mapSandboxCardMutation((await post(`/v1/cards/virtual/${encodeURIComponent(cardId)}/${blocked ? 'block' : 'unblock'}`, {}, `ctbx-virtual-${blocked ? 'block' : 'unblock'}-${cardId}`)).data);
  };
  const cancelVirtualCard = async (cardId) => {
    if (demoMode) return { cardId, status: 'CANCELLED' };
    if (!sandboxMode) return notConfigured();
    return mapSandboxCardMutation((await post(`/v1/cards/virtual/${encodeURIComponent(cardId)}/cancel`, {}, `ctbx-virtual-cancel-${cardId}`)).data);
  };
  // Gera PAN/CVV/final novos pro mesmo cartão (mesmo id/limite/apelido/cor)
  // — o anterior fica de fato invalidado no backend.
  const recreateVirtualCard = async (cardId) => {
    if (demoMode) return { ...MOCK_VIRTUAL_CARDS[0], id: cardId, lastFour: String(Math.floor(1000 + Math.random() * 9000)) };
    if (!sandboxMode) return notConfigured();
    return mapSandboxVirtualCard((await post(`/v1/cards/virtual/${encodeURIComponent(cardId)}/recreate`, {}, `ctbx-virtual-recreate-${cardId}-${Date.now()}`)).data);
  };
  const getVirtualCardTransactions = async (cardId) => {
    if (demoMode) return MOCK_CARD_TRANSACTIONS;
    if (!sandboxMode) return notConfigured();
    return mapSandboxCardTransactions((await get(`/v1/cards/virtual/${encodeURIComponent(cardId)}/transactions`)).data);
  };
  // Revelar PAN completo/CVV: challenge + verify (mesmo padrão de
  // activateCard acima) + reveal em si. Sem once() de propósito — cada
  // clique em "Mostrar dados" deve repetir o fluxo, não reaproveitar um
  // resultado antigo (ex.: depois de recriar o cartão, o número mudou).
  const revealVirtualCardData = async (cardId, otp = '123456') => {
    if (demoMode) return { number: '4000 1234 5678 9010', cvv: '123', holderName: 'CLIENTE DEMONSTRAÇÃO' };
    if (!sandboxMode) return notConfigured();
    const challenge = (await post(`/v1/cards/virtual/${cardId}/reveal/challenge`)).data;
    await post(`/v1/security/challenges/${challenge.id}/verify`, { proof: otp });
    return (await post(`/v1/cards/virtual/${cardId}/reveal`, { challengeId: challenge.id })).data;
  };

  return {
    getCards, getCard, getCardTransactions, getCardTransaction, getCardReceipts, getCardReceipt, getTransportCard,
    activateCard, changePassword, setBlocked, blockCard: (card) => setBlocked(true, card), unblockCard: (card) => setBlocked(false, card),
    rechargeCard, rechargeTransportCard: (value) => rechargeCard(value, { transport: true }), requestCard,
    listVirtualCards, getVirtualCard, getVirtualCardLimitPool, getVirtualCardsOverview, createVirtualCard, setVirtualCardLimit,
    setVirtualCardBlocked, blockVirtualCard: (cardId) => setVirtualCardBlocked(true, cardId), unblockVirtualCard: (cardId) => setVirtualCardBlocked(false, cardId),
    cancelVirtualCard, recreateVirtualCard, getVirtualCardTransactions, revealVirtualCardData,
  };
}

const service = createCardService({ demoMode: isDemoMode, sandboxMode: isSandboxMode });
export const listCards = service.getCards;
export const getCards = service.getCards;
export const getCard = service.getCard;
export const listTransactions = service.getCardTransactions;
export const getCardTransactions = service.getCardTransactions;
export const getCardTransaction = service.getCardTransaction;
export const getCardReceipts = service.getCardReceipts;
export const getCardReceipt = service.getCardReceipt;
export const getTransportCard = service.getTransportCard;
export const activateCard = service.activateCard;
export const changePassword = service.changePassword;
export const setBlocked = service.setBlocked;
export const rechargeCard = service.rechargeCard;
export const requestCard = service.requestCard;
export const rechargeTransportCard = service.rechargeTransportCard;
export const listVirtualCards = service.listVirtualCards;
export const getVirtualCard = service.getVirtualCard;
export const getVirtualCardLimitPool = service.getVirtualCardLimitPool;
export const getVirtualCardsOverview = service.getVirtualCardsOverview;
export const createVirtualCard = service.createVirtualCard;
export const setVirtualCardLimit = service.setVirtualCardLimit;
export const blockVirtualCard = service.blockVirtualCard;
export const unblockVirtualCard = service.unblockVirtualCard;
export const cancelVirtualCard = service.cancelVirtualCard;
export const recreateVirtualCard = service.recreateVirtualCard;
export const getVirtualCardTransactions = service.getVirtualCardTransactions;
export const revealVirtualCardData = service.revealVirtualCardData;
