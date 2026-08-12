import { formatCents } from './accountMapper';

const STATUS_LABELS = { COMPLETED: 'Concluído', SCHEDULED: 'Agendado', UNDER_REVIEW: 'Em análise' };

function dateParts(isoValue) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) throw new TypeError('occurredAt must be ISO 8601');
  return {
    date: new Intl.DateTimeFormat('pt-BR').format(date),
    time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date),
  };
}

export function mapSandboxTransaction(item) {
  if (!Number.isInteger(item?.amountMinor) || !Number.isInteger(item?.feeMinor)) {
    throw new TypeError('statement money must use integer minor units');
  }
  const occurred = dateParts(item.occurredAt);
  return {
    ...item,
    ...occurred,
    direction: item.direction === 'CREDIT' ? 'entrada' : 'saida',
    amount: item.amountMinor / 100,
    amountFormatted: formatCents(item.amountMinor),
    fee: formatCents(item.feeMinor),
    status: STATUS_LABELS[item.status] || item.status,
    bank: item.institution,
    receipt: item.receiptAvailable === true,
  };
}

export const mapSandboxStatement = (items = []) => items.map(mapSandboxTransaction);

export function mapSandboxReceipt(item) {
  if (!Number.isInteger(item?.amountMinor)) throw new TypeError('receipt money must use integer minor units');
  const occurred = dateParts(item.occurredAt);
  return {
    ...item,
    ...occurred,
    id: item.transactionId,
    description: 'Comprovante de movimentação',
    counterparty: item.payee,
    bank: item.institution,
    amount: item.amountMinor / 100,
    amountFormatted: formatCents(item.amountMinor),
    status: STATUS_LABELS[item.status] || item.status,
  };
}
