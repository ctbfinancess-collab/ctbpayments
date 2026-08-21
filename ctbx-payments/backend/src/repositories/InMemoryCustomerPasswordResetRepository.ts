import { randomUUID } from 'node:crypto';
import type { CreateCustomerPasswordResetInput, CustomerPasswordResetRecord, CustomerPasswordResetRepository } from './CustomerPasswordResetRepository.js';

export class InMemoryCustomerPasswordResetRepository implements CustomerPasswordResetRepository {
  private readonly byTokenHash = new Map<string, CustomerPasswordResetRecord>();

  async create(input: CreateCustomerPasswordResetInput): Promise<CustomerPasswordResetRecord> {
    const record: CustomerPasswordResetRecord = { ...input, id: randomUUID(), createdAt: new Date(), consumedAt: null };
    this.byTokenHash.set(record.tokenHash, record);
    return record;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerPasswordResetRecord | undefined> {
    return this.byTokenHash.get(tokenHash);
  }

  async markConsumed(tokenHash: string, consumedAt: Date): Promise<void> {
    const existing = this.byTokenHash.get(tokenHash);
    if (existing) this.byTokenHash.set(tokenHash, { ...existing, consumedAt });
  }

  async findLatestByCustomer(customerId: string): Promise<CustomerPasswordResetRecord | undefined> {
    const rows = [...this.byTokenHash.values()].filter((row) => row.customerId === customerId);
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return rows[0];
  }
}
