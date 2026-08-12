import { MOCK_STATEMENT_BALANCE } from '../data/statementMockData';
import { MOCK_ACCOUNT } from '../data/profileMockData';
import { demoOrThrow } from './serviceMode';
export const getBalance = () => demoOrThrow(() => MOCK_STATEMENT_BALANCE);
export const getAccount = () => demoOrThrow(() => MOCK_ACCOUNT);
