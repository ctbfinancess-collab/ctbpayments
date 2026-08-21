import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sandboxAccounts } from './sandboxAccounts.js';

// Etapa 4 — cartão físico (o financialCard/"Cartão" que sempre existiu no
// SandboxCardProvider), antes 100% em memória (campos de instância). Um
// cartão físico por conta (mesmo modelo singleton de sempre) — o id é
// determinístico (`sbx_card_fin_<accountId>`) pra "ensure" ser idempotente:
// nunca cria um segundo cartão pra mesma conta, mesmo chamado várias vezes.
//
// Esse cartão nunca teve PAN/CVV completos (só "lastFour" mascarado, como
// hoje) — não há nada além disso pra criptografar aqui. "availableMinor" é
// o saldo/limite PRÓPRIO do cartão (equivalente ao limitMinor-usedMinor do
// cartão virtual), não um saldo bancário paralelo: quando uma recarga move
// dinheiro da CONTA pro cartão, quem debita a conta é sempre o
// SandboxLedgerRepository (Etapa 3) — este valor aqui só guarda o quanto já
// foi carregado no cartão.
export const sandboxPhysicalCards = pgTable('sandbox_physical_cards', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // PENDING_ACTIVATION | ACTIVE | BLOCKED
  brand: text('brand').notNull(),
  lastFour: text('last_four').notNull(),
  holderName: text('holder_name').notNull(),
  expiryMonth: integer('expiry_month').notNull(),
  expiryYear: integer('expiry_year').notNull(),
  availableMinor: integer('available_minor').notNull(),
  passwordChanged: boolean('password_changed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Transações fictícias do cartão físico — antes recalculadas a cada
// chamada com datas relativas a "now()"; agora semeadas UMA vez (datas
// absolutas), igual ao extrato da conta (Etapa 2) e às transações do
// cartão virtual.
export const sandboxPhysicalCardTransactions = pgTable('sandbox_physical_card_transactions', {
  id: text('id').primaryKey(),
  cardId: text('card_id').notNull().references(() => sandboxPhysicalCards.id, { onDelete: 'cascade' }),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  type: text('type').notNull(),
  direction: text('direction').notNull(), // CREDIT | DEBIT
  merchantName: text('merchant_name').notNull(),
  description: text('description').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull().default('BRL'),
  status: text('status').notNull(), // APPROVED | COMPLETED
  authorizationCodeMasked: text('authorization_code_masked').notNull(),
  receiptAvailable: boolean('receipt_available').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Cartão de transporte (TOP) — mesmo raciocínio do cartão físico: um por
// conta, id determinístico, era 100% em memória.
export const sandboxTransportCards = pgTable('sandbox_transport_cards', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  brand: text('brand').notNull(),
  lastFour: text('last_four').notNull(),
  holderName: text('holder_name').notNull(),
  balanceMinor: integer('balance_minor').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
