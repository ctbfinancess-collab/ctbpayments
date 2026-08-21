import type {
  CreateSandboxAccountInput, CreateSandboxAccountTransactionInput, SandboxAccountRecord,
  SandboxAccountRepository, SandboxAccountTransactionRecord, UpdateSandboxAccountBalancesInput,
} from '../../repositories/SandboxAccountRepository.js';

// Mesma interface do repositório real (Postgres) — mesmo papel de
// InMemorySandboxSessionRepository (Etapa 1): usada nos testes e como
// fallback automático em app.ts quando DATABASE_URL não está configurado,
// pra conta/extrato sandbox continuarem funcionando como sempre
// funcionaram (só sem sobreviver a restart, igual antes desta etapa).
export class InMemorySandboxAccountRepository implements SandboxAccountRepository {
  private readonly accounts = new Map<string, SandboxAccountRecord>();
  private readonly transactions = new Map<string, SandboxAccountTransactionRecord>();

  async findById(id: string): Promise<SandboxAccountRecord | undefined> {
    return this.accounts.get(id);
  }

  async create(input: CreateSandboxAccountInput): Promise<SandboxAccountRecord> {
    const now = new Date();
    const record: SandboxAccountRecord = { ...input, createdAt: now, updatedAt: now };
    this.accounts.set(record.id, record);
    return record;
  }

  async updateBalances(id: string, patch: UpdateSandboxAccountBalancesInput): Promise<SandboxAccountRecord | undefined> {
    const record = this.accounts.get(id);
    if (!record) return undefined;
    const next = { ...record, ...patch, updatedAt: new Date() };
    this.accounts.set(id, next);
    return next;
  }

  async listTransactions(accountId: string): Promise<SandboxAccountTransactionRecord[]> {
    return [...this.transactions.values()].filter((row) => row.accountId === accountId).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  async findTransaction(accountId: string, id: string): Promise<SandboxAccountTransactionRecord | undefined> {
    const row = this.transactions.get(id);
    return row && row.accountId === accountId ? row : undefined;
  }

  async createTransaction(input: CreateSandboxAccountTransactionInput): Promise<SandboxAccountTransactionRecord> {
    const record: SandboxAccountTransactionRecord = { ...input, createdAt: new Date() };
    this.transactions.set(record.id, record);
    return record;
  }

  async createTransactions(inputs: CreateSandboxAccountTransactionInput[]): Promise<void> {
    for (const input of inputs) await this.createTransaction(input);
  }
}
