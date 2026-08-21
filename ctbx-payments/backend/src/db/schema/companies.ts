import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Customer Identity — PJ, de forma aditiva. `customers` continua sendo a
// base de identidade/login (só PF, como sempre foi) — uma empresa NUNCA
// loga diretamente: quem autentica é sempre um `customer` (pessoa física)
// vinculado como representante (ver company_representatives.ts). Por
// isso esta tabela não tem nenhuma coluna de senha/credencial.
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  cnpj: text('cnpj').notNull().unique(),
  legalName: text('legal_name').notNull(), // razão social
  tradeName: text('trade_name'), // nome fantasia (opcional)
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
