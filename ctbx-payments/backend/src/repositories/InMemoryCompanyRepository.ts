import { randomUUID } from 'node:crypto';
import type { CompanyRecord, CompanyRepository, CreateCompanyInput } from './CompanyRepository.js';

export class InMemoryCompanyRepository implements CompanyRepository {
  private readonly byId = new Map<string, CompanyRecord>();

  async create(input: CreateCompanyInput): Promise<CompanyRecord> {
    const now = new Date();
    const record: CompanyRecord = { ...input, id: randomUUID(), status: 'ACTIVE', createdAt: now, updatedAt: now };
    this.byId.set(record.id, record);
    return record;
  }

  async findByCnpj(cnpj: string): Promise<CompanyRecord | undefined> {
    return [...this.byId.values()].find((row) => row.cnpj === cnpj);
  }

  async findById(id: string): Promise<CompanyRecord | undefined> {
    return this.byId.get(id);
  }
}
