import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { customerSessions } from '../db/schema/index.js';

export interface CustomerSessionRecord {
  id: string;
  customerId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CreateCustomerSessionInput {
  customerId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CustomerSessionRepository {
  create(input: CreateCustomerSessionInput): Promise<CustomerSessionRecord>;
  findByTokenHash(tokenHash: string): Promise<CustomerSessionRecord | undefined>;
  revoke(tokenHash: string): Promise<void>;
  // Usado pela recuperação de senha — ao trocar a senha, toda sessão
  // ativa daquela conta deixa de valer (se alguém pediu o reset, uma
  // sessão antiga não deve continuar de pé).
  revokeAllForCustomer(customerId: string): Promise<void>;
}

export class PostgresCustomerSessionRepository implements CustomerSessionRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateCustomerSessionInput): Promise<CustomerSessionRecord> {
    const [row] = await this.db.insert(customerSessions).values(input).returning();
    if (!row) throw new Error('Failed to create customer session');
    return row as CustomerSessionRecord;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerSessionRecord | undefined> {
    const [row] = await this.db.select().from(customerSessions).where(eq(customerSessions.tokenHash, tokenHash)).limit(1);
    return row as CustomerSessionRecord | undefined;
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.db.update(customerSessions).set({ revokedAt: new Date() }).where(eq(customerSessions.tokenHash, tokenHash));
  }

  async revokeAllForCustomer(customerId: string): Promise<void> {
    await this.db.update(customerSessions).set({ revokedAt: new Date() })
      .where(and(eq(customerSessions.customerId, customerId), isNull(customerSessions.revokedAt)));
  }
}
