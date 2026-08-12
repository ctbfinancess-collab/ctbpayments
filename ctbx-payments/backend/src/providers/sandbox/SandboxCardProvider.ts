import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, CardProvider } from '../ports.js';

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
  constructor(environment: string, private readonly now: () => Date = () => new Date()) {
    if (environment === 'production') throw new Error('SandboxCardProvider is forbidden in production');
  }

  private financialCard() {
    return { id: this.financialCardId, type: 'PHYSICAL', brand: 'Mastercard', lastFour: '4821', holderName: 'CLIENTE SANDBOX', expiryMonth: 8, expiryYear: 2029, status: 'ACTIVE', availableMinor: 245_080, currency: 'BRL' };
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
    return { id: 'sbx_top_K8m4P2', type: 'TRANSPORT', brand: 'TOP', lastFour: '9073', holderName: 'CLIENTE SANDBOX', status: 'ACTIVE', balanceMinor: 4_820, currency: 'BRL', updatedAt: this.now().toISOString() };
  }
  private receipt(transaction: CardTransaction, requestId: string) {
    return { id: `sbx_cr_${transaction.id.slice(-4)}`, operationId: `sbx_cop_${transaction.id.slice(-4)}`, cardId: transaction.cardId, transactionId: transaction.id, occurredAt: transaction.occurredAt, direction: transaction.direction, merchantName: transaction.merchantName, amountMinor: transaction.amountMinor, currency: transaction.currency, status: transaction.status, authorizationCodeMasked: transaction.authorizationCodeMasked, requestId };
  }
}
