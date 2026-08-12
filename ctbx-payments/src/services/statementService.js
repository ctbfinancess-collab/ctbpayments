import { MOCK_BLOCKED_TRANSACTIONS, MOCK_FUTURE_TRANSACTIONS, MOCK_STATEMENT_BALANCE, MOCK_TRANSACTIONS } from '../data/statementMockData';
import { demoOrThrow } from './serviceMode';
export const getBalance = () => demoOrThrow(() => MOCK_STATEMENT_BALANCE);
export const listTransactions = () => demoOrThrow(() => MOCK_TRANSACTIONS);
export const listFutureTransactions = () => demoOrThrow(() => MOCK_FUTURE_TRANSACTIONS);
export const listBlockedTransactions = () => demoOrThrow(() => MOCK_BLOCKED_TRANSACTIONS);
export const exportStatement = () => demoOrThrow(() => null);
