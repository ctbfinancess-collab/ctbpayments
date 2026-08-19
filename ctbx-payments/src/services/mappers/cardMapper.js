import { formatCents } from './accountMapper';

const statusLabel = (status) => ({ PENDING_ACTIVATION: 'Pendente de ativação', ACTIVE: 'Desbloqueado', BLOCKED: 'Bloqueado', CANCELLED: 'Cancelado', APPROVED: 'Aprovada', COMPLETED: 'Concluída', RECEIVED: 'Recebida', DECLINED: 'Recusada', REVERSED: 'Estornada', PENDING: 'Pendente' }[status] || status);
const cardDate = (iso) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

export function mapSandboxCard(card) {
  const minor = card.availableMinor ?? card.balanceMinor;
  if (!Number.isInteger(minor)) throw new TypeError('card money must use integer minor units');
  return {
    ...card,
    holder: card.holderName,
    expiry: card.expiryMonth && card.expiryYear ? `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}` : '',
    statusKey: card.status, // preserva o enum bruto (ACTIVE/BLOCKED/CANCELLED/...) — "status" abaixo vira o rótulo em pt-BR
    status: statusLabel(card.status),
    balance: `R$ ${formatCents(minor)}`,
  };
}

// Cartão virtual usa os mesmos campos de mapSandboxCard (availableMinor,
// expiryMonth/Year, status) mais limitMinor/usedMinor — reaproveita direto,
// só formata o extra (limite/usado) que o cartão físico não tem.
export function mapSandboxVirtualCard(card) {
  const base = mapSandboxCard(card);
  return {
    ...base,
    limit: Number.isInteger(card.limitMinor) ? `R$ ${formatCents(card.limitMinor)}` : undefined,
    used: Number.isInteger(card.usedMinor) ? `R$ ${formatCents(card.usedMinor)}` : undefined,
  };
}
export const mapSandboxVirtualCards = (items = []) => items.map(mapSandboxVirtualCard);

export function mapVirtualCardLimitPool(pool = {}) {
  assertMinor(pool.totalMinor, 'totalMinor');
  assertMinor(pool.allocatedMinor, 'allocatedMinor');
  assertMinor(pool.availableMinor, 'availableMinor');
  return { ...pool, total: `R$ ${formatCents(pool.totalMinor)}`, allocated: `R$ ${formatCents(pool.allocatedMinor)}`, available: `R$ ${formatCents(pool.availableMinor)}` };
}

export function mapSandboxCardTransaction(item) {
  if (!Number.isInteger(item?.amountMinor)) throw new TypeError('card transaction money must use integer minor units');
  const sign = item.direction === 'CREDIT' ? '+' : '-';
  return { ...item, title: item.merchantName, date: cardDate(item.occurredAt), value: `${sign} R$ ${formatCents(item.amountMinor)}`, statusKey: item.status, status: statusLabel(item.status), authorization: item.authorizationCodeMasked, receipt: item.receiptAvailable === true };
}

export const mapSandboxCardTransactions = (items = []) => items.map(mapSandboxCardTransaction);

export function mapSandboxCardReceipt(item) {
  if (!Number.isInteger(item?.amountMinor)) throw new TypeError('card receipt money must use integer minor units');
  return { ...item, title: item.merchantName, date: cardDate(item.occurredAt), value: `${item.direction === 'CREDIT' ? '+' : '-'} R$ ${formatCents(item.amountMinor)}`, authorization: item.authorizationCodeMasked };
}

export const mapSandboxCardReceipts = (items = []) => items.map(mapSandboxCardReceipt);

const assertMinor = (value, field) => { if (!Number.isInteger(value)) throw new TypeError(`${field} must use integer minor units`); };
export const mapSandboxCardMutation = (value = {}) => ({ ...value, statusLabel: statusLabel(value.status), simulated: value.simulated === true, sandboxMode: value.environment === 'SANDBOX' });
export function mapSandboxCardRecharge(value = {}) { assertMinor(value.amountMinor, 'amountMinor'); assertMinor(value.newBalanceMinor, 'newBalanceMinor'); return { ...mapSandboxCardMutation(value), amount: formatCents(value.amountMinor), newBalance: `R$ ${formatCents(value.newBalanceMinor)}` }; }
export const mapSandboxCardRequest = (value = {}) => mapSandboxCardMutation(value);
