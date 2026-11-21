import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { renderSecurityNoticeTemplate } from '../emails/securityNoticeTemplate.js';
import { ApiError } from '../errors/ApiError.js';
import type { EmailProvider } from '../providers/EmailProvider.js';
import type { CustomerRecord, CustomerRepository } from '../repositories/CustomerRepository.js';
import type { CustomerSessionRepository } from '../repositories/CustomerSessionRepository.js';
import { isValidCpf, onlyDigits } from '../utils/cpf.js';

export interface RegisterCustomerInput {
  name: string;
  document: string;
  email: string;
  phone: string;
  password: string;
}

// Formato público — nunca inclui passwordHash nem o documento completo.
export interface RegisteredCustomer {
  id: string;
  type: 'PF';
  name: string;
  email: string;
  documentMasked: string;
  status: string;
  createdAt: string;
}

// Formato exposto por login/sessão — mesmo espírito de RegisteredCustomer,
// mas sem createdAt/documentMasked (não fazem falta ali) e com o campo
// que o brief pediu pra já deixar pronto: dá pra, depois, olhar
// company_representatives por este mesmo id sem precisar de outro
// contrato de autenticação.
// Perfil para o painel (Fase 3) — o CPF e o telefone saem sempre mascarados.
export interface CustomerProfile {
  id: string;
  type: 'PF';
  name: string;
  email: string;
  emailVerified: boolean;
  documentMasked: string;
  phoneMasked: string;
  status: string;
  createdAt: string;
}

export interface AuthenticatedCustomer {
  id: string;
  type: 'PF';
  name: string;
  email: string;
  status: string;
}

// Resultado do cadastro. `customer` só existe quando uma conta nova foi
// criada; quando o e-mail ou o CPF já existem, a rota responde exatamente
// igual (sem revelar se o dado está cadastrado) e, se o e-mail já tem
// conta, o titular recebe um aviso.
export interface RegisterCustomerResult {
  customer: RegisteredCustomer | null;
}

export interface CustomerLoginResult {
  token: string;
  expiresAt: Date;
  customer: AuthenticatedCustomer;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '****';
  const ddd = digits.length >= 10 ? `(${digits.slice(0, 2)}) ` : '';
  const local = digits.length >= 10 ? digits.slice(2) : digits;
  return `${ddd}${'*'.repeat(local.length - 4)}-${local.slice(-4)}`;
}

function maskCpf(cpf: string): string {
  return `***.${cpf.slice(3, 6)}.***-**`;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toAuthenticatedCustomer(customer: CustomerRecord): AuthenticatedCustomer {
  return { id: customer.id, type: 'PF', name: customer.name, email: customer.email, status: customer.status };
}

// Customer Identity — Etapa 2 (login real). PF e representante de PJ
// usam a MESMA identidade (customers) — uma empresa nunca tem senha
// própria (ver company_representatives.ts). Verificação de e-mail e
// recuperação de senha continuam sendo etapas seguintes; login aqui não
// depende de e-mail verificado (nenhum fluxo de verificação existe ainda).
export class CustomerAuthService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly sessions: CustomerSessionRepository,
    private readonly now: () => Date = () => new Date(),
    // Avisos de segurança (senha alterada, tentativa de cadastro com e-mail
    // existente). Opcional: sem e-mail configurado, nada é enviado.
    private readonly notifier?: EmailProvider,
  ) {}

  private async notify(to: string, kind: Parameters<typeof renderSecurityNoticeTemplate>[0]): Promise<void> {
    if (!this.notifier) return;
    const { subject, html, text } = renderSecurityNoticeTemplate(kind);
    await this.notifier.send({ to, subject, html, text }).catch(() => undefined);
  }

  async register(input: RegisterCustomerInput): Promise<RegisterCustomerResult> {
    const email = input.email.trim().toLowerCase();
    const document = onlyDigits(input.document);
    const name = input.name.trim();
    const phone = input.phone.trim();

    if (!isValidCpf(document)) throw new ApiError('CUSTOMER_DOCUMENT_INVALID', 'CPF inválido.', { statusCode: 422 });
    if (!name) throw new ApiError('CUSTOMER_NAME_INVALID', 'Nome inválido.', { statusCode: 422 });
    if (!phone) throw new ApiError('CUSTOMER_PHONE_INVALID', 'Telefone inválido.', { statusCode: 422 });

    // Nunca revela se o e-mail ou o CPF já existem (evita descobrir quem é
    // cliente a partir de um CPF). Sempre calcula o hash da senha, para o
    // tempo de resposta ser o mesmo nos dois casos.
    const passwordHash = await argon2.hash(input.password);
    const existingByEmail = await this.customers.findByEmail(email);
    if (existingByEmail) {
      await this.notify(existingByEmail.email, 'ACCOUNT_EXISTS');
      return { customer: null };
    }
    if (await this.customers.findByDocument(document)) return { customer: null };

    let row: CustomerRecord;
    try {
      row = await this.customers.create({ type: 'PF', name, document, email, phone, passwordHash });
    } catch (error) {
      // Dois cadastros simultâneos com o mesmo e-mail/CPF: a restrição de
      // unicidade do banco barra o segundo — tratado como duplicado, nunca 500.
      if (isUniqueViolation(error)) return { customer: null };
      throw error;
    }
    return { customer: { id: row.id, type: 'PF', name: row.name, email: row.email, documentMasked: maskCpf(row.document), status: row.status, createdAt: row.createdAt.toISOString() } };
  }

  // Retorna null tanto pra e-mail inexistente quanto pra senha errada —
  // nunca revela qual dos dois falhou (mesmo padrão de AdminAuthService).
  // Sempre roda um hash "fantasma" quando o e-mail não existe, pra o
  // tempo de resposta não vazar se o e-mail está cadastrado.
  async login(email: string, password: string): Promise<CustomerLoginResult | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const customer = await this.customers.findByEmail(normalizedEmail);
    if (!customer) {
      await argon2.hash(password).catch(() => undefined);
      return null;
    }
    const valid = await argon2.verify(customer.passwordHash, password).catch(() => false);
    if (!valid) return null;
    // Conta suspensa pela equipe (Fase 6): avisada só a quem acertou a senha.
    if (customer.status !== 'ACTIVE') {
      throw new ApiError('CUSTOMER_BLOCKED', 'Sua conta está suspensa. Fale com o atendimento: contato@ctbxpayments.com.', { statusCode: 403 });
    }
    // Só entra quem confirmou o e-mail. Este erro só aparece para quem
    // acertou a senha, então não revela a existência da conta a terceiros.
    if (!customer.emailVerifiedAt) {
      throw new ApiError('CUSTOMER_EMAIL_NOT_VERIFIED', 'Confirme seu e-mail para entrar. Enviamos um link no cadastro.', { statusCode: 403 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(this.now().getTime() + SESSION_TTL_MS);
    await this.sessions.create({ customerId: customer.id, tokenHash: hashToken(token), expiresAt });
    return { token, expiresAt, customer: toAuthenticatedCustomer(customer) };
  }

  async getProfile(customerId: string): Promise<CustomerProfile> {
    const row = await this.customers.findById(customerId);
    if (!row) throw new ApiError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', { statusCode: 404 });
    return {
      id: row.id, type: 'PF', name: row.name, email: row.email, emailVerified: Boolean(row.emailVerifiedAt),
      documentMasked: maskCpf(row.document), phoneMasked: maskPhone(row.phone), status: row.status, createdAt: row.createdAt.toISOString(),
    };
  }

  // Só para a auditoria interna de logins que falharam (nunca exposto).
  async findIdByEmail(email: string): Promise<string | undefined> {
    return (await this.customers.findByEmail(email.trim().toLowerCase()))?.id;
  }

  async validateSession(token: string): Promise<AuthenticatedCustomer | null> {
    const session = await this.sessions.findByTokenHash(hashToken(token));
    if (!session || session.revokedAt || session.expiresAt.getTime() < this.now().getTime()) return null;
    const customer = await this.customers.findById(session.customerId);
    if (!customer || customer.status !== 'ACTIVE') return null;
    return toAuthenticatedCustomer(customer);
  }

  async logout(token: string): Promise<void> {
    await this.sessions.revoke(hashToken(token));
  }

  // Troca de senha autenticada (diferente da recuperação — aqui o
  // cliente já está logado e confirma a senha ATUAL, não um token de
  // e-mail). Ao trocar, revoga toda sessão existente (inclusive a que fez
  // a chamada) e já devolve uma sessão nova — mesmo espírito de segurança
  // de CustomerPasswordResetService.confirmReset (nenhuma sessão antiga
  // sobrevive a uma troca de senha), mas sem derrubar quem acabou de
  // trocar no meio do fluxo.
  async changePassword(customerId: string, currentPassword: string, newPassword: string): Promise<CustomerLoginResult> {
    const customer = await this.customers.findById(customerId);
    if (!customer || customer.status !== 'ACTIVE') throw new ApiError('CUSTOMER_PASSWORD_CHANGE_INVALID', 'Senha atual incorreta.', { statusCode: 401 });
    const valid = await argon2.verify(customer.passwordHash, currentPassword).catch(() => false);
    if (!valid) throw new ApiError('CUSTOMER_PASSWORD_CHANGE_INVALID', 'Senha atual incorreta.', { statusCode: 401 });

    const now = this.now();
    const passwordHash = await argon2.hash(newPassword);
    await this.customers.updatePasswordHash(customer.id, passwordHash, now);
    await this.sessions.revokeAllForCustomer(customer.id);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await this.sessions.create({ customerId: customer.id, tokenHash: hashToken(token), expiresAt });
    await this.notify(customer.email, 'PASSWORD_CHANGED');
    return { token, expiresAt, customer: toAuthenticatedCustomer(customer) };
  }
}

// Código 23505 do PostgreSQL = violação de restrição UNIQUE.
function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | undefined;
  return e?.code === '23505' || e?.cause?.code === '23505';
}
