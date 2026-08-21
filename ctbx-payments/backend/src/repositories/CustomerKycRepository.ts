import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { customerKyc } from '../db/schema/index.js';

// Ver comentário completo em db/schema/customerKyc.ts — status cobre o
// ciclo de vida inteiro do KYC, mas esta etapa só produz NOT_STARTED/
// IN_PROGRESS.
export type KycStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface CustomerKycRecord {
  id: string;
  customerId: string;
  status: KycStatus;
  birthDate: string | null; // YYYY-MM-DD
  motherName: string | null;
  nationality: string | null;
  personalInfoCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// O service (CustomerKycService) já resolve o merge entre o que existia
// e o que veio de novo — o repositório sempre recebe o estado FINAL a
// persistir, nunca um patch parcial, pra não duplicar a lógica de merge
// entre Postgres/InMemory.
export interface PersonalInfoPatch {
  status: KycStatus;
  birthDate: string | null;
  motherName: string | null;
  nationality: string | null;
  personalInfoCompletedAt: Date | null;
}

// Interface própria — mesmo motivo de sempre neste backend (Postgres
// real e InMemoryCustomerKycRepository implementam o mesmo contrato).
export interface CustomerKycRepository {
  findByCustomerId(customerId: string): Promise<CustomerKycRecord | undefined>;
  upsertPersonalInfo(customerId: string, patch: PersonalInfoPatch, now: Date): Promise<CustomerKycRecord>;
}

export class PostgresCustomerKycRepository implements CustomerKycRepository {
  constructor(private readonly db: Db) {}

  async findByCustomerId(customerId: string): Promise<CustomerKycRecord | undefined> {
    const [row] = await this.db.select().from(customerKyc).where(eq(customerKyc.customerId, customerId)).limit(1);
    return row as CustomerKycRecord | undefined;
  }

  // Um registro por customer (customerId único, ver schema) — insere na
  // primeira chamada, atualiza nas seguintes ("salvar o progresso" e
  // "permitir sair e continuar depois" são o mesmo caminho de código).
  async upsertPersonalInfo(customerId: string, patch: PersonalInfoPatch, now: Date): Promise<CustomerKycRecord> {
    const [row] = await this.db
      .insert(customerKyc)
      .values({ customerId, ...patch, updatedAt: now })
      .onConflictDoUpdate({ target: customerKyc.customerId, set: { ...patch, updatedAt: now } })
      .returning();
    if (!row) throw new Error('Failed to save customer KYC personal info');
    return row as CustomerKycRecord;
  }
}
