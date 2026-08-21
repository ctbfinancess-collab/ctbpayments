import { ApiError } from '../errors/ApiError.js';
import type { CustomerRepository } from '../repositories/CustomerRepository.js';
import type { CustomerKycRecord, CustomerKycRepository, KycStatus } from '../repositories/CustomerKycRepository.js';

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

// KYC — Etapa 1 (dados pessoais complementares do titular PF). Identidade
// SEMPRE vem de customerId já validado pela sessão real (ver
// requireCustomerSession + customerRoutes.ts) — este service nunca
// recebe nem confia em um customerId vindo do body/query de um cliente.
export class CustomerKycService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly kyc: CustomerKycRepository,
    private readonly now: () => Date = () => new Date(),
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

    const birthDate = this.validateBirthDate(input.birthDate) ?? existing?.birthDate ?? null;
    const motherName = this.validateFreeText(input.motherName, 'KYC_MOTHER_NAME_INVALID', 'Nome da mãe inválido.') ?? existing?.motherName ?? null;
    const nationality = this.validateFreeText(input.nationality, 'KYC_NATIONALITY_INVALID', 'Nacionalidade inválida.') ?? existing?.nationality ?? null;

    const now = this.now();
    // Uma vez além de IN_PROGRESS (SUBMITTED/APPROVED/REJECTED — ainda
    // inalcançável nesta etapa, mas já protegido pra quando existir),
    // salvar dados pessoais não rebaixa o status geral do KYC.
    const status: KycStatus = existing && existing.status !== 'NOT_STARTED' && existing.status !== 'IN_PROGRESS' ? existing.status : 'IN_PROGRESS';
    const complete = Boolean(birthDate && motherName && nationality);
    const personalInfoCompletedAt = complete ? (existing?.personalInfoCompletedAt ?? now) : null;

    const saved = await this.kyc.upsertPersonalInfo(customerId, { status, birthDate, motherName, nationality, personalInfoCompletedAt }, now);
    return this.toView(customer.name, customer.document, customer.email, customer.phone, saved);
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
      document,
      email,
      phone,
      birthDate: kyc?.birthDate ?? null,
      motherName: kyc?.motherName ?? null,
      nationality: kyc?.nationality ?? null,
      personalInfoCompletedAt: kyc?.personalInfoCompletedAt ? kyc.personalInfoCompletedAt.toISOString() : null,
    };
  }
}
