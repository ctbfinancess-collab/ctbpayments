import { MOCK_STATEMENT_BALANCE } from '../data/statementMockData';
import { MOCK_ACCOUNT } from '../data/profileMockData';
import { MOCK_ACCOUNT_SUMMARY, MOCK_HOME_BALANCES } from '../data/accountMockData';
import { apiClient, ApiError } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { mapSandboxAccount, mapSandboxBalances } from './mappers/accountMapper';

const unavailable = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };
export const getAccount = async () => {
  if (isDemoMode) return MOCK_ACCOUNT;
  if (!isSandboxMode) return unavailable();
  const response = await apiClient('/v1/accounts/current', { method: 'GET', retryOnUnauthorized: true });
  return mapSandboxAccount(response.data);
};
export const getBalances = async () => {
  if (isDemoMode) return MOCK_HOME_BALANCES;
  if (!isSandboxMode) return unavailable();
  const response = await apiClient('/v1/accounts/current/balances', { method: 'GET', retryOnUnauthorized: true });
  return mapSandboxBalances(response.data);
};
export const getBalance = async () => isSandboxMode ? (await getBalances())[0]?.value || '0,00' : isDemoMode ? MOCK_STATEMENT_BALANCE : unavailable();
export const getAccountSummary = async () => isSandboxMode ? { displayName: 'Sandbox', accountType: 'PF', account: await getAccount() } : isDemoMode ? MOCK_ACCOUNT_SUMMARY : unavailable();
export const getHomeData = async () => {
  if (isDemoMode) return { balances: MOCK_HOME_BALANCES, summary: MOCK_ACCOUNT_SUMMARY };
  if (!isSandboxMode) return unavailable();
  const [balances, summary] = await Promise.all([getBalances(), getAccountSummary()]);
  return { balances, summary };
};
