import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { customers } from '../db/schema/index.js';

export type CustomerType = 'PF' | 'PJ';
export type CustomerStatus = 'ACTIVE' | 'BLOCKED';

export interface CustomerRecord {
  id: string;
  type: CustomerType;
  name: string;
  document: string;
  email: string;
  emailVerifiedAt: Date | null;
  phone: string;
  passwordHash: string;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerInput {
  type: CustomerType;
  name: string;
  document: string;
  email: string;
  phone: string;
  passwordHash: string;
}

// Interface própria — mesmo motivo de sempre neste backend (Postgres real
// e InMemoryCustomerRepository implementam o mesmo contrato).
export interface CustomerRepository {
  create(input: CreateCustomerInput): Promise<CustomerRecord>;
  findByEmail(email: string): Promise<CustomerRecord | undefined>;
  findByDocument(document: string): Promise<CustomerRecord | undefined>;
  findById(id: string): Promise<CustomerRecord | undefined>;
  markEmailVerified(id: string, verifiedAt: Date): Promise<void>;
  updatePasswordHash(id: string, passwordHash: string, updatedAt: Date): Promise<void>;
  // Troca de e-mail confirmada: já entra com emailVerifiedAt = verifiedAt
  // (a posse do novo endereço acabou de ser provada pelo próprio token de
  // confirmação — não faz sentido pedir uma segunda verificação depois).
  updateEmail(id: string, newEmail: string, verifiedAt: Date): Promise<void>;
}

export class PostgresCustomerRepository implements CustomerRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateCustomerInput): Promise<CustomerRecord> {
    const [row] = await this.db.insert(customers).values(input).returning();
    if (!row) throw new Error('Failed to create customer');
    return row as CustomerRecord;
  }

  async findByEmail(email: string): Promise<CustomerRecord | undefined> {
    const [row] = await this.db.select().from(customers).where(eq(customers.email, email)).limit(1);
    return row as CustomerRecord | undefined;
  }

  async findByDocument(document: string): Promise<CustomerRecord | undefined> {
    const [row] = await this.db.select().from(customers).where(eq(customers.document, document)).limit(1);
    return row as CustomerRecord | undefined;
  }

  async findById(id: string): Promise<CustomerRecord | undefined> {
    const [row] = await this.db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return row as CustomerRecord | undefined;
  }

  async markEmailVerified(id: string, verifiedAt: Date): Promise<void> {
    await this.db.update(customers).set({ emailVerifiedAt: verifiedAt, updatedAt: verifiedAt }).where(eq(customers.id, id));
  }

  async updatePasswordHash(id: string, passwordHash: string, updatedAt: Date): Promise<void> {
    await this.db.update(customers).set({ passwordHash, updatedAt }).where(eq(customers.id, id));
  }

  async updateEmail(id: string, newEmail: string, verifiedAt: Date): Promise<void> {
    await this.db.update(customers).set({ email: newEmail, emailVerifiedAt: verifiedAt, updatedAt: verifiedAt }).where(eq(customers.id, id));
  }
}
