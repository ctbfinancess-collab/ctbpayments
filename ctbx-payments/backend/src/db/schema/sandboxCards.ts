import { integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sandboxAccounts } from './sandboxAccounts.js';

// Cartão virtual SANDBOX — único domínio "de negócio" (não-admin) com
// persistência real neste backend. Todo o resto do sandbox (PIX,
// pagamentos, cartão físico, transferências) continua em memória de
// propósito; aqui o brief pediu explicitamente que sobrevivesse a um
// restart do backend, não só a um refresh de página.
//
// PAN completo e CVV NUNCA ficam em texto puro — só as versões
// criptografadas (AES-256-GCM, ver src/security/cardEncryption.ts) com uma
// chave que só existe no backend (SANDBOX_CARD_ENCRYPTION_KEY). "lastFour"
// fica solto, sem criptografia, por ser exatamente o que já aparece em
// qualquer lugar (mascarado) sem risco nenhum.
export const sandboxVirtualCards = pgTable('sandbox_virtual_cards', {
  id: text('id').primaryKey(),
  // Etapa 5.2 — auditoria apontou a ausência desta FK como inconsistência
  // (única tabela por-conta do projeto sem ela). createVirtualCard agora
  // garante a conta via ensureSandboxAccount antes de inserir, então isto
  // nunca falha pra dados novos; a única linha pré-existente já apontava
  // pra uma conta real (conferido antes de aplicar a migration).
  accountId: text('account_id').notNull().references(() => sandboxAccounts.id, { onDelete: 'cascade' }),
  nickname: text('nickname'),
  color: text('color').notNull(),
  brand: text('brand').notNull().default('Visa'),
  lastFour: text('last_four').notNull(),
  panEncrypted: text('pan_encrypted').notNull(),
  cvvEncrypted: text('cvv_encrypted').notNull(),
  holderName: text('holder_name').notNull(),
  expiryMonth: integer('expiry_month').notNull(),
  expiryYear: integer('expiry_year').notNull(),
  limitMinor: integer('limit_minor').notNull(),
  usedMinor: integer('used_minor').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | BLOCKED | CANCELLED
  // Etapa 5.1 — idempotência PERSISTIDA da criação (Prioridade 3): sem
  // isso, um replay do mesmo Idempotency-Key depois de um restart real
  // recriava um cartão virtual duplicado (a checagem antes vivia só num
  // Map() em memória do processo). Nulo pra linhas antigas.
  idempotencyKey: text('idempotency_key'),
  requestHash: text('request_hash'),
  // O requestId do POST que criou o cartão — devolvido congelado em toda
  // resposta de replay (mesmo padrão de PIX/Transferência/Pagamento/
  // Investimento: o requestId da resposta é sempre o da requisição
  // original, nunca o da tentativa de replay).
  requestId: text('request_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('sandbox_virtual_cards_account_idempotency_key').on(table.accountId, table.idempotencyKey),
]);

// Transações fictícias do cartão virtual — geradas na criação (ver
// VirtualCardRepository.seedTransactions) só pra dar sensação de produto
// real, mas persistidas de verdade (sobrevivem a refresh/restart, ligadas
// ao cartão correto pelo card_id).
export const sandboxVirtualCardTransactions = pgTable('sandbox_virtual_card_transactions', {
  id: text('id').primaryKey(),
  cardId: text('card_id').notNull().references(() => sandboxVirtualCards.id, { onDelete: 'cascade' }),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  merchantName: text('merchant_name').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  status: text('status').notNull(), // APPROVED | DECLINED | REVERSED | PENDING
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
