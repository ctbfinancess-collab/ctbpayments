import { randomUUID } from 'node:crypto';
import type { CompanyRepresentativeRecord, CompanyRepresentativeRepository, CreateCompanyRepresentativeInput } from './CompanyRepresentativeRepository.js';

export class InMemoryCompanyRepresentativeRepository implements CompanyRepresentativeRepository {
  private readonly byId = new Map<string, CompanyRepresentativeRecord>();

  async create(input: CreateCompanyRepresentativeInput): Promise<CompanyRepresentativeRecord> {
    const now = new Date();
    const record: CompanyRepresentativeRecord = { ...input, id: randomUUID(), status: 'ACTIVE', createdAt: now, updatedAt: now };
    this.byId.set(record.id, record);
    return record;
  }

  async findByCompanyAndCustomer(companyId: string, customerId: string): Promise<CompanyRepresentativeRecord | undefined> {
    return [...this.byId.values()].find((row) => row.companyId === companyId && row.customerId === customerId);
  }

  async listByCustomer(customerId: string): Promise<CompanyRepresentativeRecord[]> {
    return [...this.byId.values()].filter((row) => row.customerId === customerId);
  }

  async listByCompany(companyId: string): Promise<CompanyRepresentativeRecord[]> {
    return [...this.byId.values()].filter((row) => row.companyId === companyId);
  }
}
