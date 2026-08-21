import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Customer Identity — Etapa 1 (cadastro real de cliente PF). Ainda NÃO
// afeta login (SandboxAuthProvider continua intocado) nem
// sandbox_accounts (o vínculo é uma etapa própria, mais à frente). Mesmo
// padrão de admin_users: senha nunca em texto puro, só o hash argon2.
//
// `type` já nasce pronta pra PJ (mesma dualidade que domain/models.ts já
// previa em User.type/Account.type), mas a rota de cadastro desta etapa
// só aceita 'PF' — evita uma migration só-de-coluna quando PJ for
// implementado. `emailVerifiedAt` e `phone` também já nascem aqui pelo
// mesmo motivo (etapas seguintes do plano aprovado), mesmo sem terem
// endpoint próprio ainda.
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull().default('PF'), // PF | PJ (PJ ainda não é aceito pela rota de cadastro)
  name: text('name').notNull(),
  document: text('document').notNull().unique(), // CPF, só dígitos (CNPJ quando PJ existir)
  email: text('email').notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  phone: text('phone').notNull(),
  passwordHash: text('password_hash').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
