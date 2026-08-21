import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import type { AdminSessionRepository } from '../repositories/AdminSessionRepository.js';
import type { AdminUserRepository } from '../repositories/AdminUserRepository.js';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h — expiração da sessão (item 6 do brief).

export interface AuthenticatedAdmin { id: string; name: string; email: string; role: string }
export interface LoginResult { token: string; expiresAt: Date; admin: AuthenticatedAdmin }

// Sessão de admin em token opaco (mesmo padrão do SandboxSessionStore já
// usado pelo app cliente): só um hash SHA-256 do token vai para o banco,
// nunca o token em texto puro. A senha nunca é comparada nem guardada em
// texto puro — só o hash argon2 (argon2.verify já compara em tempo
// constante internamente).
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AdminAuthService {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly sessions: AdminSessionRepository,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  async login(email: string, password: string): Promise<LoginResult | null> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user || !user.active) {
      // Ainda roda um hash "fantasma" quando o e-mail não existe, para o
      // tempo de resposta não vazar se o e-mail está cadastrado.
      await argon2.hash(password).catch(() => undefined);
      return null;
    }
    const valid = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!valid) return null;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.sessions.create({ adminUserId: user.id, tokenHash: hashToken(token), expiresAt });
    await this.users.touchLastLogin(user.id);
    return { token, expiresAt, admin: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }

  async validateSession(token: string): Promise<AuthenticatedAdmin | null> {
    const session = await this.sessions.findByTokenHash(hashToken(token));
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;
    const user = await this.users.findById(session.adminUserId);
    if (!user || !user.active) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  async logout(token: string): Promise<void> {
    await this.sessions.revoke(hashToken(token));
  }
}
