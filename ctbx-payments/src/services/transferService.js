import { ApiError, apiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { ACCOUNT_TYPES, MOCK_BANKS, MOCK_TRANSFER_BALANCE, MOCK_TRANSFER_FAVORITES, MOCK_TRANSFER_FEE, TRANSFER_PURPOSES, buildMockBeneficiary } from '../data/transferMockData';
import { transferCurrencyToNumber } from '../utils/transferValidation';
import { getBalances } from './accountService';
import { mapSandboxBank, mapSandboxTransferBeneficiary, mapSandboxTransferFavorites, mapSandboxTransferValidation } from './mappers/transferMapper';

const unavailable = () => { throw new ApiError('Transferências não estão disponíveis no ambiente sandbox.', { code: 'SANDBOX_OPERATION_UNAVAILABLE' }); };
const notConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };

function scheduleDateToIso(value) {
  if (!value) return undefined;
  const [day, month, year] = value.split('/').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

export function createTransferService({ demoMode = false, sandboxMode = false, client = apiClient, balanceLoader = getBalances } = {}) {
  const request = (path, options = {}) => client(path, { retryOnUnauthorized: true, ...options });
  const getBanks = async () => demoMode ? MOCK_BANKS : sandboxMode ? (await request('/v1/transfers/banks', { method: 'GET' })).data.map(mapSandboxBank) : notConfigured();
  const getFavorites = async () => demoMode ? MOCK_TRANSFER_FAVORITES : sandboxMode ? mapSandboxTransferFavorites((await request('/v1/transfers/favorites', { method: 'GET' })).data) : notConfigured();
  const lookupBeneficiary = async (mode, values = {}) => {
    if (demoMode) return buildMockBeneficiary(mode, values);
    if (!sandboxMode) return notConfigured();
    let body;
    if (values.favoriteId) body = { type: 'FAVORITE', favoriteId: values.favoriteId };
    else if (mode === 'external') body = { type: 'EXTERNAL_ACCOUNT', bankId: values.bankId, agency: values.agency, account: values.account, accountDigit: values.digit };
    else if (values.phone) body = { type: 'INTERNAL_PHONE', phone: values.phone.replace(/[\s()-]/g, '') };
    else if (values.document) body = { type: 'INTERNAL_DOCUMENT', document: values.document.replace(/\D/g, '') };
    else body = { type: 'INTERNAL_ACCOUNT', agency: values.agency, account: values.account };
    return mapSandboxTransferBeneficiary((await request('/v1/transfers/beneficiaries/lookup', { method: 'POST', body: JSON.stringify(body) })).data);
  };
  const validateTransfer = async (transfer) => {
    if (demoMode) return transfer;
    if (!sandboxMode) return notConfigured();
    const amountMinor = Math.round(transferCurrencyToNumber(transfer.amount) * 100);
    const body = { beneficiaryId: transfer.beneficiary.beneficiaryId || transfer.beneficiary.id, amountMinor, currency: 'BRL', ...(transfer.description ? { description: transfer.description } : {}), ...(transfer.purpose ? { purpose: transfer.purpose } : {}), ...(transfer.scheduled ? { scheduledFor: scheduleDateToIso(transfer.date) } : {}) };
    return { ...transfer, ...mapSandboxTransferValidation((await request('/v1/transfers/validate', { method: 'POST', body: JSON.stringify(body) })).data) };
  };
  const getBalance = async () => demoMode ? MOCK_TRANSFER_BALANCE : sandboxMode ? (await balanceLoader())[0]?.value || '0,00' : notConfigured();
  return {
    getBalance,
    getBanks,
    listBanks: getBanks,
    getFavorites,
    listFavorites: getFavorites,
    lookupBeneficiary,
    validateTransfer,
    getTransferOptions: async () => ({ accountTypes: ACCOUNT_TYPES, fee: MOCK_TRANSFER_FEE, purposes: TRANSFER_PURPOSES }),
    getTransferFormData: async () => ({ accountTypes: ACCOUNT_TYPES, banks: await getBanks() }),
    getTransferDetailsData: async () => ({ balance: await getBalance(), fee: MOCK_TRANSFER_FEE, purposes: TRANSFER_PURPOSES }),
    submitTransfer: async (transfer) => demoMode ? { ...transfer, demoMode: true } : sandboxMode ? unavailable() : notConfigured(),
    authorizeTransfer: async (transfer) => demoMode ? { ...transfer, demoMode: true } : sandboxMode ? unavailable() : notConfigured(),
    scheduleTransfer: async (transfer) => demoMode ? { ...transfer, demoMode: true } : sandboxMode ? unavailable() : notConfigured(),
    getReceipt: async (transfer) => demoMode ? transfer : sandboxMode ? unavailable() : notConfigured(),
  };
}

const service = createTransferService({ demoMode: isDemoMode, sandboxMode: isSandboxMode });
export const getBalance = service.getBalance;
export const listBanks = service.listBanks;
export const getBanks = service.getBanks;
export const listFavorites = service.listFavorites;
export const getFavorites = service.getFavorites;
export const lookupBeneficiary = service.lookupBeneficiary;
export const validateTransfer = service.validateTransfer;
export const getTransferOptions = service.getTransferOptions;
export const getTransferFormData = service.getTransferFormData;
export const getTransferDetailsData = service.getTransferDetailsData;
export const submitTransfer = service.submitTransfer;
export const authorizeTransfer = service.authorizeTransfer;
export const scheduleTransfer = service.scheduleTransfer;
export const getReceipt = service.getReceipt;
