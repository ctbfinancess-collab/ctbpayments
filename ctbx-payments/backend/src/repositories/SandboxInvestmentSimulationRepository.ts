import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxInvestmentSimulations } from '../db/schema/index.js';

export interface SandboxInvestmentSimulationRecord {
  id: string; accountId: string; productId: string; amountMinor: number; projectedGrossMinor: number;
  projectedNetMinor: number; termDays: number; createdAt: Date;
}

export type CreateSandboxInvestmentSimulationInput = Omit<SandboxInvestmentSimulationRecord, 'createdAt'>;

// Interface própria — mesmo motivo dos demais repositórios desta
// consolidação. Existe pra que "aplicar" (createOrder) nunca dependa de um
// Map()/array em memória do processo: a simulação sobrevive a um restart
// entre simular e confirmar, igual qualquer outro estado do cliente.
export interface SandboxInvestmentSimulationRepository {
  create(input: CreateSandboxInvestmentSimulationInput): Promise<SandboxInvestmentSimulationRecord>;
  findById(id: string, accountId: string): Promise<SandboxInvestmentSimulationRecord | undefined>;
}

export class PostgresSandboxInvestmentSimulationRepository implements SandboxInvestmentSimulationRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateSandboxInvestmentSimulationInput): Promise<SandboxInvestmentSimulationRecord> {
    const [row] = await this.db.insert(sandboxInvestmentSimulations).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox investment simulation');
    return row;
  }

  async findById(id: string, accountId: string): Promise<SandboxInvestmentSimulationRecord | undefined> {
    const [row] = await this.db.select().from(sandboxInvestmentSimulations).where(and(eq(sandboxInvestmentSimulations.id, id), eq(sandboxInvestmentSimulations.accountId, accountId))).limit(1);
    return row;
  }
}
