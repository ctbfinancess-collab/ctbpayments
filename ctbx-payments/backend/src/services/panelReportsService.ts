import type { CompanyRepository } from '../repositories/CompanyRepository.js';
import type { CustomerKycRepository } from '../repositories/CustomerKycRepository.js';
import type { CustomerRepository } from '../repositories/CustomerRepository.js';
import type { LgpdRequestRepository } from '../repositories/LgpdRequestRepository.js';
import type { StaffRepository } from '../repositories/StaffRepository.js';
import { lastMonths } from '../utils/monthKey.js';

// Etapa D — relatório mensal do painel: SÓ números agregados (nenhum nome,
// documento, e-mail ou IP), lidos do banco.
export class PanelReportsService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly companies: CompanyRepository,
    private readonly kyc: CustomerKycRepository,
    private readonly staff: StaffRepository,
    private readonly lgpd: LgpdRequestRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async monthly(count = 12) {
    const now = this.now();
    const months = lastMonths(now, count);
    const [y, m] = months[0]!.split('-').map(Number) as [number, number];
    // Um dia antes do 1º mês em UTC: o filtro fino é feito pelo mês de Brasília.
    const since = new Date(Date.UTC(y, m - 1, 1) - 24 * 3_600_000);
    const [pf, pj, kycDecisions, pjDecisions, avgHours, lgpd] = await Promise.all([
      this.customers.countCreatedByMonth(since), this.companies.countCreatedByMonth(since),
      this.staff.countReviewsByMonth(since), this.companies.countReviewsByMonth(since),
      this.kyc.avgReviewHoursByMonth(since), this.lgpd.monthly(since),
    ]);
    const dec = (d: Record<string, number> | undefined) => ({ approved: d?.APPROVED ?? 0, changes: d?.CHANGES_REQUESTED ?? 0, rejected: d?.REJECTED ?? 0 });
    const rows = months.map((month) => ({
      month,
      newCustomers: pf[month] ?? 0, newCompanies: pj[month] ?? 0,
      kycDecisions: dec(kycDecisions[month]), companyDecisions: dec(pjDecisions[month]),
      avgKycReviewHours: avgHours[month] ?? null,
      lgpd: lgpd[month] ?? { received: 0, closed: 0, closedOnTime: 0 },
    }));
    const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
    return {
      months: rows.reverse(),
      totals: {
        newCustomers: sum((r) => r.newCustomers), newCompanies: sum((r) => r.newCompanies),
        kycApproved: sum((r) => r.kycDecisions.approved), kycChanges: sum((r) => r.kycDecisions.changes), kycRejected: sum((r) => r.kycDecisions.rejected),
        companyApproved: sum((r) => r.companyDecisions.approved),
        lgpdReceived: sum((r) => r.lgpd.received), lgpdClosed: sum((r) => r.lgpd.closed), lgpdClosedOnTime: sum((r) => r.lgpd.closedOnTime),
      },
    };
  }
}
