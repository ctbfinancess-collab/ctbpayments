import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { customerStatusChanges, kycReviews, staffSessions, staffTokens, staffUsers } from '../db/schema/index.js';

export type StaffRole = 'ADMIN' | 'ANALYST';
export type StaffStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';
export type StaffTokenPurpose = 'INVITE' | 'MFA_ENROLL' | 'MFA_LOGIN' | 'PASSWORD_RESET';
export type KycDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

export interface StaffUserRecord {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  passwordHash: string | null;
  totpSecretEnc: string | null;
  totpEnabledAt: Date | null;
  totpLastStep: number | null;
  failedAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffUserPatch = Partial<Omit<StaffUserRecord, 'id' | 'email' | 'createdAt'>>;

export interface StaffSessionRecord { id: string; staffId: string; tokenHash: string; createdAt: Date; lastSeenAt: Date; expiresAt: Date; revokedAt: Date | null }
export interface CustomerStatusChangeRecord { id: string; customerId: string; staffId: string; action: 'BLOCK' | 'UNBLOCK'; reason: string; createdAt: Date }
export interface KycReviewRecord { id: string; customerId: string; staffId: string; decision: KycDecision; reason: string | null; createdAt: Date }

export interface StaffRepository {
  createUser(input: { name: string; email: string; role: StaffRole }, now: Date): Promise<StaffUserRecord>;
  findUserByEmail(email: string): Promise<StaffUserRecord | undefined>;
  findUserById(id: string): Promise<StaffUserRecord | undefined>;
  listUsers(): Promise<StaffUserRecord[]>;
  updateUser(id: string, patch: StaffUserPatch, now: Date): Promise<void>;
  createToken(staffId: string, purpose: StaffTokenPurpose, tokenHash: string, expiresAt: Date): Promise<void>;
  // Confere sem consumir (válido, não usado e não vencido).
  peekToken(tokenHash: string, purpose: StaffTokenPurpose, now: Date): Promise<string | null>;
  // Uso único atômico: devolve o staffId só para quem consumiu agora.
  consumeToken(tokenHash: string, purpose: StaffTokenPurpose, now: Date): Promise<string | null>;
  // Invalida links pendentes do usuário (todos ou só de uma finalidade).
  invalidateTokens(staffId: string, now: Date, purpose?: StaffTokenPurpose): Promise<void>;
  createSession(staffId: string, tokenHash: string, expiresAt: Date, now: Date): Promise<void>;
  findSession(tokenHash: string): Promise<StaffSessionRecord | undefined>;
  touchSession(tokenHash: string, now: Date): Promise<void>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  revokeAllSessions(staffId: string, now: Date): Promise<void>;
  addReview(review: Omit<KycReviewRecord, 'id'>): Promise<KycReviewRecord>;
  listReviews(customerId: string): Promise<KycReviewRecord[]>;
  addStatusChange(change: Omit<CustomerStatusChangeRecord, 'id'>): Promise<void>;
  listStatusChanges(customerId: string): Promise<CustomerStatusChangeRecord[]>;
}

export class PostgresStaffRepository implements StaffRepository {
  constructor(private readonly db: Db) {}

  async createUser(input: { name: string; email: string; role: StaffRole }, now: Date): Promise<StaffUserRecord> {
    const [row] = await this.db.insert(staffUsers).values({ ...input, status: 'INVITED', createdAt: now, updatedAt: now }).returning();
    return row as StaffUserRecord;
  }
  async findUserByEmail(email: string) {
    const [row] = await this.db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
    return row as StaffUserRecord | undefined;
  }
  async findUserById(id: string) {
    const [row] = await this.db.select().from(staffUsers).where(eq(staffUsers.id, id)).limit(1);
    return row as StaffUserRecord | undefined;
  }
  async listUsers() {
    return (await this.db.select().from(staffUsers).orderBy(asc(staffUsers.createdAt))) as StaffUserRecord[];
  }
  async updateUser(id: string, patch: StaffUserPatch, now: Date) {
    await this.db.update(staffUsers).set({ ...patch, updatedAt: now }).where(eq(staffUsers.id, id));
  }
  async createToken(staffId: string, purpose: StaffTokenPurpose, tokenHash: string, expiresAt: Date) {
    await this.db.insert(staffTokens).values({ staffId, purpose, tokenHash, expiresAt });
  }
  async peekToken(tokenHash: string, purpose: StaffTokenPurpose, now: Date) {
    const [row] = await this.db.select({ staffId: staffTokens.staffId }).from(staffTokens)
      .where(and(eq(staffTokens.tokenHash, tokenHash), eq(staffTokens.purpose, purpose), isNull(staffTokens.consumedAt), gt(staffTokens.expiresAt, now))).limit(1);
    return row?.staffId ?? null;
  }
  async consumeToken(tokenHash: string, purpose: StaffTokenPurpose, now: Date) {
    const rows = await this.db.update(staffTokens).set({ consumedAt: now })
      .where(and(eq(staffTokens.tokenHash, tokenHash), eq(staffTokens.purpose, purpose), isNull(staffTokens.consumedAt), gt(staffTokens.expiresAt, now)))
      .returning({ staffId: staffTokens.staffId });
    return rows[0]?.staffId ?? null;
  }
  async invalidateTokens(staffId: string, now: Date, purpose?: StaffTokenPurpose) {
    const conds = [eq(staffTokens.staffId, staffId), isNull(staffTokens.consumedAt)];
    if (purpose) conds.push(eq(staffTokens.purpose, purpose));
    await this.db.update(staffTokens).set({ consumedAt: now }).where(and(...conds));
  }
  async createSession(staffId: string, tokenHash: string, expiresAt: Date, now: Date) {
    await this.db.insert(staffSessions).values({ staffId, tokenHash, expiresAt, createdAt: now, lastSeenAt: now });
  }
  async findSession(tokenHash: string) {
    const [row] = await this.db.select().from(staffSessions).where(eq(staffSessions.tokenHash, tokenHash)).limit(1);
    return row as StaffSessionRecord | undefined;
  }
  async touchSession(tokenHash: string, now: Date) {
    await this.db.update(staffSessions).set({ lastSeenAt: now }).where(eq(staffSessions.tokenHash, tokenHash));
  }
  async revokeSession(tokenHash: string, now: Date) {
    await this.db.update(staffSessions).set({ revokedAt: now }).where(and(eq(staffSessions.tokenHash, tokenHash), isNull(staffSessions.revokedAt)));
  }
  async revokeAllSessions(staffId: string, now: Date) {
    await this.db.update(staffSessions).set({ revokedAt: now }).where(and(eq(staffSessions.staffId, staffId), isNull(staffSessions.revokedAt)));
  }
  async addReview(review: Omit<KycReviewRecord, 'id'>) {
    const [row] = await this.db.insert(kycReviews).values(review).returning();
    return row as KycReviewRecord;
  }
  async addStatusChange(change: Omit<CustomerStatusChangeRecord, 'id'>) {
    await this.db.insert(customerStatusChanges).values(change);
  }
  async listStatusChanges(customerId: string) {
    return (await this.db.select().from(customerStatusChanges).where(eq(customerStatusChanges.customerId, customerId)).orderBy(desc(customerStatusChanges.createdAt))) as CustomerStatusChangeRecord[];
  }
  async listReviews(customerId: string) {
    return (await this.db.select().from(kycReviews).where(eq(kycReviews.customerId, customerId)).orderBy(desc(kycReviews.createdAt))) as KycReviewRecord[];
  }
}

export class InMemoryStaffRepository implements StaffRepository {
  readonly users: StaffUserRecord[] = [];
  readonly tokens: { staffId: string; purpose: StaffTokenPurpose; tokenHash: string; expiresAt: Date; consumedAt: Date | null }[] = [];
  readonly sessions: StaffSessionRecord[] = [];
  readonly reviews: KycReviewRecord[] = [];
  readonly statusChanges: CustomerStatusChangeRecord[] = [];

  async createUser(input: { name: string; email: string; role: StaffRole }, now: Date) {
    if (this.users.some((u) => u.email === input.email)) throw Object.assign(new Error('duplicate key'), { code: '23505' });
    const user: StaffUserRecord = { ...input, id: randomUUID(), status: 'INVITED', passwordHash: null, totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null, failedAttempts: 0, lockedUntil: null, lastLoginAt: null, createdAt: now, updatedAt: now };
    this.users.push(user);
    return { ...user };
  }
  async findUserByEmail(email: string) { const u = this.users.find((x) => x.email === email); return u && { ...u }; }
  async findUserById(id: string) { const u = this.users.find((x) => x.id === id); return u && { ...u }; }
  async listUsers() { return this.users.map((u) => ({ ...u })); }
  async updateUser(id: string, patch: StaffUserPatch, now: Date) {
    const u = this.users.find((x) => x.id === id);
    if (u) Object.assign(u, patch, { updatedAt: now });
  }
  async createToken(staffId: string, purpose: StaffTokenPurpose, tokenHash: string, expiresAt: Date) {
    this.tokens.push({ staffId, purpose, tokenHash, expiresAt, consumedAt: null });
  }
  async peekToken(tokenHash: string, purpose: StaffTokenPurpose, now: Date) {
    return this.tokens.find((x) => x.tokenHash === tokenHash && x.purpose === purpose && !x.consumedAt && x.expiresAt > now)?.staffId ?? null;
  }
  async consumeToken(tokenHash: string, purpose: StaffTokenPurpose, now: Date) {
    const t = this.tokens.find((x) => x.tokenHash === tokenHash && x.purpose === purpose && !x.consumedAt && x.expiresAt > now);
    if (!t) return null;
    t.consumedAt = now;
    return t.staffId;
  }
  async invalidateTokens(staffId: string, now: Date, purpose?: StaffTokenPurpose) {
    for (const t of this.tokens) if (t.staffId === staffId && !t.consumedAt && (!purpose || t.purpose === purpose)) t.consumedAt = now;
  }
  async createSession(staffId: string, tokenHash: string, expiresAt: Date, now: Date) {
    this.sessions.push({ id: randomUUID(), staffId, tokenHash, createdAt: now, lastSeenAt: now, expiresAt, revokedAt: null });
  }
  async findSession(tokenHash: string) { const s = this.sessions.find((x) => x.tokenHash === tokenHash); return s && { ...s }; }
  async touchSession(tokenHash: string, now: Date) { const s = this.sessions.find((x) => x.tokenHash === tokenHash); if (s) s.lastSeenAt = now; }
  async revokeSession(tokenHash: string, now: Date) { const s = this.sessions.find((x) => x.tokenHash === tokenHash && !x.revokedAt); if (s) s.revokedAt = now; }
  async revokeAllSessions(staffId: string, now: Date) { for (const s of this.sessions) if (s.staffId === staffId && !s.revokedAt) s.revokedAt = now; }
  async addReview(review: Omit<KycReviewRecord, 'id'>) { const r = { ...review, id: randomUUID() }; this.reviews.push(r); return { ...r }; }
  async addStatusChange(change: Omit<CustomerStatusChangeRecord, 'id'>) { this.statusChanges.push({ ...change, id: randomUUID() }); }
  async listStatusChanges(customerId: string) { return this.statusChanges.filter((c) => c.customerId === customerId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); }
  async listReviews(customerId: string) { return this.reviews.filter((r) => r.customerId === customerId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); }
}
