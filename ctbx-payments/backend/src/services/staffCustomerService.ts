import { maskIp } from '../security/maskIp.js';
import { lastMonths } from '../utils/monthKey.js';
import { renderAccountStatusTemplate } from '../emails/staffAndKycTemplates.js';
import { ApiError } from '../errors/ApiError.js';
import type { EmailProvider } from '../providers/EmailProvider.js';
import type { CompanyRepository } from '../repositories/CompanyRepository.js';
import type { CompanyRepresentativeRepository } from '../repositories/CompanyRepresentativeRepository.js';
import type { CustomerKycRepository } from '../repositories/CustomerKycRepository.js';
import type { CustomerRecord, CustomerRepository, CustomerSearch } from '../repositories/CustomerRepository.js';
import type { CustomerSessionRepository } from '../repositories/CustomerSessionRepository.js';
import type { SecurityAuditRepository } from '../repositories/SecurityAuditRepository.js';
import type { StaffRepository } from '../repositories/StaffRepository.js';
import type { AuthenticatedStaff } from './staffAuthService.js';

// Fase 6 — painel administrativo: visão geral, clientes e auditoria.
// Leitura: ANALYST e ADMIN. Suspender/reativar/encerrar sessões e ver a
// auditoria completa: só ADMIN (checado nas rotas).
const SEARCH_LIMIT = 50;
const maskCpf = (cpf: string) => `***.${cpf.slice(3, 6)}.***-**`;

export function parseCustomerSearch(raw: string): CustomerSearch {
  const q = raw.trim();
  const digits = q.replace(/\D/g, '');
  if (/^[\d.\-\s]+$/.test(q) && digits.length === 11) return { document: digits };
  if (q.includes('@')) {
    if (q.length < 3) throw new ApiError('STAFF_SEARCH_TOO_SHORT', 'Digite pelo menos 3 caracteres.', { statusCode: 422 });
    return { email: q.toLowerCase() };
  }
  if (q.length < 3) throw new ApiError('STAFF_SEARCH_TOO_SHORT', 'Digite pelo menos 3 caracteres (ou o CPF completo).', { statusCode: 422 });
  return { name: q };
}

export class StaffCustomerService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly sessions: CustomerSessionRepository,
    private readonly kyc: CustomerKycRepository,
    private readonly companies: CompanyRepository,
    private readonly representatives: CompanyRepresentativeRepository,
    private readonly staff: StaffRepository,
    private readonly audit: SecurityAuditRepository,
    private readonly email: EmailProvider | undefined,
    private readonly appBaseUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async overview() {
    const [customers, kyc, companies] = await Promise.all([this.customers.countAll(), this.kyc.countByStatus(), this.companies.countByStatus()]);
    return { customers, kyc, companies, pending: { kyc: kyc.SUBMITTED ?? 0, companies: companies.SUBMITTED ?? 0 } };
  }

  // Dashboard (Etapa A): tudo lido do banco; nada de dado pessoal além do
  // nome do cliente ou da empresa nas pendências (que o painel já mostra) e
  // nenhum IP.
  async dashboard() {
    const now = this.now();
    const start = new Date(now); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0); start.setUTCMonth(start.getUTCMonth() - 12);
    const days30 = new Date(now.getTime() - 30 * 24 * 3_600_000);
    const [customers, kyc, companies, pfByMonth, pjByMonth, review, kycQueue, pjQueue, staffUsers, events] = await Promise.all([
      this.customers.countAll(), this.kyc.countByStatus(), this.companies.countByStatus(),
      this.customers.countCreatedByMonth(start), this.companies.countCreatedByMonth(start), this.kyc.reviewStats(days30),
      this.kyc.listByStatus('SUBMITTED'), this.companies.listByStatus('SUBMITTED'), this.staff.listUsers(),
      this.audit.query({ limit: 300 }),
    ]);
    const months = lastMonths(now, 12);
    const series = months.map((m) => ({ month: m, pf: pfByMonth[m] ?? 0, pj: pjByMonth[m] ?? 0 }));
    const pending = [
      ...kycQueue.filter((k) => k.submittedAt).map((k) => ({ kind: 'KYC' as const, id: k.customerId, submittedAt: k.submittedAt! })),
      ...pjQueue.filter((c) => c.submittedAt).map((c) => ({ kind: 'PJ' as const, id: c.id, submittedAt: c.submittedAt!, name: c.tradeName || c.legalName })),
    ].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
    const top = await Promise.all(pending.slice(0, 5).map(async (p) => ({
      kind: p.kind, id: p.id, submittedAt: p.submittedAt.toISOString(),
      name: p.kind === 'PJ' ? (p as { name: string }).name : ((await this.customers.findById(p.id))?.name ?? 'Cliente'),
    })));
    const staffNames = new Map(staffUsers.map((u) => [u.id, u.name]));
    const ACTIVITY = new Set(['STAFF_KYC_DECISION', 'STAFF_COMPANY_DECISION', 'STAFF_CUSTOMER_BLOCK', 'STAFF_CUSTOMER_UNBLOCK', 'STAFF_USER_INVITE', 'STAFF_USER_DISABLE', 'STAFF_USER_ACCESS_RESET']);
    const picked = events.filter((e) => e.staffId && e.outcome === 'SUCCESS' && ACTIVITY.has(e.event)).slice(0, 6);
    const activity = await Promise.all(picked.map(async (e) => {
      const d = (e.details ?? {}) as Record<string, unknown>;
      const companyId = typeof d.companyId === 'string' ? d.companyId : null;
      const subject = e.customerId ? ((await this.customers.findById(e.customerId))?.name ?? null)
        : companyId ? ((await this.companies.findById(companyId))?.legalName ?? null)
        : typeof d.targetStaffId === 'string' ? (staffNames.get(d.targetStaffId) ?? null) : null;
      return { event: e.event, staffName: staffNames.get(e.staffId!) ?? 'Equipe', subject, decision: typeof d.decision === 'string' ? d.decision : null, occurredAt: e.occurredAt.toISOString() };
    }));
    const oldestKyc = kycQueue.filter((k) => k.submittedAt).sort((a, b) => a.submittedAt!.getTime() - b.submittedAt!.getTime())[0];
    return {
      customers, kyc, companies,
      companiesTotal: Object.values(companies).reduce((a, b) => a + b, 0),
      pending: { kyc: kyc.SUBMITTED ?? 0, companies: companies.SUBMITTED ?? 0, oldestKycSubmittedAt: oldestKyc?.submittedAt?.toISOString() ?? null },
      newCustomers30d: Object.values(await this.customers.countCreatedByMonth(days30)).reduce((a, b) => a + b, 0),
      review: { last30Days: review.reviewed, avgHours: review.avgHours },
      series, priorities: top, activity,
    };
  }

  // Contadores do menu (leve, sem auditoria: só números).
  async badges() {
    const [kyc, companies] = await Promise.all([this.kyc.countByStatus(), this.companies.countByStatus()]);
    return { kyc: kyc.SUBMITTED ?? 0, companies: companies.SUBMITTED ?? 0 };
  }

  async search(raw: string) {
    const rows = await this.customers.search(parseCustomerSearch(raw), SEARCH_LIMIT);
    const out = [];
    for (const r of rows) out.push({ id: r.id, name: r.name, email: r.email, documentMasked: maskCpf(r.document), status: r.status, kycStatus: (await this.kyc.findByCustomerId(r.id))?.status ?? 'NOT_STARTED', createdAt: r.createdAt.toISOString() });
    return out;
  }

  // fullIp: só administradores recebem o IP completo; analistas, mascarado.
  async detail(customerId: string, opts: { fullIp: boolean } = { fullIp: false }) {
    const c = await this.require(customerId);
    const k = await this.kyc.findByCustomerId(customerId);
    const links = await this.representatives.listByCustomer(customerId);
    const companies = [];
    for (const l of links) {
      const co = await this.companies.findById(l.companyId);
      if (co) companies.push({ id: co.id, cnpj: co.cnpj, name: co.tradeName || co.legalName, status: co.status, linkStatus: l.status });
    }
    const names = new Map<string, string>();
    const changes = await this.staff.listStatusChanges(customerId);
    for (const ch of changes) if (!names.has(ch.staffId)) names.set(ch.staffId, (await this.staff.findUserById(ch.staffId))?.name ?? '—');
    const events = await this.audit.query({ customerId, limit: 30 });
    return {
      customer: { id: c.id, name: c.name, document: c.document, email: c.email, emailVerified: Boolean(c.emailVerifiedAt), phone: c.phone, status: c.status, createdAt: c.createdAt.toISOString() },
      kyc: { status: k?.status ?? 'NOT_STARTED', submittedAt: k?.submittedAt?.toISOString() ?? null, reviewedAt: k?.reviewedAt?.toISOString() ?? null },
      companies,
      statusHistory: changes.map((ch) => ({ action: ch.action, reason: ch.reason, staffName: names.get(ch.staffId) ?? '—', createdAt: ch.createdAt.toISOString() })),
      recentEvents: events.map((e) => ({ event: e.event, outcome: e.outcome, byStaff: Boolean(e.staffId), ip: opts.fullIp ? (e.ip ?? null) : maskIp(e.ip), occurredAt: e.occurredAt.toISOString() })),
    };
  }

  async setBlocked(actor: AuthenticatedStaff, customerId: string, blocked: boolean, reason: string) {
    const text = reason.trim();
    if (text.length < 10 || text.length > 500) throw new ApiError('STAFF_REASON_REQUIRED', 'Explique o motivo (de 10 a 500 caracteres). Ele fica só no registro interno.', { statusCode: 422 });
    const c = await this.require(customerId);
    if (blocked && c.status === 'BLOCKED') throw new ApiError('CUSTOMER_ALREADY_BLOCKED', 'Esta conta já está suspensa.', { statusCode: 409 });
    if (!blocked && c.status === 'ACTIVE') throw new ApiError('CUSTOMER_NOT_BLOCKED', 'Esta conta já está ativa.', { statusCode: 409 });
    const now = this.now();
    await this.customers.setStatus(customerId, blocked ? 'BLOCKED' : 'ACTIVE', now);
    if (blocked) await this.sessions.revokeAllForCustomer(customerId);
    await this.staff.addStatusChange({ customerId, staffId: actor.id, action: blocked ? 'BLOCK' : 'UNBLOCK', reason: text, createdAt: now });
    const notified = this.email
      ? await this.email.send({ to: c.email, ...renderAccountStatusTemplate(blocked ? 'BLOCKED' : 'REACTIVATED', `${this.appBaseUrl.replace(/\/$/, '')}/entrar`) }).then(() => true, () => false)
      : false;
    return { status: blocked ? 'BLOCKED' : 'ACTIVE', notified };
  }

  async revokeSessions(customerId: string) {
    await this.require(customerId);
    await this.sessions.revokeAllForCustomer(customerId);
  }

  async auditLog(filters: { event?: string; customerId?: string; staffId?: string; from?: string; to?: string; before?: string }) {
    const date = (v?: string) => { if (!v) return undefined; const d = new Date(v); if (Number.isNaN(d.getTime())) throw new ApiError('STAFF_AUDIT_FILTER_INVALID', 'Data inválida no filtro.', { statusCode: 422 }); return d; };
    const rows = await this.audit.query({
      ...(filters.event ? { event: filters.event } : {}), ...(filters.customerId ? { customerId: filters.customerId } : {}), ...(filters.staffId ? { staffId: filters.staffId } : {}),
      ...(date(filters.from) ? { from: date(filters.from)! } : {}), ...(date(filters.to) ? { to: date(filters.to)! } : {}), ...(date(filters.before) ? { before: date(filters.before)! } : {}),
      limit: 100,
    });
    // Nomes buscados na hora de exibir (a trilha em si não guarda nomes).
    const staffNames = new Map<string, string>();
    const customerNames = new Map<string, { name: string; email: string } | null>();
    for (const r of rows) {
      if (r.staffId && !staffNames.has(r.staffId)) staffNames.set(r.staffId, (await this.staff.findUserById(r.staffId))?.name ?? '—');
      if (r.customerId && !customerNames.has(r.customerId)) { const c = await this.customers.findById(r.customerId); customerNames.set(r.customerId, c ? { name: c.name, email: c.email } : null); }
    }
    return rows.map((r) => {
      const cust = r.customerId ? customerNames.get(r.customerId) : null;
      return { id: r.id, event: r.event, outcome: r.outcome, staffName: r.staffId ? staffNames.get(r.staffId) : null, staffId: r.staffId ?? null, customerId: r.customerId ?? null, customerName: cust?.name ?? null, customerEmail: cust?.email ?? null, ip: r.ip ?? null, details: r.details ?? null, occurredAt: r.occurredAt.toISOString() };
    });
  }

  private async require(customerId: string): Promise<CustomerRecord> {
    const c = await this.customers.findById(customerId);
    if (!c) throw new ApiError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', { statusCode: 404 });
    return c;
  }
}
