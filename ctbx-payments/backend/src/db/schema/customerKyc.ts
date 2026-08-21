import { date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';

// KYC do cliente PF — Etapa 1 (dados pessoais complementares). Tabela
// própria e extensível: cada etapa futura (endereço, documentos, selfie,
// prova de vida, análise...) ganha suas PRÓPRIAS colunas aqui (ou tabelas
// satélite, se fizer sentido pra dados binários/arquivo), sem nunca
// duplicar o que já existe em customers — name/document/email/phone
// continuam vindo de lá (ver customerRoutes.ts). Um registro por
// customer (customerId único), sempre associado via sessão real, nunca
// por um customerId arbitrário vindo do body/query.
//
// `status` cobre o ciclo de vida completo do KYC (não só a Etapa 1):
// NOT_STARTED | IN_PROGRESS | SUBMITTED | APPROVED | REJECTED. Nesta
// etapa só NOT_STARTED/IN_PROGRESS são alcançáveis a partir do código —
// SUBMITTED/APPROVED/REJECTED entram quando as etapas de
// documento/análise existirem.
//
// Campos escolhidos a dedo: "sexo/gênero" e "estado civil" ficaram de
// fora de propósito — nenhum dos dois tem função definida ainda no
// produto ou no compliance, e cada dado pessoal a mais é responsabilidade
// a mais sobre informação sensível.
export const customerKyc = pgTable('customer_kyc', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().unique().references(() => customers.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('NOT_STARTED'), // NOT_STARTED | IN_PROGRESS | SUBMITTED | APPROVED | REJECTED
  birthDate: date('birth_date', { mode: 'string' }),
  motherName: text('mother_name'),
  nationality: text('nationality'),
  // Marca quando a Etapa 1 (dados pessoais) ficou completa — controle de
  // progresso que as próximas etapas (endereço, documentos...) vão
  // reaproveitar, cada uma com seu próprio *_completed_at.
  personalInfoCompletedAt: timestamp('personal_info_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
