export function formatStatementAmount(value) { return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function statementDateToValue(value) { const [day, month, year] = value.split('/').map(Number); return new Date(year, month - 1, day).getTime(); }
export function filterTransactions(items, { direction = 'todos', period = 90, query = '', startDate = '', endDate = '', category = 'todos' }) {
  const now = new Date(2026, 7, 12).getTime(); const periodStart = now - period * 86400000;
  const customStart = startDate ? statementDateToValue(startDate) : null; const customEnd = endDate ? statementDateToValue(endDate) : null; const normalized = query.trim().toLowerCase();
  return items.filter((item) => { const date = statementDateToValue(item.date); return (direction === 'todos' || item.direction === direction) && (category === 'todos' || item.category === category) && (!normalized || `${item.description} ${item.counterparty}`.toLowerCase().includes(normalized)) && (customStart ? date >= customStart : date >= periodStart) && (!customEnd || date <= customEnd); });
}
export function groupTransactionsByDate(items) { return items.reduce((groups, item) => { const group = groups.find((entry) => entry.date === item.date); if (group) group.items.push(item); else groups.push({ date: item.date, items: [item] }); return groups; }, []); }
