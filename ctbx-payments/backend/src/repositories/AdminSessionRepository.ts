import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { adminSessions } from '../db/schema/index.js';

export interface AdminSessionRecord {
  id: string;
  adminUserId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export class AdminSessionRepository {
  constructor(private readonly db: Db) {}

  async create(input: { adminUserId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.db.insert(adminSessions).values(input);
  }

  async findByTokenHash(tokenHash: string): Promise<AdminSessionRecord | undefined> {
    const [row] = await this.db.select().from(adminSessions).where(eq(adminSessions.tokenHash, tokenHash)).limit(1);
    return row;
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.db.update(adminSessions).set({ revokedAt: new Date() }).where(eq(adminSessions.tokenHash, tokenHash));
  }
}
