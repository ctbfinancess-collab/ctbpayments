import { randomBytes } from 'node:crypto';
import { ApiError } from '../errors/ApiError.js';
import type { CustomerRepository } from '../repositories/CustomerRepository.js';
import { LGPD_OPEN, LGPD_RIGHTS, type LgpdRequestRecord, type LgpdRequestRepository, type LgpdRight } from '../repositories/LgpdRequestRepository.js';
import type { StaffRepository } from '../repositories/StaffRepository.js';
import type { AuthenticatedStaff } from './staffAuthService.js';

// Etapa D — solicitações de titulares (LGPD). Registro e acompanhamento;
// a execução de cada pedido é manual. Prazo: 15 dias a partir do
// recebimento (art. 19, II).
export const LGPD_DEADLINE_DAYS = 15;
const DAY = 24 * 3_600_000;

export interface NewLgpdInput { right: string; channel: string; requesterName: string; requesterContact: string; description: string; receivedAt: string; customerLookup?: string }

const bad = (code: string, message: string) => new ApiError(code, message, { statusCode: 422 });
const text = (v: unknown, min: number, max: number, code: string, message: string) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min || s.length > max) throw bad(code, message);
  return s;
};
const protocol = (now: Date) => `LGPD-${now.getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase().slice(0, 6)}`;

export class LgpdService {
  constructor(
    private readonly repo: LgpdRequestRepository,
    private readonly customers: CustomerRepository,
    private readonly staff: StaffRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(actor: AuthenticatedStaff, input: NewLgpdInput) {
    if (!LGPD_RIGHTS.includes(input.right as LgpdRight)) throw bad('LGPD_RIGHT_INVALID', 'Escolha o direito solicitado.');
    if (input.channel !== 'EMAIL' && input.channel !== 'OTHER') throw bad('LGPD_CHANNEL_INVALID', 'Escolha o canal de recebimento.');
    const requesterName = text(input.requesterName, 2, 160, 'LGPD_NAME_INVALID', 'Informe o nome do titular.');
    const requesterContact = text(input.requesterContact, 3, 200, 'LGPD_CONTACT_INVALID', 'Informe o e-mail ou telefone de contato do titular.');
    const description = text(input.description, 5, 2000, 'LGPD_DESCRIPTION_INVALID', 'Descreva o pedido (até 2.000 caracteres).');
    const now = this.now();
    const receivedAt = new Date(input.receivedAt);
    if (Number.isNaN(receivedAt.getTime()) || receivedAt.getTime() > now.getTime() + DAY || receivedAt.getTime() < now.getTime() - 365 * DAY) throw bad('LGPD_RECEIVED_INVALID', 'Informe a data em que o pedido chegou (até 1 ano atrás).');
    let customerId: string | null = null;
    const lookup = (input.customerLookup ?? '').trim();
    if (lookup) {
      const digits = lookup.replace(/\D/g, '');
      const c = lookup.includes('@') ? await this.customers.findByEmail(lookup.toLowerCase()) : digits.length === 11 ? await this.customers.findByDocument(digits) : undefined;
      if (!c) throw bad('LGPD_CUSTOMER_NOT_FOUND', 'Nenhum cliente com esse e-mail ou CPF. Deixe o campo em branco se o titular não for cliente.');
      customerId = c.id;
    }
    const dueAt = new Date(receivedAt.getTime() + LGPD_DEADLINE_DAYS * DAY);
    let created: LgpdRequestRecord | undefined;
    for (let i = 0; i < 5 && !created; i += 1) {
      try { created = await this.repo.create({ protocol: protocol(now), right: input.right as LgpdRight, channel: input.channel, requesterName, requesterContact, customerId, description, receivedAt, dueAt, createdBy: actor.id }, now); }
      catch (e) { if ((e as { code?: string }).code !== '23505') throw e; }
    }
    if (!created) throw new ApiError('LGPD_PROTOCOL_FAILED', 'Não foi possível gerar o protocolo. Tente de novo.', { statusCode: 503 });
    await this.repo.addEvent({ requestId: created.id, staffId: actor.id, action: 'CREATED', note: null }, now);
    return this.view(created);
  }

  async list(filter: 'open' | 'closed' | 'all') {
    return (await this.repo.list(filter, 200)).map((r) => this.view(r));
  }

  async detail(id: string) {
    const r = await this.repo.findById(id);
    if (!r) throw new ApiError('LGPD_NOT_FOUND', 'Solicitação não encontrada.', { statusCode: 404 });
    const events = await this.repo.listEvents(id);
    const names = new Map<string, string>();
    for (const e of events) if (!names.has(e.staffId)) names.set(e.staffId, (await this.staff.findUserById(e.staffId))?.name ?? '—');
    const customer = r.customerId ? await this.customers.findById(r.customerId) : undefined;
    return {
      ...this.view(r),
      description: r.description, response: r.response,
      customer: customer ? { id: customer.id, name: customer.name } : null,
      events: events.map((e) => ({ action: e.action, note: e.note, staffName: names.get(e.staffId) ?? '—', createdAt: e.createdAt.toISOString() })),
    };
  }

  // Anotação, início do atendimento e/ou identidade confirmada.
  async update(actor: AuthenticatedStaff, id: string, input: { note?: string; inProgress?: boolean; identityVerified?: boolean }) {
    const r = await this.openOrFail(id);
    const note = input.note == null || input.note.trim() === '' ? null : text(input.note, 2, 2000, 'LGPD_NOTE_INVALID', 'A anotação deve ter até 2.000 caracteres.');
    const start = input.inProgress === true && r.status === 'OPEN';
    const verify = input.identityVerified === true && !r.identityVerified;
    if (!note && !start && !verify) throw bad('LGPD_NOTHING_TO_SAVE', 'Escreva uma anotação ou marque uma das opções.');
    const now = this.now();
    if (start || verify) {
      const ok = await this.repo.updateOpen(id, { ...(start ? { status: 'IN_PROGRESS' as const } : {}), ...(verify ? { identityVerified: true } : {}) }, now);
      if (!ok) throw this.closedError();
    }
    if (start) await this.repo.addEvent({ requestId: id, staffId: actor.id, action: 'IN_PROGRESS', note: null }, now);
    if (verify) await this.repo.addEvent({ requestId: id, staffId: actor.id, action: 'IDENTITY_VERIFIED', note: null }, now);
    if (note) await this.repo.addEvent({ requestId: id, staffId: actor.id, action: 'NOTE', note }, now);
    return this.detail(id);
  }

  // Encerramento definitivo: atendido (exige identidade confirmada) ou não
  // atendido (com justificativa). O texto é o resumo do que foi respondido.
  async close(actor: AuthenticatedStaff, id: string, input: { outcome: string; response: string }) {
    const r = await this.openOrFail(id);
    if (input.outcome !== 'ANSWERED' && input.outcome !== 'DENIED') throw bad('LGPD_OUTCOME_INVALID', 'Escolha como o pedido foi encerrado.');
    if (input.outcome === 'ANSWERED' && !r.identityVerified) throw bad('LGPD_IDENTITY_REQUIRED', 'Confirme a identidade do titular antes de atender o pedido.');
    const response = text(input.response, 10, 4000, 'LGPD_RESPONSE_INVALID', 'Resuma a resposta enviada ao titular (10 a 4.000 caracteres).');
    const now = this.now();
    if (!(await this.repo.updateOpen(id, { status: input.outcome, response, closedAt: now }, now))) throw this.closedError();
    await this.repo.addEvent({ requestId: id, staffId: actor.id, action: input.outcome, note: response }, now);
    return this.detail(id);
  }

  async counts() { return this.repo.countOpen(this.now()); }

  private async openOrFail(id: string) {
    const r = await this.repo.findById(id);
    if (!r) throw new ApiError('LGPD_NOT_FOUND', 'Solicitação não encontrada.', { statusCode: 404 });
    if (!LGPD_OPEN.includes(r.status)) throw this.closedError();
    return r;
  }
  private closedError() { return new ApiError('LGPD_ALREADY_CLOSED', 'Esta solicitação já foi encerrada e não pode ser alterada.', { statusCode: 409 }); }

  private view(r: LgpdRequestRecord) {
    const now = this.now();
    const open = LGPD_OPEN.includes(r.status);
    return {
      id: r.id, protocol: r.protocol, right: r.right, channel: r.channel, requesterName: r.requesterName, requesterContact: r.requesterContact,
      linkedCustomer: Boolean(r.customerId), identityVerified: r.identityVerified, status: r.status,
      receivedAt: r.receivedAt.toISOString(), dueAt: r.dueAt.toISOString(), closedAt: r.closedAt?.toISOString() ?? null,
      overdue: open ? r.dueAt < now : Boolean(r.closedAt && r.closedAt > r.dueAt),
      daysLeft: open ? Math.ceil((r.dueAt.getTime() - now.getTime()) / DAY) : null,
    };
  }
}
