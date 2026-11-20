import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Registro de auditoria de segurança (Fase 2). Guarda SÓ o necessário para
// investigar um incidente: o que aconteceu, quando, com qual conta (id
// interno), resultado, IP, navegador (truncado) e o id da requisição.
// NUNCA guarda senha, token, e-mail, CPF, nome ou o conteúdo enviado.
// Sem chave estrangeira de propósito: o histórico continua existindo
// mesmo que a conta seja removida um dia.
export const securityAuditEvents = pgTable('security_audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  event: text('event').notNull(),
  outcome: text('outcome').notNull(),
  customerId: uuid('customer_id'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  requestId: text('request_id'),
  details: jsonb('details').$type<Record<string, string | number | boolean>>(),
}, (t) => [
  index('security_audit_events_customer_idx').on(t.customerId, t.occurredAt),
  index('security_audit_events_occurred_idx').on(t.occurredAt),
]);
