import type { CreateSandboxSessionInput, SandboxSessionRecord, SandboxSessionRepository } from '../../repositories/SandboxSessionRepository.js';

// Mesma interface do repositório real (Postgres) — usada em duas
// situações: (1) testes, sem precisar de banco; (2) fallback automático em
// app.ts quando DATABASE_URL não está configurado, pra sessão sandbox
// continuar funcionando exatamente como sempre funcionou (só sem
// sobreviver a restart, igual antes desta etapa).
export class InMemorySandboxSessionRepository implements SandboxSessionRepository {
  private readonly byId = new Map<string, SandboxSessionRecord>();
  private readonly byAccessHash = new Map<string, string>();
  private readonly byRefreshHash = new Map<string, string>();

  async create(input: CreateSandboxSessionInput): Promise<SandboxSessionRecord> {
    const record: SandboxSessionRecord = { ...input, revokedAt: null, rotatedAt: null };
    this.byId.set(record.id, record);
    this.byAccessHash.set(record.accessTokenHash, record.id);
    this.byRefreshHash.set(record.refreshTokenHash, record.id);
    return record;
  }

  async findByAccessTokenHash(hash: string): Promise<SandboxSessionRecord | undefined> {
    const id = this.byAccessHash.get(hash);
    return id ? this.byId.get(id) : undefined;
  }

  async findByRefreshTokenHash(hash: string): Promise<SandboxSessionRecord | undefined> {
    const id = this.byRefreshHash.get(hash);
    return id ? this.byId.get(id) : undefined;
  }

  async markRotated(id: string): Promise<void> {
    const record = this.byId.get(id);
    if (!record) return;
    const now = new Date();
    record.rotatedAt = now;
    record.revokedAt = now;
  }

  async revoke(id: string): Promise<void> {
    const record = this.byId.get(id);
    if (!record) return;
    record.revokedAt = new Date();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const now = new Date();
    for (const record of this.byId.values()) if (record.userId === userId) record.revokedAt = now;
  }
}
