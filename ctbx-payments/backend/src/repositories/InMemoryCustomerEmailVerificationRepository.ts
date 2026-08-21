import { randomUUID } from 'node:crypto';
import type { CreateCustomerEmailVerificationInput, CustomerEmailVerificationRecord, CustomerEmailVerificationRepository } from './CustomerEmailVerificationRepository.js';

export class InMemoryCustomerEmailVerificationRepository implements CustomerEmailVerificationRepository {
  private readonly byTokenHash = new Map<string, CustomerEmailVerificationRecord>();

  async create(input: CreateCustomerEmailVerificationInput): Promise<CustomerEmailVerificationRecord> {
    const record: CustomerEmailVerificationRecord = { ...input, id: randomUUID(), createdAt: new Date(), consumedAt: null };
    this.byTokenHash.set(record.tokenHash, record);
    return record;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerEmailVerificationRecord | undefined> {
    return this.byTokenHash.get(tokenHash);
  }

  async markConsumed(tokenHash: string, consumedAt: Date): Promise<void> {
    const existing = this.byTokenHash.get(tokenHash);
    if (existing) this.byTokenHash.set(tokenHash, { ...existing, consumedAt });
  }

  async findLatestByCustomer(customerId: string): Promise<CustomerEmailVerificationRecord | undefined> {
    const rows = [...this.byTokenHash.values()].filter((row) => row.customerId === customerId);
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return rows[0];
  }
}
