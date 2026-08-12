import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, CardProvider } from '../ports.js';
import type { SandboxChallengeProvider } from './SandboxChallengeProvider.js';

type CardTransaction = {
  id: string; cardId: string; occurredAt: string; type: string; direction: 'CREDIT' | 'DEBIT';
  merchantName: string; description: string; amountMinor: number; currency: 'BRL';
  status: 'APPROVED' | 'COMPLETED'; authorizationCodeMasked: string; receiptAvailable: boolean;
};

const shift = (now: Date, days: number, hour: number) => {
  const value = new Date(now); value.setDate(value.getDate() + days); value.setHours(hour, 0, 0, 0); return value.toISOString();
};

export class SandboxCardProvider implements CardProvider {
  private readonly financialCardId = 'sbx_card_fin_A7k2M9';
  private status: 'PENDING_ACTIVATION' | 'ACTIVE' | 'BLOCKED' = 'PENDING_ACTIVATION';
  private availableMinor = 245_080;
  private transportBalanceMinor = 4_820;
  private passwordChanged = false;
  private readonly idempotency = new Map<string, { hash: string; result: Record<string, unknown> }>();
  constructor(environment: string, private readonly challenges?: SandboxChallengeProvider, private readonly now: () => Date = () => new Date()) {
    if (environment === 'production') throw new Error('SandboxCardProvider is forbidden in production');
  }

  private financialCard() {
    return { id: this.financialCardId, type: 'PHYSICAL', brand: 'Mastercard', lastFour: '4821', holderName: 'CLIENTE SANDBOX', expiryMonth: 8, expiryYear: 2029, status: this.status, availableMinor: this.availableMinor, currency: 'BRL' };
  }

  private transactions(): CardTransaction[] {
    const now = this.now();
    return [
      { id: 'sbx_ctx_A1p9', cardId: this.financialCardId, occurredAt: shift(now, 0, 10), type: 'PURCHASE', direction: 'DEBIT', merchantName: 'Mercado Sandbox', description: 'Compra no débito', amountMinor: 8_640, currency: 'BRL', status: 'APPROVED', authorizationCodeMasked: 'SBX-**01', receiptAvailable: true },
      { id: 'sbx_ctx_B2q8', cardId: this.financialCardId, occurredAt: shift(now, -1, 15), type: 'REVERSAL', direction: 'CREDIT', merchantName: 'Loja Sandbox', description: 'Estorno de compra', amountMinor: 3_000, currency: 'BRL', status: 'COMPLETED', authorizationCodeMasked: 'SBX-**02', receiptAvailable: true },
      { id: 'sbx_ctx_C3r7', cardId: this.financialCardId, occurredAt: shift(now, -4, 19), type: 'PURCHASE', direction: 'DEBIT', merchantName: 'Farmácia Sandbox', description: 'Compra aprovada', amountMinor: 4_290, currency: 'BRL', status: 'APPROVED', authorizationCodeMasked: 'SBX-**03', receiptAvailable: true },
      { id: 'sbx_ctx_D4s6', cardId: this.financialCardId, occurredAt: shift(now, -12, 12), type: 'PURCHASE', direction: 'DEBIT', merchantName: 'Restaurante Sandbox', description: 'Compra aprovada', amountMinor: 12_750, currency: 'BRL', status: 'APPROVED', authorizationCodeMasked: 'SBX-**04', receiptAvailable: true },
      { id: 'sbx_ctx_E5t5', cardId: this.financialCardId, occurredAt: shift(now, -25, 8), type: 'PURCHASE', direction: 'DEBIT', merchantName: 'Mobilidade Sandbox', description: 'Compra aprovada', amountMinor: 2_250, currency: 'BRL', status: 'APPROVED', authorizationCodeMasked: 'SBX-**05', receiptAvailable: false },
    ];
  }

  private requireCard(cardId: string) {
    if (cardId !== this.financialCardId) throw new ApiError('CARD_NOT_FOUND', 'Cartão não encontrado.', { statusCode: 404 });
    return this.financialCard();
  }

  async list(_context: AuthContext) { return [this.financialCard()]; }
  async get(_context: AuthContext, cardId: string) { return this.requireCard(cardId); }
  async listTransactions(_context: AuthContext, cardId: string) { this.requireCard(cardId); return this.transactions(); }
  async getTransaction(_context: AuthContext, cardId: string, transactionId: string) {
    this.requireCard(cardId);
    const transaction = this.transactions().find((item) => item.id === transactionId);
    if (!transaction) throw new ApiError('CARD_TRANSACTION_NOT_FOUND', 'Transação do cartão não encontrada.', { statusCode: 404 });
    return transaction;
  }
  async listReceipts(context: AuthContext, cardId: string) {
    const transactions = await this.listTransactions(context, cardId) as CardTransaction[];
    return transactions.filter((item) => item.receiptAvailable).map((item) => this.receipt(item, `sbx_req_${item.id.slice(-4)}`));
  }
  async getTransactionReceipt(context: AuthContext, cardId: string, transactionId: string, requestId: string) {
    const transaction = await this.getTransaction(context, cardId, transactionId) as CardTransaction;
    if (!transaction.receiptAvailable) throw new ApiError('CARD_RECEIPT_NOT_FOUND', 'Comprovante do cartão não encontrado.', { statusCode: 404 });
    return this.receipt(transaction, requestId);
  }
  async getTransportCard(_context: AuthContext) {
    return { id: 'sbx_top_K8m4P2', type: 'TRANSPORT', brand: 'TOP', lastFour: '9073', holderName: 'CLIENTE SANDBOX', status: 'ACTIVE', balanceMinor: this.transportBalanceMinor, currency: 'BRL', updatedAt: this.now().toISOString() };
  }
  private receipt(transaction: CardTransaction, requestId: string) {
    return { id: `sbx_cr_${transaction.id.slice(-4)}`, operationId: `sbx_cop_${transaction.id.slice(-4)}`, cardId: transaction.cardId, transactionId: transaction.id, occurredAt: transaction.occurredAt, direction: transaction.direction, merchantName: transaction.merchantName, amountMinor: transaction.amountMinor, currency: transaction.currency, status: transaction.status, authorizationCodeMasked: transaction.authorizationCodeMasked, requestId };
  }

  private once(context: AuthContext, route: string, key: string, raw: unknown, factory: () => Record<string, unknown>) {
    const scope = `${context.accountId}:${route}:${key}`; const hash = createHash('sha256').update(JSON.stringify(raw)).digest('hex'); const existing = this.idempotency.get(scope);
    if (existing) { if (existing.hash !== hash) throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key reutilizada com payload diferente.', { statusCode: 409 }); return existing.result; }
    const result = factory(); this.idempotency.set(scope, { hash, result }); return result;
  }
  async createActivationChallenge(context: AuthContext, cardId: string) { this.requireCard(cardId); return this.challenges!.create(context, { purpose: 'CARD_ACTIVATION', operationId: cardId, type: 'OTP' }); }
  async activate(context: AuthContext, cardId: string, raw: unknown, key: string, requestId: string) { this.requireCard(cardId); return this.once(context, 'activate', key, raw, () => { if (this.status === 'ACTIVE') throw new ApiError('CARD_ALREADY_ACTIVE', 'Cartão já está ativo.', { statusCode: 409 }); if (this.status !== 'PENDING_ACTIVATION') throw new ApiError('CARD_INVALID_STATE', 'Estado do cartão inválido.', { statusCode: 409 }); const challengeId = (raw as { challengeId?: string }).challengeId; if (!this.challenges?.isVerified(context, challengeId ?? '', cardId)) throw new ApiError('AUTH_CHALLENGE_INVALID', 'Challenge de ativação inválido.', { statusCode: 401 }); this.status = 'ACTIVE'; return { cardId, status: this.status, activatedAt: this.now().toISOString(), environment: 'SANDBOX', simulated: true, requestId }; }); }
  async setBlocked(context: AuthContext, cardId: string, blocked: boolean, key: string, requestId: string) { this.requireCard(cardId); return this.once(context, blocked ? 'block' : 'unblock', key, {}, () => { const expected = blocked ? 'ACTIVE' : 'BLOCKED'; if (this.status !== expected) throw new ApiError('CARD_INVALID_STATE', 'Transição de estado inválida.', { statusCode: 409 }); this.status = blocked ? 'BLOCKED' : 'ACTIVE'; return { cardId, status: this.status, changedAt: this.now().toISOString(), simulated: true, environment: 'SANDBOX', requestId }; }); }
  async changePassword(context: AuthContext, cardId: string, raw: unknown, key: string, requestId: string) { this.requireCard(cardId); return this.once(context, 'password', key, raw, () => { const password = String((raw as { password?: string }).password ?? ''); if (!/^\d{4}$/.test(password)) throw new ApiError('CARD_PASSWORD_INVALID', 'Senha deve possuir quatro dígitos.', { statusCode: 422 }); this.passwordChanged = true; return { cardId, passwordChanged: this.passwordChanged, changedAt: this.now().toISOString(), simulated: true, environment: 'SANDBOX', requestId }; }); }
  async recharge(context: AuthContext, cardId: string, raw: unknown, key: string, requestId: string) { this.requireCard(cardId); return this.once(context, 'recharge', key, raw, () => { const { amountMinor, currency } = raw as { amountMinor?: number; currency?: string }; if (!Number.isInteger(amountMinor) || (amountMinor ?? 0) <= 0 || (amountMinor ?? 0) > 100_000 || currency !== 'BRL') throw new ApiError('CARD_RECHARGE_INVALID', 'Recarga SANDBOX inválida.', { statusCode: 422 }); this.availableMinor += amountMinor!; return { rechargeId: `sbx_card_recharge_${randomUUID()}`, cardId, amountMinor, newBalanceMinor: this.availableMinor, currency: 'BRL', status: 'COMPLETED', simulated: true, environment: 'SANDBOX', createdAt: this.now().toISOString(), requestId }; }); }
  async requestCard(context: AuthContext, raw: unknown, key: string, requestId: string) { return this.once(context, 'request', key, raw, () => { const { selectedColor, termsAccepted } = raw as { selectedColor?: string; termsAccepted?: boolean }; if (!['Azul', 'Roxo', 'Preto'].includes(selectedColor ?? '') || termsAccepted !== true) throw new ApiError('CARD_REQUEST_INVALID', 'Solicitação SANDBOX inválida.', { statusCode: 422 }); return { requestIdPublic: `sbx_card_request_${randomUUID()}`, status: 'RECEIVED', selectedColor, simulated: true, environment: 'SANDBOX', createdAt: this.now().toISOString(), requestId }; }); }
  async rechargeTransport(context: AuthContext, raw: unknown, key: string, requestId: string) { return this.once(context, 'top-recharge', key, raw, () => { const { amountMinor, currency } = raw as { amountMinor?: number; currency?: string }; if (!Number.isInteger(amountMinor) || (amountMinor ?? 0) <= 0 || (amountMinor ?? 0) > 50_000 || currency !== 'BRL') throw new ApiError('CARD_RECHARGE_INVALID', 'Recarga TOP SANDBOX inválida.', { statusCode: 422 }); this.transportBalanceMinor += amountMinor!; return { rechargeId: `sbx_top_recharge_${randomUUID()}`, amountMinor, newBalanceMinor: this.transportBalanceMinor, currency: 'BRL', status: 'COMPLETED', simulated: true, environment: 'SANDBOX', createdAt: this.now().toISOString(), requestId }; }); }
}
