import { ApiError } from '../../errors/ApiError.js';
import type { AccountProvider, AuthContext } from '../ports.js';

const money = (amount: number) => ({ amount, currency: 'BRL' as const });
type Direction = 'CREDIT' | 'DEBIT';
type Status = 'COMPLETED' | 'SCHEDULED' | 'UNDER_REVIEW';
interface SandboxTransaction {
  id: string; occurredAt: string; type: string; direction: Direction; description: string;
  counterparty: string; amountMinor: number; currency: 'BRL'; status: Status; category: string;
  feeMinor: number; receiptAvailable: boolean; institution: string; document: string; reason?: string;
}

const shiftedIso = (now: Date, days: number, hour: number, minute = 0) => {
  const value = new Date(now);
  value.setDate(value.getDate() + days);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
};

export class SandboxAccountProvider implements AccountProvider {
  constructor(environment: string, private readonly now: () => Date = () => new Date()) {
    if (environment === 'production') throw new Error('SandboxAccountProvider is forbidden in production');
  }

  async getCurrent(context: AuthContext) {
    return context.account;
  }

  async getBalances(_context: AuthContext) {
    return {
      available: money(125_000),
      ledger: money(130_000),
      components: {
        digitalAccount: money(125_000), blocked: money(5_000), investments: money(200_000),
        cardAccount: money(25_000), credit: money(75_000), foreignCurrency: money(0),
      },
      asOf: new Date().toISOString(),
      environment: 'sandbox',
    };
  }

  private transactions(): SandboxTransaction[] {
    const now = this.now();
    return [
      { id: 'sbx_txn_a7K2mP9q', occurredAt: shiftedIso(now, 0, 14, 32), type: 'PIX_RECEIVED', direction: 'CREDIT', description: 'Pix recebido', counterparty: 'Cliente Sandbox A', amountMinor: 35_000, currency: 'BRL', status: 'COMPLETED', category: 'Pix', feeMinor: 0, receiptAvailable: true, institution: 'Banco Sandbox', document: '***.***.***-**' },
      { id: 'sbx_txn_b4N8vR1s', occurredAt: shiftedIso(now, -1, 9, 18), type: 'BILL_PAYMENT', direction: 'DEBIT', description: 'Pagamento de boleto', counterparty: 'Empresa Sandbox', amountMinor: 12_500, currency: 'BRL', status: 'COMPLETED', category: 'Pagamento', feeMinor: 0, receiptAvailable: true, institution: 'Banco Emissor Sandbox', document: '**.***.***/****-**' },
      { id: 'sbx_txn_c6T3xL0w', occurredAt: shiftedIso(now, -3, 17, 5), type: 'TRANSFER_RECEIVED', direction: 'CREDIT', description: 'Transferência recebida', counterparty: 'Cliente Sandbox B', amountMinor: 120_000, currency: 'BRL', status: 'COMPLETED', category: 'Transferência', feeMinor: 0, receiptAvailable: true, institution: 'CTBX Payments Sandbox', document: '***.***.***-**' },
      { id: 'sbx_txn_d9Q5jH2e', occurredAt: shiftedIso(now, -10, 12, 40), type: 'SERVICE_PAYMENT', direction: 'DEBIT', description: 'Recarga de transporte', counterparty: 'Cartão Sandbox', amountMinor: 5_000, currency: 'BRL', status: 'COMPLETED', category: 'Serviços', feeMinor: 0, receiptAvailable: true, institution: 'CTBX Payments Sandbox', document: '—' },
      { id: 'sbx_txn_e1Y7kC4u', occurredAt: shiftedIso(now, -20, 8, 20), type: 'SALARY_CREDIT', direction: 'CREDIT', description: 'Crédito de salário', counterparty: 'Empresa Sandbox', amountMinor: 320_000, currency: 'BRL', status: 'COMPLETED', category: 'Crédito', feeMinor: 0, receiptAvailable: false, institution: 'CTBX Payments Sandbox', document: '**.***.***/****-**' },
      { id: 'sbx_txn_f8M2pS5z', occurredAt: shiftedIso(now, 3, 8), type: 'SCHEDULED_PAYMENT', direction: 'DEBIT', description: 'Pagamento agendado', counterparty: 'Concessionária Sandbox', amountMinor: 22_000, currency: 'BRL', status: 'SCHEDULED', category: 'Pagamento', feeMinor: 0, receiptAvailable: false, institution: 'Banco Emissor Sandbox', document: '**.***.***/****-**' },
      { id: 'sbx_txn_g3W9rD6n', occurredAt: shiftedIso(now, -2, 13, 20), type: 'PIX_SENT', direction: 'DEBIT', description: 'Pix em análise', counterparty: 'Favorecido Sandbox', amountMinor: 30_000, currency: 'BRL', status: 'UNDER_REVIEW', category: 'Pix', feeMinor: 0, receiptAvailable: false, institution: 'Outra Instituição Sandbox', document: '***.***.***-**', reason: 'Movimentação em análise de segurança' },
    ];
  }

  async listStatement(_context: AuthContext, input: { from?: string; to?: string; direction?: Direction } = {}) {
    return this.transactions().filter((item) => {
      if (item.status !== 'COMPLETED') return false;
      if (input.direction && item.direction !== input.direction) return false;
      const date = item.occurredAt.slice(0, 10);
      return (!input.from || date >= input.from) && (!input.to || date <= input.to);
    });
  }

  async listFutureTransactions(_context: AuthContext) {
    return this.transactions().filter((item) => item.status === 'SCHEDULED');
  }

  async listBlockedTransactions(_context: AuthContext) {
    return this.transactions().filter((item) => item.status === 'UNDER_REVIEW');
  }

  async getTransaction(_context: AuthContext, id: string) {
    const transaction = this.transactions().find((item) => item.id === id);
    if (!transaction) throw new ApiError('TRANSACTION_NOT_FOUND', 'Movimentação não encontrada.', { statusCode: 404 });
    return transaction;
  }

  async getTransactionReceipt(context: AuthContext, id: string, requestId: string) {
    const transaction = await this.getTransaction(context, id) as SandboxTransaction;
    if (!transaction.receiptAvailable || transaction.status !== 'COMPLETED') {
      throw new ApiError('RECEIPT_NOT_FOUND', 'Comprovante não encontrado.', { statusCode: 404 });
    }
    return {
      operationId: `sbx_op_${transaction.id.slice(-8)}`, transactionId: transaction.id,
      occurredAt: transaction.occurredAt, amountMinor: transaction.amountMinor, currency: transaction.currency,
      payer: transaction.direction === 'DEBIT' ? 'Conta Sandbox CTBX' : transaction.counterparty,
      payee: transaction.direction === 'DEBIT' ? transaction.counterparty : 'Conta Sandbox CTBX',
      institution: transaction.institution, status: transaction.status, requestId,
    };
  }
}
