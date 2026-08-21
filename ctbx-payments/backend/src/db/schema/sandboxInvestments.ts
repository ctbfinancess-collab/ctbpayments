import { integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sandboxAccounts } from './sandboxAccounts.js';

// Etapa 5 — investimentos. Ordens/posições reaproveitam sandbox_operations
// (Etapa 3, kind='INVESTMENT_ORDER') — mesma "fonte única de verdade" de
// saldo/extrato, sem tabela paralela pra ordem+posição (posição é sempre
// derivada 1:1 da ordem, igual já era em memória).
//
// A simulação é a única peça nova que precisa de tabela própria: é o
// "rascunho" que createOrder() consulta antes de debitar — igual à
// validação de PIX/Transferência/Pagamento (Etapa 3), mas aqui o brief
// pediu explicitamente que NÃO dependa de Map()/memória do processo, pra
// "aplicar" sobreviver a um restart entre simular e confirmar.
export const sandboxInvestmentSimulations = pgTable('sandbox_investment_simulations', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  projectedGrossMinor: integer('projected_gross_minor').notNull(),
  projectedNetMinor: integer('projected_net_minor').notNull(),
  termDays: integer('term_days').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Consignado — propostas/solicitações (o fluxo atual só tem esse único
// passo: "apply" cria a solicitação já em UNDER_REVIEW; não existe
// aprovação/liberação de crédito implementada hoje, então nada disso
// move dinheiro — sem relação com o ledger).
export const sandboxConsignedApplications = pgTable('sandbox_consigned_applications', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  installments: integer('installments').notNull(),
  status: text('status').notNull(), // UNDER_REVIEW (único status que o fluxo atual produz)
  sandboxReference: text('sandbox_reference').notNull(),
  requestId: text('request_id').notNull(),
  // Idempotência persistida (Etapa 5) — apply() é um passo único e
  // autocontido (não depende de nenhum recurso intermediário como a
  // simulação de investimentos), então sem isto um replay após restart
  // recriaria a solicitação do zero, violando "nunca ser duplicada por
  // retry/replay".
  idempotencyKey: text('idempotency_key'),
  requestHash: text('request_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('sandbox_consigned_applications_account_idempotency_key').on(table.accountId, table.idempotencyKey),
]);
