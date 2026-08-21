import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Metadados de cada arquivo real enviado ao Cloudinary. O arquivo em si
// mora no Cloudinary; esta tabela só guarda a referência (public_id/
// secure_url) e os metadados devolvidos no upload — nunca nenhum segredo
// do Cloudinary. Ainda não é escrita por nenhuma rota nesta etapa (entra
// na próxima, junto com o restante do fluxo de conteúdo).
export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicId: text('public_id').notNull().unique(),
  secureUrl: text('secure_url').notNull(),
  resourceType: text('resource_type').notNull(),
  format: text('format'),
  width: integer('width'),
  height: integer('height'),
  bytes: integer('bytes'),
  originalFilename: text('original_filename'),
  altText: text('alt_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
