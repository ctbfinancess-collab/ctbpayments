import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { renderChangeEmailTemplate } from '../emails/changeEmailTemplate.js';
import { ApiError } from '../errors/ApiError.js';
import type { EmailProvider } from '../providers/EmailProvider.js';
import type { CustomerEmailChangeRepository } from '../repositories/CustomerEmailChangeRepository.js';
import type { CustomerRepository } from '../repositories/CustomerRepository.js';

const CHANGE_TTL_MS = 30 * 60_000; // 30 minutos — mesma janela das outras confirmações por e-mail
const RESEND_COOLDOWN_MS = 60_000; // 1 minuto entre pedidos pra mesma conta
const DEV_FALLBACK_BASE_URL = 'http://localhost:8081';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Troca de e-mail autenticada — diferente de tudo em Customer Identity
// até aqui (verificação/reset são sempre "silenciosos", nunca revelam
// nada): esta é uma ação de conta já logada, sobre a PRÓPRIA conta, então
// pode e deve ser explícita sobre erros (senha atual errada, e-mail já
// usado por outra conta) — o mesmo espírito de RegisterCustomer.
export class CustomerEmailChangeService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly changes: CustomerEmailChangeRepository,
    private readonly emailProvider: EmailProvider,
    private readonly appBaseUrl: string | undefined,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // Exige a senha ATUAL como reautenticação (mesma exigência de
  // changePassword) — mudar o e-mail de contato é sensível o bastante pra
  // não bastar só ter uma sessão válida. O e-mail em customers só muda
  // quando o token abaixo é confirmado, nunca aqui.
  async requestChange(customerId: string, newEmail: string, currentPassword: string): Promise<void> {
    const customer = await this.customers.findById(customerId);
    if (!customer || customer.status !== 'ACTIVE') throw new ApiError('CUSTOMER_EMAIL_CHANGE_INVALID', 'Senha atual incorreta.', { statusCode: 401 });
    const valid = await argon2.verify(customer.passwordHash, currentPassword).catch(() => false);
    if (!valid) throw new ApiError('CUSTOMER_EMAIL_CHANGE_INVALID', 'Senha atual incorreta.', { statusCode: 401 });

    const normalizedEmail = newEmail.trim().toLowerCase();
    if (normalizedEmail === customer.email) throw new ApiError('CUSTOMER_EMAIL_CHANGE_SAME_EMAIL', 'Este já é o e-mail cadastrado.', { statusCode: 422 });
    if (await this.customers.findByEmail(normalizedEmail)) throw new ApiError('CUSTOMER_EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.', { statusCode: 409 });

    const latest = await this.changes.findLatestByCustomer(customer.id);
    if (latest && this.now().getTime() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) throw new ApiError('CUSTOMER_EMAIL_CHANGE_COOLDOWN', 'Aguarde antes de pedir uma nova troca.', { statusCode: 429, retryable: true });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(this.now().getTime() + CHANGE_TTL_MS);
    await this.changes.create({ customerId: customer.id, newEmail: normalizedEmail, tokenHash: hashToken(token), expiresAt });
    const confirmUrl = `${this.appBaseUrl || DEV_FALLBACK_BASE_URL}/confirm-email-change?token=${token}`;
    const { subject, html, text } = renderChangeEmailTemplate({ confirmUrl, expiresInMinutes: CHANGE_TTL_MS / 60_000 });
    await this.emailProvider.send({ to: normalizedEmail, subject, html, text });
  }

  // Token inválido, expirado OU já usado devolvem o MESMO erro genérico —
  // mesmo espírito de confirm() em verificação/reset (aqui sim, sem
  // sessão nem senha, é só o token de posse do e-mail que autoriza).
  // Revalida que o e-mail não foi registrado por outra conta ENTRE o
  // pedido e a confirmação (corrida improvável, mas barata de checar).
  async confirmChange(token: string): Promise<void> {
    const record = await this.changes.findByTokenHash(hashToken(token));
    if (!record || record.consumedAt || record.expiresAt.getTime() < this.now().getTime()) {
      throw new ApiError('CUSTOMER_EMAIL_CHANGE_TOKEN_INVALID', 'Link de confirmação inválido ou expirado.', { statusCode: 400 });
    }
    if (await this.customers.findByEmail(record.newEmail)) {
      throw new ApiError('CUSTOMER_EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.', { statusCode: 409 });
    }
    const consumedAt = this.now();
    await this.changes.markConsumed(record.tokenHash, consumedAt);
    await this.customers.updateEmail(record.customerId, record.newEmail, consumedAt);
  }
}
