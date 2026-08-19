import type { OperationKind, RecordOperationInput, SandboxLedgerRepository, SandboxOperationRecord } from '../../repositories/SandboxLedgerRepository.js';
import type { InMemorySandboxAccountRepository } from './InMemorySandboxAccountRepository.js';

// Fallback/testes — mesma interface do repositório real (Postgres), mas
// opera sobre a MESMA instância de InMemorySandboxAccountRepository usada
// pelo SandboxAccountProvider (Etapa 2), pra manter só uma fonte de
// verdade pro saldo mesmo em memória. "Atomicidade" aqui é grátis (single
// process, sem I/O entre os passos) — a garantia real é testada contra o
// repositório Postgres (transação de verdade), não aqui.
export class InMemorySandboxLedgerRepository implements SandboxLedgerRepository {
  private readonly operations = new Map<string, SandboxOperationRecord>();

  constructor(private readonly accounts: InMemorySandboxAccountRepository) {}

  async recordOperation(input: RecordOperationInput): Promise<SandboxOperationRecord> {
    // Mesma checagem que o índice único faz no Postgres (Etapa 5.1) — e no
    // MESMO lugar (antes de tocar o saldo): se a chave já existe, a
    // "transação" inteira é abortada, nada fica aplicado pela metade.
    if (input.idempotencyKey && [...this.operations.values()].some((row) => row.accountId === input.accountId && row.kind === input.kind && row.idempotencyKey === input.idempotencyKey)) {
      throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
    }
    let accountTransactionId: string | null = null;
    if (input.ledgerEntry) {
      const account = await this.accounts.findById(input.accountId);
      if (!account) throw new Error('sandbox account not found for ledger operation');
      const currentValue = account[input.ledgerEntry.balanceField];
      const nextValue = currentValue + input.ledgerEntry.deltaMinor;
      if (nextValue < 0) throw new Error('INSUFFICIENT_FUNDS');
      await this.accounts.updateBalances(input.accountId, { [input.ledgerEntry.balanceField]: nextValue });
      const transactionRow = await this.accounts.createTransaction(input.ledgerEntry.transaction);
      accountTransactionId = transactionRow.id;
    }
    const record: SandboxOperationRecord = {
      id: input.operationId, accountId: input.accountId, kind: input.kind, status: input.status, amountMinor: input.amountMinor,
      currency: 'BRL', scheduledFor: input.scheduledFor ?? null, accountTransactionId, details: input.details,
      idempotencyKey: input.idempotencyKey ?? null, createdAt: new Date(),
    };
    this.operations.set(record.id, record);
    return record;
  }

  async findById(id: string, accountId: string): Promise<SandboxOperationRecord | undefined> {
    const row = this.operations.get(id);
    return row && row.accountId === accountId ? row : undefined;
  }

  async listByAccountAndKind(accountId: string, kind: OperationKind): Promise<SandboxOperationRecord[]> {
    return [...this.operations.values()].filter((row) => row.accountId === accountId && row.kind === kind).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByIdempotencyKey(accountId: string, kind: OperationKind, idempotencyKey: string): Promise<SandboxOperationRecord | undefined> {
    return [...this.operations.values()].find((row) => row.accountId === accountId && row.kind === kind && row.idempotencyKey === idempotencyKey);
  }
}
