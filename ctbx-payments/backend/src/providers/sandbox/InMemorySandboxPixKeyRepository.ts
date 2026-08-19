import type { CreateSandboxPixKeyInput, SandboxPixKeyRecord, SandboxPixKeyRepository } from '../../repositories/SandboxPixKeyRepository.js';

export class InMemorySandboxPixKeyRepository implements SandboxPixKeyRepository {
  private readonly keys = new Map<string, SandboxPixKeyRecord>();

  async listActiveByAccount(accountId: string): Promise<SandboxPixKeyRecord[]> {
    return [...this.keys.values()].filter((row) => row.accountId === accountId && row.status === 'ACTIVE');
  }

  async findById(id: string, accountId: string): Promise<SandboxPixKeyRecord | undefined> {
    const row = this.keys.get(id);
    return row && row.accountId === accountId ? row : undefined;
  }

  async create(input: CreateSandboxPixKeyInput): Promise<SandboxPixKeyRecord> {
    const record: SandboxPixKeyRecord = { ...input, createdAt: new Date() };
    this.keys.set(record.id, record);
    return record;
  }

  async createMany(inputs: CreateSandboxPixKeyInput[]): Promise<void> {
    for (const input of inputs) await this.create(input);
  }

  async remove(id: string, accountId: string): Promise<SandboxPixKeyRecord | undefined> {
    const row = this.keys.get(id);
    if (!row || row.accountId !== accountId) return undefined;
    const next = { ...row, status: 'REMOVED' as const };
    this.keys.set(id, next);
    return next;
  }
}
