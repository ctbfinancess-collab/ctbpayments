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

export interface StoredSecurityAuditEvent extends SecurityAuditEvent { occurredAt: Date }

export interface SecurityAuditRepository {
  record(event: SecurityAuditEvent): Promise<void>;
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
}

export class InMemorySecurityAuditRepository implements SecurityAuditRepository {
  readonly events: StoredSecurityAuditEvent[] = [];

  async record(event: SecurityAuditEvent): Promise<void> {
    this.events.push({ ...event, occurredAt: new Date() });
  }
}
