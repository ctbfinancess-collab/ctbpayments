import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, PaymentProvider } from '../ports.js';
import type { SandboxChallengeProvider } from './SandboxChallengeProvider.js';

const VALID_CODE = '00190500954014481606906809350314337370000000100';
const MISSING_CODE = '99999999999999999999999999999999999999999999999';
const beneficiary = Object.freeze({ name: 'Empresa Beneficiária SANDBOX', documentMasked: '**.***.***/****-**' });
type Bill = ReturnType<SandboxPaymentProvider['bill']>;
type Payment = { paymentId: string; operationId: string; requestId: string; accountId: string; environment: 'SANDBOX'; simulated: true; status: 'COMPLETED' | 'SCHEDULED'; createdAt: string; amountMinor: number; currency: 'BRL'; beneficiary: typeof beneficiary; barcodeMasked: string; description?: string; scheduledFor?: string; installments?: number };

export class SandboxPaymentProvider implements PaymentProvider {
  private readonly validations = new Map<string, { accountId: string; bill: Bill; amountMinor: number; scheduledFor?: string }>();
  private readonly simulations = new Map<string, { accountId: string; bill: Bill; amountMinor: number; options: Array<Record<string, unknown>> }>();
  private readonly payments = new Map<string, Payment>();
  private readonly idempotency = new Map<string, { hash: string; result: Payment }>();
  constructor(environment: string, private readonly challenges: SandboxChallengeProvider, private readonly now: () => Date = () => new Date()) {
    if (environment === 'production') throw new Error('SandboxPaymentProvider is forbidden in production');
  }
  private bill() {
    const due = new Date(this.now()); due.setDate(due.getDate() + 10);
    return { billId: 'sbx_bill_001', barcode: VALID_CODE, digitableLine: VALID_CODE, beneficiary, bankName: 'Banco Emissor SANDBOX', dueDate: due.toISOString().slice(0, 10), originalAmountMinor: 12_500, discountMinor: 0, interestMinor: 0, fineMinor: 0, totalAmountMinor: 12_500, currency: 'BRL', status: 'OPEN' } as const;
  }
  async lookupBill(_context: AuthContext, raw: unknown) {
    const code = String((raw as { code?: string }).code ?? '').replace(/\s/g, '');
    if (!/^\d{44,48}$/.test(code) || ![44, 46, 47, 48].includes(code.length)) throw new ApiError('PAYMENT_BARCODE_INVALID', 'Código de barras inválido.', { statusCode: 400 });
    if (code === MISSING_CODE) throw new ApiError('PAYMENT_BILL_NOT_FOUND', 'Boleto não encontrado.', { statusCode: 404 });
    if (code !== VALID_CODE) throw new ApiError('PAYMENT_BILL_NOT_FOUND', 'Boleto não encontrado.', { statusCode: 404 });
    return this.bill();
  }
  private ownedBill(billId: string | undefined) {
    const bill = this.bill();
    if (billId !== bill.billId) throw new ApiError('PAYMENT_BILL_NOT_FOUND', 'Boleto não encontrado.', { statusCode: 404 });
    return bill;
  }
  async validateBill(context: AuthContext, raw: unknown) {
    const input = raw as { billId?: string; amountMinor?: number; currency?: string; scheduledFor?: string };
    const bill = this.ownedBill(input.billId);
    if (!Number.isInteger(input.amountMinor) || (input.amountMinor ?? 0) <= 0 || input.currency !== 'BRL') throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Dados do pagamento inválidos.', { statusCode: 422 });
    if ((input.amountMinor ?? 0) > 125_000) throw new ApiError('INSUFFICIENT_FUNDS', 'Saldo SANDBOX insuficiente.', { statusCode: 422 });
    if (input.scheduledFor && (!Number.isFinite(Date.parse(input.scheduledFor)) || Date.parse(input.scheduledFor) < this.now().getTime())) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Data de pagamento inválida.', { statusCode: 422 });
    const validationId = `sbx_payment_validation_${randomUUID()}`;
    const amountMinor = input.amountMinor as number;
    this.validations.set(validationId, { accountId: context.accountId, bill, amountMinor, ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}) });
    return { validationId, bill, amountMinor, currency: 'BRL', feeMinor: 0, totalDebitMinor: amountMinor, ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}), status: 'VALIDATED', requiresChallenge: true, warnings: input.scheduledFor ? ['Agendamento SANDBOX sem execução automática'] : [] };
  }
  async simulateInstallments(context: AuthContext, raw: unknown) {
    const input = raw as { billId?: string; amountMinor?: number; installments?: number };
    const bill = this.ownedBill(input.billId);
    if (!Number.isInteger(input.amountMinor) || (input.amountMinor ?? 0) <= 0) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Valor inválido.', { statusCode: 422 });
    const counts = input.installments ? [input.installments] : [1, 2, 3, 4, 6, 8, 10, 12];
    if (counts.some((count) => !Number.isInteger(count) || count < 1 || count > 12)) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Parcelamento inválido.', { statusCode: 422 });
    const simulationId = `sbx_payment_simulation_${randomUUID()}`;
    const amountMinor = input.amountMinor as number;
    const options = counts.map((installments) => { const totalAmountMinor = Math.round(amountMinor * (1 + Math.max(0, installments - 1) * 0.012)); return { optionId: `sbx_option_${installments}`, installments, installmentAmountMinor: Math.ceil(totalAmountMinor / installments), totalAmountMinor, feeMinor: totalAmountMinor - amountMinor, currency: 'BRL', rule: 'SANDBOX_1_2_PERCENT_PER_ADDITIONAL_INSTALLMENT' }; });
    this.simulations.set(simulationId, { accountId: context.accountId, bill, amountMinor, options });
    return { simulationId, environment: 'SANDBOX', simulated: true, options };
  }
  private ensureChallenge(context: AuthContext, challengeId: string | undefined, operationId: string) {
    if (!challengeId || !this.challenges.isVerified(context, challengeId, operationId)) throw new ApiError('AUTH_CHALLENGE_REQUIRED', 'Challenge OTP verificado é obrigatório.', { statusCode: 401 });
  }
  private idempotent(context: AuthContext, route: string, key: string, raw: unknown, factory: () => Payment) {
    const scope = `${context.accountId}:${route}:${key}`;
    const hash = createHash('sha256').update(JSON.stringify(raw)).digest('hex');
    const existing = this.idempotency.get(scope);
    if (existing) {
      if (existing.hash !== hash) throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key reutilizada com payload diferente.', { statusCode: 409 });
      return existing.result;
    }
    const result = factory(); this.idempotency.set(scope, { hash, result }); this.payments.set(result.paymentId, result); return result;
  }
  private buildPayment(context: AuthContext, bill: Bill, amountMinor: number, requestId: string, status: 'COMPLETED' | 'SCHEDULED', input: { description?: string; scheduledFor?: string }, installments?: number): Payment {
    return { paymentId: `sbx_payment_${randomUUID()}`, operationId: `sbx_operation_${randomUUID()}`, requestId, accountId: context.accountId, environment: 'SANDBOX', simulated: true, status, createdAt: this.now().toISOString(), amountMinor, currency: 'BRL', beneficiary, barcodeMasked: `${bill.barcode.slice(0, 5)}••••••••${bill.barcode.slice(-5)}`, ...(input.description ? { description: input.description } : {}), ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}), ...(installments ? { installments } : {}) };
  }
  async payBill(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const input = raw as { validationId?: string; challengeId?: string; description?: string };
    const validation = this.validations.get(input.validationId ?? '');
    if (!validation || validation.accountId !== context.accountId || validation.scheduledFor) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Validação de pagamento inválida.', { statusCode: 422 });
    this.ensureChallenge(context, input.challengeId, input.validationId!);
    return this.idempotent(context, 'bill', key, raw, () => this.buildPayment(context, validation.bill, validation.amountMinor, requestId, 'COMPLETED', input));
  }
  async scheduleBill(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const input = raw as { validationId?: string; challengeId?: string; description?: string; scheduledFor?: string };
    const validation = this.validations.get(input.validationId ?? '');
    if (!validation || validation.accountId !== context.accountId || !validation.scheduledFor || validation.scheduledFor !== input.scheduledFor) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Validação de agendamento inválida.', { statusCode: 422 });
    this.ensureChallenge(context, input.challengeId, input.validationId!);
    return this.idempotent(context, 'schedule', key, raw, () => this.buildPayment(context, validation.bill, validation.amountMinor, requestId, 'SCHEDULED', input));
  }
  async payInstallments(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const input = raw as { simulationId?: string; optionId?: string; challengeId?: string; description?: string };
    const simulation = this.simulations.get(input.simulationId ?? '');
    const option = simulation?.options.find((item) => item.optionId === input.optionId) as { installments: number; totalAmountMinor: number } | undefined;
    if (!simulation || simulation.accountId !== context.accountId || !option) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Simulação de parcelamento inválida.', { statusCode: 422 });
    this.ensureChallenge(context, input.challengeId, input.simulationId!);
    return this.idempotent(context, 'installments', key, raw, () => this.buildPayment(context, simulation.bill, option.totalAmountMinor, requestId, 'COMPLETED', input, option.installments));
  }
  async getPayment(context: AuthContext, paymentId: string) {
    const payment = this.payments.get(paymentId);
    if (!payment || payment.accountId !== context.accountId) throw new ApiError('PAYMENT_NOT_FOUND', 'Pagamento não encontrado.', { statusCode: 404 });
    return payment;
  }
  async getReceipt(context: AuthContext, paymentId: string, requestId: string) {
    const payment = await this.getPayment(context, paymentId) as Payment;
    return { operationId: payment.operationId, paymentId, createdAt: payment.createdAt, amountMinor: payment.amountMinor, currency: payment.currency, beneficiary: payment.beneficiary, barcodeMasked: payment.barcodeMasked, status: payment.status, environment: 'SANDBOX', simulated: true, requestId };
  }
}
