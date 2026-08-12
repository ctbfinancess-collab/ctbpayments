import { ApiError, apiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { MOCK_PIX_BALANCE, MOCK_PIX_BENEFICIARY, MOCK_PIX_FAVORITES, MOCK_PIX_KEYS, PIX_KEY_TYPES, buildMockPixTransfer } from '../data/pixMockData';
import { parseCurrency } from '../utils/pixValidation';
import { getBalances } from './accountService';
import { mapSandboxPixKeys, mapSandboxPixLookup, mapSandboxQrLookup, mapSandboxReceiveQr } from './mappers/pixMapper';

const unavailable = () => { throw new ApiError('Operação PIX não disponível no ambiente sandbox.', { code: 'SANDBOX_OPERATION_UNAVAILABLE' }); };
const notConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };
const SANDBOX_FAVORITES = Object.freeze([{ id: 'sbx-favorite-1', name: 'Cliente Recebedor SANDBOX', key: 'recebedor@sandbox.invalid', bank: 'Banco SANDBOX', type: 'email' }]);

export function createPixService({ demoMode = false, sandboxMode = false, client = apiClient, balanceLoader = getBalances } = {}) {
  const request = (path, options) => client(path, { retryOnUnauthorized: true, ...options });
  const lookupKey = async (input = {}) => demoMode ? { key: input.key, keyType: input.keyType, beneficiary: MOCK_PIX_BENEFICIARY } : sandboxMode ? mapSandboxPixLookup((await request('/v1/pix/keys/lookup', { method: 'POST', body: JSON.stringify({ key: input.key }) })).data) : notConfigured();
  const lookupQrCode = async (input = {}) => demoMode ? buildMockPixTransfer(input) : sandboxMode ? mapSandboxQrLookup((await request('/v1/pix/qr/lookup', { method: 'POST', body: JSON.stringify({ payload: input.payload ?? input.key }) })).data) : notConfigured();
  const getKeys = async () => demoMode ? MOCK_PIX_KEYS : sandboxMode ? mapSandboxPixKeys((await request('/v1/pix/keys', { method: 'GET' })).data) : notConfigured();
  const generateReceiveQr = async (input = {}) => {
    if (demoMode) return { ...input, payload: `PIX-DEMO|${input.keyValue}|${input.amount || '0,00'}` };
    if (!sandboxMode) return notConfigured();
    const amountMinor = Math.round(parseCurrency(input.amount || '') * 100);
    const data = (await request('/v1/pix/receive/qr', { method: 'POST', body: JSON.stringify({ keyId: input.keyId, ...(amountMinor ? { amountMinor } : {}), ...(input.description ? { description: input.description } : {}) }) })).data;
    return mapSandboxReceiveQr(data, input.keyValue);
  };
  const getBalance = async () => demoMode ? MOCK_PIX_BALANCE : sandboxMode ? (await balanceLoader())[0]?.value || '0,00' : notConfigured();
  const mutate = async (factory) => demoMode ? factory() : sandboxMode ? unavailable() : notConfigured();
  return {
    getBalance, lookupKey, lookupQrCode, getKeys, generateReceiveQr,
    getFavorites: async () => demoMode ? MOCK_PIX_FAVORITES : sandboxMode ? SANDBOX_FAVORITES : notConfigured(),
    getAvailableKeyTypes: async () => demoMode || sandboxMode ? PIX_KEY_TYPES : notConfigured(),
    createTransfer: (input) => mutate(() => buildMockPixTransfer(input)),
    validateTransfer: (transfer) => mutate(() => transfer),
    authorizeTransfer: (transfer) => mutate(() => ({ ...transfer, demoMode: true })),
    scheduleTransfer: (transfer) => mutate(() => ({ ...transfer, demoMode: true })),
    createKey: (key) => mutate(() => ({ ...key, id: `DEMO-KEY-${Date.now()}`, status: 'Ativo' })),
    deleteKey: (key) => mutate(() => key),
    getReceipt: (transfer) => mutate(() => transfer),
    getPixTransferData: async () => ({ balance: await getBalance() }),
  };
}

const service = createPixService({ demoMode: isDemoMode, sandboxMode: isSandboxMode });
export const getBalance = service.getBalance;
export const lookupKey = service.lookupKey;
export const lookupQrCode = service.lookupQrCode;
export const getKeys = service.getKeys;
export const listKeys = service.getKeys;
export const generateReceiveQr = service.generateReceiveQr;
export const getFavorites = service.getFavorites;
export const listFavorites = service.getFavorites;
export const getAvailableKeyTypes = service.getAvailableKeyTypes;
export const createTransfer = service.createTransfer;
export const validateTransfer = service.validateTransfer;
export const authorizeTransfer = service.authorizeTransfer;
export const scheduleTransfer = service.scheduleTransfer;
export const createKey = service.createKey;
export const deleteKey = service.deleteKey;
export const getReceipt = service.getReceipt;
export const getPixTransferData = service.getPixTransferData;
