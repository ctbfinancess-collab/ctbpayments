import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Sessão do app cliente SANDBOX (Etapa 1 da consolidação de arquitetura —
// era o único domínio de "negócio" ainda 100% em memória além dos outros
// providers sandbox). Só access/refresh token HASH ficam aqui (SHA-256,
// mesma lógica de antes) — nunca o token em texto puro, nunca senha.
// "user"/"account" são os objetos pequenos já usados no AuthContext
// (ver domain/models.ts) — guardados como jsonb pra não precisar de mais
// tabelas só pra isso.
export const sandboxSessions = pgTable('sandbox_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  deviceId: text('device_id').notNull(),
  user: jsonb('user').notNull(),
  account: jsonb('account').notNull(),
  accessTokenHash: text('access_token_hash').notNull().unique(),
  refreshTokenHash: text('refresh_token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }).notNull(),
  // revokedAt sozinho = logout (ou expiração). revokedAt + rotatedAt juntos
  // = essa sessão foi rotacionada por /auth/refresh — distinção necessária
  // pra devolver AUTH_REFRESH_TOKEN_REUSED (reuso de um token já rotacionado)
  // em vez de AUTH_REFRESH_TOKEN_INVALID (sessão só encerrada por logout).
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
