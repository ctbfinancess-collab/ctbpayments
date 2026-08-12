import { ApiError, apiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { MOCK_BLOCKED_TRANSACTIONS, MOCK_FUTURE_TRANSACTIONS, MOCK_STATEMENT_BALANCE, MOCK_TRANSACTIONS } from '../data/statementMockData';
import { getBalances } from './accountService';
import { mapSandboxReceipt, mapSandboxStatement, mapSandboxTransaction } from './mappers/statementMapper';

export function createStatementService({ demoMode = false, sandboxMode = false, client = apiClient, balanceLoader = getBalances } = {}) {
  const backendNotConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };
  const sandboxGet = async (path) => client(path, { method: 'GET', retryOnUnauthorized: true });
  const getBalance = async () => {
    if (demoMode) return MOCK_STATEMENT_BALANCE;
    if (!sandboxMode) return backendNotConfigured();
    const balances = await balanceLoader();
    return balances[0]?.value || '0,00';
  };
  const listTransactions = async () => demoMode ? MOCK_TRANSACTIONS : sandboxMode ? mapSandboxStatement((await sandboxGet('/v1/accounts/current/statement')).data) : backendNotConfigured();
  const listFutureTransactions = async () => demoMode ? MOCK_FUTURE_TRANSACTIONS : sandboxMode ? mapSandboxStatement((await sandboxGet('/v1/accounts/current/statement/future')).data) : backendNotConfigured();
  const listBlockedTransactions = async () => demoMode ? MOCK_BLOCKED_TRANSACTIONS : sandboxMode ? mapSandboxStatement((await sandboxGet('/v1/accounts/current/statement/blocked')).data) : backendNotConfigured();
  const getTransaction = async (transaction) => {
    if (demoMode) return transaction || null;
    if (!sandboxMode) return backendNotConfigured();
    if (!transaction?.id) return null;
    return mapSandboxTransaction((await sandboxGet(`/v1/accounts/current/transactions/${encodeURIComponent(transaction.id)}`)).data);
  };
  const getReceipt = async (transaction) => {
    if (demoMode) return transaction || null;
    if (!sandboxMode) return backendNotConfigured();
    if (!transaction?.id) return null;
    return mapSandboxReceipt((await sandboxGet(`/v1/accounts/current/transactions/${encodeURIComponent(transaction.id)}/receipt`)).data);
  };
  const getStatementData = async () => {
    const [balance, transactions, futureTransactions, blockedTransactions] = await Promise.all([getBalance(), listTransactions(), listFutureTransactions(), listBlockedTransactions()]);
    return { balance, transactions, futureTransactions, blockedTransactions };
  };
  return { getBalance, listTransactions, listFutureTransactions, listBlockedTransactions, getTransaction, getReceipt, getStatementData };
}

const service = createStatementService({ demoMode: isDemoMode, sandboxMode: isSandboxMode });
export const getBalance = service.getBalance;
export const listTransactions = service.listTransactions;
export const listFutureTransactions = service.listFutureTransactions;
export const listBlockedTransactions = service.listBlockedTransactions;
export const getTransaction = service.getTransaction;
export const getReceipt = service.getReceipt;
export const getStatementData = service.getStatementData;
export const exportStatement = async () => null;
export const getStatement = listTransactions;
export const getFutureTransactions = listFutureTransactions;
export const getBlockedTransactions = listBlockedTransactions;
