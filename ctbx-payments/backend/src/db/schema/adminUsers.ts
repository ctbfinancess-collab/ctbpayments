import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Usuários do Painel Administrativo — nunca guarda senha em texto puro, só
// o hash (argon2, ver services/adminAuthService.ts). "role" é texto livre
// por enquanto (só 'admin' é emitido nesta etapa), mas já dá pra crescer
// para 'editor'/'viewer' sem migration de schema.
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});
