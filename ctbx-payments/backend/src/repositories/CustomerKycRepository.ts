import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { customerKyc, customerKycDocuments } from '../db/schema/index.js';

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
}
