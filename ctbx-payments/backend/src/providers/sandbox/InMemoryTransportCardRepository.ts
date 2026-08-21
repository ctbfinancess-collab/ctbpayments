import type { CreateTransportCardInput, TransportCardRecord, TransportCardRepository, UpdateTransportCardInput } from '../../repositories/TransportCardRepository.js';

export class InMemoryTransportCardRepository implements TransportCardRepository {
  private readonly cards = new Map<string, TransportCardRecord>();

  async findById(id: string): Promise<TransportCardRecord | undefined> {
    return this.cards.get(id);
  }

  async create(input: CreateTransportCardInput): Promise<TransportCardRecord> {
    const now = new Date();
    const record: TransportCardRecord = { ...input, createdAt: now, updatedAt: now };
    this.cards.set(record.id, record);
    return record;
  }

  async update(id: string, accountId: string, patch: UpdateTransportCardInput): Promise<TransportCardRecord | undefined> {
    const existing = this.cards.get(id);
    if (!existing || existing.accountId !== accountId) return undefined;
    const next = { ...existing, ...patch, updatedAt: new Date() };
    this.cards.set(id, next);
    return next;
  }
}
