import type {
  CreateSandboxBillingBillInput, CreateSandboxBillingPayerInput, SandboxBillingBillRecord, SandboxBillingPayerRecord,
  SandboxBillingRepository, UpdateSandboxBillingPayerInput,
} from '../../repositories/SandboxBillingRepository.js';

const uniqueViolation = () => Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });

export class InMemorySandboxBillingRepository implements SandboxBillingRepository {
  private readonly payers = new Map<string, SandboxBillingPayerRecord>();
  private readonly bills = new Map<string, SandboxBillingBillRecord>();

  async listPayers(accountId: string): Promise<SandboxBillingPayerRecord[]> {
    return [...this.payers.values()].filter((row) => row.accountId === accountId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async findPayer(id: string, accountId: string): Promise<SandboxBillingPayerRecord | undefined> {
    const row = this.payers.get(id);
    return row && row.accountId === accountId ? row : undefined;
  }
  async findPayerByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<SandboxBillingPayerRecord | undefined> {
    return [...this.payers.values()].find((row) => row.accountId === accountId && row.idempotencyKey === idempotencyKey);
  }
  async createPayer(input: CreateSandboxBillingPayerInput): Promise<SandboxBillingPayerRecord> {
    if (input.idempotencyKey && [...this.payers.values()].some((row) => row.accountId === input.accountId && row.idempotencyKey === input.idempotencyKey)) throw uniqueViolation();
    const record: SandboxBillingPayerRecord = { ...input, createdAt: new Date() };
    this.payers.set(record.id, record);
    return record;
  }
  async updatePayer(id: string, accountId: string, patch: UpdateSandboxBillingPayerInput): Promise<SandboxBillingPayerRecord | undefined> {
    const row = this.payers.get(id);
    if (!row || row.accountId !== accountId) return undefined;
    const next = { ...row, ...patch };
    this.payers.set(id, next);
    return next;
  }
  async deletePayer(id: string, accountId: string): Promise<boolean> {
    const row = this.payers.get(id);
    if (!row || row.accountId !== accountId) return false;
    return this.payers.delete(id);
  }

  async listBills(accountId: string): Promise<SandboxBillingBillRecord[]> {
    return [...this.bills.values()].filter((row) => row.accountId === accountId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async findBill(id: string, accountId: string): Promise<SandboxBillingBillRecord | undefined> {
    const row = this.bills.get(id);
    return row && row.accountId === accountId ? row : undefined;
  }
  async findBillByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<SandboxBillingBillRecord | undefined> {
    return [...this.bills.values()].find((row) => row.accountId === accountId && row.idempotencyKey === idempotencyKey);
  }
  async createBill(input: CreateSandboxBillingBillInput): Promise<SandboxBillingBillRecord> {
    if (input.idempotencyKey && [...this.bills.values()].some((row) => row.accountId === input.accountId && row.idempotencyKey === input.idempotencyKey)) throw uniqueViolation();
    const record: SandboxBillingBillRecord = { ...input, createdAt: new Date() };
    this.bills.set(record.id, record);
    return record;
  }
}
