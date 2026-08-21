import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { renderResetPasswordTemplate } from '../emails/resetPasswordTemplate.js';
import { ApiError } from '../errors/ApiError.js';
import type { EmailProvider } from '../providers/EmailProvider.js';
import type { CustomerPasswordResetRepository } from '../repositories/CustomerPasswordResetRepository.js';
import type { CustomerRepository } from '../repositories/CustomerRepository.js';
import type { CustomerSessionRepository } from '../repositories/CustomerSessionRepository.js';

const RESET_TTL_MS = 30 * 60_000; // 30 minutos — mesma janela da verificação de e-mail
const RESEND_COOLDOWN_MS = 60_000; // 1 minuto entre pedidos pra mesma conta
// Sem domínio real decidido ainda (ver config/env.ts, CUSTOMER_APP_BASE_URL
// — propositalmente vazio). Fallback só de desenvolvimento local, nunca
// usado se a variável estiver configurada.
const DEV_FALLBACK_BASE_URL = 'http://localhost:8081';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Customer Identity — recuperação de senha. Mesmo padrão de segurança de
// CustomerEmailVerificationService: resposta sempre genérica (nunca
// revela se o e-mail existe), token de uso único com hash persistido,
// cooldown contra abuso. Diferença: ao confirmar a troca, revoga TODAS
// as sessões ativas da conta — quem pediu o reset não deve continuar
// logado em nenhuma sessão antiga.
export class CustomerPasswordResetService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly resets: CustomerPasswordResetRepository,
    private readonly sessions: CustomerSessionRepository,
    private readonly emailProvider: EmailProvider,
    private readonly appBaseUrl: string | undefined,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // Sempre "silencioso": nunca lança, nunca diferencia e-mail inexistente
  // de cooldown ativo — a rota sempre devolve a mesma resposta genérica
  // pra quem chamou, então não há como uma tentativa de enumeração
  // aprender nada daqui.
  async requestReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const customer = await this.customers.findByEmail(normalizedEmail);
    if (!customer || customer.status !== 'ACTIVE') return;
    const latest = await this.resets.findLatestByCustomer(customer.id);
    if (latest && this.now().getTime() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) return;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(this.now().getTime() + RESET_TTL_MS);
    await this.resets.create({ customerId: customer.id, tokenHash: hashToken(token), expiresAt });
    const resetUrl = `${this.appBaseUrl || DEV_FALLBACK_BASE_URL}/reset-password?token=${token}`;
    const { subject, html, text } = renderResetPasswordTemplate({ resetUrl, expiresInMinutes: RESET_TTL_MS / 60_000 });
    await this.emailProvider.send({ to: customer.email, subject, html, text });
  }

  // Token inválido, expirado OU já usado devolvem o MESMO erro genérico —
  // mesmo espírito de CustomerEmailVerificationService.confirm.
  async confirmReset(token: string, newPassword: string): Promise<void> {
    const record = await this.resets.findByTokenHash(hashToken(token));
    if (!record || record.consumedAt || record.expiresAt.getTime() < this.now().getTime()) {
      throw new ApiError('CUSTOMER_PASSWORD_RESET_INVALID', 'Link de redefinição inválido ou expirado.', { statusCode: 400 });
    }
    const consumedAt = this.now();
    const passwordHash = await argon2.hash(newPassword);
    await this.resets.markConsumed(record.tokenHash, consumedAt);
    await this.customers.updatePasswordHash(record.customerId, passwordHash, consumedAt);
    await this.sessions.revokeAllForCustomer(record.customerId);
  }
}
