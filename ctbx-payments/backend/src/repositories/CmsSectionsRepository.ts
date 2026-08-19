import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { cmsSections } from '../db/schema/index.js';

export interface CmsSectionRecord {
  id: string;
  section: string;
  key: string;
  label: string;
  value: unknown;
  mediaId: string | null;
  status: string;
  active: boolean;
  order: number | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface UpdateCmsSectionInput {
  value?: unknown;
  mediaId?: string | null;
  status?: string;
  updatedBy?: string;
}

// Home/Login/Tema/SEO são campos ESTRUTURAIS — cada "key" corresponde a um
// elemento fixo de UI já existente no app (ex.: título da Home, logo do
// login). Diferente de cms_items (banners, produtos...), aqui não existe
// create/delete pelo admin — só edição do valor/mídia de um campo que já
// existe (por isso o repositório não expõe create/delete, só list/update).
export class CmsSectionsRepository {
  constructor(private readonly db: Db) {}

  async listBySection(section: string): Promise<CmsSectionRecord[]> {
    return this.db.select().from(cmsSections).where(eq(cmsSections.section, section)).orderBy(cmsSections.order, cmsSections.key);
  }

  async findById(id: string): Promise<CmsSectionRecord | undefined> {
    const [row] = await this.db.select().from(cmsSections).where(eq(cmsSections.id, id)).limit(1);
    return row;
  }

  // Usado só pelo seed, pra rodar de novo sem duplicar (chave natural é
  // section+key, já garantida única pelo índice do schema).
  async findBySectionKey(section: string, key: string): Promise<CmsSectionRecord | undefined> {
    const [row] = await this.db.select().from(cmsSections).where(and(eq(cmsSections.section, section), eq(cmsSections.key, key))).limit(1);
    return row;
  }

  // "section" no where garante que um id de outra seção nunca é alterado
  // por engano pela rota errada (mesma defesa em profundidade de
  // CmsItemsRepository.updateInCollection).
  async updateInSection(id: string, section: string, patch: UpdateCmsSectionInput): Promise<CmsSectionRecord | undefined> {
    const [row] = await this.db.update(cmsSections)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(cmsSections.id, id), eq(cmsSections.section, section)))
      .returning();
    return row;
  }
}
