import { randomUUID } from 'node:crypto';
import type { CreateCustomerInput, CustomerRecord, CustomerRepository, CustomerSearch, CustomerStatus } from './CustomerRepository.js';

// Fallback/testes — mesmo papel de todo InMemoryX deste backend: usado
// quando DATABASE_URL não está configurado (dev local sem Postgres) e nos
// testes unitários. Nunca usado em produção real (ver app.ts).
export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly byId = new Map<string, CustomerRecord>();

  async create(input: CreateCustomerInput): Promise<CustomerRecord> {
    const now = new Date();
    const record: CustomerRecord = { ...input, id: randomUUID(), emailVerifiedAt: null, status: 'ACTIVE', createdAt: now, updatedAt: now };
    this.byId.set(record.id, record);
    return record;
  }

  async findByEmail(email: string): Promise<CustomerRecord | undefined> {
    return [...this.byId.values()].find((row) => row.email === email);
  }

  async findByDocument(document: string): Promise<CustomerRecord | undefined> {
    return [...this.byId.values()].find((row) => row.document === document);
  }

  async findById(id: string): Promise<CustomerRecord | undefined> {
    return this.byId.get(id);
  }

  async markEmailVerified(id: string, verifiedAt: Date): Promise<void> {
    const existing = this.byId.get(id);
    if (existing) this.byId.set(id, { ...existing, emailVerifiedAt: verifiedAt, updatedAt: verifiedAt });
  }

  async updatePasswordHash(id: string, passwordHash: string, updatedAt: Date): Promise<void> {
    const existing = this.byId.get(id);
    if (existing) this.byId.set(id, { ...existing, passwordHash, updatedAt });
  }

  async updateEmail(id: string, newEmail: string, verifiedAt: Date): Promise<void> {
    const existing = this.byId.get(id);
    if (existing) this.byId.set(id, { ...existing, email: newEmail, emailVerifiedAt: verifiedAt, updatedAt: verifiedAt });
  }

  async search(criteria: CustomerSearch, limit: number): Promise<CustomerRecord[]> {
    const rows = [...this.byId.values()].filter((r) => ('document' in criteria ? r.document === criteria.document
      : 'email' in criteria ? r.email.toLowerCase().includes(criteria.email.toLowerCase())
        : r.name.toLowerCase().includes(criteria.name.toLowerCase())));
    return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  async setStatus(id: string, status: CustomerStatus, now: Date): Promise<void> {
    const existing = this.byId.get(id);
    if (existing) this.byId.set(id, { ...existing, status, updatedAt: now });
  }

  async countAll(): Promise<number> {
    return this.byId.size;
  }
}
