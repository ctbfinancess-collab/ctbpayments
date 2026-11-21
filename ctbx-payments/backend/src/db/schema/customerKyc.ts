import { boolean, date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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
  status: text('status').notNull().default('NOT_STARTED'), // NOT_STARTED | IN_PROGRESS | SUBMITTED | CHANGES_REQUESTED | APPROVED | REJECTED
  birthDate: date('birth_date', { mode: 'string' }),
  motherName: text('mother_name'),
  nationality: text('nationality'),
  // Marca quando a Etapa 1 (dados pessoais) ficou completa — controle de
  // progresso que as próximas etapas (endereço, documentos...) vão
  // reaproveitar, cada uma com seu próprio *_completed_at.
  personalInfoCompletedAt: timestamp('personal_info_completed_at', { withTimezone: true }),
  // Fase 4 — endereço residencial.
  addressCep: text('address_cep'),
  addressStreet: text('address_street'),
  addressNumber: text('address_number'),
  addressComplement: text('address_complement'),
  addressDistrict: text('address_district'),
  addressCity: text('address_city'),
  addressState: text('address_state'),
  addressCompletedAt: timestamp('address_completed_at', { withTimezone: true }),
  // Fase 4 — declarações (prevenção à lavagem de dinheiro).
  isPep: boolean('is_pep'),
  occupation: text('occupation'),
  incomeRange: text('income_range'),
  declarationsCompletedAt: timestamp('declarations_completed_at', { withTimezone: true }),
  // Fase 4 — tipo do documento com foto (RG | CNH | RNE) e envio para análise.
  idDocumentType: text('id_document_type'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  // Última decisão da análise (o histórico completo fica em kyc_reviews).
  reviewReason: text('review_reason'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Fase 4 — documentos do KYC. O ARQUIVO fica criptografado no bucket
// privado; aqui ficam só os metadados e os dados para descriptografar
// (IV/etiqueta; a chave fica nas variáveis do servidor). Um arquivo novo do
// mesmo tipo substitui o anterior (status REPLACED), sem apagar o histórico.
// Sem ON DELETE CASCADE: documentos de KYC precisam ser guardados pelo
// prazo legal mesmo que algo aconteça com o cadastro.
export const customerKycDocuments = pgTable('customer_kyc_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  kind: text('kind').notNull(), // ID_FRONT | ID_BACK | SELFIE | PROOF_OF_ADDRESS
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | REPLACED
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  sha256: text('sha256').notNull(),
  storageKey: text('storage_key').notNull().unique(),
  keyId: text('key_id').notNull(),
  iv: text('iv').notNull(),
  authTag: text('auth_tag').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  replacedAt: timestamp('replaced_at', { withTimezone: true }),
}, (t) => [index('customer_kyc_documents_customer_idx').on(t.customerId, t.kind, t.status)]);
