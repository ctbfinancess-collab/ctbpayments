import { desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { customerEmailVerifications } from '../db/schema/index.js';

export interface CustomerEmailVerificationRecord {
  id: string;
  customerId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface CreateCustomerEmailVerificationInput {
  customerId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CustomerEmailVerificationRepository {
  create(input: CreateCustomerEmailVerificationInput): Promise<CustomerEmailVerificationRecord>;
  findByTokenHash(tokenHash: string): Promise<CustomerEmailVerificationRecord | undefined>;
  markConsumed(tokenHash: string, consumedAt: Date): Promise<void>;
  // Usado pelo cooldown do reenvio — o mais recente emitido pra essa
  // conta, consumido ou não.
  findLatestByCustomer(customerId: string): Promise<CustomerEmailVerificationRecord | undefined>;
}

export class PostgresCustomerEmailVerificationRepository implements CustomerEmailVerificationRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateCustomerEmailVerificationInput): Promise<CustomerEmailVerificationRecord> {
    const [row] = await this.db.insert(customerEmailVerifications).values(input).returning();
    if (!row) throw new Error('Failed to create customer email verification');
    return row as CustomerEmailVerificationRecord;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerEmailVerificationRecord | undefined> {
    const [row] = await this.db.select().from(customerEmailVerifications).where(eq(customerEmailVerifications.tokenHash, tokenHash)).limit(1);
    return row as CustomerEmailVerificationRecord | undefined;
  }

  async markConsumed(tokenHash: string, consumedAt: Date): Promise<void> {
    await this.db.update(customerEmailVerifications).set({ consumedAt }).where(eq(customerEmailVerifications.tokenHash, tokenHash));
  }

  async findLatestByCustomer(customerId: string): Promise<CustomerEmailVerificationRecord | undefined> {
    const [row] = await this.db.select().from(customerEmailVerifications)
      .where(eq(customerEmailVerifications.customerId, customerId))
      .orderBy(desc(customerEmailVerifications.createdAt)).limit(1);
    return row as CustomerEmailVerificationRecord | undefined;
  }
}
