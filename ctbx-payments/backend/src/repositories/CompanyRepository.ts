import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { companies } from '../db/schema/index.js';

export type CompanyStatus = 'ACTIVE' | 'BLOCKED';

export interface CompanyRecord {
  id: string;
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  status: CompanyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyInput {
  cnpj: string;
  legalName: string;
  tradeName: string | null;
}

export interface CompanyRepository {
  create(input: CreateCompanyInput): Promise<CompanyRecord>;
  findByCnpj(cnpj: string): Promise<CompanyRecord | undefined>;
  findById(id: string): Promise<CompanyRecord | undefined>;
}

export class PostgresCompanyRepository implements CompanyRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateCompanyInput): Promise<CompanyRecord> {
    const [row] = await this.db.insert(companies).values(input).returning();
    if (!row) throw new Error('Failed to create company');
    return row as CompanyRecord;
  }

  async findByCnpj(cnpj: string): Promise<CompanyRecord | undefined> {
    const [row] = await this.db.select().from(companies).where(eq(companies.cnpj, cnpj)).limit(1);
    return row as CompanyRecord | undefined;
  }

  async findById(id: string): Promise<CompanyRecord | undefined> {
    const [row] = await this.db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return row as CompanyRecord | undefined;
  }
}
