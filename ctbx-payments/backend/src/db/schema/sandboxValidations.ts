import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sandboxAccounts } from './sandboxAccounts.js';

// Etapa 5.2 — pendência MÉDIA da auditoria: "validação" de PIX/
// Transferência/Pagamento (o rascunho gerado por /validate, consultado
// pelo submit) vivia só num Map() em memória — um restart real do backend
// entre validar e confirmar derrubava a operação com XXX_VALIDATION_NOT_FOUND,
// mesmo a chave de idempotência (Etapa 5.1) já sendo persistida. Mesmo
// espírito de sandbox_operations: uma tabela genérica, "kind" discrimina o
// domínio, "payload" (jsonb) guarda o que é específico de cada um.
//
// Continua sendo um rascunho de vida curta por design (expiresAt) — não é
// "estado do cliente" permanente, só deixa de depender da memória do
// processo pra sobreviver a um restart dentro da janela de validade.
export const sandboxValidations = pgTable('sandbox_validations', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // PIX_TRANSFER | BANK_TRANSFER | BILL_PAYMENT | INSTALLMENT_SIMULATION
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
