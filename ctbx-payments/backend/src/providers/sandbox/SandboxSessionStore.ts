import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Account, User } from '../../domain/models.js';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, AuthResult, SessionStore } from '../ports.js';

interface StoredSession extends AuthContext {
  accessTokenHash: string;
  refreshTokenHash: string;
  refreshExpiresAt: string;
  revokedAt?: string;
}

interface StoreOptions {
  environment: string;
  now?: () => number;
  accessTtlMs?: number;
  refreshTtlMs?: number;
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const token = (kind: 'at' | 'rt') => `sbx_${kind}_${randomBytes(32).toString('base64url')}`;

export class SandboxSessionStore implements SessionStore {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly accessIndex = new Map<string, string>();
  private readonly refreshIndex = new Map<string, string>();
  private readonly consumedRefreshTokens = new Set<string>();
  private readonly now: () => number;
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;

  constructor(options: StoreOptions) {
    if (options.environment === 'production') throw new Error('SandboxSessionStore is forbidden in production');
    this.now = options.now ?? Date.now;
    this.accessTtlMs = options.accessTtlMs ?? 15 * 60_000;
    this.refreshTtlMs = options.refreshTtlMs ?? 8 * 60 * 60_000;
  }

  async create(input: { user: User; account: Account; deviceId: string }): Promise<AuthResult> {
    const sessionId = `sbx_ses_${randomUUID()}`;
    const accessToken = token('at');
    const refreshToken = token('rt');
    const accessTokenHash = hash(accessToken);
    const refreshTokenHash = hash(refreshToken);
    const issuedAt = this.now();
    const stored: StoredSession = {
      sessionId, userId: input.user.id, accountId: input.account.id, deviceId: input.deviceId,
      user: input.user, account: input.account,
      expiresAt: new Date(issuedAt + this.accessTtlMs).toISOString(),
      refreshExpiresAt: new Date(issuedAt + this.refreshTtlMs).toISOString(),
      accessTokenHash, refreshTokenHash,
    };
    this.sessions.set(sessionId, stored);
    this.accessIndex.set(accessTokenHash, sessionId);
    this.refreshIndex.set(refreshTokenHash, sessionId);
    return this.toResult(stored, accessToken, refreshToken);
  }

  async getByAccessToken(accessToken: string): Promise<AuthContext | undefined> {
    const sessionId = this.accessIndex.get(hash(accessToken));
    if (!sessionId) return undefined;
    const session = this.sessions.get(sessionId);
    if (!session || session.revokedAt) return undefined;
    if (Date.parse(session.expiresAt) <= this.now()) {
      this.accessIndex.delete(session.accessTokenHash);
      throw new ApiError('AUTH_ACCESS_TOKEN_EXPIRED', 'O access token expirou.', { statusCode: 401 });
    }
    return this.toContext(session);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const refreshTokenHash = hash(refreshToken);
    if (this.consumedRefreshTokens.has(refreshTokenHash)) {
      throw new ApiError('AUTH_REFRESH_TOKEN_REUSED', 'O refresh token já foi utilizado.', { statusCode: 401 });
    }
    const sessionId = this.refreshIndex.get(refreshTokenHash);
    const current = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!current || current.revokedAt) throw new ApiError('AUTH_REFRESH_TOKEN_INVALID', 'Refresh token inválido.', { statusCode: 401 });
    if (Date.parse(current.refreshExpiresAt) <= this.now()) {
      await this.revoke(current.sessionId);
      throw new ApiError('AUTH_REFRESH_TOKEN_EXPIRED', 'O refresh token expirou.', { statusCode: 401 });
    }
    this.consumedRefreshTokens.add(refreshTokenHash);
    await this.revoke(current.sessionId);
    return this.create({ user: current.user, account: current.account, deviceId: current.deviceId });
  }

  async revoke(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.revokedAt) return;
    session.revokedAt = new Date(this.now()).toISOString();
    this.accessIndex.delete(session.accessTokenHash);
    this.refreshIndex.delete(session.refreshTokenHash);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await Promise.all([...this.sessions.values()].filter((session) => session.userId === userId).map((session) => this.revoke(session.sessionId)));
  }

  private toContext(session: StoredSession): AuthContext {
    return { sessionId: session.sessionId, userId: session.userId, accountId: session.accountId, deviceId: session.deviceId, expiresAt: session.expiresAt, user: session.user, account: session.account };
  }

  private toResult(session: StoredSession, accessToken: string, refreshToken: string): AuthResult {
    return { ...this.toContext(session), accessToken, refreshToken, environment: 'sandbox' };
  }
}
