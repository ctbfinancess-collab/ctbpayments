import { ApiError, apiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { ACCOUNT_TYPES, MOCK_BANKS, MOCK_TRANSFER_BALANCE, MOCK_TRANSFER_FAVORITES, MOCK_TRANSFER_FEE, TRANSFER_PURPOSES, buildMockBeneficiary } from '../data/transferMockData';
import { transferCurrencyToNumber } from '../utils/transferValidation';
import { getBalances } from './accountService';
import { mapSandboxBank, mapSandboxTransfer, mapSandboxTransferBeneficiary, mapSandboxTransferFavorites, mapSandboxTransferReceipt, mapSandboxTransferValidation } from './mappers/transferMapper';

const unavailable = () => { throw new ApiError('Transferências não estão disponíveis no ambiente sandbox.', { code: 'SANDBOX_OPERATION_UNAVAILABLE' }); };
const notConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };

function scheduleDateToIso(value) {
  if (!value) return undefined;
  const [day, month, year] = value.split('/').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

export function createTransferService({ demoMode = false, sandboxMode = false, client = apiClient, balanceLoader = getBalances } = {}) {
  const request = (path, options = {}) => client(path, { retryOnUnauthorized: true, ...options });
  const verifiedChallenges = new Map();
  const submissions = new Map();
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
    const validation = mapSandboxTransferValidation((await request('/v1/transfers/validate', { method: 'POST', body: JSON.stringify(body) })).data);
    return { ...transfer, ...validation, beneficiary: { ...transfer.beneficiary, ...validation.beneficiary }, idempotencyKey: `ctbx-transfer-${validation.validationId}` };
  };
  const createAndVerifyChallenge = async (operationId, otp) => {
    if (verifiedChallenges.has(operationId)) return verifiedChallenges.get(operationId);
    const challenge = (await request('/v1/security/challenges', { method: 'POST', body: JSON.stringify({ purpose: 'TRANSFER', operationId, type: 'OTP' }) })).data;
    await request(`/v1/security/challenges/${challenge.id}/verify`, { method: 'POST', body: JSON.stringify({ proof: otp }) });
    verifiedChallenges.set(operationId, challenge.id);
    return challenge.id;
  };
  const submitSandbox = async (transfer, otp) => {
    const key = `${transfer.validationId}:${transfer.scheduledFor || 'now'}`;
    if (submissions.has(key)) return submissions.get(key);
    const execution = (async () => {
      const challengeId = await createAndVerifyChallenge(transfer.validationId, otp);
      const path = transfer.scheduled ? '/v1/transfers/schedule' : '/v1/transfers';
      const body = { validationId: transfer.validationId, challengeId, ...(transfer.description ? { description: transfer.description } : {}), ...(transfer.purpose ? { purpose: transfer.purpose } : {}), ...(transfer.scheduled ? { scheduledFor: transfer.scheduledFor || scheduleDateToIso(transfer.date) } : {}) };
      const result = mapSandboxTransfer((await request(path, { method: 'POST', headers: { 'Idempotency-Key': transfer.idempotencyKey || `ctbx-transfer-${transfer.validationId}` }, body: JSON.stringify(body) })).data);
      const receipt = mapSandboxTransferReceipt((await request(`/v1/transfers/${result.transferId}/receipt`, { method: 'GET' })).data);
      return { ...transfer, ...result, receipt, beneficiary: { ...transfer.beneficiary, ...result.beneficiary } };
    })();
    submissions.set(key, execution);
    try { return await execution; } catch (error) { submissions.delete(key); throw error; }
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
    submitTransfer: async (transfer, otp) => demoMode ? { ...transfer, demoMode: true } : sandboxMode ? submitSandbox(transfer, otp) : notConfigured(),
    authorizeTransfer: async (transfer, otp) => demoMode ? { ...transfer, demoMode: true } : sandboxMode ? submitSandbox(transfer, otp) : notConfigured(),
    scheduleTransfer: async (transfer, otp) => demoMode ? { ...transfer, demoMode: true } : sandboxMode ? submitSandbox(transfer, otp) : notConfigured(),
    getTransfer: async (transferId) => demoMode ? null : sandboxMode ? mapSandboxTransfer((await request(`/v1/transfers/${transferId}`, { method: 'GET' })).data) : notConfigured(),
    getReceipt: async (transfer) => demoMode ? transfer : sandboxMode ? mapSandboxTransferReceipt((await request(`/v1/transfers/${transfer.transferId || transfer.id}/receipt`, { method: 'GET' })).data) : notConfigured(),
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
export const getTransfer = service.getTransfer;
