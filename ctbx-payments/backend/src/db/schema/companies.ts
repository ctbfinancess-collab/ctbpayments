import { sql } from 'drizzle-orm';
import { date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';

// Fase 5 — pedido de conta PJ (KYB). Cada linha é um PEDIDO feito por um
// cliente com identidade verificada; só vira empresa ativa depois da análise
// da equipe. O mesmo CNPJ pode ter mais de um pedido (ninguém "trava" o CNPJ
// de outra empresa), mas o banco só permite UM aprovado por CNPJ.
// status: DRAFT | SUBMITTED | CHANGES_REQUESTED | APPROVED | REJECTED
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  cnpj: text('cnpj').notNull(),
  legalName: text('legal_name').notNull(), // razão social
  tradeName: text('trade_name'), // nome fantasia (opcional)
  status: text('status').notNull().default('DRAFT'),
  applicantCustomerId: uuid('applicant_customer_id').references(() => customers.id),
  // Cargo de quem pede: SOCIO_ADMINISTRADOR | SOCIO | ADMINISTRADOR | PROCURADOR
  applicantPosition: text('applicant_position'),
  openingDate: date('opening_date', { mode: 'string' }),
  legalNature: text('legal_nature'),
  mainActivity: text('main_activity'),
  businessEmail: text('business_email'),
  businessPhone: text('business_phone'),
  annualRevenueRange: text('annual_revenue_range'),
  dataCompletedAt: timestamp('data_completed_at', { withTimezone: true }),
  addressCep: text('address_cep'),
  addressStreet: text('address_street'),
  addressNumber: text('address_number'),
  addressComplement: text('address_complement'),
  addressDistrict: text('address_district'),
  addressCity: text('address_city'),
  addressState: text('address_state'),
  addressCompletedAt: timestamp('address_completed_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  reviewReason: text('review_reason'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('companies_cnpj_idx').on(t.cnpj),
  index('companies_status_idx').on(t.status, t.submittedAt),
  uniqueIndex('companies_cnpj_approved_unique').on(t.cnpj).where(sql`status = 'APPROVED'`),
]);

// Documentos da empresa — mesmo cofre criptografado do KYC.
// kind: SOCIAL_CONTRACT | ADDRESS_PROOF | POWER_OF_ATTORNEY | CNPJ_CARD
export const companyDocuments = pgTable('company_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  uploadedByCustomerId: uuid('uploaded_by_customer_id').notNull().references(() => customers.id),
  kind: text('kind').notNull(),
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
}, (t) => [index('company_documents_company_idx').on(t.companyId, t.kind, t.status)]);
