import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';

// Troca de e-mail autenticada — mesmo padrão de customer_password_resets:
// só o hash SHA-256 do token vai para o banco. newEmail fica em texto
// puro aqui (não é segredo, é só o destino da troca) e só é copiado pra
// customers.email quando o token é confirmado — o e-mail atual nunca
// muda antes da prova de posse do novo endereço.
export const customerEmailChanges = pgTable('customer_email_changes', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  newEmail: text('new_email').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});
