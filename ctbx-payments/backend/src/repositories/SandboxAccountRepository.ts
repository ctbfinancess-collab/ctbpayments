import { desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxAccountTransactions, sandboxAccounts } from '../db/schema/index.js';

export type TransactionDirection = 'CREDIT' | 'DEBIT';
export type TransactionStatus = 'COMPLETED' | 'SCHEDULED' | 'UNDER_REVIEW';

export interface SandboxAccountRecord {
  id: string; userId: string; availableMinor: number; ledgerMinor: number; digitalAccountMinor: number;
  blockedMinor: number; investmentsMinor: number; cardAccountMinor: number; creditMinor: number;
  foreignCurrencyMinor: number; currency: string; createdAt: Date; updatedAt: Date;
}

export interface SandboxAccountTransactionRecord {
  id: string; accountId: string; occurredAt: Date; type: string; direction: TransactionDirection;
  description: string; counterparty: string; amountMinor: number; currency: string; status: TransactionStatus;
  category: string; feeMinor: number; receiptAvailable: boolean; institution: string; document: string;
  reason: string | null; createdAt: Date;
}

export type CreateSandboxAccountInput = Omit<SandboxAccountRecord, 'createdAt' | 'updatedAt'>;
export type CreateSandboxAccountTransactionInput = Omit<SandboxAccountTransactionRecord, 'createdAt'>;
export type UpdateSandboxAccountBalancesInput = Partial<Pick<SandboxAccountRecord,
  'availableMinor' | 'ledgerMinor' | 'digitalAccountMinor' | 'blockedMinor' | 'investmentsMinor' | 'cardAccountMinor' | 'creditMinor' | 'foreignCurrencyMinor'>>;

// Interface própria — mesmo motivo de SandboxSessionRepository (Etapa 1):
// deixa SandboxAccountProvider.ts (a "camada provider/adapter") indiferente
// a qual implementação está por trás. Real (Postgres) aqui,
// InMemorySandboxAccountRepository como fallback/testes.
export interface SandboxAccountRepository {
  findById(id: string): Promise<SandboxAccountRecord | undefined>;
  create(input: CreateSandboxAccountInput): Promise<SandboxAccountRecord>;
  updateBalances(id: string, patch: UpdateSandboxAccountBalancesInput): Promise<SandboxAccountRecord | undefined>;
  listTransactions(accountId: string): Promise<SandboxAccountTransactionRecord[]>;
  findTransaction(accountId: string, id: string): Promise<SandboxAccountTransactionRecord | undefined>;
  // Genérico de propósito — é o que PIX/transferências/pagamentos vão
  // reaproveitar nas próximas etapas pra lançar movimentações no mesmo
  // extrato, sem precisar de tabela própria por módulo.
  createTransaction(input: CreateSandboxAccountTransactionInput): Promise<SandboxAccountTransactionRecord>;
  createTransactions(inputs: CreateSandboxAccountTransactionInput[]): Promise<void>;
}

export class PostgresSandboxAccountRepository implements SandboxAccountRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<SandboxAccountRecord | undefined> {
    const [row] = await this.db.select().from(sandboxAccounts).where(eq(sandboxAccounts.id, id)).limit(1);
    return row;
  }

  async create(input: CreateSandboxAccountInput): Promise<SandboxAccountRecord> {
    const [row] = await this.db.insert(sandboxAccounts).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox account');
    return row;
  }

  async updateBalances(id: string, patch: UpdateSandboxAccountBalancesInput): Promise<SandboxAccountRecord | undefined> {
    const [row] = await this.db.update(sandboxAccounts).set({ ...patch, updatedAt: new Date() }).where(eq(sandboxAccounts.id, id)).returning();
    return row;
  }

  async listTransactions(accountId: string): Promise<SandboxAccountTransactionRecord[]> {
    return (await this.db.select().from(sandboxAccountTransactions).where(eq(sandboxAccountTransactions.accountId, accountId)).orderBy(desc(sandboxAccountTransactions.occurredAt))) as SandboxAccountTransactionRecord[];
  }

  async findTransaction(accountId: string, id: string): Promise<SandboxAccountTransactionRecord | undefined> {
    const [row] = await this.db.select().from(sandboxAccountTransactions).where(eq(sandboxAccountTransactions.id, id)).limit(1);
    return row && row.accountId === accountId ? (row as SandboxAccountTransactionRecord) : undefined;
  }

  async createTransaction(input: CreateSandboxAccountTransactionInput): Promise<SandboxAccountTransactionRecord> {
    const [row] = await this.db.insert(sandboxAccountTransactions).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox account transaction');
    return row as SandboxAccountTransactionRecord;
  }

  async createTransactions(inputs: CreateSandboxAccountTransactionInput[]): Promise<void> {
    if (!inputs.length) return;
    await this.db.insert(sandboxAccountTransactions).values(inputs);
  }
}
