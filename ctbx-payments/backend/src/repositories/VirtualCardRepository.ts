import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxVirtualCardTransactions, sandboxVirtualCards } from '../db/schema/index.js';

export type VirtualCardStatus = 'ACTIVE' | 'BLOCKED' | 'CANCELLED';

export interface VirtualCardRecord {
  id: string; accountId: string; nickname: string | null; color: string; brand: string; lastFour: string;
  panEncrypted: string; cvvEncrypted: string; holderName: string; expiryMonth: number; expiryYear: number;
  limitMinor: number; usedMinor: number; status: VirtualCardStatus;
  idempotencyKey: string | null; requestHash: string | null; requestId: string | null; createdAt: Date; updatedAt: Date;
}

export interface VirtualCardTransactionRecord {
  id: string; cardId: string; occurredAt: Date; merchantName: string; amountMinor: number; status: string; createdAt: Date;
}

export interface CreateVirtualCardInput {
  id: string; accountId: string; nickname: string | null; color: string; brand: string; lastFour: string;
  panEncrypted: string; cvvEncrypted: string; holderName: string; expiryMonth: number; expiryYear: number; limitMinor: number;
  // Etapa 5.1 — ver comentário em db/schema/sandboxCards.ts.
  idempotencyKey: string; requestHash: string; requestId: string;
}

export interface UpdateVirtualCardInput {
  nickname?: string | null; lastFour?: string; panEncrypted?: string; cvvEncrypted?: string;
  expiryMonth?: number; expiryYear?: number; limitMinor?: number; usedMinor?: number; status?: VirtualCardStatus;
}

// Único domínio "de negócio" (não-admin) com persistência real — ver
// comentário em db/schema/sandboxCards.ts. "accountId" no where de
// find/update é defesa em profundidade (mesmo espírito de
// CmsItemsRepository.updateInCollection): garante que a conta sandbox A
// nunca enxerga/altera um cartão da conta sandbox B, mesmo que descubra o id.
export class VirtualCardRepository {
  constructor(private readonly db: Db) {}

  // "status" na tabela é `text` genérico (Drizzle infere `string`) — os
  // casts abaixo só estreitam pro union VirtualCardStatus, a coluna em si
  // só recebe 'ACTIVE'/'BLOCKED'/'CANCELLED' (ver ports.ts/provider).
  async listByAccount(accountId: string): Promise<VirtualCardRecord[]> {
    return (await this.db.select().from(sandboxVirtualCards).where(eq(sandboxVirtualCards.accountId, accountId)).orderBy(desc(sandboxVirtualCards.createdAt))) as VirtualCardRecord[];
  }

  async findById(id: string, accountId: string): Promise<VirtualCardRecord | undefined> {
    const [row] = await this.db.select().from(sandboxVirtualCards).where(and(eq(sandboxVirtualCards.id, id), eq(sandboxVirtualCards.accountId, accountId))).limit(1);
    return row as VirtualCardRecord | undefined;
  }

  async create(input: CreateVirtualCardInput): Promise<VirtualCardRecord> {
    const [row] = await this.db.insert(sandboxVirtualCards).values(input).returning();
    if (!row) throw new Error('Failed to create virtual card');
    return row as VirtualCardRecord;
  }

  // Etapa 5.1 — ver withPersistedIdempotency em providers/sandbox/persistedIdempotency.ts.
  async findByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<VirtualCardRecord | undefined> {
    const [row] = await this.db.select().from(sandboxVirtualCards).where(and(eq(sandboxVirtualCards.accountId, accountId), eq(sandboxVirtualCards.idempotencyKey, idempotencyKey))).limit(1);
    return row as VirtualCardRecord | undefined;
  }

  async update(id: string, accountId: string, patch: UpdateVirtualCardInput): Promise<VirtualCardRecord | undefined> {
    const [row] = await this.db.update(sandboxVirtualCards)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(sandboxVirtualCards.id, id), eq(sandboxVirtualCards.accountId, accountId)))
      .returning();
    return row as VirtualCardRecord | undefined;
  }

  async listTransactions(cardId: string): Promise<VirtualCardTransactionRecord[]> {
    return this.db.select().from(sandboxVirtualCardTransactions).where(eq(sandboxVirtualCardTransactions.cardId, cardId)).orderBy(desc(sandboxVirtualCardTransactions.occurredAt));
  }

  async deleteTransactions(cardId: string): Promise<void> {
    await this.db.delete(sandboxVirtualCardTransactions).where(eq(sandboxVirtualCardTransactions.cardId, cardId));
  }

  // Transações fictícias geradas na criação/recriação do cartão — só pra
  // dar sensação de produto real (ver SandboxCardProvider), mas persistidas.
  async createTransactions(rows: Array<Omit<VirtualCardTransactionRecord, 'createdAt'>>): Promise<void> {
    if (!rows.length) return;
    await this.db.insert(sandboxVirtualCardTransactions).values(rows);
  }
}
