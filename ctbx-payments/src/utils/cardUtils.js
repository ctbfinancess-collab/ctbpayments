export const onlyDigits = (value = '') => value.replace(/\D/g, '');
export const validCardCode = (value) => onlyDigits(value).length >= 4;
export const validCardPassword = (value) => /^\d{4}$/.test(value);
export const validMoney = (value) => Number(value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) > 0;
