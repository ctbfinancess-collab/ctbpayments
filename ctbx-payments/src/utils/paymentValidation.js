import { isTodayOrFutureDate } from './dateValidation';

export const onlyPaymentDigits = (value = '') => value.replace(/\D/g, '');
export function validatePaymentCode(value = '') { const length = onlyPaymentDigits(value).length; return [44, 46, 47, 48].includes(length); }
export function paymentCurrencyToNumber(value = '') { return Number(value.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0; }
export const validatePaymentDate = isTodayOrFutureDate;
