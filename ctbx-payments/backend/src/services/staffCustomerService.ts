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

  async search(raw: string) {
    const rows = await this.customers.search(parseCustomerSearch(raw), SEARCH_LIMIT);
    const out = [];
    for (const r of rows) out.push({ id: r.id, name: r.name, email: r.email, documentMasked: maskCpf(r.document), status: r.status, kycStatus: (await this.kyc.findByCustomerId(r.id))?.status ?? 'NOT_STARTED', createdAt: r.createdAt.toISOString() });
    return out;
  }

  async detail(customerId: string) {
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
      recentEvents: events.map((e) => ({ event: e.event, outcome: e.outcome, byStaff: Boolean(e.staffId), ip: e.ip ?? null, occurredAt: e.occurredAt.toISOString() })),
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
    const staffNames = new Map<string, string>();
    for (const r of rows) if (r.staffId && !staffNames.has(r.staffId)) staffNames.set(r.staffId, (await this.staff.findUserById(r.staffId))?.name ?? '—');
    return rows.map((r) => ({ id: r.id, event: r.event, outcome: r.outcome, staffName: r.staffId ? staffNames.get(r.staffId) : null, staffId: r.staffId ?? null, customerId: r.customerId ?? null, ip: r.ip ?? null, details: r.details ?? null, occurredAt: r.occurredAt.toISOString() }));
  }

  private async require(customerId: string): Promise<CustomerRecord> {
    const c = await this.customers.findById(customerId);
    if (!c) throw new ApiError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', { statusCode: 404 });
    return c;
  }
}
