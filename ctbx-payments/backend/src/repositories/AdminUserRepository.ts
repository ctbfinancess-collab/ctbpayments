import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { adminUsers } from '../db/schema/index.js';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  active: boolean;
}

export class AdminUserRepository {
  constructor(private readonly db: Db) {}

  async findByEmail(email: string): Promise<AdminUserRecord | undefined> {
    const [row] = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    return row;
  }

  async findById(id: string): Promise<AdminUserRecord | undefined> {
    const [row] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    return row;
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
  }
}
