import { renderKycDecisionTemplate } from '../emails/staffAndKycTemplates.js';
import { ApiError } from '../errors/ApiError.js';
import type { EmailProvider } from '../providers/EmailProvider.js';
import type { CustomerKycRepository, KycDocumentRepository } from '../repositories/CustomerKycRepository.js';
import type { CustomerRepository } from '../repositories/CustomerRepository.js';
import type { KycDecision, StaffRepository } from '../repositories/StaffRepository.js';
import type { EncryptedDocumentVault } from '../storage/EncryptedDocumentVault.js';
import type { AuthenticatedStaff } from './staffAuthService.js';

// Análise de KYC pela equipe. A decisão:
//  - APPROVED: identidade verificada. NÃO libera nenhuma operação financeira
//    (não existe nenhuma ligada a este status).
//  - CHANGES_REQUESTED: o cliente corrige e reenvia (motivo obrigatório).
//  - REJECTED: recusa definitiva, fundamentada (motivo obrigatório).
// O cliente recebe um e-mail em cada decisão.
export const KYC_DECISIONS: KycDecision[] = ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'];

export class KycReviewService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly kyc: CustomerKycRepository,
    private readonly documents: KycDocumentRepository,
    private readonly staff: StaffRepository,
    private readonly vault: EncryptedDocumentVault | undefined,
    private readonly email: EmailProvider | undefined,
    private readonly customerAppBaseUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async queue() {
    const pending = await this.kyc.listByStatus('SUBMITTED');
    const items = [];
    for (const k of pending) {
      const c = await this.customers.findById(k.customerId);
      if (c) items.push({ customerId: c.id, name: c.name, documentMasked: `***.${c.document.slice(3, 6)}.***-**`, submittedAt: k.submittedAt ? k.submittedAt.toISOString() : null });
    }
    return items;
  }

  async caseDetail(customerId: string) {
    const c = await this.customers.findById(customerId);
    const k = await this.kyc.findByCustomerId(customerId);
    if (!c || !k) throw new ApiError('KYC_CASE_NOT_FOUND', 'Caso não encontrado.', { statusCode: 404 });
    const docs = await this.documents.listActive(customerId);
    const reviews = await this.staff.listReviews(customerId);
    const names = new Map<string, string>();
    for (const r of reviews) if (!names.has(r.staffId)) names.set(r.staffId, (await this.staff.findUserById(r.staffId))?.name ?? '—');
    return {
      customer: { id: c.id, name: c.name, document: c.document, email: c.email, emailVerified: Boolean(c.emailVerifiedAt), phone: c.phone, createdAt: c.createdAt.toISOString() },
      kyc: {
        status: k.status, submittedAt: k.submittedAt ? k.submittedAt.toISOString() : null,
        birthDate: k.birthDate, motherName: k.motherName, nationality: k.nationality,
        address: { cep: k.addressCep, street: k.addressStreet, number: k.addressNumber, complement: k.addressComplement, district: k.addressDistrict, city: k.addressCity, state: k.addressState },
        isPep: k.isPep, occupation: k.occupation, incomeRange: k.incomeRange, idDocumentType: k.idDocumentType,
      },
      documents: docs.map((d) => ({ id: d.id, kind: d.kind, contentType: d.contentType, sizeBytes: d.sizeBytes, sha256: d.sha256, uploadedAt: d.createdAt.toISOString() })),
      reviews: reviews.map((r) => ({ decision: r.decision, reason: r.reason, staffName: names.get(r.staffId) ?? '—', createdAt: r.createdAt.toISOString() })),
    };
  }

  async openDocument(customerId: string, documentId: string): Promise<{ contentType: string; bytes: Buffer; kind: string }> {
    if (!this.vault) throw new ApiError('KYC_VAULT_NOT_CONFIGURED', 'Cofre de documentos não configurado.', { statusCode: 503 });
    const doc = await this.documents.findActiveById(customerId, documentId);
    if (!doc) throw new ApiError('KYC_DOCUMENT_NOT_FOUND', 'Documento não encontrado.', { statusCode: 404 });
    return { contentType: doc.contentType, bytes: await this.vault.open(doc), kind: doc.kind };
  }

  async decide(actor: AuthenticatedStaff, customerId: string, decision: string, reason: string | undefined) {
    if (!KYC_DECISIONS.includes(decision as KycDecision)) throw new ApiError('KYC_DECISION_INVALID', 'Decisão inválida.', { statusCode: 422 });
    const text = (reason ?? '').trim();
    if (decision !== 'APPROVED' && (text.length < 10 || text.length > 1000)) {
      throw new ApiError('KYC_REASON_REQUIRED', 'Explique o motivo para o cliente (de 10 a 1.000 caracteres).', { statusCode: 422 });
    }
    const customer = await this.customers.findById(customerId);
    if (!customer) throw new ApiError('KYC_CASE_NOT_FOUND', 'Caso não encontrado.', { statusCode: 404 });
    const now = this.now();
    const finalReason = decision === 'APPROVED' ? null : text;
    const changed = await this.kyc.transitionStatus(customerId, 'SUBMITTED', { status: decision as KycDecision, reviewReason: finalReason, reviewedAt: now }, now);
    if (!changed) throw new ApiError('KYC_NOT_PENDING', 'Este caso não está mais aguardando análise (talvez outra pessoa já tenha decidido).', { statusCode: 409 });
    await this.staff.addReview({ customerId, staffId: actor.id, decision: decision as KycDecision, reason: finalReason, createdAt: now });
    let notified = false;
    if (this.email) {
      const mail = renderKycDecisionTemplate(decision as KycDecision, finalReason, `${this.customerAppBaseUrl.replace(/\/$/, '')}/verificacao`);
      notified = await this.email.send({ to: customer.email, ...mail }).then(() => true, () => false);
    }
    return { status: decision, notified };
  }
}
