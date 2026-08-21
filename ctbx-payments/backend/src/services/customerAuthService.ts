import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { ApiError } from '../errors/ApiError.js';
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
export interface AuthenticatedCustomer {
  id: string;
  type: 'PF';
  name: string;
  email: string;
  status: string;
}

export interface CustomerLoginResult {
  token: string;
  expiresAt: Date;
  customer: AuthenticatedCustomer;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

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
  ) {}

  async register(input: RegisterCustomerInput): Promise<RegisteredCustomer> {
    const email = input.email.trim().toLowerCase();
    const document = onlyDigits(input.document);
    const name = input.name.trim();
    const phone = input.phone.trim();

    if (!isValidCpf(document)) throw new ApiError('CUSTOMER_DOCUMENT_INVALID', 'CPF inválido.', { statusCode: 422 });
    if (!name) throw new ApiError('CUSTOMER_NAME_INVALID', 'Nome inválido.', { statusCode: 422 });
    if (!phone) throw new ApiError('CUSTOMER_PHONE_INVALID', 'Telefone inválido.', { statusCode: 422 });

    // Mesma lógica de "não vazar qual campo já existe primeiro" não se
    // aplica aqui (diferente do login) — cadastro precisa dizer
    // exatamente qual dado está duplicado pro cliente poder corrigir.
    if (await this.customers.findByEmail(email)) throw new ApiError('CUSTOMER_EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.', { statusCode: 409 });
    if (await this.customers.findByDocument(document)) throw new ApiError('CUSTOMER_DOCUMENT_ALREADY_REGISTERED', 'Este CPF já está cadastrado.', { statusCode: 409 });

    const passwordHash = await argon2.hash(input.password);
    const row = await this.customers.create({ type: 'PF', name, document, email, phone, passwordHash });
    return { id: row.id, type: 'PF', name: row.name, email: row.email, documentMasked: maskCpf(row.document), status: row.status, createdAt: row.createdAt.toISOString() };
  }

  // Retorna null tanto pra e-mail inexistente quanto pra senha errada —
  // nunca revela qual dos dois falhou (mesmo padrão de AdminAuthService).
  // Sempre roda um hash "fantasma" quando o e-mail não existe, pra o
  // tempo de resposta não vazar se o e-mail está cadastrado.
  async login(email: string, password: string): Promise<CustomerLoginResult | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const customer = await this.customers.findByEmail(normalizedEmail);
    if (!customer || customer.status !== 'ACTIVE') {
      await argon2.hash(password).catch(() => undefined);
      return null;
    }
    const valid = await argon2.verify(customer.passwordHash, password).catch(() => false);
    if (!valid) return null;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(this.now().getTime() + SESSION_TTL_MS);
    await this.sessions.create({ customerId: customer.id, tokenHash: hashToken(token), expiresAt });
    return { token, expiresAt, customer: toAuthenticatedCustomer(customer) };
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
    return { token, expiresAt, customer: toAuthenticatedCustomer(customer) };
  }
}
