import { randomUUID } from 'node:crypto';
import type { CreateCustomerSessionInput, CustomerSessionRecord, CustomerSessionRepository } from './CustomerSessionRepository.js';

export class InMemoryCustomerSessionRepository implements CustomerSessionRepository {
  private readonly byTokenHash = new Map<string, CustomerSessionRecord>();

  async create(input: CreateCustomerSessionInput): Promise<CustomerSessionRecord> {
    const record: CustomerSessionRecord = { ...input, id: randomUUID(), createdAt: new Date(), revokedAt: null };
    this.byTokenHash.set(record.tokenHash, record);
    return record;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerSessionRecord | undefined> {
    return this.byTokenHash.get(tokenHash);
  }

  async revoke(tokenHash: string): Promise<void> {
    const existing = this.byTokenHash.get(tokenHash);
    if (existing) this.byTokenHash.set(tokenHash, { ...existing, revokedAt: new Date() });
  }

  async revokeAllForCustomer(customerId: string): Promise<void> {
    const now = new Date();
    for (const [key, record] of this.byTokenHash.entries()) {
      if (record.customerId === customerId && !record.revokedAt) this.byTokenHash.set(key, { ...record, revokedAt: now });
    }
  }
}
