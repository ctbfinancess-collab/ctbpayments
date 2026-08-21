import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { companyRepresentatives } from '../db/schema/index.js';

export type RepresentativeStatus = 'ACTIVE' | 'REMOVED';

export interface CompanyRepresentativeRecord {
  id: string;
  companyId: string;
  customerId: string;
  role: string;
  status: RepresentativeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyRepresentativeInput {
  companyId: string;
  customerId: string;
  role: string;
}

export interface CompanyRepresentativeRepository {
  create(input: CreateCompanyRepresentativeInput): Promise<CompanyRepresentativeRecord>;
  findByCompanyAndCustomer(companyId: string, customerId: string): Promise<CompanyRepresentativeRecord | undefined>;
  listByCustomer(customerId: string): Promise<CompanyRepresentativeRecord[]>;
  listByCompany(companyId: string): Promise<CompanyRepresentativeRecord[]>;
}

export class PostgresCompanyRepresentativeRepository implements CompanyRepresentativeRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateCompanyRepresentativeInput): Promise<CompanyRepresentativeRecord> {
    const [row] = await this.db.insert(companyRepresentatives).values(input).returning();
    if (!row) throw new Error('Failed to create company representative');
    return row as CompanyRepresentativeRecord;
  }

  async findByCompanyAndCustomer(companyId: string, customerId: string): Promise<CompanyRepresentativeRecord | undefined> {
    const [row] = await this.db.select().from(companyRepresentatives)
      .where(and(eq(companyRepresentatives.companyId, companyId), eq(companyRepresentatives.customerId, customerId))).limit(1);
    return row as CompanyRepresentativeRecord | undefined;
  }

  async listByCustomer(customerId: string): Promise<CompanyRepresentativeRecord[]> {
    const rows = await this.db.select().from(companyRepresentatives).where(eq(companyRepresentatives.customerId, customerId));
    return rows as CompanyRepresentativeRecord[];
  }

  async listByCompany(companyId: string): Promise<CompanyRepresentativeRecord[]> {
    const rows = await this.db.select().from(companyRepresentatives).where(eq(companyRepresentatives.companyId, companyId));
    return rows as CompanyRepresentativeRecord[];
  }
}
