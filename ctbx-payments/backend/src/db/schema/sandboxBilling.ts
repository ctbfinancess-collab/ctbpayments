import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sandboxAccounts } from './sandboxAccounts.js';

// Etapa 5.1 (Prioridade 4) — Cobrança ("Cobrar"): antes 100% em memória
// (SandboxBillingProvider guardava sacados/cobranças em dois Map() do
// processo, perdidos em qualquer restart). Nunca move sandbox_accounts —
// emitir uma cobrança pra alguém PAGAR não é uma operação da PRÓPRIA
// conta, então não há ledgerEntry nem relação com sandbox_operations aqui,
// só durabilidade dos dois cadastros em si.
export const sandboxBillingPayers = pgTable('sandbox_billing_payers', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  documentMasked: text('document_masked').notNull(),
  emailSandbox: text('email_sandbox').notNull(),
  addressSandbox: text('address_sandbox').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  idempotencyKey: text('idempotency_key'),
  requestHash: text('request_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('sandbox_billing_payers_account_idempotency_key').on(table.accountId, table.idempotencyKey),
]);

export const sandboxBillingBills = pgTable('sandbox_billing_bills', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  payerId: text('payer_id').notNull().references(() => sandboxBillingPayers.id, { onDelete: 'cascade' }),
  // Retrato do sacado no momento da emissão (mesmo comportamento de
  // sempre: renomear o sacado depois não altera cobranças já emitidas).
  payerSnapshot: jsonb('payer_snapshot').notNull(),
  externalReferenceSandbox: text('external_reference_sandbox').notNull(),
  digitableLineSandbox: text('digitable_line_sandbox').notNull(),
  barcodeSandbox: text('barcode_sandbox').notNull(),
  status: text('status').notNull().default('ISSUED'),
  dueDate: text('due_date').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  description: text('description').notNull().default(''),
  requestId: text('request_id').notNull(),
  idempotencyKey: text('idempotency_key'),
  requestHash: text('request_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('sandbox_billing_bills_account_idempotency_key').on(table.accountId, table.idempotencyKey),
]);
