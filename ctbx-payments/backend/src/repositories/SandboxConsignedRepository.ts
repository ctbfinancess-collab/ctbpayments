import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxConsignedApplications } from '../db/schema/index.js';

export interface SandboxConsignedApplicationRecord {
  id: string; accountId: string; productId: string; amountMinor: number; installments: number; status: string;
  sandboxReference: string; requestId: string; idempotencyKey: string | null; requestHash: string | null; createdAt: Date;
}

export type CreateSandboxConsignedApplicationInput = Omit<SandboxConsignedApplicationRecord, 'createdAt'>;

// Interface própria — mesmo motivo dos demais repositórios desta
// consolidação. O fluxo atual do consignado é um único passo (apply() já
// cria a solicitação em UNDER_REVIEW; não existe aprovação/liberação de
// crédito implementada), então não há nenhuma relação com o ledger aqui —
// só a solicitação em si precisa persistir. idempotencyKey/requestHash
// (Etapa 5) permitem detectar um replay mesmo depois de um restart, sem
// depender de nenhum Map()/array em memória do processo.
export interface SandboxConsignedRepository {
  create(input: CreateSandboxConsignedApplicationInput): Promise<SandboxConsignedApplicationRecord>;
  listByAccount(accountId: string): Promise<SandboxConsignedApplicationRecord[]>;
  findById(id: string, accountId: string): Promise<SandboxConsignedApplicationRecord | undefined>;
  findByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<SandboxConsignedApplicationRecord | undefined>;
}

export class PostgresSandboxConsignedRepository implements SandboxConsignedRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateSandboxConsignedApplicationInput): Promise<SandboxConsignedApplicationRecord> {
    const [row] = await this.db.insert(sandboxConsignedApplications).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox consigned application');
    return row;
  }

  async listByAccount(accountId: string): Promise<SandboxConsignedApplicationRecord[]> {
    return this.db.select().from(sandboxConsignedApplications).where(eq(sandboxConsignedApplications.accountId, accountId)).orderBy(desc(sandboxConsignedApplications.createdAt));
  }

  async findById(id: string, accountId: string): Promise<SandboxConsignedApplicationRecord | undefined> {
    const [row] = await this.db.select().from(sandboxConsignedApplications).where(and(eq(sandboxConsignedApplications.id, id), eq(sandboxConsignedApplications.accountId, accountId))).limit(1);
    return row;
  }

  async findByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<SandboxConsignedApplicationRecord | undefined> {
    const [row] = await this.db.select().from(sandboxConsignedApplications).where(and(eq(sandboxConsignedApplications.accountId, accountId), eq(sandboxConsignedApplications.idempotencyKey, idempotencyKey))).limit(1);
    return row;
  }
}
