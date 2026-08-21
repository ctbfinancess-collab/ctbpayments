import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';

// Sessão real de cliente — Etapa 2. Mesmo padrão de admin_sessions: só o
// hash SHA-256 do token vai para o banco, nunca o token em texto puro,
// nunca senha. Token único (Bearer), sem rotação de refresh token (mesma
// simplicidade da sessão do admin — não foi pedido nesta etapa).
export const customerSessions = pgTable('customer_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});
