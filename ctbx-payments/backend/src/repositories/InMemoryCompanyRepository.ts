import { randomUUID } from 'node:crypto';
import type { CompanyDocumentRecord, CompanyPatch, CompanyRecord, CompanyRepository, CompanyReviewRecord, CompanyStatus, NewCompanyDocument } from './CompanyRepository.js';

const EMPTY = {
  tradeName: null, applicantPosition: null, openingDate: null, legalNature: null, mainActivity: null, businessEmail: null, businessPhone: null,
  annualRevenueRange: null, dataCompletedAt: null, addressCep: null, addressStreet: null, addressNumber: null, addressComplement: null,
  addressDistrict: null, addressCity: null, addressState: null, addressCompletedAt: null, submittedAt: null, reviewReason: null, reviewedAt: null,
};

import { monthKey } from '../utils/monthKey.js';
export class InMemoryCompanyRepository implements CompanyRepository {
  readonly companies: CompanyRecord[] = [];
  readonly documents: CompanyDocumentRecord[] = [];
  readonly reviews: CompanyReviewRecord[] = [];

  async create(input: { cnpj: string; legalName: string; applicantCustomerId: string }, now: Date) {
    const c: CompanyRecord = { ...EMPTY, ...input, id: randomUUID(), status: 'DRAFT', createdAt: now, updatedAt: now };
    this.companies.push(c);
    return { ...c };
  }
  async findById(id: string) { const c = this.companies.find((x) => x.id === id); return c && { ...c }; }
  async listByCnpj(cnpj: string) { return this.companies.filter((c) => c.cnpj === cnpj).map((c) => ({ ...c })); }
  async listByStatus(status: CompanyStatus) {
    return this.companies.filter((c) => c.status === status).sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0)).map((c) => ({ ...c }));
  }
  async update(id: string, patch: CompanyPatch, now: Date) {
    const c = this.companies.find((x) => x.id === id);
    if (!c) throw new Error('Company not found');
    Object.assign(c, patch, { updatedAt: now });
    return { ...c };
  }
  async transitionStatus(id: string, from: CompanyStatus, patch: CompanyPatch, now: Date) {
    const c = this.companies.find((x) => x.id === id);
    if (!c || c.status !== from) return false;
    // Igual ao índice único parcial do Postgres: um só APROVADO por CNPJ.
    if (patch.status === 'APPROVED' && this.companies.some((o) => o.id !== id && o.cnpj === c.cnpj && o.status === 'APPROVED')) {
      throw Object.assign(new Error('duplicate key'), { code: '23505' });
    }
    Object.assign(c, patch, { updatedAt: now });
    return true;
  }
  async addDocumentReplacing(doc: NewCompanyDocument, now: Date) {
    for (const d of this.documents) if (d.companyId === doc.companyId && d.kind === doc.kind && d.status === 'ACTIVE') { d.status = 'REPLACED'; d.replacedAt = now; }
    const r: CompanyDocumentRecord = { ...doc, id: randomUUID(), status: 'ACTIVE', createdAt: now, replacedAt: null };
    this.documents.push(r);
    return { ...r };
  }
  async listActiveDocuments(companyId: string) { return this.documents.filter((d) => d.companyId === companyId && d.status === 'ACTIVE'); }
  async findActiveDocument(companyId: string, documentId: string) { return this.documents.find((d) => d.id === documentId && d.companyId === companyId && d.status === 'ACTIVE'); }
  async addReview(review: Omit<CompanyReviewRecord, 'id'>) { const r = { ...review, id: randomUUID() }; this.reviews.push(r); return { ...r }; }
  async countByStatus() { const out: Record<string, number> = {}; for (const c of this.companies) out[c.status] = (out[c.status] ?? 0) + 1; return out; }
  async countCreatedByMonth(since: Date) { const out: Record<string, number> = {}; for (const c of this.companies) if (c.createdAt >= since) { const k = monthKey(c.createdAt); out[k] = (out[k] ?? 0) + 1; } return out; }
  async listReviews(companyId: string) { return this.reviews.filter((r) => r.companyId === companyId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); }
}
