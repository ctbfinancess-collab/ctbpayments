import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { adminUsers } from './adminUsers.js';

// Sessão persistida (mesmo padrão do SandboxSessionStore já usado pelo app
// cliente) — nunca guarda o token em texto puro, só um hash SHA-256 dele
// (ver adminAuthService.ts). Permite revogar/expirar sem precisar de
// blocklist de JWT.
export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: uuid('admin_user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});
