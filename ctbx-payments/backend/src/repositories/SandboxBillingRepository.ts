import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxBillingBills, sandboxBillingPayers } from '../db/schema/index.js';

export interface SandboxBillingPayerRecord {
  id: string; accountId: string; name: string; documentMasked: string; emailSandbox: string; addressSandbox: string;
  status: string; idempotencyKey: string | null; requestHash: string | null; createdAt: Date;
}
export type CreateSandboxBillingPayerInput = Omit<SandboxBillingPayerRecord, 'createdAt'>;
export type UpdateSandboxBillingPayerInput = Partial<Pick<SandboxBillingPayerRecord, 'name'>>;

export interface SandboxBillingBillRecord {
  id: string; accountId: string; payerId: string; payerSnapshot: Record<string, unknown>; externalReferenceSandbox: string;
  digitableLineSandbox: string; barcodeSandbox: string; status: string; dueDate: string; amountMinor: number;
  description: string; requestId: string; idempotencyKey: string | null; requestHash: string | null; createdAt: Date;
}
export type CreateSandboxBillingBillInput = Omit<SandboxBillingBillRecord, 'createdAt'>;

// Interface própria — mesmo motivo dos demais repositórios desta
// consolidação. Nenhuma das duas tabelas se relaciona com o
// ledger/sandbox_accounts: emitir uma cobrança pra alguém pagar não é uma
// movimentação da própria conta (ver comentário em db/schema/sandboxBilling.ts).
export interface SandboxBillingRepository {
  listPayers(accountId: string): Promise<SandboxBillingPayerRecord[]>;
  findPayer(id: string, accountId: string): Promise<SandboxBillingPayerRecord | undefined>;
  findPayerByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<SandboxBillingPayerRecord | undefined>;
  createPayer(input: CreateSandboxBillingPayerInput): Promise<SandboxBillingPayerRecord>;
  updatePayer(id: string, accountId: string, patch: UpdateSandboxBillingPayerInput): Promise<SandboxBillingPayerRecord | undefined>;
  deletePayer(id: string, accountId: string): Promise<boolean>;

  listBills(accountId: string): Promise<SandboxBillingBillRecord[]>;
  findBill(id: string, accountId: string): Promise<SandboxBillingBillRecord | undefined>;
  findBillByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<SandboxBillingBillRecord | undefined>;
  createBill(input: CreateSandboxBillingBillInput): Promise<SandboxBillingBillRecord>;
}

export class PostgresSandboxBillingRepository implements SandboxBillingRepository {
  constructor(private readonly db: Db) {}

  async listPayers(accountId: string): Promise<SandboxBillingPayerRecord[]> {
    return this.db.select().from(sandboxBillingPayers).where(eq(sandboxBillingPayers.accountId, accountId)).orderBy(desc(sandboxBillingPayers.createdAt));
  }
  async findPayer(id: string, accountId: string): Promise<SandboxBillingPayerRecord | undefined> {
    const [row] = await this.db.select().from(sandboxBillingPayers).where(and(eq(sandboxBillingPayers.id, id), eq(sandboxBillingPayers.accountId, accountId))).limit(1);
    return row;
  }
  async findPayerByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<SandboxBillingPayerRecord | undefined> {
    const [row] = await this.db.select().from(sandboxBillingPayers).where(and(eq(sandboxBillingPayers.accountId, accountId), eq(sandboxBillingPayers.idempotencyKey, idempotencyKey))).limit(1);
    return row;
  }
  async createPayer(input: CreateSandboxBillingPayerInput): Promise<SandboxBillingPayerRecord> {
    const [row] = await this.db.insert(sandboxBillingPayers).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox billing payer');
    return row;
  }
  async updatePayer(id: string, accountId: string, patch: UpdateSandboxBillingPayerInput): Promise<SandboxBillingPayerRecord | undefined> {
    const [row] = await this.db.update(sandboxBillingPayers).set(patch).where(and(eq(sandboxBillingPayers.id, id), eq(sandboxBillingPayers.accountId, accountId))).returning();
    return row;
  }
  async deletePayer(id: string, accountId: string): Promise<boolean> {
    const rows = await this.db.delete(sandboxBillingPayers).where(and(eq(sandboxBillingPayers.id, id), eq(sandboxBillingPayers.accountId, accountId))).returning();
    return rows.length > 0;
  }

  async listBills(accountId: string): Promise<SandboxBillingBillRecord[]> {
    return (await this.db.select().from(sandboxBillingBills).where(eq(sandboxBillingBills.accountId, accountId)).orderBy(desc(sandboxBillingBills.createdAt))) as SandboxBillingBillRecord[];
  }
  async findBill(id: string, accountId: string): Promise<SandboxBillingBillRecord | undefined> {
    const [row] = await this.db.select().from(sandboxBillingBills).where(and(eq(sandboxBillingBills.id, id), eq(sandboxBillingBills.accountId, accountId))).limit(1);
    return row as SandboxBillingBillRecord | undefined;
  }
  async findBillByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<SandboxBillingBillRecord | undefined> {
    const [row] = await this.db.select().from(sandboxBillingBills).where(and(eq(sandboxBillingBills.accountId, accountId), eq(sandboxBillingBills.idempotencyKey, idempotencyKey))).limit(1);
    return row as SandboxBillingBillRecord | undefined;
  }
  async createBill(input: CreateSandboxBillingBillInput): Promise<SandboxBillingBillRecord> {
    const [row] = await this.db.insert(sandboxBillingBills).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox billing bill');
    return row as SandboxBillingBillRecord;
  }
}
