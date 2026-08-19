import type { CreateSandboxInvestmentSimulationInput, SandboxInvestmentSimulationRecord, SandboxInvestmentSimulationRepository } from '../../repositories/SandboxInvestmentSimulationRepository.js';

export class InMemorySandboxInvestmentSimulationRepository implements SandboxInvestmentSimulationRepository {
  private readonly simulations = new Map<string, SandboxInvestmentSimulationRecord>();

  async create(input: CreateSandboxInvestmentSimulationInput): Promise<SandboxInvestmentSimulationRecord> {
    const record: SandboxInvestmentSimulationRecord = { ...input, createdAt: new Date() };
    this.simulations.set(record.id, record);
    return record;
  }

  async findById(id: string, accountId: string): Promise<SandboxInvestmentSimulationRecord | undefined> {
    const row = this.simulations.get(id);
    return row && row.accountId === accountId ? row : undefined;
  }
}
