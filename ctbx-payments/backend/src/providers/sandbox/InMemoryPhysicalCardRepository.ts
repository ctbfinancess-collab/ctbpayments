import type { CreatePhysicalCardInput, CreatePhysicalCardTransactionInput, PhysicalCardRecord, PhysicalCardRepository, PhysicalCardTransactionRecord, UpdatePhysicalCardInput } from '../../repositories/PhysicalCardRepository.js';

export class InMemoryPhysicalCardRepository implements PhysicalCardRepository {
  private readonly cards = new Map<string, PhysicalCardRecord>();
  private readonly transactions = new Map<string, PhysicalCardTransactionRecord[]>();

  async findById(id: string): Promise<PhysicalCardRecord | undefined> {
    return this.cards.get(id);
  }

  async create(input: CreatePhysicalCardInput): Promise<PhysicalCardRecord> {
    const now = new Date();
    const record: PhysicalCardRecord = { ...input, createdAt: now, updatedAt: now };
    this.cards.set(record.id, record);
    return record;
  }

  async update(id: string, accountId: string, patch: UpdatePhysicalCardInput): Promise<PhysicalCardRecord | undefined> {
    const existing = this.cards.get(id);
    if (!existing || existing.accountId !== accountId) return undefined;
    const next = { ...existing, ...patch, updatedAt: new Date() };
    this.cards.set(id, next);
    return next;
  }

  async listTransactions(cardId: string): Promise<PhysicalCardTransactionRecord[]> {
    return this.transactions.get(cardId) ?? [];
  }

  async createTransactions(inputs: CreatePhysicalCardTransactionInput[]): Promise<void> {
    for (const input of inputs) {
      const list = this.transactions.get(input.cardId) ?? [];
      list.push({ ...input, createdAt: new Date() });
      this.transactions.set(input.cardId, list);
    }
  }
}
