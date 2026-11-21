import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { customerPasswordResets } from '../db/schema/index.js';

export interface CustomerPasswordResetRecord {
  id: string;
  customerId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface CreateCustomerPasswordResetInput {
  customerId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CustomerPasswordResetRepository {
  create(input: CreateCustomerPasswordResetInput): Promise<CustomerPasswordResetRecord>;
  findByTokenHash(tokenHash: string): Promise<CustomerPasswordResetRecord | undefined>;
  // Atômico: só marca se ainda não foi usado. Devolve true se ESTA
  // chamada consumiu o token (false = já usado, mesmo em pedidos simultâneos).
  markConsumed(tokenHash: string, consumedAt: Date): Promise<boolean>;
  // Usado pelo cooldown do pedido de reset — o mais recente emitido pra
  // essa conta, consumido ou não.
  findLatestByCustomer(customerId: string): Promise<CustomerPasswordResetRecord | undefined>;
}

export class PostgresCustomerPasswordResetRepository implements CustomerPasswordResetRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateCustomerPasswordResetInput): Promise<CustomerPasswordResetRecord> {
    const [row] = await this.db.insert(customerPasswordResets).values(input).returning();
    if (!row) throw new Error('Failed to create customer password reset');
    return row as CustomerPasswordResetRecord;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerPasswordResetRecord | undefined> {
    const [row] = await this.db.select().from(customerPasswordResets).where(eq(customerPasswordResets.tokenHash, tokenHash)).limit(1);
    return row as CustomerPasswordResetRecord | undefined;
  }

  async markConsumed(tokenHash: string, consumedAt: Date): Promise<boolean> {
    const rows = await this.db.update(customerPasswordResets).set({ consumedAt })
      .where(and(eq(customerPasswordResets.tokenHash, tokenHash), isNull(customerPasswordResets.consumedAt)))
      .returning({ id: customerPasswordResets.id });
    return rows.length > 0;
  }

  async findLatestByCustomer(customerId: string): Promise<CustomerPasswordResetRecord | undefined> {
    const [row] = await this.db.select().from(customerPasswordResets)
      .where(eq(customerPasswordResets.customerId, customerId))
      .orderBy(desc(customerPasswordResets.createdAt)).limit(1);
    return row as CustomerPasswordResetRecord | undefined;
  }
}
