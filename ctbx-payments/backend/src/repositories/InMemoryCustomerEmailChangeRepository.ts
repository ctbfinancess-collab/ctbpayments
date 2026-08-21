import { randomUUID } from 'node:crypto';
import type { CreateCustomerEmailChangeInput, CustomerEmailChangeRecord, CustomerEmailChangeRepository } from './CustomerEmailChangeRepository.js';

export class InMemoryCustomerEmailChangeRepository implements CustomerEmailChangeRepository {
  private readonly byTokenHash = new Map<string, CustomerEmailChangeRecord>();

  async create(input: CreateCustomerEmailChangeInput): Promise<CustomerEmailChangeRecord> {
    const record: CustomerEmailChangeRecord = { ...input, id: randomUUID(), createdAt: new Date(), consumedAt: null };
    this.byTokenHash.set(record.tokenHash, record);
    return record;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerEmailChangeRecord | undefined> {
    return this.byTokenHash.get(tokenHash);
  }

  async markConsumed(tokenHash: string, consumedAt: Date): Promise<void> {
    const existing = this.byTokenHash.get(tokenHash);
    if (existing) this.byTokenHash.set(tokenHash, { ...existing, consumedAt });
  }

  async findLatestByCustomer(customerId: string): Promise<CustomerEmailChangeRecord | undefined> {
    const rows = [...this.byTokenHash.values()].filter((row) => row.customerId === customerId);
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return rows[0];
  }
}
