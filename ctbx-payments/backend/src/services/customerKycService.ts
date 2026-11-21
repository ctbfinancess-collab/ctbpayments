import { ApiError } from '../errors/ApiError.js';
import type { CustomerRepository } from '../repositories/CustomerRepository.js';
import type { CustomerKycRecord, CustomerKycRepository, KycDocumentKind, KycDocumentRecord, KycDocumentRepository, KycStatus } from '../repositories/CustomerKycRepository.js';
import { detectDocumentType, type EncryptedDocumentVault } from '../storage/EncryptedDocumentVault.js';
import { renderSubmissionReceivedTemplate } from '../emails/staffAndKycTemplates.js';
import type { EmailProvider } from '../providers/EmailProvider.js';

export interface SavePersonalInfoInput {
  birthDate?: string;
  motherName?: string;
  nationality?: string;
}

// Formato público — nome/CPF/e-mail/telefone vêm sempre de customers
// (nunca duplicados em customer_kyc, ver schema); só os campos
// complementares da Etapa 1 vêm da tabela nova.
export interface KycPersonalInfoView {
  status: KycStatus;
  name: string;
  document: string;
  email: string;
  phone: string;
  birthDate: string | null;
  motherName: string | null;
  nationality: string | null;
  personalInfoCompletedAt: string | null;
}

const MAX_PLAUSIBLE_AGE = 130;
export const MIN_AGE = 18;

// Maior de idade na data de hoje (UTC): completou 18 anos até hoje,
// inclusive no próprio aniversário. 29/02 vira 01/03 em anos não bissextos.
export function isAdult(birthDate: string, today: Date): boolean {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  const eighteenth = new Date(Date.UTC(y + MIN_AGE, m - 1, d));
  return eighteenth.getTime() <= today.getTime();
}

// ---- Fase 4: KYC completo ---------------------------------------------
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_KINDS: KycDocumentKind[] = ['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS'];
export const ID_DOCUMENT_TYPES = ['RG', 'CNH', 'RNE'] as const;
export const INCOME_RANGES = ['ATE_2K', 'DE_2K_A_5K', 'DE_5K_A_10K', 'DE_10K_A_20K', 'ACIMA_20K'] as const;
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export interface SaveAddressInput { cep: string; street: string; number: string; complement?: string; district: string; city: string; state: string }
export interface SaveDeclarationsInput { isPep: boolean; occupation: string; incomeRange: string }

export interface KycDocumentView { kind: KycDocumentKind; contentType: string; sizeBytes: number; uploadedAt: string }

export interface KycOverview {
  status: KycStatus;
  submittedAt: string | null;
  personalInfo: { birthDate: string | null; motherName: string | null; nationality: string | null; complete: boolean };
  address: { cep: string | null; street: string | null; number: string | null; complement: string | null; district: string | null; city: string | null; state: string | null; complete: boolean };
  declarations: { isPep: boolean | null; occupation: string | null; incomeRange: string | null; complete: boolean };
  documents: { idDocumentType: string | null; items: KycDocumentView[]; uploadsEnabled: boolean };
  missing: string[];
  canSubmit: boolean;
  editable: boolean;
  // Última decisão da análise (motivo visível ao cliente).
  review: { reason: string | null; reviewedAt: string | null };
}

// Depois de enviado para análise (ou aprovado, ou recusado), nada pode ser
// alterado pelo cliente. Se a análise pedir ajustes (CHANGES_REQUESTED),
// volta a ser editável e o cliente reenvia.
function assertEditable(kyc: CustomerKycRecord | undefined): void {
  if (kyc && (kyc.status === 'SUBMITTED' || kyc.status === 'APPROVED' || kyc.status === 'REJECTED')) {
    throw new ApiError('KYC_LOCKED', 'Seus dados já foram enviados para análise e não podem ser alterados agora.', { statusCode: 409 });
  }
}

function nextStatus(kyc: CustomerKycRecord | undefined): KycStatus {
  return kyc?.status === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : 'IN_PROGRESS';
}

// KYC — Etapa 1 (dados pessoais complementares do titular PF). Identidade
// SEMPRE vem de customerId já validado pela sessão real (ver
// requireCustomerSession + customerRoutes.ts) — este service nunca
// recebe nem confia em um customerId vindo do body/query de um cliente.
export class CustomerKycService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly kyc: CustomerKycRepository,
    private readonly now: () => Date = () => new Date(),
    // Fase 4 — documentos. Sem cofre configurado (ou com o envio desligado),
    // o envio de arquivos responde "indisponível"; o resto do KYC funciona.
    private readonly documents?: KycDocumentRepository,
    private readonly vault?: EncryptedDocumentVault,
    private readonly uploadsEnabled = false,
    // Confirmação "recebemos" ao enviar (falha de envio nunca afeta o cliente).
    private readonly email?: EmailProvider,
    private readonly appBaseUrl = 'http://localhost:8081',
  ) {}

  async getPersonalInfo(customerId: string): Promise<KycPersonalInfoView> {
    const customer = await this.customers.findById(customerId);
    if (!customer) throw new ApiError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', { statusCode: 404 });
    const kyc = await this.kyc.findByCustomerId(customerId);
    return this.toView(customer.name, customer.document, customer.email, customer.phone, kyc);
  }

  // "Salvar o progresso" — aceita um patch parcial (qualquer subconjunto
  // dos 3 campos) e faz merge com o que já estava salvo, pra permitir
  // "completar os campos faltantes" em chamadas separadas e "sair e
  // continuar depois". Um campo inválido derruba a chamada inteira (nada
  // é salvo pela metade); um campo já salvo nunca é apagado por uma
  // chamada que simplesmente não o reenvia.
  async savePersonalInfo(customerId: string, input: SavePersonalInfoInput): Promise<KycPersonalInfoView> {
    const customer = await this.customers.findById(customerId);
    if (!customer) throw new ApiError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', { statusCode: 404 });
    const existing = await this.kyc.findByCustomerId(customerId);
    assertEditable(existing);

    const birthDate = this.validateBirthDate(input.birthDate) ?? existing?.birthDate ?? null;
    const motherName = this.validateFreeText(input.motherName, 'KYC_MOTHER_NAME_INVALID', 'Nome da mãe inválido.') ?? existing?.motherName ?? null;
    const nationality = this.validateFreeText(input.nationality, 'KYC_NATIONALITY_INVALID', 'Nacionalidade inválida.') ?? existing?.nationality ?? null;

    const now = this.now();
    // Uma vez além de IN_PROGRESS (SUBMITTED/APPROVED/REJECTED — ainda
    // inalcançável nesta etapa, mas já protegido pra quando existir),
    // salvar dados pessoais não rebaixa o status geral do KYC.
    const status: KycStatus = existing?.status === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : 'IN_PROGRESS';
    const complete = Boolean(birthDate && motherName && nationality);
    const personalInfoCompletedAt = complete ? (existing?.personalInfoCompletedAt ?? now) : null;

    const saved = await this.kyc.upsertPersonalInfo(customerId, { status, birthDate, motherName, nationality, personalInfoCompletedAt }, now);
    return this.toView(customer.name, customer.document, customer.email, customer.phone, saved);
  }

  // ---- Fase 4 ----------------------------------------------------------
  async saveAddress(customerId: string, input: SaveAddressInput): Promise<KycOverview> {
    const existing = await this.requireEditable(customerId);
    const cep = input.cep.replace(/\D/g, '');
    if (cep.length !== 8) throw new ApiError('KYC_CEP_INVALID', 'CEP inválido.', { statusCode: 422 });
    const state = input.state.trim().toUpperCase();
    if (!UFS.includes(state)) throw new ApiError('KYC_STATE_INVALID', 'Estado (UF) inválido.', { statusCode: 422 });
    const street = this.requireText(input.street, 2, 160, 'KYC_STREET_INVALID', 'Informe a rua.');
    const number = this.requireText(input.number, 1, 20, 'KYC_NUMBER_INVALID', 'Informe o número (ou "S/N").');
    const district = this.requireText(input.district, 2, 80, 'KYC_DISTRICT_INVALID', 'Informe o bairro.');
    const city = this.requireText(input.city, 2, 80, 'KYC_CITY_INVALID', 'Informe a cidade.');
    const complement = input.complement?.trim() ? this.requireText(input.complement, 1, 80, 'KYC_COMPLEMENT_INVALID', 'Complemento muito longo.') : null;
    const now = this.now();
    await this.kyc.saveSection(customerId, {
      status: nextStatus(existing), addressCep: cep, addressStreet: street, addressNumber: number, addressComplement: complement,
      addressDistrict: district, addressCity: city, addressState: state, addressCompletedAt: existing?.addressCompletedAt ?? now,
    }, now);
    return this.getOverview(customerId);
  }

  async saveDeclarations(customerId: string, input: SaveDeclarationsInput): Promise<KycOverview> {
    const existing = await this.requireEditable(customerId);
    if (typeof input.isPep !== 'boolean') throw new ApiError('KYC_PEP_INVALID', 'Informe se você é pessoa politicamente exposta.', { statusCode: 422 });
    if (!(INCOME_RANGES as readonly string[]).includes(input.incomeRange)) throw new ApiError('KYC_INCOME_INVALID', 'Faixa de renda inválida.', { statusCode: 422 });
    const occupation = this.requireText(input.occupation, 2, 80, 'KYC_OCCUPATION_INVALID', 'Informe sua profissão.');
    const now = this.now();
    await this.kyc.saveSection(customerId, {
      status: nextStatus(existing), isPep: input.isPep, occupation, incomeRange: input.incomeRange,
      declarationsCompletedAt: existing?.declarationsCompletedAt ?? now,
    }, now);
    return this.getOverview(customerId);
  }

  async saveIdDocumentType(customerId: string, documentType: string): Promise<KycOverview> {
    const existing = await this.requireEditable(customerId);
    if (!(ID_DOCUMENT_TYPES as readonly string[]).includes(documentType)) throw new ApiError('KYC_DOCUMENT_TYPE_INVALID', 'Tipo de documento inválido.', { statusCode: 422 });
    await this.kyc.saveSection(customerId, { status: nextStatus(existing), idDocumentType: documentType }, this.now());
    return this.getOverview(customerId);
  }

  async uploadDocument(customerId: string, kind: string, bytes: Buffer): Promise<KycDocumentView> {
    if (!this.uploadsEnabled || !this.vault || !this.documents) {
      throw new ApiError('KYC_UPLOADS_DISABLED', 'O envio de documentos ainda não está disponível.', { statusCode: 503 });
    }
    const existing = await this.requireEditable(customerId);
    if (!(DOCUMENT_KINDS as string[]).includes(kind)) throw new ApiError('KYC_DOCUMENT_KIND_INVALID', 'Tipo de arquivo inválido.', { statusCode: 422 });
    if (bytes.length === 0) throw new ApiError('KYC_DOCUMENT_EMPTY', 'O arquivo está vazio.', { statusCode: 422 });
    if (bytes.length > MAX_DOCUMENT_BYTES) throw new ApiError('KYC_DOCUMENT_TOO_LARGE', 'O arquivo passa de 10 MB.', { statusCode: 413 });
    const contentType = detectDocumentType(bytes);
    if (!contentType) throw new ApiError('KYC_DOCUMENT_FORMAT_INVALID', 'Envie um arquivo JPG, PNG ou PDF.', { statusCode: 415 });
    if (kind === 'SELFIE' && contentType === 'application/pdf') throw new ApiError('KYC_DOCUMENT_FORMAT_INVALID', 'A selfie precisa ser uma foto (JPG ou PNG).', { statusCode: 415 });
    const sealed = await this.vault.seal(customerId, bytes);
    const now = this.now();
    const record = await this.documents.addReplacing({ customerId, kind: kind as KycDocumentKind, contentType, sizeBytes: bytes.length, ...sealed }, now);
    if (!existing || existing.status === 'NOT_STARTED') await this.kyc.saveSection(customerId, { status: 'IN_PROGRESS' }, now);
    return toDocumentView(record);
  }

  async getOverview(customerId: string): Promise<KycOverview> {
    const customer = await this.customers.findById(customerId);
    if (!customer) throw new ApiError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', { statusCode: 404 });
    const kyc = await this.kyc.findByCustomerId(customerId);
    const docs = this.documents ? await this.documents.listActive(customerId) : [];
    const byKind = new Map(docs.map((d) => [d.kind, d]));
    const personalComplete = Boolean(kyc?.birthDate && kyc?.motherName && kyc?.nationality);
    const addressComplete = Boolean(kyc?.addressCompletedAt);
    const declarationsComplete = Boolean(kyc?.declarationsCompletedAt);
    const missing: string[] = [];
    if (!personalComplete) missing.push('PERSONAL_INFO');
    if (!addressComplete) missing.push('ADDRESS');
    if (!declarationsComplete) missing.push('DECLARATIONS');
    if (!kyc?.idDocumentType) missing.push('ID_DOCUMENT_TYPE');
    if (!byKind.has('ID_FRONT')) missing.push('ID_FRONT');
    // Um PDF da frente pode trazer frente e verso juntos.
    if (!byKind.has('ID_BACK') && byKind.get('ID_FRONT')?.contentType !== 'application/pdf') missing.push('ID_BACK');
    if (!byKind.has('SELFIE')) missing.push('SELFIE');
    if (!byKind.has('PROOF_OF_ADDRESS')) missing.push('PROOF_OF_ADDRESS');
    const status = kyc?.status ?? 'NOT_STARTED';
    const editable = status !== 'SUBMITTED' && status !== 'APPROVED' && status !== 'REJECTED';
    return {
      status,
      submittedAt: kyc?.submittedAt ? kyc.submittedAt.toISOString() : null,
      personalInfo: { birthDate: kyc?.birthDate ?? null, motherName: kyc?.motherName ?? null, nationality: kyc?.nationality ?? null, complete: personalComplete },
      address: { cep: kyc?.addressCep ?? null, street: kyc?.addressStreet ?? null, number: kyc?.addressNumber ?? null, complement: kyc?.addressComplement ?? null, district: kyc?.addressDistrict ?? null, city: kyc?.addressCity ?? null, state: kyc?.addressState ?? null, complete: addressComplete },
      declarations: { isPep: kyc?.isPep ?? null, occupation: kyc?.occupation ?? null, incomeRange: kyc?.incomeRange ?? null, complete: declarationsComplete },
      documents: { idDocumentType: kyc?.idDocumentType ?? null, items: docs.map(toDocumentView), uploadsEnabled: Boolean(this.uploadsEnabled && this.vault && this.documents) },
      missing,
      canSubmit: editable && missing.length === 0,
      editable,
      review: { reason: kyc?.reviewReason ?? null, reviewedAt: kyc?.reviewedAt ? kyc.reviewedAt.toISOString() : null },
    };
  }

  async submit(customerId: string): Promise<KycOverview> {
    await this.requireEditable(customerId);
    const overview = await this.getOverview(customerId);
    if (overview.missing.length) {
      throw new ApiError('KYC_INCOMPLETE', 'Complete todas as etapas antes de enviar para análise.', { statusCode: 422, details: { missing: overview.missing } });
    }
    const now = this.now();
    // Dupla checagem: uma data salva antes da regra dos 18 anos não passa.
    const birthDate = overview.personalInfo.birthDate;
    if (birthDate && !isAdult(birthDate, now)) throw new ApiError('KYC_UNDERAGE', 'É preciso ter 18 anos ou mais para abrir uma conta.', { statusCode: 422 });
    await this.kyc.saveSection(customerId, { status: 'SUBMITTED', submittedAt: now }, now);
    const customer = await this.customers.findById(customerId);
    if (this.email && customer) {
      await this.email.send({ to: customer.email, ...renderSubmissionReceivedTemplate('KYC', `${this.appBaseUrl.replace(/\/$/, '')}/verificacao`) }).catch(() => undefined);
    }
    return this.getOverview(customerId);
  }

  // O cliente retira o envio da análise para corrigir algo — só enquanto
  // ninguém da equipe decidiu (troca atômica SUBMITTED → IN_PROGRESS).
  async withdraw(customerId: string): Promise<KycOverview> {
    const now = this.now();
    const ok = await this.kyc.transitionStatus(customerId, 'SUBMITTED', { status: 'IN_PROGRESS', submittedAt: null }, now);
    if (!ok) throw new ApiError('KYC_NOT_WITHDRAWABLE', 'Este envio não está mais em análise e não pode ser retirado.', { statusCode: 409 });
    return this.getOverview(customerId);
  }

  private async requireEditable(customerId: string): Promise<CustomerKycRecord | undefined> {
    const customer = await this.customers.findById(customerId);
    if (!customer) throw new ApiError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', { statusCode: 404 });
    const existing = await this.kyc.findByCustomerId(customerId);
    assertEditable(existing);
    return existing;
  }

  private requireText(value: string | undefined, min: number, max: number, code: string, message: string): string {
    const trimmed = (value ?? '').trim();
    if (trimmed.length < min || trimmed.length > max) throw new ApiError(code, message, { statusCode: 422 });
    return trimmed;
  }

  private validateBirthDate(value: string | undefined): string | undefined {
    if (value === undefined) return undefined;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const invalid = () => new ApiError('KYC_BIRTH_DATE_INVALID', 'Data de nascimento inválida.', { statusCode: 422 });
    if (!match) throw invalid();
    const [, y, m, d] = match as unknown as [string, string, string, string];
    const parsed = new Date(`${value}T00:00:00.000Z`);
    // Rejeita datas "estouradas" (ex.: 2024-02-30) que o Date normaliza
    // silenciosamente em vez de invalidar.
    if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== Number(y) || parsed.getUTCMonth() + 1 !== Number(m) || parsed.getUTCDate() !== Number(d)) throw invalid();
    const today = this.now();
    if (parsed.getTime() > today.getTime()) throw invalid();
    if (today.getUTCFullYear() - parsed.getUTCFullYear() > MAX_PLAUSIBLE_AGE) throw invalid();
    if (!isAdult(value, today)) throw new ApiError('KYC_UNDERAGE', 'É preciso ter 18 anos ou mais para abrir uma conta.', { statusCode: 422 });
    return value;
  }

  private validateFreeText(value: string | undefined, code: string, message: string): string | undefined {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    if (trimmed.length < 2) throw new ApiError(code, message, { statusCode: 422 });
    return trimmed;
  }

  private toView(name: string, document: string, email: string, phone: string, kyc: CustomerKycRecord | undefined): KycPersonalInfoView {
    return {
      status: kyc?.status ?? 'NOT_STARTED',
      name,
      // Fase 3: o CPF completo nunca sai da API (só os 3 dígitos do meio).
      document: `***.${document.slice(3, 6)}.***-**`,
      email,
      phone,
      birthDate: kyc?.birthDate ?? null,
      motherName: kyc?.motherName ?? null,
      nationality: kyc?.nationality ?? null,
      personalInfoCompletedAt: kyc?.personalInfoCompletedAt ? kyc.personalInfoCompletedAt.toISOString() : null,
    };
  }
}

function toDocumentView(d: KycDocumentRecord): KycDocumentView {
  return { kind: d.kind, contentType: d.contentType, sizeBytes: d.sizeBytes, uploadedAt: d.createdAt.toISOString() };
}
