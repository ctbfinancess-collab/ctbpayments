export const onlyPaymentDigits = (value = '') => value.replace(/\D/g, '');
export function validatePaymentCode(value = '') { const length = onlyPaymentDigits(value).length; return [44, 46, 47, 48].includes(length); }
export function paymentCurrencyToNumber(value = '') { return Number(value.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0; }
export function validatePaymentDate(value = '') { if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false; const [d, m, y] = value.split('/').map(Number); const date = new Date(y, m - 1, d); const today = new Date(); today.setHours(0, 0, 0, 0); return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && date >= today; }
