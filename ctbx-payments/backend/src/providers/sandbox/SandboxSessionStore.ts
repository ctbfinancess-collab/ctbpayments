import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Account, User } from '../../domain/models.js';
import { ApiError } from '../../errors/ApiError.js';
import type { SandboxSessionRecord, SandboxSessionRepository } from '../../repositories/SandboxSessionRepository.js';
import type { AuthContext, AuthResult, SessionStore } from '../ports.js';

interface StoreOptions {
  environment: string;
  now?: () => number;
  accessTtlMs?: number;
  refreshTtlMs?: number;
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const token = (kind: 'at' | 'rt') => `sbx_${kind}_${randomBytes(32).toString('base64url')}`;

// Etapa 1 da consolidação de arquitetura: a lógica de rotação/expiração/
// reuso continua toda aqui (nada mudou nesse contrato — SessionStore
// continua a mesma interface de ports.ts) — só a ONDE os dados ficam
// guardados mudou, de Map() em memória pra um SandboxSessionRepository
// injetado (Postgres de verdade em produção/dev real, ou
// InMemorySandboxSessionRepository como fallback/testes). Nunca guarda
// senha; só o hash SHA-256 dos tokens (nunca o token em texto puro).
export class SandboxSessionStore implements SessionStore {
  private readonly now: () => number;
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;

  constructor(private readonly repository: SandboxSessionRepository, options: StoreOptions) {
    if (options.environment === 'production') throw new Error('SandboxSessionStore is forbidden in production');
    this.now = options.now ?? Date.now;
    this.accessTtlMs = options.accessTtlMs ?? 15 * 60_000;
    this.refreshTtlMs = options.refreshTtlMs ?? 8 * 60 * 60_000;
  }

  async create(input: { user: User; account: Account; deviceId: string }): Promise<AuthResult> {
    const sessionId = `sbx_ses_${randomUUID()}`;
    const accessToken = token('at');
    const refreshToken = token('rt');
    const issuedAt = this.now();
    const stored = await this.repository.create({
      id: sessionId, userId: input.user.id, accountId: input.account.id, deviceId: input.deviceId,
      user: input.user, account: input.account,
      accessTokenHash: hash(accessToken), refreshTokenHash: hash(refreshToken),
      expiresAt: new Date(issuedAt + this.accessTtlMs), refreshExpiresAt: new Date(issuedAt + this.refreshTtlMs),
    });
    return this.toResult(stored, accessToken, refreshToken);
  }

  async getByAccessToken(accessToken: string): Promise<AuthContext | undefined> {
    const session = await this.repository.findByAccessTokenHash(hash(accessToken));
    if (!session || session.revokedAt) return undefined;
    if (session.expiresAt.getTime() <= this.now()) {
      throw new ApiError('AUTH_ACCESS_TOKEN_EXPIRED', 'O access token expirou.', { statusCode: 401 });
    }
    return this.toContext(session);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const current = await this.repository.findByRefreshTokenHash(hash(refreshToken));
    if (!current) throw new ApiError('AUTH_REFRESH_TOKEN_INVALID', 'Refresh token inválido.', { statusCode: 401 });
    // rotatedAt só é setado por este mesmo método (linha abaixo) — encontrar
    // uma sessão com rotatedAt já preenchido significa que esse refresh
    // token específico já foi usado uma vez pra gerar outro par de tokens.
    if (current.rotatedAt) throw new ApiError('AUTH_REFRESH_TOKEN_REUSED', 'O refresh token já foi utilizado.', { statusCode: 401 });
    if (current.revokedAt) throw new ApiError('AUTH_REFRESH_TOKEN_INVALID', 'Refresh token inválido.', { statusCode: 401 }); // encerrada por logout
    if (current.refreshExpiresAt.getTime() <= this.now()) {
      await this.repository.revoke(current.id);
      throw new ApiError('AUTH_REFRESH_TOKEN_EXPIRED', 'O refresh token expirou.', { statusCode: 401 });
    }
    await this.repository.markRotated(current.id);
    return this.create({ user: current.user, account: current.account, deviceId: current.deviceId });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.repository.revoke(sessionId);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repository.revokeAllForUser(userId);
  }

  private toContext(session: SandboxSessionRecord): AuthContext {
    return { sessionId: session.id, userId: session.userId, accountId: session.accountId, deviceId: session.deviceId, expiresAt: session.expiresAt.toISOString(), user: session.user, account: session.account };
  }

  private toResult(session: SandboxSessionRecord, accessToken: string, refreshToken: string): AuthResult {
    return { ...this.toContext(session), accessToken, refreshToken, environment: 'sandbox' };
  }
}
