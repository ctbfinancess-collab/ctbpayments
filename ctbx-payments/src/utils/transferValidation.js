import { isTodayOrFutureDate } from './dateValidation';

export const onlyTransferDigits = (value = '') => value.replace(/\D/g, '');

export function transferCurrencyToNumber(value = '') {
  const normalized = value.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return Number(normalized) || 0;
}

export function validateTransferDocument(value = '') {
  const length = onlyTransferDigits(value).length;
  return length === 11 || length === 14;
}

export const validateScheduleDate = isTodayOrFutureDate;
