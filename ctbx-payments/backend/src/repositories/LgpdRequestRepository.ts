import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { lgpdRequestEvents, lgpdRequests } from '../db/schema/index.js';
import { monthKey } from '../utils/monthKey.js';

export const LGPD_RIGHTS = ['CONFIRMATION_ACCESS', 'CORRECTION', 'ANONYMIZATION_DELETION', 'PORTABILITY', 'CONSENT_REVOCATION', 'SHARING_INFO', 'DECISION_REVIEW', 'OTHER'] as const;
export type LgpdRight = (typeof LGPD_RIGHTS)[number];
export type LgpdStatus = 'OPEN' | 'IN_PROGRESS' | 'ANSWERED' | 'DENIED';
export type LgpdEventAction = 'CREATED' | 'NOTE' | 'IN_PROGRESS' | 'IDENTITY_VERIFIED' | 'ANSWERED' | 'DENIED';
export const LGPD_OPEN: LgpdStatus[] = ['OPEN', 'IN_PROGRESS'];

export interface LgpdRequestRecord {
  id: string; protocol: string; right: LgpdRight; channel: 'EMAIL' | 'OTHER';
  requesterName: string; requesterContact: string; customerId: string | null; description: string;
  identityVerified: boolean; status: LgpdStatus; response: string | null;
  receivedAt: Date; dueAt: Date; closedAt: Date | null; createdBy: string; createdAt: Date; updatedAt: Date;
}
export interface LgpdEventRecord { id: string; requestId: string; staffId: string; action: LgpdEventAction; note: string | null; createdAt: Date }
export type NewLgpdRequest = Omit<LgpdRequestRecord, 'id' | 'identityVerified' | 'status' | 'response' | 'closedAt' | 'createdAt' | 'updatedAt'>;
export type LgpdPatch = Partial<Pick<LgpdRequestRecord, 'status' | 'identityVerified' | 'response' | 'closedAt'>>;
export interface LgpdMonthly { received: number; closed: number; closedOnTime: number }

export interface LgpdRequestRepository {
  create(input: NewLgpdRequest, now: Date): Promise<LgpdRequestRecord>;
  findById(id: string): Promise<LgpdRequestRecord | undefined>;
  list(filter: 'open' | 'closed' | 'all', limit: number): Promise<LgpdRequestRecord[]>;
  // Só altera se o pedido ainda estiver aberto (pedido encerrado é definitivo).
  updateOpen(id: string, patch: LgpdPatch, now: Date): Promise<boolean>;
  addEvent(event: Omit<LgpdEventRecord, 'id' | 'createdAt'>, now: Date): Promise<void>;
  listEvents(requestId: string): Promise<LgpdEventRecord[]>;
  countOpen(now: Date): Promise<{ open: number; overdue: number }>;
  monthly(since: Date): Promise<Record<string, LgpdMonthly>>;
}

const MONTH = (col: unknown) => sql<string>`to_char(date_trunc('month', ${col} at time zone 'America/Sao_Paulo'), 'YYYY-MM')`;

export class PostgresLgpdRequestRepository implements LgpdRequestRepository {
  constructor(private readonly db: Db) {}
  async create(input: NewLgpdRequest, now: Date) {
    const [row] = await this.db.insert(lgpdRequests).values({ ...input, createdAt: now, updatedAt: now }).returning();
    return row as LgpdRequestRecord;
  }
  async findById(id: string) {
    const [row] = await this.db.select().from(lgpdRequests).where(eq(lgpdRequests.id, id)).limit(1);
    return row as LgpdRequestRecord | undefined;
  }
  async list(filter: 'open' | 'closed' | 'all', limit: number) {
    const where = filter === 'open' ? inArray(lgpdRequests.status, LGPD_OPEN) : filter === 'closed' ? inArray(lgpdRequests.status, ['ANSWERED', 'DENIED']) : undefined;
    const q = this.db.select().from(lgpdRequests).where(where).orderBy(filter === 'open' ? lgpdRequests.dueAt : desc(lgpdRequests.receivedAt)).limit(limit);
    return (await q) as LgpdRequestRecord[];
  }
  async updateOpen(id: string, patch: LgpdPatch, now: Date) {
    const rows = await this.db.update(lgpdRequests).set({ ...patch, updatedAt: now }).where(and(eq(lgpdRequests.id, id), inArray(lgpdRequests.status, LGPD_OPEN))).returning({ id: lgpdRequests.id });
    return rows.length === 1;
  }
  async addEvent(event: Omit<LgpdEventRecord, 'id' | 'createdAt'>, now: Date) {
    await this.db.insert(lgpdRequestEvents).values({ ...event, createdAt: now });
  }
  async listEvents(requestId: string) {
    return (await this.db.select().from(lgpdRequestEvents).where(eq(lgpdRequestEvents.requestId, requestId)).orderBy(lgpdRequestEvents.createdAt)) as LgpdEventRecord[];
  }
  async countOpen(now: Date) {
    const [row] = await this.db.select({
      open: count(),
      overdue: sql<number>`count(*) filter (where ${lgpdRequests.dueAt} < ${now})`,
    }).from(lgpdRequests).where(inArray(lgpdRequests.status, LGPD_OPEN));
    return { open: Number(row?.open ?? 0), overdue: Number(row?.overdue ?? 0) };
  }
  async monthly(since: Date) {
    const out: Record<string, LgpdMonthly> = {};
    const slot = (m: string) => (out[m] ??= { received: 0, closed: 0, closedOnTime: 0 });
    const rm = MONTH(lgpdRequests.receivedAt);
    for (const r of await this.db.select({ m: rm, n: count() }).from(lgpdRequests).where(gte(lgpdRequests.receivedAt, since)).groupBy(rm)) slot(r.m).received = Number(r.n);
    const cm = MONTH(lgpdRequests.closedAt);
    const closed = await this.db.select({ m: cm, n: count(), onTime: sql<number>`count(*) filter (where ${lgpdRequests.closedAt} <= ${lgpdRequests.dueAt})` })
      .from(lgpdRequests).where(gte(lgpdRequests.closedAt, since)).groupBy(cm);
    for (const r of closed) { slot(r.m).closed = Number(r.n); slot(r.m).closedOnTime = Number(r.onTime); }
    return out;
  }
}

export class InMemoryLgpdRequestRepository implements LgpdRequestRepository {
  private readonly items: LgpdRequestRecord[] = [];
  private readonly events: LgpdEventRecord[] = [];
  async create(input: NewLgpdRequest, now: Date) {
    if (this.items.some((r) => r.protocol === input.protocol)) throw Object.assign(new Error('duplicate'), { code: '23505' });
    const r: LgpdRequestRecord = { ...input, id: randomUUID(), identityVerified: false, status: 'OPEN', response: null, closedAt: null, createdAt: now, updatedAt: now };
    this.items.push(r); return { ...r };
  }
  async findById(id: string) { const r = this.items.find((x) => x.id === id); return r ? { ...r } : undefined; }
  async list(filter: 'open' | 'closed' | 'all', limit: number) {
    const open = (r: LgpdRequestRecord) => LGPD_OPEN.includes(r.status);
    const rows = this.items.filter((r) => filter === 'all' || (filter === 'open' ? open(r) : !open(r)));
    rows.sort((a, b) => filter === 'open' ? a.dueAt.getTime() - b.dueAt.getTime() : b.receivedAt.getTime() - a.receivedAt.getTime());
    return rows.slice(0, limit).map((r) => ({ ...r }));
  }
  async updateOpen(id: string, patch: LgpdPatch, now: Date) {
    const r = this.items.find((x) => x.id === id);
    if (!r || !LGPD_OPEN.includes(r.status)) return false;
    Object.assign(r, patch, { updatedAt: now }); return true;
  }
  async addEvent(event: Omit<LgpdEventRecord, 'id' | 'createdAt'>, now: Date) { this.events.push({ ...event, id: randomUUID(), createdAt: now }); }
  async listEvents(requestId: string) { return this.events.filter((e) => e.requestId === requestId).map((e) => ({ ...e })); }
  async countOpen(now: Date) {
    const open = this.items.filter((r) => LGPD_OPEN.includes(r.status));
    return { open: open.length, overdue: open.filter((r) => r.dueAt < now).length };
  }
  async monthly(since: Date) {
    const out: Record<string, LgpdMonthly> = {};
    const slot = (m: string) => (out[m] ??= { received: 0, closed: 0, closedOnTime: 0 });
    for (const r of this.items) {
      if (r.receivedAt >= since) slot(monthKey(r.receivedAt)).received += 1;
      if (r.closedAt && r.closedAt >= since) { const s = slot(monthKey(r.closedAt)); s.closed += 1; if (r.closedAt <= r.dueAt) s.closedOnTime += 1; }
    }
    return out;
  }
}
