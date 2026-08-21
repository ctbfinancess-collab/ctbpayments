import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { adminUsers } from './adminUsers.js';
import { media } from './media.js';

// Duas tabelas cobrem os 9 tipos de conteúdo do CMS (Home, Login, Tema,
// SEO, banners, serviços, produtos, textos, links, navegação) sem precisar
// de uma tabela por tipo:
//
// - cms_sections: campos avulsos, um valor por "key" dentro de uma seção
//   (Home blocks, Login fields, Tema/Visual, SEO/Metadados).
// - cms_items: coleções com múltiplos itens do mesmo tipo (banners,
//   produtos, serviços, textos, links, itens de navegação).
//
// O campo específico de cada tipo fica em "value" (jsonb) — evita explosão
// de tabelas e mantém a tipagem no nível da aplicação (TypeScript), não do
// schema do banco. "status" (draft/published) é o que permite publicar sem
// novo deploy assim que o app cliente passar a consultar esta tabela.

export const cmsSections = pgTable('cms_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  section: text('section').notNull(), // 'home' | 'login' | 'theme' | 'seo'
  key: text('key').notNull(),
  label: text('label').notNull(),
  value: jsonb('value').notNull(),
  mediaId: uuid('media_id').references(() => media.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('draft'), // 'draft' | 'published'
  active: boolean('active').notNull().default(true),
  order: integer('order'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => adminUsers.id, { onDelete: 'set null' }),
}, (table) => [
  uniqueIndex('cms_sections_section_key_idx').on(table.section, table.key),
]);

export const cmsItems = pgTable('cms_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  collection: text('collection').notNull(), // 'banner' | 'service' | 'product' | 'link' | 'nav_item' | 'text'
  // Identificador estável opcional (ex.: usado pelo seed para não duplicar
  // ao rodar de novo) — o app usa o uuid "id" normalmente, slug é só apoio.
  slug: text('slug').unique(),
  name: text('name').notNull(),
  value: jsonb('value').notNull(),
  mediaId: uuid('media_id').references(() => media.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('draft'),
  active: boolean('active').notNull().default(true),
  order: integer('order'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => adminUsers.id, { onDelete: 'set null' }),
});
