export function formatCents(amount) {
  if (!Number.isInteger(amount)) throw new Error('Monetary amount must be integer cents');
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);
  const units = String(Math.floor(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${units},${String(absolute % 100).padStart(2, '0')}`;
}

export function mapSandboxAccount(account) {
  return {
    id: account.id,
    bank: 'CTBX Sandbox',
    agency: account.maskedAgency,
    number: account.maskedNumber,
    type: account.accountType,
    currency: account.currency,
    status: account.status,
  };
}

export function mapSandboxBalances(balance) {
  const components = balance.components || {};
  return [
    { id: 'digital', description: 'Conta Sandbox', tag: 'R$', value: formatCents(balance.available.amount), blockedValue: formatCents(components.blocked?.amount || 0) },
    { id: 'investment', description: 'Investimentos Sandbox', tag: 'R$', value: formatCents(components.investments?.amount || 0) },
    { id: 'card', description: 'Conta Cartão Sandbox', tag: 'R$', value: formatCents(components.cardAccount?.amount || 0) },
    { id: 'credit', description: 'Crédito Sandbox', tag: 'R$', value: formatCents(components.credit?.amount || 0) },
  ];
}
