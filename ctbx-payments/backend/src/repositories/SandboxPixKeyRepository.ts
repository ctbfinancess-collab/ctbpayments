import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxPixKeys } from '../db/schema/index.js';

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
export type PixKeyStatus = 'ACTIVE' | 'REMOVED';

export interface SandboxPixKeyRecord {
  id: string; accountId: string; type: PixKeyType; keyMasked: string; status: PixKeyStatus; createdAt: Date;
}

export interface CreateSandboxPixKeyInput {
  id: string; accountId: string; type: PixKeyType; keyMasked: string; status: PixKeyStatus;
}

export interface SandboxPixKeyRepository {
  listActiveByAccount(accountId: string): Promise<SandboxPixKeyRecord[]>;
  findById(id: string, accountId: string): Promise<SandboxPixKeyRecord | undefined>;
  create(input: CreateSandboxPixKeyInput): Promise<SandboxPixKeyRecord>;
  createMany(inputs: CreateSandboxPixKeyInput[]): Promise<void>;
  remove(id: string, accountId: string): Promise<SandboxPixKeyRecord | undefined>;
}

export class PostgresSandboxPixKeyRepository implements SandboxPixKeyRepository {
  constructor(private readonly db: Db) {}

  async listActiveByAccount(accountId: string): Promise<SandboxPixKeyRecord[]> {
    return (await this.db.select().from(sandboxPixKeys).where(and(eq(sandboxPixKeys.accountId, accountId), eq(sandboxPixKeys.status, 'ACTIVE')))) as SandboxPixKeyRecord[];
  }

  async findById(id: string, accountId: string): Promise<SandboxPixKeyRecord | undefined> {
    const [row] = await this.db.select().from(sandboxPixKeys).where(and(eq(sandboxPixKeys.id, id), eq(sandboxPixKeys.accountId, accountId))).limit(1);
    return row as SandboxPixKeyRecord | undefined;
  }

  async create(input: CreateSandboxPixKeyInput): Promise<SandboxPixKeyRecord> {
    const [row] = await this.db.insert(sandboxPixKeys).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox PIX key');
    return row as SandboxPixKeyRecord;
  }

  async createMany(inputs: CreateSandboxPixKeyInput[]): Promise<void> {
    if (!inputs.length) return;
    await this.db.insert(sandboxPixKeys).values(inputs);
  }

  async remove(id: string, accountId: string): Promise<SandboxPixKeyRecord | undefined> {
    const [row] = await this.db.update(sandboxPixKeys).set({ status: 'REMOVED' }).where(and(eq(sandboxPixKeys.id, id), eq(sandboxPixKeys.accountId, accountId))).returning();
    return row as SandboxPixKeyRecord | undefined;
  }
}
