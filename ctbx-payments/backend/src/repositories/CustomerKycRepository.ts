import { and, asc, count, eq, gte, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { customerKyc, customerKycDocuments } from '../db/schema/index.js';

// Ver comentário completo em db/schema/customerKyc.ts — status cobre o
// ciclo de vida inteiro do KYC, mas esta etapa só produz NOT_STARTED/
// IN_PROGRESS.
export type KycStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';

export interface CustomerKycRecord {
  id: string;
  customerId: string;
  status: KycStatus;
  birthDate: string | null; // YYYY-MM-DD
  motherName: string | null;
  nationality: string | null;
  personalInfoCompletedAt: Date | null;
  addressCep: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressCompletedAt: Date | null;
  isPep: boolean | null;
  occupation: string | null;
  incomeRange: string | null;
  declarationsCompletedAt: Date | null;
  idDocumentType: string | null;
  submittedAt: Date | null;
  reviewReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Campos que as seções da Fase 4 gravam (endereço, declarações, tipo de
// documento, envio). O service sempre manda os valores FINAIS da seção.
export type KycSectionPatch = Partial<Omit<CustomerKycRecord, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>;

export type KycDocumentKind = 'ID_FRONT' | 'ID_BACK' | 'SELFIE' | 'PROOF_OF_ADDRESS';

export interface KycDocumentRecord {
  id: string;
  customerId: string;
  kind: KycDocumentKind;
  status: 'ACTIVE' | 'REPLACED';
  contentType: string;
  sizeBytes: number;
  sha256: string;
  storageKey: string;
  keyId: string;
  iv: string;
  authTag: string;
  createdAt: Date;
  replacedAt: Date | null;
}

export type NewKycDocument = Omit<KycDocumentRecord, 'id' | 'status' | 'createdAt' | 'replacedAt'>;

export interface KycDocumentRepository {
  // Grava o novo arquivo e marca o anterior do mesmo tipo como REPLACED.
  addReplacing(doc: NewKycDocument, now: Date): Promise<KycDocumentRecord>;
  listActive(customerId: string): Promise<KycDocumentRecord[]>;
  findActiveById(customerId: string, documentId: string): Promise<KycDocumentRecord | undefined>;
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
  saveSection(customerId: string, patch: KycSectionPatch, now: Date): Promise<CustomerKycRecord>;
  // Fila da análise (painel da equipe): mais antigos primeiro.
  listByStatus(status: KycStatus): Promise<CustomerKycRecord[]>;
  // Muda a situação só se ainda estiver em `from` (atômico). true = mudou.
  transitionStatus(customerId: string, from: KycStatus, patch: KycSectionPatch, now: Date): Promise<boolean>;
  countByStatus(): Promise<Record<string, number>>;
  // Painel: análises concluídas desde a data dada e o tempo médio (horas)
  // entre o envio e a decisão.
  reviewStats(since: Date): Promise<{ reviewed: number; avgHours: number | null }>;
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

  async saveSection(customerId: string, patch: KycSectionPatch, now: Date): Promise<CustomerKycRecord> {
    const [row] = await this.db
      .insert(customerKyc)
      .values({ customerId, ...patch, updatedAt: now })
      .onConflictDoUpdate({ target: customerKyc.customerId, set: { ...patch, updatedAt: now } })
      .returning();
    if (!row) throw new Error('Failed to save customer KYC section');
    return row as CustomerKycRecord;
  }

  async transitionStatus(customerId: string, from: KycStatus, patch: KycSectionPatch, now: Date): Promise<boolean> {
    const rows = await this.db.update(customerKyc).set({ ...patch, updatedAt: now })
      .where(and(eq(customerKyc.customerId, customerId), eq(customerKyc.status, from))).returning({ id: customerKyc.id });
    return rows.length > 0;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.db.select({ status: customerKyc.status, n: count() }).from(customerKyc).groupBy(customerKyc.status);
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  }

  async reviewStats(since: Date): Promise<{ reviewed: number; avgHours: number | null }> {
    const [row] = await this.db.select({
      n: count(),
      avg: sql<string | null>`avg(extract(epoch from (${customerKyc.reviewedAt} - ${customerKyc.submittedAt})) / 3600)`,
    }).from(customerKyc).where(and(gte(customerKyc.reviewedAt, since), isNotNull(customerKyc.submittedAt)));
    const avg = row?.avg == null ? null : Number(row.avg);
    return { reviewed: Number(row?.n ?? 0), avgHours: avg != null && Number.isFinite(avg) ? avg : null };
  }

  async listByStatus(status: KycStatus): Promise<CustomerKycRecord[]> {
    return (await this.db.select().from(customerKyc).where(eq(customerKyc.status, status)).orderBy(asc(customerKyc.submittedAt))) as CustomerKycRecord[];
  }
}

export class PostgresKycDocumentRepository implements KycDocumentRepository {
  constructor(private readonly db: Db) {}

  async addReplacing(doc: NewKycDocument, now: Date): Promise<KycDocumentRecord> {
    return this.db.transaction(async (tx) => {
      await tx.update(customerKycDocuments).set({ status: 'REPLACED', replacedAt: now })
        .where(and(eq(customerKycDocuments.customerId, doc.customerId), eq(customerKycDocuments.kind, doc.kind), eq(customerKycDocuments.status, 'ACTIVE')));
      const [row] = await tx.insert(customerKycDocuments).values({ ...doc, status: 'ACTIVE', createdAt: now }).returning();
      if (!row) throw new Error('Failed to save KYC document');
      return row as KycDocumentRecord;
    });
  }

  async listActive(customerId: string): Promise<KycDocumentRecord[]> {
    const rows = await this.db.select().from(customerKycDocuments)
      .where(and(eq(customerKycDocuments.customerId, customerId), eq(customerKycDocuments.status, 'ACTIVE')));
    return rows as KycDocumentRecord[];
  }

  async findActiveById(customerId: string, documentId: string): Promise<KycDocumentRecord | undefined> {
    const [row] = await this.db.select().from(customerKycDocuments)
      .where(and(eq(customerKycDocuments.id, documentId), eq(customerKycDocuments.customerId, customerId), eq(customerKycDocuments.status, 'ACTIVE'))).limit(1);
    return row as KycDocumentRecord | undefined;
  }
}
