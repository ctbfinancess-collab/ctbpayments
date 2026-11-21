import { randomUUID } from 'node:crypto';
import type { CustomerKycRecord, CustomerKycRepository, KycDocumentRecord, KycDocumentRepository, KycSectionPatch, NewKycDocument, PersonalInfoPatch } from './CustomerKycRepository.js';

const EMPTY = {
  status: 'NOT_STARTED' as const, birthDate: null, motherName: null, nationality: null, personalInfoCompletedAt: null,
  addressCep: null, addressStreet: null, addressNumber: null, addressComplement: null, addressDistrict: null, addressCity: null, addressState: null, addressCompletedAt: null,
  isPep: null, occupation: null, incomeRange: null, declarationsCompletedAt: null, idDocumentType: null, submittedAt: null,
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
}
