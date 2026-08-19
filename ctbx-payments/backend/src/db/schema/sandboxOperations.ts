import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sandboxAccounts, sandboxAccountTransactions } from './sandboxAccounts.js';

// Etapa 3 — PIX enviado, transferência bancária e pagamento de boleto,
// todos guardados numa tabela genérica só (mesmo espírito de cms_items ter
// um discriminador "collection" em vez de uma tabela por tipo de
// conteúdo): "kind" distingue PIX_TRANSFER/BANK_TRANSFER/BILL_PAYMENT,
// "details" (jsonb) guarda o que é específico de cada um (favorecido,
// descrição, boleto, parcelas...). id/status/valor/data ficam em colunas
// próprias por serem comuns aos três e precisarem ser consultáveis.
//
// accountTransactionId liga esta operação ao lançamento correspondente no
// extrato (sandbox_account_transactions, Etapa 2) — "existe uma única
// fonte de verdade pra saldo/extrato": esta tabela nunca guarda saldo
// nenhum, só aponta pra onde o dinheiro foi de fato lançado.
export const sandboxOperations = pgTable('sandbox_operations', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // PIX_TRANSFER | BANK_TRANSFER | BILL_PAYMENT
  status: text('status').notNull(), // COMPLETED | SCHEDULED
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull().default('BRL'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  accountTransactionId: text('account_transaction_id').references(() => sandboxAccountTransactions.id, { onDelete: 'set null' }),
  details: jsonb('details').notNull(),
  // Etapa 5 — nulo pra PIX/Transferência/Pagamento/Cartão (que continuam
  // com o cache de idempotência em memória, ressalva já registrada); só
  // investimentos passam a gravar isso aqui, porque a simulação (ao
  // contrário da validação de PIX/Transferência/Pagamento) É persistida —
  // sem essa coluna, um replay após restart encontraria a simulação de
  // novo e debitaria uma segunda vez.
  idempotencyKey: text('idempotency_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // NULL conta como valor distinto em índice único no Postgres — então
  // isto nunca colide pra PIX/Transferência/Pagamento/Cartão (idempotencyKey
  // sempre nulo ali), só passa a valer de verdade quando a coluna é
  // preenchida (investimentos).
  uniqueIndex('sandbox_operations_account_kind_idempotency_key').on(table.accountId, table.kind, table.idempotencyKey),
]);

// Chaves PIX de verdade (antes um array fixo em memória) — cada conta
// semeia as 3 chaves que o app sempre mostrou, e a partir daí passa a
// aceitar criar/remover de verdade (essa parte era só um placeholder que
// sempre respondia "indisponível", nunca existiu de fato).
export const sandboxPixKeys = pgTable('sandbox_pix_keys', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // CPF | CNPJ | EMAIL | PHONE | RANDOM
  keyMasked: text('key_masked').notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | REMOVED
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
