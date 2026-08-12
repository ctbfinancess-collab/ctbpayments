import { MOCK_PAYMENT_BALANCE, buildMockBill, buildMockInstallments } from '../data/paymentMockData';
import { demoOrThrow } from './serviceMode';
export const getBalance = () => demoOrThrow(() => MOCK_PAYMENT_BALANCE);
export const lookupBill = (code) => demoOrThrow(() => buildMockBill(code));
export const simulateInstallments = (value) => demoOrThrow(() => buildMockInstallments(value));
export const submitPayment = (payment) => demoOrThrow(() => ({ ...payment, demoMode: true }));
