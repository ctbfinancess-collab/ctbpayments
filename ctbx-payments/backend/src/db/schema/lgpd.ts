import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';
import { staffUsers } from './staff.js';

// Etapa D do painel — solicitações de titulares (LGPD, art. 18). Os pedidos
// chegam ao encarregado por e-mail (Política de Privacidade) e a equipe
// administradora registra e acompanha cada um aqui, com prazo de 15 dias
// (art. 19). A execução (correção, eliminação etc.) continua manual.
export const lgpdRequests = pgTable('lgpd_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  protocol: text('protocol').notNull().unique(),
  // CONFIRMATION_ACCESS | CORRECTION | ANONYMIZATION_DELETION | PORTABILITY |
  // CONSENT_REVOCATION | SHARING_INFO | DECISION_REVIEW | OTHER
  right: text('right').notNull(),
  channel: text('channel').notNull(), // EMAIL | OTHER
  requesterName: text('requester_name').notNull(),
  requesterContact: text('requester_contact').notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  description: text('description').notNull(),
  identityVerified: boolean('identity_verified').notNull().default(false),
  status: text('status').notNull().default('OPEN'), // OPEN | IN_PROGRESS | ANSWERED | DENIED
  response: text('response'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull().references(() => staffUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('lgpd_requests_status_idx').on(t.status, t.dueAt),
  index('lgpd_requests_received_idx').on(t.receivedAt),
  index('lgpd_requests_customer_idx').on(t.customerId),
]);

// Histórico do pedido: só acréscimo (trigger no banco), para comprovar o
// atendimento à ANPD se preciso.
export const lgpdRequestEvents = pgTable('lgpd_request_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull().references(() => lgpdRequests.id),
  staffId: uuid('staff_id').notNull().references(() => staffUsers.id),
  action: text('action').notNull(), // CREATED | NOTE | IN_PROGRESS | IDENTITY_VERIFIED | ANSWERED | DENIED
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('lgpd_request_events_request_idx').on(t.requestId, t.createdAt)]);
