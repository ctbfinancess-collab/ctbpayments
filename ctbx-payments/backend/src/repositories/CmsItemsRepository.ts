import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { cmsItems } from '../db/schema/index.js';

export interface CmsItemRecord {
  id: string;
  collection: string;
  slug: string | null;
  name: string;
  value: unknown;
  mediaId: string | null;
  status: string;
  active: boolean;
  order: number | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface CreateCmsItemInput {
  collection: string;
  slug?: string;
  name: string;
  value: unknown;
  mediaId?: string | null;
  status?: string;
  active?: boolean;
  order?: number;
  updatedBy?: string;
}

export interface UpdateCmsItemInput {
  name?: string;
  value?: unknown;
  mediaId?: string | null;
  status?: string;
  active?: boolean;
  order?: number;
  updatedBy?: string;
}

export class CmsItemsRepository {
  constructor(private readonly db: Db) {}

  async listByCollection(collection: string): Promise<CmsItemRecord[]> {
    return this.db.select().from(cmsItems).where(eq(cmsItems.collection, collection)).orderBy(cmsItems.order, cmsItems.createdAt);
  }

  async findById(id: string): Promise<CmsItemRecord | undefined> {
    const [row] = await this.db.select().from(cmsItems).where(eq(cmsItems.id, id)).limit(1);
    return row;
  }

  // Usado só pelo seed, pra rodar de novo sem duplicar.
  async findBySlug(slug: string): Promise<CmsItemRecord | undefined> {
    const [row] = await this.db.select().from(cmsItems).where(eq(cmsItems.slug, slug)).limit(1);
    return row;
  }

  async create(input: CreateCmsItemInput): Promise<CmsItemRecord> {
    const [row] = await this.db.insert(cmsItems).values(input).returning();
    if (!row) throw new Error('Failed to create cms item');
    return row;
  }

  // "collection" no where garante que um id de outra coleção nunca é
  // alterado/apagado por engano pela rota errada (defesa em profundidade,
  // além da validação já feita na rota).
  async updateInCollection(id: string, collection: string, patch: UpdateCmsItemInput): Promise<CmsItemRecord | undefined> {
    const [row] = await this.db.update(cmsItems)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(cmsItems.id, id), eq(cmsItems.collection, collection)))
      .returning();
    return row;
  }

  async deleteInCollection(id: string, collection: string): Promise<boolean> {
    const deleted = await this.db.delete(cmsItems).where(and(eq(cmsItems.id, id), eq(cmsItems.collection, collection))).returning({ id: cmsItems.id });
    return deleted.length > 0;
  }
}
