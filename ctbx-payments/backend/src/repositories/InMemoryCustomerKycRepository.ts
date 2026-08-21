import { randomUUID } from 'node:crypto';
import type { CustomerKycRecord, CustomerKycRepository, PersonalInfoPatch } from './CustomerKycRepository.js';

export class InMemoryCustomerKycRepository implements CustomerKycRepository {
  private readonly byCustomerId = new Map<string, CustomerKycRecord>();

  async findByCustomerId(customerId: string): Promise<CustomerKycRecord | undefined> {
    return this.byCustomerId.get(customerId);
  }

  async upsertPersonalInfo(customerId: string, patch: PersonalInfoPatch, now: Date): Promise<CustomerKycRecord> {
    const existing = this.byCustomerId.get(customerId);
    const record: CustomerKycRecord = { id: existing?.id ?? randomUUID(), customerId, ...patch, createdAt: existing?.createdAt ?? now, updatedAt: now };
    this.byCustomerId.set(customerId, record);
    return record;
  }
}
