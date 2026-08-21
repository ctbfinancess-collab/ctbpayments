import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { customers } from './customers.js';

// Vínculo N:N entre customers (pessoa, sempre quem autentica) e companies
// (empresa, nunca autentica sozinha) — uma empresa pode ter vários
// representantes, uma mesma pessoa pode representar várias empresas. O
// índice único impede o mesmo vínculo duplicado (não limita a
// cardinalidade N:N em si).
export const companyRepresentatives = pgTable('company_representatives', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('ADMIN'), // papel/permissão dentro da empresa
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('company_representatives_company_customer_unique').on(table.companyId, table.customerId),
]);
