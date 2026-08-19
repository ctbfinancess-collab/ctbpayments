import { ApiError } from '../../errors/ApiError.js';
import type { AccountProvider, AuthContext } from '../ports.js';
import type { SandboxAccountRepository, SandboxAccountTransactionRecord } from '../../repositories/SandboxAccountRepository.js';
import { ensureSandboxAccount } from './ensureSandboxAccount.js';

const money = (amount: number) => ({ amount, currency: 'BRL' as const });
type Direction = 'CREDIT' | 'DEBIT';

function toApiShape(row: SandboxAccountTransactionRecord) {
  return {
    id: row.id, occurredAt: row.occurredAt.toISOString(), type: row.type, direction: row.direction,
    description: row.description, counterparty: row.counterparty, amountMinor: row.amountMinor, currency: row.currency,
    status: row.status, category: row.category, feeMinor: row.feeMinor, receiptAvailable: row.receiptAvailable,
    institution: row.institution, document: row.document, ...(row.reason ? { reason: row.reason } : {}),
  };
}

// Etapa 2 da consolidação de arquitetura: mesma interface AccountProvider/
// mesmo contrato de resposta de sempre — só troca ONDE conta/saldo/extrato
// ficam guardados, de campos de instância pra um SandboxAccountRepository
// injetado (Postgres real, ou InMemorySandboxAccountRepository como
// fallback/testes — mesmo padrão da Etapa 1).
export class SandboxAccountProvider implements AccountProvider {
  constructor(environment: string, private readonly repository: SandboxAccountRepository, private readonly now: () => Date = () => new Date()) {
    if (environment === 'production') throw new Error('SandboxAccountProvider is forbidden in production');
  }

  // Cria a conta (+ extrato inicial) na primeira vez que essa accountId é
  // vista — nas chamadas seguintes só lê o que já está persistido.
  // Compartilhado com PIX/Transferência/Pagamento (Etapa 3), que também
  // precisam ler o saldo real antes de validar uma operação.
  private async ensureAccount(context: AuthContext) {
    return ensureSandboxAccount(this.repository, context, this.now);
  }

  async getCurrent(context: AuthContext) {
    return context.account;
  }

  async getBalances(context: AuthContext) {
    const account = await this.ensureAccount(context);
    return {
      available: money(account.availableMinor),
      ledger: money(account.ledgerMinor),
      components: {
        digitalAccount: money(account.digitalAccountMinor), blocked: money(account.blockedMinor), investments: money(account.investmentsMinor),
        cardAccount: money(account.cardAccountMinor), credit: money(account.creditMinor), foreignCurrency: money(account.foreignCurrencyMinor),
      },
      asOf: new Date().toISOString(),
      environment: 'sandbox',
    };
  }

  async listStatement(context: AuthContext, input: { from?: string; to?: string; direction?: Direction } = {}) {
    await this.ensureAccount(context);
    const rows = await this.repository.listTransactions(context.accountId);
    return rows.filter((item) => {
      if (item.status !== 'COMPLETED') return false;
      if (input.direction && item.direction !== input.direction) return false;
      const date = item.occurredAt.toISOString().slice(0, 10);
      return (!input.from || date >= input.from) && (!input.to || date <= input.to);
    }).map(toApiShape);
  }

  async listFutureTransactions(context: AuthContext) {
    await this.ensureAccount(context);
    const rows = await this.repository.listTransactions(context.accountId);
    return rows.filter((item) => item.status === 'SCHEDULED').map(toApiShape);
  }

  async listBlockedTransactions(context: AuthContext) {
    await this.ensureAccount(context);
    const rows = await this.repository.listTransactions(context.accountId);
    return rows.filter((item) => item.status === 'UNDER_REVIEW').map(toApiShape);
  }

  async getTransaction(context: AuthContext, id: string) {
    await this.ensureAccount(context);
    const transaction = await this.repository.findTransaction(context.accountId, id);
    if (!transaction) throw new ApiError('TRANSACTION_NOT_FOUND', 'Movimentação não encontrada.', { statusCode: 404 });
    return toApiShape(transaction);
  }

  async getTransactionReceipt(context: AuthContext, id: string, requestId: string) {
    await this.ensureAccount(context);
    const transaction = await this.repository.findTransaction(context.accountId, id);
    if (!transaction || !transaction.receiptAvailable || transaction.status !== 'COMPLETED') {
      throw new ApiError('RECEIPT_NOT_FOUND', 'Comprovante não encontrado.', { statusCode: 404 });
    }
    return {
      operationId: `sbx_op_${transaction.id.slice(-8)}`, transactionId: transaction.id,
      occurredAt: transaction.occurredAt.toISOString(), amountMinor: transaction.amountMinor, currency: transaction.currency,
      payer: transaction.direction === 'DEBIT' ? 'Conta Sandbox CTBX' : transaction.counterparty,
      payee: transaction.direction === 'DEBIT' ? transaction.counterparty : 'Conta Sandbox CTBX',
      institution: transaction.institution, status: transaction.status, requestId,
    };
  }
}
