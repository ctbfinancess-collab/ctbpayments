import { MOCK_PIX_BALANCE, MOCK_PIX_BENEFICIARY, MOCK_PIX_FAVORITES, MOCK_PIX_KEYS, buildMockPixTransfer } from '../data/pixMockData';
import { demoOrThrow } from './serviceMode';
export const getBalance = () => demoOrThrow(() => MOCK_PIX_BALANCE);
export const lookupKey = () => demoOrThrow(() => MOCK_PIX_BENEFICIARY);
export const listFavorites = () => demoOrThrow(() => MOCK_PIX_FAVORITES);
export const listKeys = () => demoOrThrow(() => MOCK_PIX_KEYS);
export const createTransfer = (input) => demoOrThrow(() => buildMockPixTransfer(input));
