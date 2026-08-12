import { MOCK_STATEMENT_BALANCE } from '../data/statementMockData';
import { MOCK_ACCOUNT } from '../data/profileMockData';
import { MOCK_ACCOUNT_SUMMARY, MOCK_HOME_BALANCES } from '../data/accountMockData';
import { demoOrThrow } from './serviceMode';
export const getBalance = () => demoOrThrow(() => MOCK_STATEMENT_BALANCE);
export const getAccount = () => demoOrThrow(() => MOCK_ACCOUNT);
export const getBalances = () => demoOrThrow(() => MOCK_HOME_BALANCES);
export const getAccountSummary = () => demoOrThrow(() => MOCK_ACCOUNT_SUMMARY);
export const getHomeData = () => demoOrThrow(() => ({ balances: MOCK_HOME_BALANCES, summary: MOCK_ACCOUNT_SUMMARY }));
