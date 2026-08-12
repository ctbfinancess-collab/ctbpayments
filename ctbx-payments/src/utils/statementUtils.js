import { parseBrazilianDate } from './dateValidation';

export function formatStatementAmount(value) { return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function statementDateToValue(value) { return parseBrazilianDate(value)?.getTime() ?? Number.NaN; }
export function filterTransactions(items, { direction = 'todos', period = 90, query = '', startDate = '', endDate = '', category = 'todos', applyPastPeriod = true }) {
  const today = new Date(); today.setHours(0, 0, 0, 0); const periodStart = today.getTime() - Math.max(0, period - 1) * 86400000;
  const customStart = startDate ? statementDateToValue(startDate) : null; const customEnd = endDate ? statementDateToValue(endDate) : null; const normalized = query.trim().toLowerCase();
  return items.filter((item) => { const date = statementDateToValue(item.date); const matchesPeriod = !applyPastPeriod || ((customStart ? date >= customStart : date >= periodStart) && (!customEnd || date <= customEnd)); return Number.isFinite(date) && (direction === 'todos' || item.direction === direction) && (category === 'todos' || item.category === category) && (!normalized || `${item.description} ${item.counterparty}`.toLowerCase().includes(normalized)) && matchesPeriod; });
}
export function groupTransactionsByDate(items) { return items.reduce((groups, item) => { const group = groups.find((entry) => entry.date === item.date); if (group) group.items.push(item); else groups.push({ date: item.date, items: [item] }); return groups; }, []); }
