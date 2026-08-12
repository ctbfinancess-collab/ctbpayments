export const onlyTransferDigits = (value = '') => value.replace(/\D/g, '');

export function transferCurrencyToNumber(value = '') {
  const normalized = value.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return Number(normalized) || 0;
}

export function validateTransferDocument(value = '') {
  const length = onlyTransferDigits(value).length;
  return length === 11 || length === 14;
}

export function validateScheduleDate(value = '') {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date >= today;
}
