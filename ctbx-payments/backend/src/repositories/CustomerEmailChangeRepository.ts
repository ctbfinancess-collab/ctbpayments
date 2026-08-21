import { desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { customerEmailChanges } from '../db/schema/index.js';

export interface CustomerEmailChangeRecord {
  id: string;
  customerId: string;
  newEmail: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface CreateCustomerEmailChangeInput {
  customerId: string;
  newEmail: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CustomerEmailChangeRepository {
  create(input: CreateCustomerEmailChangeInput): Promise<CustomerEmailChangeRecord>;
  findByTokenHash(tokenHash: string): Promise<CustomerEmailChangeRecord | undefined>;
  markConsumed(tokenHash: string, consumedAt: Date): Promise<void>;
  // Usado pelo cooldown do pedido — o mais recente emitido pra essa
  // conta, consumido ou não.
  findLatestByCustomer(customerId: string): Promise<CustomerEmailChangeRecord | undefined>;
}

export class PostgresCustomerEmailChangeRepository implements CustomerEmailChangeRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateCustomerEmailChangeInput): Promise<CustomerEmailChangeRecord> {
    const [row] = await this.db.insert(customerEmailChanges).values(input).returning();
    if (!row) throw new Error('Failed to create customer email change');
    return row as CustomerEmailChangeRecord;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerEmailChangeRecord | undefined> {
    const [row] = await this.db.select().from(customerEmailChanges).where(eq(customerEmailChanges.tokenHash, tokenHash)).limit(1);
    return row as CustomerEmailChangeRecord | undefined;
  }

  async markConsumed(tokenHash: string, consumedAt: Date): Promise<void> {
    await this.db.update(customerEmailChanges).set({ consumedAt }).where(eq(customerEmailChanges.tokenHash, tokenHash));
  }

  async findLatestByCustomer(customerId: string): Promise<CustomerEmailChangeRecord | undefined> {
    const [row] = await this.db.select().from(customerEmailChanges)
      .where(eq(customerEmailChanges.customerId, customerId))
      .orderBy(desc(customerEmailChanges.createdAt)).limit(1);
    return row as CustomerEmailChangeRecord | undefined;
  }
}
