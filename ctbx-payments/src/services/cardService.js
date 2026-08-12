import { ApiError, apiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { MOCK_CARD_TRANSACTIONS, MOCK_FINANCIAL_CARD, MOCK_TRANSPORT_CARD } from '../data/cardMockData';
import { mapSandboxCard, mapSandboxCardReceipts, mapSandboxCardTransaction, mapSandboxCardTransactions } from './mappers/cardMapper';

const unavailable = () => { throw new ApiError('Operação indisponível no ambiente sandbox', { code: 'SANDBOX_OPERATION_UNAVAILABLE' }); };
const notConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };

export function createCardService({ demoMode = false, sandboxMode = false, client = apiClient } = {}) {
  const get = async (path) => client(path, { method: 'GET', retryOnUnauthorized: true });
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
  const mutate = async (factory) => demoMode ? factory() : sandboxMode ? unavailable() : notConfigured();
  return { getCards, getCard, getCardTransactions, getCardTransaction, getCardReceipts, getCardReceipt, getTransportCard, activateCard: (card) => mutate(() => ({ ...card, status: 'Demonstração' })), changePassword: () => mutate(() => true), setBlocked: (blocked) => mutate(() => ({ blocked })), rechargeCard: (value) => mutate(() => ({ value, demoMode: true })), requestCard: (options) => mutate(() => ({ ...options, demoMode: true })) };
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
