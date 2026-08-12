import { MOCK_BANKS, MOCK_TRANSFER_BALANCE, MOCK_TRANSFER_FAVORITES, buildMockBeneficiary } from '../data/transferMockData';
import { demoOrThrow } from './serviceMode';
export const getBalance = () => demoOrThrow(() => MOCK_TRANSFER_BALANCE);
export const listBanks = () => demoOrThrow(() => MOCK_BANKS);
export const listFavorites = () => demoOrThrow(() => MOCK_TRANSFER_FAVORITES);
export const lookupBeneficiary = (mode, values) => demoOrThrow(() => buildMockBeneficiary(mode, values));
export const submitTransfer = (transfer) => demoOrThrow(() => ({ ...transfer, demoMode: true }));
