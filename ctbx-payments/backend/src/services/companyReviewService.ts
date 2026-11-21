import { renderCompanyDecisionTemplate } from '../emails/staffAndKycTemplates.js';
import { ApiError } from '../errors/ApiError.js';
import type { EmailProvider } from '../providers/EmailProvider.js';
import type { CompanyDecision, CompanyRepository } from '../repositories/CompanyRepository.js';
import type { CompanyRepresentativeRepository } from '../repositories/CompanyRepresentativeRepository.js';
import type { CustomerKycRepository } from '../repositories/CustomerKycRepository.js';
import type { CustomerRepository } from '../repositories/CustomerRepository.js';
import type { StaffRepository } from '../repositories/StaffRepository.js';
import type { EncryptedDocumentVault } from '../storage/EncryptedDocumentVault.js';
import { isUniqueViolation } from '../providers/sandbox/persistedIdempotency.js';
import { lookupCnpj, type CnpjLookupResult } from './cnpjLookup.js';
import type { AuthenticatedStaff } from './staffAuthService.js';

// Análise dos pedidos de conta PJ pela equipe (Fase 5). A aprovação ativa o
// vínculo do cliente com a empresa, mas NÃO libera nenhuma operação
// financeira. Só um pedido aprovado por CNPJ (garantido pelo banco).
const DECISIONS: CompanyDecision[] = ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'];

export class CompanyReviewService {
  constructor(
    private readonly companies: CompanyRepository,
    private readonly representatives: CompanyRepresentativeRepository,
    private readonly customers: CustomerRepository,
    private readonly kyc: CustomerKycRepository,
    private readonly staff: StaffRepository,
    private readonly vault: EncryptedDocumentVault | undefined,
    private readonly email: EmailProvider | undefined,
    private readonly customerAppBaseUrl: string,
    private readonly lookup: (cnpj: string) => Promise<CnpjLookupResult> = (cnpj) => lookupCnpj(cnpj),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async queue() {
    const items = [];
    for (const c of await this.companies.listByStatus('SUBMITTED')) {
      const applicant = c.applicantCustomerId ? await this.customers.findById(c.applicantCustomerId) : undefined;
      items.push({ companyId: c.id, cnpj: c.cnpj, legalName: c.legalName, tradeName: c.tradeName, applicantName: applicant?.name ?? '—', submittedAt: c.submittedAt ? c.submittedAt.toISOString() : null });
    }
    return items;
  }

  async caseDetail(companyId: string) {
    const c = await this.companies.findById(companyId);
    if (!c) throw new ApiError('COMPANY_CASE_NOT_FOUND', 'Pedido não encontrado.', { statusCode: 404 });
    const applicant = c.applicantCustomerId ? await this.customers.findById(c.applicantCustomerId) : undefined;
    const applicantKyc = applicant ? await this.kyc.findByCustomerId(applicant.id) : undefined;
    const others = (await this.companies.listByCnpj(c.cnpj)).filter((o) => o.id !== c.id);
    const reviews = await this.companies.listReviews(c.id);
    const names = new Map<string, string>();
    for (const r of reviews) if (!names.has(r.staffId)) names.set(r.staffId, (await this.staff.findUserById(r.staffId))?.name ?? '—');
    const receita = await this.lookup(c.cnpj);
    return {
      company: {
        id: c.id, cnpj: c.cnpj, status: c.status, submittedAt: c.submittedAt ? c.submittedAt.toISOString() : null,
        legalName: c.legalName, tradeName: c.tradeName, openingDate: c.openingDate, legalNature: c.legalNature, mainActivity: c.mainActivity,
        businessEmail: c.businessEmail, businessPhone: c.businessPhone, annualRevenueRange: c.annualRevenueRange, applicantPosition: c.applicantPosition,
        address: { cep: c.addressCep, street: c.addressStreet, number: c.addressNumber, complement: c.addressComplement, district: c.addressDistrict, city: c.addressCity, state: c.addressState },
      },
      applicant: applicant ? { id: applicant.id, name: applicant.name, document: applicant.document, email: applicant.email, kycStatus: applicantKyc?.status ?? 'NOT_STARTED' } : null,
      // Alertas para a análise: outros pedidos do mesmo CNPJ e se já existe um aprovado.
      conflicts: { otherApplications: others.length, approvedElsewhere: others.some((o) => o.status === 'APPROVED') },
      receita,
      documents: (await this.companies.listActiveDocuments(c.id)).map((d) => ({ id: d.id, kind: d.kind, contentType: d.contentType, sizeBytes: d.sizeBytes, uploadedAt: d.createdAt.toISOString() })),
      reviews: reviews.map((r) => ({ decision: r.decision, reason: r.reason, staffName: names.get(r.staffId) ?? '—', createdAt: r.createdAt.toISOString() })),
    };
  }

  async openDocument(companyId: string, documentId: string) {
    if (!this.vault) throw new ApiError('KYC_VAULT_NOT_CONFIGURED', 'Cofre de documentos não configurado.', { statusCode: 503 });
    const doc = await this.companies.findActiveDocument(companyId, documentId);
    if (!doc) throw new ApiError('COMPANY_DOCUMENT_NOT_FOUND', 'Documento não encontrado.', { statusCode: 404 });
    return { contentType: doc.contentType, bytes: await this.vault.open(doc), kind: doc.kind };
  }

  async decide(actor: AuthenticatedStaff, companyId: string, decision: string, reason: string | undefined) {
    if (!DECISIONS.includes(decision as CompanyDecision)) throw new ApiError('KYC_DECISION_INVALID', 'Decisão inválida.', { statusCode: 422 });
    const text = (reason ?? '').trim();
    if (decision !== 'APPROVED' && (text.length < 10 || text.length > 1000)) throw new ApiError('KYC_REASON_REQUIRED', 'Explique o motivo para o cliente (de 10 a 1.000 caracteres).', { statusCode: 422 });
    const c = await this.companies.findById(companyId);
    if (!c) throw new ApiError('COMPANY_CASE_NOT_FOUND', 'Pedido não encontrado.', { statusCode: 404 });
    if (decision === 'APPROVED') {
      const applicantKyc = c.applicantCustomerId ? await this.kyc.findByCustomerId(c.applicantCustomerId) : undefined;
      if (applicantKyc?.status !== 'APPROVED') throw new ApiError('COMPANY_APPLICANT_KYC_NOT_APPROVED', 'A identidade de quem pediu não está aprovada.', { statusCode: 409 });
    }
    const now = this.now();
    const finalReason = decision === 'APPROVED' ? null : text;
    let changed: boolean;
    try {
      changed = await this.companies.transitionStatus(companyId, 'SUBMITTED', { status: decision as CompanyDecision, reviewReason: finalReason, reviewedAt: now }, now);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError('COMPANY_CNPJ_ALREADY_APPROVED', 'Já existe outra conta PJ aprovada para este CNPJ.', { statusCode: 409 });
      throw error;
    }
    if (!changed) throw new ApiError('KYC_NOT_PENDING', 'Este pedido não está mais aguardando análise (talvez outra pessoa já tenha decidido).', { statusCode: 409 });
    if (decision === 'APPROVED') await this.representatives.setStatusForCompany(companyId, 'ACTIVE', now);
    // Recusado: o vínculo continua PENDENTE (nunca ativo), para o cliente ver o motivo.
    await this.companies.addReview({ companyId, staffId: actor.id, decision: decision as CompanyDecision, reason: finalReason, createdAt: now });
    let notified = false;
    const applicant = c.applicantCustomerId ? await this.customers.findById(c.applicantCustomerId) : undefined;
    if (this.email && applicant) {
      const mail = renderCompanyDecisionTemplate(decision as CompanyDecision, c.tradeName || c.legalName, finalReason, `${this.customerAppBaseUrl.replace(/\/$/, '')}/empresas`);
      notified = await this.email.send({ to: applicant.email, ...mail }).then(() => true, () => false);
    }
    return { status: decision, notified };
  }
}
