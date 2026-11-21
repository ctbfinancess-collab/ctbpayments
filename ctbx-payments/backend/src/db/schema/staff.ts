import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';

// Painel administrativo da equipe (análise de KYC). Módulo NOVO e separado
// do admin antigo do CMS (admin_users): perfis de acesso, verificação em
// duas etapas obrigatória (TOTP) e sessões curtas.
export const staffUsers = pgTable('staff_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull(), // ADMIN | ANALYST
  status: text('status').notNull().default('INVITED'), // INVITED | ACTIVE | DISABLED
  passwordHash: text('password_hash'),
  // Segredo TOTP criptografado (AES-256-GCM, chave STAFF_TOTP_ENCRYPTION_KEY).
  totpSecretEnc: text('totp_secret_enc'),
  totpEnabledAt: timestamp('totp_enabled_at', { withTimezone: true }),
  // Último passo de 30s aceito: impede reutilizar o mesmo código.
  totpLastStep: integer('totp_last_step'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Tokens de uso único (só o hash SHA-256): convite (definir senha),
// cadastro do autenticador e a etapa intermediária do login (senha ok,
// falta o código).
export const staffTokens = pgTable('staff_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id').notNull().references(() => staffUsers.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(), // INVITE | MFA_ENROLL | MFA_LOGIN
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const staffSessions = pgTable('staff_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id').notNull().references(() => staffUsers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

// Histórico das decisões de KYC (cada análise fica registrada).
export const kycReviews = pgTable('kyc_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  staffId: uuid('staff_id').notNull().references(() => staffUsers.id),
  decision: text('decision').notNull(), // APPROVED | CHANGES_REQUESTED | REJECTED
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('kyc_reviews_customer_idx').on(t.customerId, t.createdAt)]);
