import { randomUUID } from 'node:crypto';
import type { CompanyRepresentativeRecord, CompanyRepresentativeRepository, CreateCompanyRepresentativeInput, RepresentativeStatus } from './CompanyRepresentativeRepository.js';

export class InMemoryCompanyRepresentativeRepository implements CompanyRepresentativeRepository {
  private readonly byId = new Map<string, CompanyRepresentativeRecord>();

  async create(input: CreateCompanyRepresentativeInput): Promise<CompanyRepresentativeRecord> {
    const now = new Date();
    const record: CompanyRepresentativeRecord = { ...input, id: randomUUID(), status: 'PENDING', createdAt: now, updatedAt: now };
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

  async setStatusForCompany(companyId: string, status: RepresentativeStatus, now: Date): Promise<void> {
    for (const r of this.byId.values()) if (r.companyId === companyId) { r.status = status; r.updatedAt = now; }
  }
}
