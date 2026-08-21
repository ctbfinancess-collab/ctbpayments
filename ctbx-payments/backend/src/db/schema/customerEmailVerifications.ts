import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';

// Verificação real de e-mail — Etapa 3. Mesmo padrão de customer_sessions:
// só o hash SHA-256 do token vai para o banco, nunca o token em texto
// puro. consumedAt marca uso único (nunca deletamos a linha, pra sempre
// dar pra provar "esse token já foi usado" em vez de "nunca existiu").
export const customerEmailVerifications = pgTable('customer_email_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});
