import { MOCK_STATEMENT_BALANCE } from '../data/statementMockData';
import { MOCK_ACCOUNT } from '../data/profileMockData';
import { MOCK_ACCOUNT_SUMMARY, MOCK_HOME_BALANCES } from '../data/accountMockData';
import { apiClient, ApiError } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { mapSandboxAccount, mapSandboxBalances } from './mappers/accountMapper';

const unavailable = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };
// Contas Globais (USD/EUR/AED) ainda não têm endpoint próprio no backend —
// `SandboxAccountProvider.getBalances` só devolve um `foreignCurrency` genérico
// zerado, sem quebra por moeda. Fallback TEMPORÁRIO de mock só para essas 3,
// até existir endpoint real. BRL (conta digital/investimentos) abaixo já vem
// 100% do backend sandbox — não mexer nisso ao integrar contas globais depois.
const GLOBAL_ACCOUNTS_FALLBACK = MOCK_HOME_BALANCES.filter((balance) => ['usd', 'eur', 'aed'].includes(balance.id));
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
  const real = mapSandboxBalances(response.data);
  const digital = real.find((balance) => balance.id === 'digital');
  const investment = real.find((balance) => balance.id === 'investment');
  return [digital, ...GLOBAL_ACCOUNTS_FALLBACK, investment].filter(Boolean);
};
export const getBalance = async () => isSandboxMode ? (await getBalances())[0]?.value || '0,00' : isDemoMode ? MOCK_STATEMENT_BALANCE : unavailable();
export const getAccountSummary = async () => isSandboxMode ? { displayName: 'Sandbox', accountType: 'PF', account: await getAccount() } : isDemoMode ? MOCK_ACCOUNT_SUMMARY : unavailable();
export const getHomeData = async () => {
  if (isDemoMode) return { balances: MOCK_HOME_BALANCES, summary: MOCK_ACCOUNT_SUMMARY };
  if (!isSandboxMode) return unavailable();
  const [balances, summary] = await Promise.all([getBalances(), getAccountSummary()]);
  return { balances, summary };
};
