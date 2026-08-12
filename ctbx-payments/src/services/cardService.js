import { MOCK_CARD_TRANSACTIONS, MOCK_FINANCIAL_CARD, MOCK_TRANSPORT_CARD } from '../data/cardMockData';
import { demoOrThrow } from './serviceMode';
export const listCards = () => demoOrThrow(() => [MOCK_FINANCIAL_CARD, MOCK_TRANSPORT_CARD]);
export const listTransactions = () => demoOrThrow(() => MOCK_CARD_TRANSACTIONS);
export const activateCard = (card) => demoOrThrow(() => ({ ...card, status: 'Demonstração' }));
export const changePassword = () => demoOrThrow(() => true);
export const setBlocked = (blocked) => demoOrThrow(() => ({ blocked }));
