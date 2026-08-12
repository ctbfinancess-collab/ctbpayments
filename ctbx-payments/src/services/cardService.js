import { ApiError, apiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { MOCK_CARD_TRANSACTIONS, MOCK_FINANCIAL_CARD, MOCK_TRANSPORT_CARD } from '../data/cardMockData';
import { mapSandboxCard, mapSandboxCardMutation, mapSandboxCardRecharge, mapSandboxCardReceipts, mapSandboxCardRequest, mapSandboxCardTransaction, mapSandboxCardTransactions } from './mappers/cardMapper';
import { parseCurrency } from '../utils/pixValidation';

const notConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };

export function createCardService({ demoMode = false, sandboxMode = false, client = apiClient } = {}) {
  const get = async (path) => client(path, { method: 'GET', retryOnUnauthorized: true });
  const requests = new Map();
  const post = async (path, body = {}, key) => client(path, { method: 'POST', retryOnUnauthorized: true, ...(key ? { headers: { 'Idempotency-Key': key } } : {}), body: JSON.stringify(body) });
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
  return { getCards, getCard, getCardTransactions, getCardTransaction, getCardReceipts, getCardReceipt, getTransportCard, activateCard, changePassword, setBlocked, blockCard: (card) => setBlocked(true, card), unblockCard: (card) => setBlocked(false, card), rechargeCard, rechargeTransportCard: (value) => rechargeCard(value, { transport: true }), requestCard };
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
