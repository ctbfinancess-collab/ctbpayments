import { count, desc, eq, gte, ilike, sql } from 'drizzle-orm';
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
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
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
  termsAcceptedAt?: Date | null;
  termsVersion?: string | null;
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
  // Painel da equipe (Fase 6).
  search(criteria: CustomerSearch, limit: number): Promise<CustomerRecord[]>;
  setStatus(id: string, status: CustomerStatus, now: Date): Promise<void>;
  countAll(): Promise<number>;
  // Painel: novos cadastros por mês (fuso de Brasília) desde a data dada.
  countCreatedByMonth(since: Date): Promise<Record<string, number>>;
}

// Uma busca por vez: CPF exato, parte do e-mail ou parte do nome.
export type CustomerSearch = { document: string } | { email: string } | { name: string };

// Escapa curingas do LIKE para a busca nunca virar um "listar tudo".
export const likePattern = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

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

  async search(criteria: CustomerSearch, limit: number): Promise<CustomerRecord[]> {
    const where = 'document' in criteria ? eq(customers.document, criteria.document)
      : 'email' in criteria ? ilike(customers.email, likePattern(criteria.email))
        : ilike(customers.name, likePattern(criteria.name));
    return (await this.db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(limit)) as CustomerRecord[];
  }

  async setStatus(id: string, status: CustomerStatus, now: Date): Promise<void> {
    await this.db.update(customers).set({ status, updatedAt: now }).where(eq(customers.id, id));
  }

  async countAll(): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(customers);
    return Number(row?.n ?? 0);
  }
  async countCreatedByMonth(since: Date): Promise<Record<string, number>> {
    const m = sql<string>`to_char(date_trunc('month', ${customers.createdAt} at time zone 'America/Sao_Paulo'), 'YYYY-MM')`;
    const rows = await this.db.select({ m, n: count() }).from(customers).where(gte(customers.createdAt, since)).groupBy(m);
    return Object.fromEntries(rows.map((r) => [r.m, Number(r.n)]));
  }
}
