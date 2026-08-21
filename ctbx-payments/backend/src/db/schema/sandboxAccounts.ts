import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Etapa 2 da consolidação de arquitetura — conta + saldo + extrato do
// cliente sandbox, antes 100% em memória (SandboxAccountProvider). Todo
// valor monetário fica em minor units (inteiro, centavos) — mesma
// convenção já usada em cms_items/sandbox_virtual_cards/etc., evita
// float. accountId é o mesmo id estável já emitido pela sessão (Etapa 1),
// pronto pra quando "Clientes" virar um cadastro real de verdade.
export const sandboxAccounts = pgTable('sandbox_accounts', {
  id: text('id').primaryKey(), // accountId (ex.: 'sbx_acc_nonbanking')
  userId: text('user_id').notNull(),
  availableMinor: integer('available_minor').notNull(),
  ledgerMinor: integer('ledger_minor').notNull(),
  digitalAccountMinor: integer('digital_account_minor').notNull(),
  blockedMinor: integer('blocked_minor').notNull(),
  investmentsMinor: integer('investments_minor').notNull(),
  cardAccountMinor: integer('card_account_minor').notNull(),
  creditMinor: integer('credit_minor').notNull(),
  foreignCurrencyMinor: integer('foreign_currency_minor').notNull(),
  currency: text('currency').notNull().default('BRL'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Extrato — genérico o suficiente pra, nas próximas etapas, PIX/
// transferências/pagamentos lançarem movimentações aqui também (mesma
// estrutura), sem precisar de uma tabela por módulo.
export const sandboxAccountTransactions = pgTable('sandbox_account_transactions', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  type: text('type').notNull(),
  direction: text('direction').notNull(), // CREDIT | DEBIT
  description: text('description').notNull(),
  counterparty: text('counterparty').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull().default('BRL'),
  status: text('status').notNull(), // COMPLETED | SCHEDULED | UNDER_REVIEW
  category: text('category').notNull(),
  feeMinor: integer('fee_minor').notNull().default(0),
  receiptAvailable: boolean('receipt_available').notNull().default(false),
  institution: text('institution').notNull(),
  document: text('document').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
