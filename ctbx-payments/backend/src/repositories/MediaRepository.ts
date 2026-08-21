import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { cmsItems, cmsSections, media } from '../db/schema/index.js';

export interface MediaRecord {
  id: string;
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  originalFilename: string | null;
  altText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMediaInput {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  originalFilename?: string;
}

export class MediaRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<MediaRecord[]> {
    return this.db.select().from(media).orderBy(media.createdAt);
  }

  async findById(id: string): Promise<MediaRecord | undefined> {
    const [row] = await this.db.select().from(media).where(eq(media.id, id)).limit(1);
    return row;
  }

  async findByPublicId(publicId: string): Promise<MediaRecord | undefined> {
    const [row] = await this.db.select().from(media).where(eq(media.publicId, publicId)).limit(1);
    return row;
  }

  // Upload assinado sempre gera um public_id novo (o front nunca reenvia um
  // já existente), então isto normalmente é sempre um insert — o upsert só
  // protege contra uma eventual repetição de rede (ex.: o cliente confirmar
  // o /media persist duas vezes pro mesmo upload).
  async create(input: CreateMediaInput): Promise<MediaRecord> {
    const [row] = await this.db.insert(media).values(input)
      .onConflictDoUpdate({ target: media.publicId, set: { ...input, updatedAt: new Date() } })
      .returning();
    if (!row) throw new Error('Failed to persist media record');
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(media).where(eq(media.id, id));
  }

  // Antes de apagar de verdade no Cloudinary: nunca remover uma mídia que
  // algum conteúdo (banner, e futuramente qualquer outro cms_item/section)
  // ainda esteja usando.
  async isReferenced(mediaId: string): Promise<boolean> {
    const [itemRow] = await this.db.select({ id: cmsItems.id }).from(cmsItems).where(eq(cmsItems.mediaId, mediaId)).limit(1);
    if (itemRow) return true;
    const [sectionRow] = await this.db.select({ id: cmsSections.id }).from(cmsSections).where(eq(cmsSections.mediaId, mediaId)).limit(1);
    return Boolean(sectionRow);
  }
}
