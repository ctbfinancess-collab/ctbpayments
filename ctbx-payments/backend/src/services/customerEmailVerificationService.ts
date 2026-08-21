import { createHash, randomBytes } from 'node:crypto';
import { renderVerifyEmailTemplate } from '../emails/verifyEmailTemplate.js';
import { ApiError } from '../errors/ApiError.js';
import type { EmailProvider } from '../providers/EmailProvider.js';
import type { CustomerEmailVerificationRepository } from '../repositories/CustomerEmailVerificationRepository.js';
import type { CustomerRepository } from '../repositories/CustomerRepository.js';

const VERIFICATION_TTL_MS = 30 * 60_000; // 30 minutos
const RESEND_COOLDOWN_MS = 60_000; // 1 minuto entre reenvios pra mesma conta
// Sem domínio real decidido ainda (ver config/env.ts, CUSTOMER_APP_BASE_URL
// — propositalmente vazio). Fallback só de desenvolvimento local, nunca
// usado se a variável estiver configurada.
const DEV_FALLBACK_BASE_URL = 'http://localhost:8081';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Customer Identity — Etapa 3 (verificação real de e-mail). Usa o
// EmailProvider já criado na Etapa 1 (nunca chama o Resend diretamente
// aqui) — em produção é o ResendEmailProvider de verdade; em dev/test,
// automaticamente o InMemoryEmailProvider (nenhum e-mail real sai sem
// querer, ver createEmailProvider.ts).
export class CustomerEmailVerificationService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly verifications: CustomerEmailVerificationRepository,
    private readonly emailProvider: EmailProvider,
    private readonly appBaseUrl: string | undefined,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // Gera o token, persiste só o hash, e envia o e-mail. Chamado
  // internamente logo após um cadastro bem-sucedido (ver routes/customers.ts)
  // e pelo reenvio — nunca lança pra fora: se o customerId não existir
  // (não deveria acontecer, chamado sempre com um id recém-criado), só
  // não faz nada.
  async sendVerification(customerId: string): Promise<void> {
    const customer = await this.customers.findById(customerId);
    if (!customer) return;
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(this.now().getTime() + VERIFICATION_TTL_MS);
    await this.verifications.create({ customerId: customer.id, tokenHash: hashToken(token), expiresAt });
    const verificationUrl = `${this.appBaseUrl || DEV_FALLBACK_BASE_URL}/verify-email?token=${token}`;
    const { subject, html, text } = renderVerifyEmailTemplate({ verificationUrl, expiresInMinutes: VERIFICATION_TTL_MS / 60_000 });
    await this.emailProvider.send({ to: customer.email, subject, html, text });
  }

  // Token inválido, expirado OU já usado devolvem o MESMO erro genérico —
  // não precisa (nem ajuda) diferenciar pro cliente qual dos três
  // aconteceu; internamente cada caso já é auditável pela linha em
  // customer_email_verifications (consumedAt/expiresAt).
  async confirm(token: string): Promise<void> {
    const record = await this.verifications.findByTokenHash(hashToken(token));
    if (!record || record.consumedAt || record.expiresAt.getTime() < this.now().getTime()) {
      throw new ApiError('CUSTOMER_EMAIL_VERIFICATION_INVALID', 'Link de verificação inválido ou expirado.', { statusCode: 400 });
    }
    const consumedAt = this.now();
    await this.verifications.markConsumed(record.tokenHash, consumedAt);
    await this.customers.markEmailVerified(record.customerId, consumedAt);
  }

  // Sempre "silencioso": nunca lança, nunca diferencia e-mail inexistente
  // de já verificado de cooldown ativo — a rota sempre devolve a mesma
  // resposta genérica pra quem chamou (ver routes/customers.ts), então
  // não há como uma tentativa de enumeração aprender nada daqui.
  async resend(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const customer = await this.customers.findByEmail(normalizedEmail);
    if (!customer || customer.emailVerifiedAt) return;
    const latest = await this.verifications.findLatestByCustomer(customer.id);
    if (latest && this.now().getTime() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) return;
    await this.sendVerification(customer.id);
  }
}
