import type { CreateSandboxConsignedApplicationInput, SandboxConsignedApplicationRecord, SandboxConsignedRepository } from '../../repositories/SandboxConsignedRepository.js';

export class InMemorySandboxConsignedRepository implements SandboxConsignedRepository {
  private readonly applications = new Map<string, SandboxConsignedApplicationRecord>();

  async create(input: CreateSandboxConsignedApplicationInput): Promise<SandboxConsignedApplicationRecord> {
    // Mesma checagem que o índice único faz no Postgres (Etapa 5.1).
    if (input.idempotencyKey && [...this.applications.values()].some((row) => row.accountId === input.accountId && row.idempotencyKey === input.idempotencyKey)) {
      throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
    }
    const record: SandboxConsignedApplicationRecord = { ...input, createdAt: new Date() };
    this.applications.set(record.id, record);
    return record;
  }

  async listByAccount(accountId: string): Promise<SandboxConsignedApplicationRecord[]> {
    return [...this.applications.values()].filter((row) => row.accountId === accountId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findById(id: string, accountId: string): Promise<SandboxConsignedApplicationRecord | undefined> {
    const row = this.applications.get(id);
    return row && row.accountId === accountId ? row : undefined;
  }

  async findByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<SandboxConsignedApplicationRecord | undefined> {
    return [...this.applications.values()].find((row) => row.accountId === accountId && row.idempotencyKey === idempotencyKey);
  }
}
