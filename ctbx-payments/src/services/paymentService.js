import { ApiError, apiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { MOCK_PAYMENT_BALANCE, buildMockBill, buildMockInstallments } from '../data/paymentMockData';
import { paymentCurrencyToNumber } from '../utils/paymentValidation';
import { getBalances } from './accountService';
import { mapSandboxBill, mapSandboxInstallments, mapSandboxPayment, mapSandboxPaymentReceipt, mapSandboxPaymentValidation } from './mappers/paymentMapper';

const notConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };
const scheduleDateToIso = (value) => { const [day, month, year] = value.split('/').map(Number); return new Date(year, month - 1, day, 12).toISOString(); };

export function createPaymentService({ demoMode = false, sandboxMode = false, client = apiClient, balanceLoader = getBalances } = {}) {
  const request = (path, options = {}) => client(path, { retryOnUnauthorized: true, ...options });
  const verifiedChallenges = new Map();
  const submits = new Map();
  const lookupBarcode = async (code) => demoMode ? buildMockBill(code) : sandboxMode ? mapSandboxBill((await request('/v1/payments/bills/lookup', { method: 'POST', body: JSON.stringify({ code }) })).data) : notConfigured();
  const validatePayment = async (payment) => {
    if (demoMode) return payment;
    if (!sandboxMode) return notConfigured();
    const body = { billId: payment.bill.billId || payment.bill.id, amountMinor: Math.round(paymentCurrencyToNumber(payment.bill.total) * 100), currency: 'BRL', ...(payment.description ? { description: payment.description } : {}), ...(payment.scheduled ? { scheduledFor: scheduleDateToIso(payment.date) } : {}) };
    const validation = mapSandboxPaymentValidation((await request('/v1/payments/bills/validate', { method: 'POST', body: JSON.stringify(body) })).data);
    return { ...payment, ...validation, bill: { ...payment.bill, ...validation.bill }, idempotencyKey: `ctbx-payment-${validation.validationId}` };
  };
  const getInstallments = async (input) => {
    const payment = typeof input === 'object' ? input : null;
    const value = payment?.bill?.total || input;
    if (demoMode) return buildMockInstallments(value);
    if (!sandboxMode) return notConfigured();
    const response = await request('/v1/payments/installments/simulate', { method: 'POST', body: JSON.stringify({ billId: payment?.bill?.billId || payment?.bill?.id, amountMinor: Math.round(paymentCurrencyToNumber(value) * 100) }) });
    return mapSandboxInstallments(response.data);
  };
  const createAndVerifyChallenge = async (operationId, otp) => {
    if (verifiedChallenges.has(operationId)) return verifiedChallenges.get(operationId);
    const challenge = (await request('/v1/security/challenges', { method: 'POST', body: JSON.stringify({ purpose: 'PAYMENT', operationId, type: 'OTP' }) })).data;
    await request(`/v1/security/challenges/${challenge.id}/verify`, { method: 'POST', body: JSON.stringify({ proof: otp }) });
    verifiedChallenges.set(operationId, challenge.id);
    return challenge.id;
  };
  const submitSandbox = async (payment, otp) => {
    const installment = payment.installmentData;
    const operationId = installment?.simulationId || payment.validationId;
    const submitKey = `${operationId}:${installment?.optionId || payment.scheduledFor || 'bill'}`;
    if (submits.has(submitKey)) return submits.get(submitKey);
    const execution = (async () => {
    const challengeId = await createAndVerifyChallenge(operationId, otp);
    const path = installment ? '/v1/payments/installments' : payment.scheduled ? '/v1/payments/bills/schedule' : '/v1/payments/bills';
    const body = installment ? { simulationId: installment.simulationId, optionId: installment.optionId, challengeId, ...(payment.description ? { description: payment.description } : {}) } : { validationId: payment.validationId, challengeId, ...(payment.description ? { description: payment.description } : {}), ...(payment.scheduled ? { scheduledFor: payment.scheduledFor || scheduleDateToIso(payment.date) } : {}) };
    const idempotencyKey = payment.idempotencyKey || `ctbx-payment-${operationId}-${installment?.optionId || 'bill'}`;
    const result = mapSandboxPayment((await request(path, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) })).data);
    const receipt = mapSandboxPaymentReceipt((await request(`/v1/payments/${result.paymentId}/receipt`, { method: 'GET' })).data);
    return { ...payment, ...result, receipt, bill: { ...payment.bill, total: result.amount } };
    })();
    submits.set(submitKey, execution);
    try { return await execution; } catch (error) { submits.delete(submitKey); throw error; }
  };
  const authorizePayment = async (payment, otp) => demoMode ? { ...payment, demoMode: true } : sandboxMode ? submitSandbox(payment, otp) : notConfigured();
  const schedulePayment = authorizePayment;
  return {
    getBalance: async () => demoMode ? MOCK_PAYMENT_BALANCE : sandboxMode ? (await balanceLoader())[0]?.value || '0,00' : notConfigured(),
    lookupBill: lookupBarcode,
    lookupBarcode,
    validatePayment,
    simulateInstallments: getInstallments,
    getInstallments,
    authorizePayment,
    schedulePayment,
    submitPayment: authorizePayment,
    getReceipt: async (payment) => demoMode ? payment : sandboxMode ? mapSandboxPaymentReceipt((await request(`/v1/payments/${payment.paymentId}/receipt`, { method: 'GET' })).data) : notConfigured(),
    getPaymentDetailsData: async () => ({ balance: demoMode ? MOCK_PAYMENT_BALANCE : sandboxMode ? (await balanceLoader())[0]?.value || '0,00' : notConfigured() }),
  };
}

const service = createPaymentService({ demoMode: isDemoMode, sandboxMode: isSandboxMode });
export const getBalance = service.getBalance;
export const lookupBill = service.lookupBill;
export const lookupBarcode = service.lookupBarcode;
export const validatePayment = service.validatePayment;
export const simulateInstallments = service.simulateInstallments;
export const getInstallments = service.getInstallments;
export const authorizePayment = service.authorizePayment;
export const schedulePayment = service.schedulePayment;
export const submitPayment = service.submitPayment;
export const getReceipt = service.getReceipt;
export const getPaymentDetailsData = service.getPaymentDetailsData;
