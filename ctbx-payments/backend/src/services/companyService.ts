import { ApiError } from '../errors/ApiError.js';
import type { CompanyDocumentKind, CompanyDocumentRecord, CompanyRecord, CompanyRepository, CompanyStatus } from '../repositories/CompanyRepository.js';
import type { CompanyRepresentativeRepository } from '../repositories/CompanyRepresentativeRepository.js';
import type { CustomerKycRepository } from '../repositories/CustomerKycRepository.js';
import { detectDocumentType, type EncryptedDocumentVault } from '../storage/EncryptedDocumentVault.js';
import { isValidCnpj, onlyDigits } from '../utils/cnpj.js';
import { MAX_DOCUMENT_BYTES } from './customerKycService.js';

// Fase 5 — pedido de conta PJ (KYB), lado do cliente.
// Regras antifraude:
//  - só quem tem a identidade verificada (KYC APROVADO) pode pedir;
//  - o pedido nunca revela se o CNPJ já é cliente: vários pedidos podem
//    existir para o mesmo CNPJ e a equipe decide (o banco só permite UM
//    aprovado por CNPJ);
//  - o vínculo do cliente com a empresa fica PENDENTE até a aprovação.
export const COMPANY_POSITIONS = ['SOCIO_ADMINISTRADOR', 'SOCIO', 'ADMINISTRADOR', 'PROCURADOR'] as const;
export const COMPANY_REVENUE_RANGES = ['ATE_81K', 'DE_81K_A_360K', 'DE_360K_A_4_8M', 'ACIMA_4_8M'] as const;
export const COMPANY_DOCUMENT_KINDS: CompanyDocumentKind[] = ['SOCIAL_CONTRACT', 'ADDRESS_PROOF', 'POWER_OF_ATTORNEY', 'CNPJ_CARD'];
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const EDITABLE: CompanyStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];

export interface SaveCompanyDataInput {
  legalName: string; tradeName?: string; openingDate: string; legalNature: string; mainActivity: string;
  businessEmail: string; businessPhone: string; annualRevenueRange: string; applicantPosition: string;
}
export interface SaveCompanyAddressInput { cep: string; street: string; number: string; complement?: string; district: string; city: string; state: string }

export interface CompanyDocumentView { kind: CompanyDocumentKind; contentType: string; sizeBytes: number; uploadedAt: string }
export interface CompanyOverview {
  id: string; cnpj: string; status: CompanyStatus; submittedAt: string | null;
  data: { legalName: string; tradeName: string | null; openingDate: string | null; legalNature: string | null; mainActivity: string | null; businessEmail: string | null; businessPhone: string | null; annualRevenueRange: string | null; applicantPosition: string | null; complete: boolean };
  address: { cep: string | null; street: string | null; number: string | null; complement: string | null; district: string | null; city: string | null; state: string | null; complete: boolean };
  documents: { items: CompanyDocumentView[]; uploadsEnabled: boolean; powerOfAttorneyRequired: boolean };
  missing: string[]; canSubmit: boolean; editable: boolean;
  review: { reason: string | null; reviewedAt: string | null };
}

const text = (v: string | undefined, min: number, max: number, code: string, msg: string) => {
  const t = (v ?? '').trim();
  if (t.length < min || t.length > max) throw new ApiError(code, msg, { statusCode: 422 });
  return t;
};

export class CompanyService {
  constructor(
    private readonly companies: CompanyRepository,
    private readonly representatives: CompanyRepresentativeRepository,
    private readonly kyc: CustomerKycRepository,
    private readonly vault?: EncryptedDocumentVault,
    private readonly uploadsEnabled = false,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(customerId: string, cnpjInput: string): Promise<CompanyOverview> {
    const kyc = await this.kyc.findByCustomerId(customerId);
    if (kyc?.status !== 'APPROVED') throw new ApiError('COMPANY_KYC_REQUIRED', 'Para abrir uma conta PJ, primeiro conclua a verificação da sua identidade.', { statusCode: 403 });
    const cnpj = onlyDigits(cnpjInput);
    if (!isValidCnpj(cnpj)) throw new ApiError('COMPANY_CNPJ_INVALID', 'CNPJ inválido.', { statusCode: 422 });
    // Só olha os pedidos DESTE cliente — nunca revela pedidos de terceiros.
    for (const link of await this.representatives.listByCustomer(customerId)) {
      const c = await this.companies.findById(link.companyId);
      if (c && c.cnpj === cnpj && c.status !== 'REJECTED') throw new ApiError('COMPANY_ALREADY_REQUESTED', 'Você já tem um pedido para este CNPJ.', { statusCode: 409 });
    }
    const now = this.now();
    const company = await this.companies.create({ cnpj, legalName: '', applicantCustomerId: customerId }, now);
    await this.representatives.create({ companyId: company.id, customerId, role: 'ADMIN' });
    return this.overview(company);
  }

  async list(customerId: string): Promise<CompanyOverview[]> {
    const out: CompanyOverview[] = [];
    for (const link of await this.representatives.listByCustomer(customerId)) {
      if (link.status === 'REMOVED') continue;
      const c = await this.companies.findById(link.companyId);
      if (c) out.push(await this.overview(c));
    }
    return out.sort((a, b) => a.cnpj.localeCompare(b.cnpj));
  }

  async get(customerId: string, companyId: string): Promise<CompanyOverview> {
    return this.overview(await this.requireMember(customerId, companyId));
  }

  async saveData(customerId: string, companyId: string, input: SaveCompanyDataInput): Promise<CompanyOverview> {
    const c = await this.requireEditable(customerId, companyId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.openingDate) || Number.isNaN(Date.parse(`${input.openingDate}T00:00:00Z`)) || new Date(`${input.openingDate}T00:00:00Z`) > this.now()) {
      throw new ApiError('COMPANY_OPENING_DATE_INVALID', 'Data de abertura inválida.', { statusCode: 422 });
    }
    if (!(COMPANY_POSITIONS as readonly string[]).includes(input.applicantPosition)) throw new ApiError('COMPANY_POSITION_INVALID', 'Cargo inválido.', { statusCode: 422 });
    if (!(COMPANY_REVENUE_RANGES as readonly string[]).includes(input.annualRevenueRange)) throw new ApiError('COMPANY_REVENUE_INVALID', 'Faixa de faturamento inválida.', { statusCode: 422 });
    const email = input.businessEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('COMPANY_EMAIL_INVALID', 'E-mail da empresa inválido.', { statusCode: 422 });
    const phone = onlyDigits(input.businessPhone);
    if (phone.length < 10 || phone.length > 11) throw new ApiError('COMPANY_PHONE_INVALID', 'Telefone da empresa inválido.', { statusCode: 422 });
    const now = this.now();
    const saved = await this.companies.update(c.id, {
      legalName: text(input.legalName, 2, 200, 'COMPANY_LEGAL_NAME_INVALID', 'Informe a razão social.'),
      tradeName: input.tradeName?.trim() ? text(input.tradeName, 1, 200, 'COMPANY_TRADE_NAME_INVALID', 'Nome fantasia muito longo.') : null,
      openingDate: input.openingDate,
      legalNature: text(input.legalNature, 2, 160, 'COMPANY_LEGAL_NATURE_INVALID', 'Informe a natureza jurídica.'),
      mainActivity: text(input.mainActivity, 2, 300, 'COMPANY_ACTIVITY_INVALID', 'Informe a atividade principal.'),
      businessEmail: email, businessPhone: phone, annualRevenueRange: input.annualRevenueRange, applicantPosition: input.applicantPosition,
      dataCompletedAt: c.dataCompletedAt ?? now,
    }, now);
    return this.overview(saved);
  }

  async saveAddress(customerId: string, companyId: string, input: SaveCompanyAddressInput): Promise<CompanyOverview> {
    const c = await this.requireEditable(customerId, companyId);
    const cep = onlyDigits(input.cep);
    if (cep.length !== 8) throw new ApiError('COMPANY_CEP_INVALID', 'CEP inválido.', { statusCode: 422 });
    const state = input.state.trim().toUpperCase();
    if (!UFS.includes(state)) throw new ApiError('COMPANY_STATE_INVALID', 'Estado (UF) inválido.', { statusCode: 422 });
    const now = this.now();
    const saved = await this.companies.update(c.id, {
      addressCep: cep, addressState: state,
      addressStreet: text(input.street, 2, 160, 'COMPANY_STREET_INVALID', 'Informe a rua.'),
      addressNumber: text(input.number, 1, 20, 'COMPANY_NUMBER_INVALID', 'Informe o número (ou "S/N").'),
      addressComplement: input.complement?.trim() ? text(input.complement, 1, 80, 'COMPANY_COMPLEMENT_INVALID', 'Complemento muito longo.') : null,
      addressDistrict: text(input.district, 2, 80, 'COMPANY_DISTRICT_INVALID', 'Informe o bairro.'),
      addressCity: text(input.city, 2, 80, 'COMPANY_CITY_INVALID', 'Informe a cidade.'),
      addressCompletedAt: c.addressCompletedAt ?? now,
    }, now);
    return this.overview(saved);
  }

  async uploadDocument(customerId: string, companyId: string, kind: string, bytes: Buffer): Promise<CompanyDocumentView> {
    if (!this.uploadsEnabled || !this.vault) throw new ApiError('KYC_UPLOADS_DISABLED', 'O envio de documentos ainda não está disponível.', { statusCode: 503 });
    const c = await this.requireEditable(customerId, companyId);
    if (!(COMPANY_DOCUMENT_KINDS as string[]).includes(kind)) throw new ApiError('COMPANY_DOCUMENT_KIND_INVALID', 'Tipo de documento inválido.', { statusCode: 422 });
    if (!bytes.length) throw new ApiError('KYC_DOCUMENT_EMPTY', 'O arquivo está vazio.', { statusCode: 422 });
    if (bytes.length > MAX_DOCUMENT_BYTES) throw new ApiError('KYC_DOCUMENT_TOO_LARGE', 'O arquivo passa de 10 MB.', { statusCode: 413 });
    const contentType = detectDocumentType(bytes);
    if (!contentType) throw new ApiError('KYC_DOCUMENT_FORMAT_INVALID', 'Envie um arquivo JPG, PNG ou PDF.', { statusCode: 415 });
    const sealed = await this.vault.seal(`company-${c.id}`, bytes);
    const doc = await this.companies.addDocumentReplacing({ companyId: c.id, uploadedByCustomerId: customerId, kind: kind as CompanyDocumentKind, contentType, sizeBytes: bytes.length, ...sealed }, this.now());
    return toDocView(doc);
  }

  async submit(customerId: string, companyId: string): Promise<CompanyOverview> {
    const c = await this.requireEditable(customerId, companyId);
    const ov = await this.overview(c);
    if (ov.missing.length) throw new ApiError('COMPANY_INCOMPLETE', 'Complete todas as etapas antes de enviar para análise.', { statusCode: 422, details: { missing: ov.missing } });
    const kyc = await this.kyc.findByCustomerId(customerId);
    if (kyc?.status !== 'APPROVED') throw new ApiError('COMPANY_KYC_REQUIRED', 'Para abrir uma conta PJ, primeiro conclua a verificação da sua identidade.', { statusCode: 403 });
    const now = this.now();
    if (!(await this.companies.transitionStatus(c.id, c.status, { status: 'SUBMITTED', submittedAt: now }, now))) {
      throw new ApiError('COMPANY_LOCKED', 'Este pedido já foi enviado para análise.', { statusCode: 409 });
    }
    return this.get(customerId, companyId);
  }

  async withdraw(customerId: string, companyId: string): Promise<CompanyOverview> {
    const c = await this.requireMember(customerId, companyId);
    const now = this.now();
    if (!(await this.companies.transitionStatus(c.id, 'SUBMITTED', { status: 'DRAFT', submittedAt: null }, now))) {
      throw new ApiError('COMPANY_NOT_WITHDRAWABLE', 'Este pedido não está mais em análise e não pode ser retirado.', { statusCode: 409 });
    }
    return this.get(customerId, companyId);
  }

  private async requireMember(customerId: string, companyId: string): Promise<CompanyRecord> {
    const link = await this.representatives.findByCompanyAndCustomer(companyId, customerId);
    const c = link && link.status !== 'REMOVED' ? await this.companies.findById(companyId) : undefined;
    // 404 tanto para "não existe" quanto para "não é seu": nunca revela pedidos alheios.
    if (!c) throw new ApiError('COMPANY_NOT_FOUND', 'Empresa não encontrada.', { statusCode: 404 });
    return c;
  }

  private async requireEditable(customerId: string, companyId: string): Promise<CompanyRecord> {
    const c = await this.requireMember(customerId, companyId);
    if (!EDITABLE.includes(c.status)) throw new ApiError('COMPANY_LOCKED', 'Este pedido já foi enviado para análise e não pode ser alterado agora.', { statusCode: 409 });
    return c;
  }

  private async overview(c: CompanyRecord): Promise<CompanyOverview> {
    const docs = await this.companies.listActiveDocuments(c.id);
    const kinds = new Set(docs.map((d) => d.kind));
    const poaRequired = c.applicantPosition === 'PROCURADOR';
    const missing: string[] = [];
    if (!c.dataCompletedAt) missing.push('COMPANY_DATA');
    if (!c.addressCompletedAt) missing.push('COMPANY_ADDRESS');
    if (!kinds.has('SOCIAL_CONTRACT')) missing.push('SOCIAL_CONTRACT');
    if (!kinds.has('ADDRESS_PROOF')) missing.push('ADDRESS_PROOF');
    if (poaRequired && !kinds.has('POWER_OF_ATTORNEY')) missing.push('POWER_OF_ATTORNEY');
    const editable = EDITABLE.includes(c.status);
    return {
      id: c.id, cnpj: c.cnpj, status: c.status, submittedAt: c.submittedAt ? c.submittedAt.toISOString() : null,
      data: { legalName: c.legalName, tradeName: c.tradeName, openingDate: c.openingDate, legalNature: c.legalNature, mainActivity: c.mainActivity, businessEmail: c.businessEmail, businessPhone: c.businessPhone, annualRevenueRange: c.annualRevenueRange, applicantPosition: c.applicantPosition, complete: Boolean(c.dataCompletedAt) },
      address: { cep: c.addressCep, street: c.addressStreet, number: c.addressNumber, complement: c.addressComplement, district: c.addressDistrict, city: c.addressCity, state: c.addressState, complete: Boolean(c.addressCompletedAt) },
      documents: { items: docs.map(toDocView), uploadsEnabled: Boolean(this.uploadsEnabled && this.vault), powerOfAttorneyRequired: poaRequired },
      missing, canSubmit: editable && missing.length === 0, editable,
      review: { reason: c.reviewReason, reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null },
    };
  }
}

function toDocView(d: CompanyDocumentRecord): CompanyDocumentView {
  return { kind: d.kind, contentType: d.contentType, sizeBytes: d.sizeBytes, uploadedAt: d.createdAt.toISOString() };
}
