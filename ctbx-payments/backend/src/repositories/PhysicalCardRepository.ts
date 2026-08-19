import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxPhysicalCardTransactions, sandboxPhysicalCards } from '../db/schema/index.js';

export type PhysicalCardStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'BLOCKED';

export interface PhysicalCardRecord {
  id: string; accountId: string; status: PhysicalCardStatus; brand: string; lastFour: string; holderName: string;
  expiryMonth: number; expiryYear: number; availableMinor: number; passwordChanged: boolean; createdAt: Date; updatedAt: Date;
}

export interface CreatePhysicalCardInput {
  id: string; accountId: string; status: PhysicalCardStatus; brand: string; lastFour: string; holderName: string;
  expiryMonth: number; expiryYear: number; availableMinor: number; passwordChanged: boolean;
}

export type UpdatePhysicalCardInput = Partial<Pick<PhysicalCardRecord, 'status' | 'availableMinor' | 'passwordChanged'>>;

export interface PhysicalCardTransactionRecord {
  id: string; cardId: string; occurredAt: Date; type: string; direction: 'CREDIT' | 'DEBIT'; merchantName: string;
  description: string; amountMinor: number; currency: string; status: string; authorizationCodeMasked: string;
  receiptAvailable: boolean; createdAt: Date;
}

export type CreatePhysicalCardTransactionInput = Omit<PhysicalCardTransactionRecord, 'createdAt'>;

// Interface própria — mesmo motivo dos demais repositórios desta
// consolidação (Etapas 1-3): SandboxCardProvider fica indiferente a qual
// implementação está por trás. Real (Postgres) aqui,
// InMemoryPhysicalCardRepository como fallback/testes.
export interface PhysicalCardRepository {
  findById(id: string): Promise<PhysicalCardRecord | undefined>;
  create(input: CreatePhysicalCardInput): Promise<PhysicalCardRecord>;
  update(id: string, accountId: string, patch: UpdatePhysicalCardInput): Promise<PhysicalCardRecord | undefined>;
  listTransactions(cardId: string): Promise<PhysicalCardTransactionRecord[]>;
  createTransactions(inputs: CreatePhysicalCardTransactionInput[]): Promise<void>;
}

export class PostgresPhysicalCardRepository implements PhysicalCardRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<PhysicalCardRecord | undefined> {
    const [row] = await this.db.select().from(sandboxPhysicalCards).where(eq(sandboxPhysicalCards.id, id)).limit(1);
    return row as PhysicalCardRecord | undefined;
  }

  async create(input: CreatePhysicalCardInput): Promise<PhysicalCardRecord> {
    const [row] = await this.db.insert(sandboxPhysicalCards).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox physical card');
    return row as PhysicalCardRecord;
  }

  async update(id: string, accountId: string, patch: UpdatePhysicalCardInput): Promise<PhysicalCardRecord | undefined> {
    const [row] = await this.db.update(sandboxPhysicalCards).set({ ...patch, updatedAt: new Date() }).where(and(eq(sandboxPhysicalCards.id, id), eq(sandboxPhysicalCards.accountId, accountId))).returning();
    return row as PhysicalCardRecord | undefined;
  }

  async listTransactions(cardId: string): Promise<PhysicalCardTransactionRecord[]> {
    return (await this.db.select().from(sandboxPhysicalCardTransactions).where(eq(sandboxPhysicalCardTransactions.cardId, cardId))) as PhysicalCardTransactionRecord[];
  }

  async createTransactions(inputs: CreatePhysicalCardTransactionInput[]): Promise<void> {
    if (!inputs.length) return;
    await this.db.insert(sandboxPhysicalCardTransactions).values(inputs);
  }
}
