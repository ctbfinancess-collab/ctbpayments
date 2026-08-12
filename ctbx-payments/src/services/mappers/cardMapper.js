import { formatCents } from './accountMapper';

const statusLabel = (status) => ({ ACTIVE: 'Desbloqueado', APPROVED: 'Aprovada', COMPLETED: 'Concluída' }[status] || status);
const cardDate = (iso) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

export function mapSandboxCard(card) {
  const minor = card.availableMinor ?? card.balanceMinor;
  if (!Number.isInteger(minor)) throw new TypeError('card money must use integer minor units');
  return {
    ...card,
    holder: card.holderName,
    expiry: card.expiryMonth && card.expiryYear ? `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}` : '',
    status: statusLabel(card.status),
    balance: `R$ ${formatCents(minor)}`,
  };
}

export function mapSandboxCardTransaction(item) {
  if (!Number.isInteger(item?.amountMinor)) throw new TypeError('card transaction money must use integer minor units');
  const sign = item.direction === 'CREDIT' ? '+' : '-';
  return { ...item, title: item.merchantName, date: cardDate(item.occurredAt), value: `${sign} R$ ${formatCents(item.amountMinor)}`, status: statusLabel(item.status), authorization: item.authorizationCodeMasked, receipt: item.receiptAvailable === true };
}

export const mapSandboxCardTransactions = (items = []) => items.map(mapSandboxCardTransaction);

export function mapSandboxCardReceipt(item) {
  if (!Number.isInteger(item?.amountMinor)) throw new TypeError('card receipt money must use integer minor units');
  return { ...item, title: item.merchantName, date: cardDate(item.occurredAt), value: `${item.direction === 'CREDIT' ? '+' : '-'} R$ ${formatCents(item.amountMinor)}`, authorization: item.authorizationCodeMasked };
}

export const mapSandboxCardReceipts = (items = []) => items.map(mapSandboxCardReceipt);
