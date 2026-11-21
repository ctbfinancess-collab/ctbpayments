import { and, asc, count, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { companies, companyDocuments, companyReviews } from '../db/schema/index.js';

// Fase 5 — pedido de conta PJ. Ver db/schema/companies.ts.
export type CompanyStatus = 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
export type CompanyDocumentKind = 'SOCIAL_CONTRACT' | 'ADDRESS_PROOF' | 'POWER_OF_ATTORNEY' | 'CNPJ_CARD';
export type CompanyDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

export interface CompanyRecord {
  id: string;
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  status: CompanyStatus;
  applicantCustomerId: string | null;
  applicantPosition: string | null;
  openingDate: string | null;
  legalNature: string | null;
  mainActivity: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  annualRevenueRange: string | null;
  dataCompletedAt: Date | null;
  addressCep: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressCompletedAt: Date | null;
  submittedAt: Date | null;
  reviewReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CompanyPatch = Partial<Omit<CompanyRecord, 'id' | 'cnpj' | 'createdAt' | 'updatedAt'>>;

export interface CompanyDocumentRecord {
  id: string;
  companyId: string;
  uploadedByCustomerId: string;
  kind: CompanyDocumentKind;
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
export type NewCompanyDocument = Omit<CompanyDocumentRecord, 'id' | 'status' | 'createdAt' | 'replacedAt'>;

export interface CompanyReviewRecord { id: string; companyId: string; staffId: string; decision: CompanyDecision; reason: string | null; createdAt: Date }

export interface CompanyRepository {
  create(input: { cnpj: string; legalName: string; applicantCustomerId: string }, now: Date): Promise<CompanyRecord>;
  findById(id: string): Promise<CompanyRecord | undefined>;
  listByCnpj(cnpj: string): Promise<CompanyRecord[]>;
  listByStatus(status: CompanyStatus): Promise<CompanyRecord[]>;
  update(id: string, patch: CompanyPatch, now: Date): Promise<CompanyRecord>;
  // Muda a situação só se ainda estiver em `from` (atômico). true = mudou.
  transitionStatus(id: string, from: CompanyStatus, patch: CompanyPatch, now: Date): Promise<boolean>;
  addDocumentReplacing(doc: NewCompanyDocument, now: Date): Promise<CompanyDocumentRecord>;
  listActiveDocuments(companyId: string): Promise<CompanyDocumentRecord[]>;
  findActiveDocument(companyId: string, documentId: string): Promise<CompanyDocumentRecord | undefined>;
  addReview(review: Omit<CompanyReviewRecord, 'id'>): Promise<CompanyReviewRecord>;
  listReviews(companyId: string): Promise<CompanyReviewRecord[]>;
  countByStatus(): Promise<Record<string, number>>;
}

export class PostgresCompanyRepository implements CompanyRepository {
  constructor(private readonly db: Db) {}

  async create(input: { cnpj: string; legalName: string; applicantCustomerId: string }, now: Date) {
    const [row] = await this.db.insert(companies).values({ ...input, status: 'DRAFT', createdAt: now, updatedAt: now }).returning();
    if (!row) throw new Error('Failed to create company');
    return row as CompanyRecord;
  }
  async findById(id: string) {
    const [row] = await this.db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return row as CompanyRecord | undefined;
  }
  async listByCnpj(cnpj: string) {
    return (await this.db.select().from(companies).where(eq(companies.cnpj, cnpj)).orderBy(asc(companies.createdAt))) as CompanyRecord[];
  }
  async listByStatus(status: CompanyStatus) {
    return (await this.db.select().from(companies).where(eq(companies.status, status)).orderBy(asc(companies.submittedAt))) as CompanyRecord[];
  }
  async update(id: string, patch: CompanyPatch, now: Date) {
    const [row] = await this.db.update(companies).set({ ...patch, updatedAt: now }).where(eq(companies.id, id)).returning();
    if (!row) throw new Error('Company not found');
    return row as CompanyRecord;
  }
  async transitionStatus(id: string, from: CompanyStatus, patch: CompanyPatch, now: Date) {
    const rows = await this.db.update(companies).set({ ...patch, updatedAt: now }).where(and(eq(companies.id, id), eq(companies.status, from))).returning({ id: companies.id });
    return rows.length > 0;
  }
  async addDocumentReplacing(doc: NewCompanyDocument, now: Date) {
    return this.db.transaction(async (tx) => {
      await tx.update(companyDocuments).set({ status: 'REPLACED', replacedAt: now })
        .where(and(eq(companyDocuments.companyId, doc.companyId), eq(companyDocuments.kind, doc.kind), eq(companyDocuments.status, 'ACTIVE')));
      const [row] = await tx.insert(companyDocuments).values({ ...doc, status: 'ACTIVE', createdAt: now }).returning();
      if (!row) throw new Error('Failed to save company document');
      return row as CompanyDocumentRecord;
    });
  }
  async listActiveDocuments(companyId: string) {
    return (await this.db.select().from(companyDocuments).where(and(eq(companyDocuments.companyId, companyId), eq(companyDocuments.status, 'ACTIVE')))) as CompanyDocumentRecord[];
  }
  async findActiveDocument(companyId: string, documentId: string) {
    const [row] = await this.db.select().from(companyDocuments)
      .where(and(eq(companyDocuments.id, documentId), eq(companyDocuments.companyId, companyId), eq(companyDocuments.status, 'ACTIVE'))).limit(1);
    return row as CompanyDocumentRecord | undefined;
  }
  async addReview(review: Omit<CompanyReviewRecord, 'id'>) {
    const [row] = await this.db.insert(companyReviews).values(review).returning();
    return row as CompanyReviewRecord;
  }
  async countByStatus() {
    const rows = await this.db.select({ status: companies.status, n: count() }).from(companies).groupBy(companies.status);
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
  }
  async listReviews(companyId: string) {
    return (await this.db.select().from(companyReviews).where(eq(companyReviews.companyId, companyId)).orderBy(desc(companyReviews.createdAt))) as CompanyReviewRecord[];
  }
}
