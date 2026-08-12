export function parseBrazilianDate(value = '') {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;
  const [day, month, year] = value.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isTodayOrFutureDate(value = '') {
  const date = parseBrazilianDate(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}

export function isValidDateRange(startValue = '', endValue = '') {
  const start = parseBrazilianDate(startValue);
  const end = parseBrazilianDate(endValue);
  return Boolean(start && end && start.getTime() <= end.getTime());
}
