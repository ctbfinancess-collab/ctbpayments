import { ApiError, apiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { MOCK_PIX_BALANCE, MOCK_PIX_BENEFICIARY, MOCK_PIX_FAVORITES, MOCK_PIX_KEYS, PIX_KEY_TYPES, buildMockPixTransfer } from '../data/pixMockData';
import { parseCurrency } from '../utils/pixValidation';
import { getBalances } from './accountService';
import { mapSandboxPixKeys, mapSandboxPixLookup, mapSandboxPixReceipt, mapSandboxPixTransfer, mapSandboxPixValidation, mapSandboxQrLookup, mapSandboxReceiveQr } from './mappers/pixMapper';

const unavailable = () => { throw new ApiError('Operação PIX não disponível no ambiente sandbox.', { code: 'SANDBOX_OPERATION_UNAVAILABLE' }); };
const notConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };
const SANDBOX_FAVORITES = Object.freeze([{ id: 'sbx-favorite-1', name: 'Cliente Recebedor SANDBOX', key: 'recebedor@sandbox.invalid', bank: 'Banco SANDBOX', type: 'email' }]);
const scheduleDateToIso = (value) => { const [day, month, year] = value.split('/').map(Number); return new Date(year, month - 1, day, 12).toISOString(); };

export function createPixService({ demoMode = false, sandboxMode = false, client = apiClient, balanceLoader = getBalances } = {}) {
  const request = (path, options = {}) => client(path, { retryOnUnauthorized: true, ...options });
  const verifiedChallenges = new Map(); const submits = new Map();
  const lookupKey = async (input = {}) => demoMode ? { key: input.key, keyType: input.keyType, beneficiary: MOCK_PIX_BENEFICIARY } : sandboxMode ? mapSandboxPixLookup((await request('/v1/pix/keys/lookup', { method: 'POST', body: JSON.stringify({ key: input.key }) })).data) : notConfigured();
  const lookupQrCode = async (input = {}) => demoMode ? buildMockPixTransfer(input) : sandboxMode ? mapSandboxQrLookup((await request('/v1/pix/qr/lookup', { method: 'POST', body: JSON.stringify({ payload: input.payload ?? input.key }) })).data) : notConfigured();
  const getKeys = async () => demoMode ? MOCK_PIX_KEYS : sandboxMode ? mapSandboxPixKeys((await request('/v1/pix/keys', { method: 'GET' })).data) : notConfigured();
  const generateReceiveQr = async (input = {}) => { if (demoMode) return { ...input, payload: `PIX-DEMO|${input.keyValue}|${input.amount || '0,00'}` }; if (!sandboxMode) return notConfigured(); const amountMinor = Math.round(parseCurrency(input.amount || '') * 100); return mapSandboxReceiveQr((await request('/v1/pix/receive/qr', { method: 'POST', body: JSON.stringify({ keyId: input.keyId, ...(amountMinor ? { amountMinor } : {}), ...(input.description ? { description: input.description } : {}) }) })).data, input.keyValue); };
  const validateTransfer = async (transfer) => {
    if (demoMode) return transfer;
    if (!sandboxMode) return notConfigured();
    const body = { beneficiaryId: transfer.beneficiary?.beneficiaryId, amountMinor: Math.round(parseCurrency(transfer.amount) * 100), currency: 'BRL', ...(transfer.message ? { description: transfer.message } : {}), ...(transfer.scheduled ? { scheduledFor: scheduleDateToIso(transfer.scheduleDate) } : {}) };
    const validation = mapSandboxPixValidation((await request('/v1/pix/transfers/validate', { method: 'POST', body: JSON.stringify(body) })).data);
    return { ...transfer, ...validation, beneficiary: { ...transfer.beneficiary, ...validation.beneficiary }, idempotencyKey: `ctbx-pix-${validation.validationId}` };
  };
  const createAndVerifyChallenge = async (operationId, otp) => { if (verifiedChallenges.has(operationId)) return verifiedChallenges.get(operationId); const challenge = (await request('/v1/security/challenges', { method: 'POST', body: JSON.stringify({ purpose: 'PIX', operationId, type: 'OTP' }) })).data; await request(`/v1/security/challenges/${challenge.id}/verify`, { method: 'POST', body: JSON.stringify({ proof: otp }) }); verifiedChallenges.set(operationId, challenge.id); return challenge.id; };
  const submitSandbox = async (transfer, otp) => {
    const submitKey = `${transfer.validationId}:${transfer.scheduledFor || 'now'}`; if (submits.has(submitKey)) return submits.get(submitKey);
    const execution = (async () => { const challengeId = await createAndVerifyChallenge(transfer.validationId, otp); const path = transfer.scheduled ? '/v1/pix/transfers/schedule' : '/v1/pix/transfers'; const body = { validationId: transfer.validationId, challengeId, ...(transfer.message ? { description: transfer.message } : {}), ...(transfer.scheduled ? { scheduledFor: transfer.scheduledFor || scheduleDateToIso(transfer.scheduleDate) } : {}) }; const result = mapSandboxPixTransfer((await request(path, { method: 'POST', headers: { 'Idempotency-Key': transfer.idempotencyKey || `ctbx-pix-${transfer.validationId}` }, body: JSON.stringify(body) })).data); const receipt = mapSandboxPixReceipt((await request(`/v1/pix/transfers/${result.pixTransferId}/receipt`, { method: 'GET' })).data); return { ...transfer, ...result, receipt, beneficiary: { ...transfer.beneficiary, ...result.beneficiary } }; })();
    submits.set(submitKey, execution); try { return await execution; } catch (error) { submits.delete(submitKey); throw error; }
  };
  const getBalance = async () => demoMode ? MOCK_PIX_BALANCE : sandboxMode ? (await balanceLoader())[0]?.value || '0,00' : notConfigured();
  return { getBalance, lookupKey, lookupQrCode, getKeys, generateReceiveQr, validateTransfer,
    getFavorites: async () => demoMode ? MOCK_PIX_FAVORITES : sandboxMode ? SANDBOX_FAVORITES : notConfigured(),
    getAvailableKeyTypes: async () => demoMode || sandboxMode ? PIX_KEY_TYPES : notConfigured(),
    createTransfer: (input) => demoMode ? buildMockPixTransfer(input) : sandboxMode ? unavailable() : notConfigured(),
    authorizeTransfer: async (transfer, otp) => demoMode ? { ...transfer, demoMode: true } : sandboxMode ? submitSandbox(transfer, otp) : notConfigured(),
    scheduleTransfer: async (transfer, otp) => demoMode ? { ...transfer, demoMode: true } : sandboxMode ? submitSandbox(transfer, otp) : notConfigured(),
    createKey: (key) => demoMode ? { ...key, id: `DEMO-KEY-${Date.now()}`, status: 'Ativo' } : sandboxMode ? unavailable() : notConfigured(),
    deleteKey: (key) => demoMode ? key : sandboxMode ? unavailable() : notConfigured(),
    getReceipt: async (transfer) => demoMode ? transfer : sandboxMode ? mapSandboxPixReceipt((await request(`/v1/pix/transfers/${transfer.pixTransferId}/receipt`, { method: 'GET' })).data) : notConfigured(),
    getPixTransferData: async () => ({ balance: await getBalance() }),
  };
}

const service = createPixService({ demoMode: isDemoMode, sandboxMode: isSandboxMode });
export const getBalance = service.getBalance; export const lookupKey = service.lookupKey; export const lookupQrCode = service.lookupQrCode; export const getKeys = service.getKeys; export const listKeys = service.getKeys; export const generateReceiveQr = service.generateReceiveQr; export const getFavorites = service.getFavorites; export const listFavorites = service.getFavorites; export const getAvailableKeyTypes = service.getAvailableKeyTypes; export const createTransfer = service.createTransfer; export const validateTransfer = service.validateTransfer; export const authorizeTransfer = service.authorizeTransfer; export const scheduleTransfer = service.scheduleTransfer; export const createKey = service.createKey; export const deleteKey = service.deleteKey; export const getReceipt = service.getReceipt; export const getPixTransferData = service.getPixTransferData;
