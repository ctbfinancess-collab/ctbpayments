import { and, desc, eq, gte, lt, lte, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { securityAuditEvents } from '../db/schema/index.js';

export type SecurityAuditOutcome = 'SUCCESS' | 'FAILURE' | 'BLOCKED';

export interface SecurityAuditEvent {
  event: string;
  outcome: SecurityAuditOutcome;
  customerId?: string | null;
  staffId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  details?: Record<string, string | number | boolean>;
}

export interface StoredSecurityAuditEvent extends SecurityAuditEvent { id?: string; occurredAt: Date }

// Consulta da trilha (painel da equipe, só ADMIN). Mais novos primeiro;
// `before` pagina pelo horário.
export interface AuditQuery { event?: string; customerId?: string; staffId?: string; from?: Date; to?: Date; before?: Date; limit: number }

export interface SecurityAuditRepository {
  record(event: SecurityAuditEvent): Promise<void>;
  query(q: AuditQuery): Promise<StoredSecurityAuditEvent[]>;
}

export class PostgresSecurityAuditRepository implements SecurityAuditRepository {
  constructor(private readonly db: Db) {}

  async record(event: SecurityAuditEvent): Promise<void> {
    await this.db.insert(securityAuditEvents).values({
      event: event.event,
      outcome: event.outcome,
      customerId: event.customerId ?? null,
      staffId: event.staffId ?? null,
      ip: event.ip ?? null,
      userAgent: event.userAgent ?? null,
      requestId: event.requestId ?? null,
      details: event.details ?? null,
    });
  }

  async query(q: AuditQuery): Promise<StoredSecurityAuditEvent[]> {
    const t = securityAuditEvents;
    const conds: SQL[] = [];
    if (q.event) conds.push(eq(t.event, q.event));
    if (q.customerId) conds.push(eq(t.customerId, q.customerId));
    if (q.staffId) conds.push(eq(t.staffId, q.staffId));
    if (q.from) conds.push(gte(t.occurredAt, q.from));
    if (q.to) conds.push(lte(t.occurredAt, q.to));
    if (q.before) conds.push(lt(t.occurredAt, q.before));
    const rows = await this.db.select().from(t).where(conds.length ? and(...conds) : undefined).orderBy(desc(t.occurredAt)).limit(q.limit);
    return rows.map((r) => ({ id: r.id, event: r.event, outcome: r.outcome as SecurityAuditOutcome, customerId: r.customerId, staffId: r.staffId, ip: r.ip, userAgent: r.userAgent, requestId: r.requestId, occurredAt: r.occurredAt, ...(r.details ? { details: r.details as Record<string, string | number | boolean> } : {}) }));
  }
}

export class InMemorySecurityAuditRepository implements SecurityAuditRepository {
  readonly events: StoredSecurityAuditEvent[] = [];

  async record(event: SecurityAuditEvent): Promise<void> {
    this.events.push({ ...event, id: `${this.events.length + 1}`, occurredAt: new Date() });
  }

  async query(q: AuditQuery): Promise<StoredSecurityAuditEvent[]> {
    return this.events.filter((e) => (!q.event || e.event === q.event) && (!q.customerId || e.customerId === q.customerId) && (!q.staffId || e.staffId === q.staffId)
      && (!q.from || e.occurredAt >= q.from) && (!q.to || e.occurredAt <= q.to) && (!q.before || e.occurredAt < q.before))
      .slice().reverse().slice(0, q.limit);
  }
}
