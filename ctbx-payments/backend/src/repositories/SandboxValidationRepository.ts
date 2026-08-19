import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxValidations } from '../db/schema/index.js';

export type ValidationKind = 'PIX_TRANSFER' | 'BANK_TRANSFER' | 'BILL_PAYMENT' | 'INSTALLMENT_SIMULATION';

export interface SandboxValidationRecord {
  id: string; accountId: string; kind: ValidationKind; payload: Record<string, unknown>; createdAt: Date; expiresAt: Date;
}

export interface CreateSandboxValidationInput {
  id: string; accountId: string; kind: ValidationKind; payload: Record<string, unknown>; expiresAt: Date;
}

// Interface própria — mesmo motivo dos demais repositórios desta
// consolidação. findById já filtra expiradas (devolve undefined, mesmo
// comportamento de "não encontrada" que o provider já tratava antes).
export interface SandboxValidationRepository {
  create(input: CreateSandboxValidationInput): Promise<SandboxValidationRecord>;
  findById(id: string, accountId: string, kind: ValidationKind): Promise<SandboxValidationRecord | undefined>;
}

export class PostgresSandboxValidationRepository implements SandboxValidationRepository {
  constructor(private readonly db: Db, private readonly now: () => Date = () => new Date()) {}

  async create(input: CreateSandboxValidationInput): Promise<SandboxValidationRecord> {
    const [row] = await this.db.insert(sandboxValidations).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox validation');
    return row as SandboxValidationRecord;
  }

  async findById(id: string, accountId: string, kind: ValidationKind): Promise<SandboxValidationRecord | undefined> {
    const [row] = await this.db.select().from(sandboxValidations).where(and(eq(sandboxValidations.id, id), eq(sandboxValidations.accountId, accountId), eq(sandboxValidations.kind, kind))).limit(1);
    if (!row) return undefined;
    if ((row.expiresAt as Date).getTime() < this.now().getTime()) return undefined;
    return row as SandboxValidationRecord;
  }
}
