import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxTransportCards } from '../db/schema/index.js';

export interface TransportCardRecord {
  id: string; accountId: string; status: string; brand: string; lastFour: string; holderName: string;
  balanceMinor: number; createdAt: Date; updatedAt: Date;
}

export type CreateTransportCardInput = Omit<TransportCardRecord, 'createdAt' | 'updatedAt'>;
export type UpdateTransportCardInput = Partial<Pick<TransportCardRecord, 'balanceMinor' | 'status'>>;

export interface TransportCardRepository {
  findById(id: string): Promise<TransportCardRecord | undefined>;
  create(input: CreateTransportCardInput): Promise<TransportCardRecord>;
  update(id: string, accountId: string, patch: UpdateTransportCardInput): Promise<TransportCardRecord | undefined>;
}

export class PostgresTransportCardRepository implements TransportCardRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<TransportCardRecord | undefined> {
    const [row] = await this.db.select().from(sandboxTransportCards).where(eq(sandboxTransportCards.id, id)).limit(1);
    return row;
  }

  async create(input: CreateTransportCardInput): Promise<TransportCardRecord> {
    const [row] = await this.db.insert(sandboxTransportCards).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox transport card');
    return row;
  }

  async update(id: string, accountId: string, patch: UpdateTransportCardInput): Promise<TransportCardRecord | undefined> {
    const [row] = await this.db.update(sandboxTransportCards).set({ ...patch, updatedAt: new Date() }).where(and(eq(sandboxTransportCards.id, id), eq(sandboxTransportCards.accountId, accountId))).returning();
    return row;
  }
}
