import { eq } from 'drizzle-orm';
import type { Account, User } from '../domain/models.js';
import type { Db } from '../db/client.js';
import { sandboxSessions } from '../db/schema/index.js';

export interface SandboxSessionRecord {
  id: string; userId: string; accountId: string; deviceId: string; user: User; account: Account;
  accessTokenHash: string; refreshTokenHash: string; expiresAt: Date; refreshExpiresAt: Date;
  revokedAt: Date | null; rotatedAt: Date | null;
}

export interface CreateSandboxSessionInput {
  id: string; userId: string; accountId: string; deviceId: string; user: User; account: Account;
  accessTokenHash: string; refreshTokenHash: string; expiresAt: Date; refreshExpiresAt: Date;
}

// Interface própria (não só a classe) de propósito — é o que deixa
// SandboxSessionStore.ts (a "camada provider/adapter") indiferente a qual
// implementação está por trás: Postgres de verdade aqui, ou em memória em
// InMemorySandboxSessionRepository.ts (usada nos testes e como fallback
// quando DATABASE_URL não está configurado). Mesmo espírito de preparar o
// terreno pra uma futura substituição pela autenticação de uma SaaS.
export interface SandboxSessionRepository {
  create(input: CreateSandboxSessionInput): Promise<SandboxSessionRecord>;
  findByAccessTokenHash(hash: string): Promise<SandboxSessionRecord | undefined>;
  findByRefreshTokenHash(hash: string): Promise<SandboxSessionRecord | undefined>;
  // Marca a sessão como rotacionada (usada por /auth/refresh) — sempre
  // acompanhada de revoke, ver comentário no schema.
  markRotated(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export class PostgresSandboxSessionRepository implements SandboxSessionRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateSandboxSessionInput): Promise<SandboxSessionRecord> {
    const [row] = await this.db.insert(sandboxSessions).values(input).returning();
    if (!row) throw new Error('Failed to create sandbox session');
    return row as SandboxSessionRecord;
  }

  async findByAccessTokenHash(hash: string): Promise<SandboxSessionRecord | undefined> {
    const [row] = await this.db.select().from(sandboxSessions).where(eq(sandboxSessions.accessTokenHash, hash)).limit(1);
    return row as SandboxSessionRecord | undefined;
  }

  async findByRefreshTokenHash(hash: string): Promise<SandboxSessionRecord | undefined> {
    const [row] = await this.db.select().from(sandboxSessions).where(eq(sandboxSessions.refreshTokenHash, hash)).limit(1);
    return row as SandboxSessionRecord | undefined;
  }

  async markRotated(id: string): Promise<void> {
    const now = new Date();
    await this.db.update(sandboxSessions).set({ rotatedAt: now, revokedAt: now }).where(eq(sandboxSessions.id, id));
  }

  async revoke(id: string): Promise<void> {
    await this.db.update(sandboxSessions).set({ revokedAt: new Date() }).where(eq(sandboxSessions.id, id));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.update(sandboxSessions).set({ revokedAt: new Date() }).where(eq(sandboxSessions.userId, userId));
  }
}
