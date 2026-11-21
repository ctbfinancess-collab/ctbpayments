import { randomUUID } from 'node:crypto';
import type { CustomerKycRecord, CustomerKycRepository, KycStatus, KycDocumentRecord, KycDocumentRepository, KycSectionPatch, NewKycDocument, PersonalInfoPatch } from './CustomerKycRepository.js';

const EMPTY = {
  status: 'NOT_STARTED' as const, birthDate: null, motherName: null, nationality: null, personalInfoCompletedAt: null,
  addressCep: null, addressStreet: null, addressNumber: null, addressComplement: null, addressDistrict: null, addressCity: null, addressState: null, addressCompletedAt: null,
  isPep: null, occupation: null, incomeRange: null, declarationsCompletedAt: null, idDocumentType: null, submittedAt: null, reviewReason: null, reviewedAt: null,
};

export class InMemoryCustomerKycRepository implements CustomerKycRepository {
  private readonly byCustomerId = new Map<string, CustomerKycRecord>();

  async findByCustomerId(customerId: string): Promise<CustomerKycRecord | undefined> {
    return this.byCustomerId.get(customerId);
  }

  async upsertPersonalInfo(customerId: string, patch: PersonalInfoPatch, now: Date): Promise<CustomerKycRecord> {
    return this.saveSection(customerId, patch, now);
  }

  async saveSection(customerId: string, patch: KycSectionPatch, now: Date): Promise<CustomerKycRecord> {
    const existing = this.byCustomerId.get(customerId);
    const record: CustomerKycRecord = { ...EMPTY, ...existing, ...patch, id: existing?.id ?? randomUUID(), customerId, createdAt: existing?.createdAt ?? now, updatedAt: now };
    this.byCustomerId.set(customerId, record);
    return record;
  }

  async transitionStatus(customerId: string, from: KycStatus, patch: KycSectionPatch, now: Date): Promise<boolean> {
    const existing = this.byCustomerId.get(customerId);
    if (!existing || existing.status !== from) return false;
    this.byCustomerId.set(customerId, { ...existing, ...patch, updatedAt: now });
    return true;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const k of this.byCustomerId.values()) out[k.status] = (out[k.status] ?? 0) + 1;
    return out;
  }

  async reviewStats(since: Date): Promise<{ reviewed: number; avgHours: number | null }> {
    const hours = [...this.byCustomerId.values()].filter((k) => k.reviewedAt && k.submittedAt && k.reviewedAt >= since).map((k) => (k.reviewedAt!.getTime() - k.submittedAt!.getTime()) / 3_600_000);
    return { reviewed: hours.length, avgHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null };
  }

  async listByStatus(status: KycStatus): Promise<CustomerKycRecord[]> {
    return [...this.byCustomerId.values()].filter((k) => k.status === status).sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0));
  }
}

export class InMemoryKycDocumentRepository implements KycDocumentRepository {
  readonly documents: KycDocumentRecord[] = [];

  async addReplacing(doc: NewKycDocument, now: Date): Promise<KycDocumentRecord> {
    for (const d of this.documents) {
      if (d.customerId === doc.customerId && d.kind === doc.kind && d.status === 'ACTIVE') { d.status = 'REPLACED'; d.replacedAt = now; }
    }
    const record: KycDocumentRecord = { ...doc, id: randomUUID(), status: 'ACTIVE', createdAt: now, replacedAt: null };
    this.documents.push(record);
    return record;
  }

  async listActive(customerId: string): Promise<KycDocumentRecord[]> {
    return this.documents.filter((d) => d.customerId === customerId && d.status === 'ACTIVE');
  }

  async findActiveById(customerId: string, documentId: string): Promise<KycDocumentRecord | undefined> {
    return this.documents.find((d) => d.id === documentId && d.customerId === customerId && d.status === 'ACTIVE');
  }
}
