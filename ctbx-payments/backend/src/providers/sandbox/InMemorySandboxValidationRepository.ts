import type { CreateSandboxValidationInput, SandboxValidationRecord, SandboxValidationRepository, ValidationKind } from '../../repositories/SandboxValidationRepository.js';

export class InMemorySandboxValidationRepository implements SandboxValidationRepository {
  private readonly validations = new Map<string, SandboxValidationRecord>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async create(input: CreateSandboxValidationInput): Promise<SandboxValidationRecord> {
    const record: SandboxValidationRecord = { ...input, createdAt: this.now() };
    this.validations.set(record.id, record);
    return record;
  }

  async findById(id: string, accountId: string, kind: ValidationKind): Promise<SandboxValidationRecord | undefined> {
    const row = this.validations.get(id);
    if (!row || row.accountId !== accountId || row.kind !== kind) return undefined;
    if (row.expiresAt.getTime() < this.now().getTime()) return undefined;
    return row;
  }
}
