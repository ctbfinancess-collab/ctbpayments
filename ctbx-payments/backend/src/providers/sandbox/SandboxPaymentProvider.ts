import { randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, PaymentProvider } from '../ports.js';
import type { SandboxAccountRepository } from '../../repositories/SandboxAccountRepository.js';
import type { SandboxLedgerRepository, SandboxOperationRecord } from '../../repositories/SandboxLedgerRepository.js';
import type { SandboxValidationRepository } from '../../repositories/SandboxValidationRepository.js';
import { ensureSandboxAccount } from './ensureSandboxAccount.js';
import { hashPayload, withPersistedIdempotency } from './persistedIdempotency.js';
import type { SandboxChallengeProvider } from './SandboxChallengeProvider.js';

const VALID_CODE = '00190500954014481606906809350314337370000000100';
const MISSING_CODE = '99999999999999999999999999999999999999999999999';
const beneficiary = Object.freeze({ name: 'Empresa Beneficiária SANDBOX', documentMasked: '**.***.***/****-**' });
type Bill = ReturnType<SandboxPaymentProvider['bill']>;
type PaymentDetails = { operationId: string; requestId: string; beneficiary: typeof beneficiary; barcodeMasked: string; description?: string; installments?: number; requestHash: string };
type Payment = { paymentId: string; operationId: string; requestId: string; accountId: string; environment: 'SANDBOX'; simulated: true; status: 'COMPLETED' | 'SCHEDULED'; createdAt: string; amountMinor: number; currency: 'BRL'; beneficiary: typeof beneficiary; barcodeMasked: string; description?: string; scheduledFor?: string; installments?: number };
type BillValidationPayload = { bill: Bill; amountMinor: number; scheduledFor?: string };
type InstallmentSimulationPayload = { bill: Bill; amountMinor: number; options: Array<Record<string, unknown>> };
// Ver comentário equivalente em SandboxPixProvider (Etapa 5.2). Duas
// "categorias" de rascunho persistidas nesse provider: a validação de
// boleto (BILL_PAYMENT) e a simulação de parcelamento (INSTALLMENT_SIMULATION).
const VALIDATION_TTL_MS = 30 * 60_000;

export class SandboxPaymentProvider implements PaymentProvider {
  constructor(
    environment: string,
    private readonly accounts: SandboxAccountRepository,
    private readonly ledger: SandboxLedgerRepository,
    private readonly validations: SandboxValidationRepository,
    private readonly challenges: SandboxChallengeProvider,
    private readonly now: () => Date = () => new Date(),
  ) {
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
    // Saldo REAL da conta (fonte única de verdade), não mais um teto fixo.
    const account = await ensureSandboxAccount(this.accounts, context, this.now);
    if ((input.amountMinor ?? 0) > account.availableMinor) throw new ApiError('INSUFFICIENT_FUNDS', 'Saldo SANDBOX insuficiente.', { statusCode: 422 });
    if (input.scheduledFor && (!Number.isFinite(Date.parse(input.scheduledFor)) || Date.parse(input.scheduledFor) < this.now().getTime())) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Data de pagamento inválida.', { statusCode: 422 });
    const validationId = `sbx_payment_validation_${randomUUID()}`;
    const amountMinor = input.amountMinor as number;
    const payload: BillValidationPayload = { bill, amountMinor, ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}) };
    await this.validations.create({ id: validationId, accountId: context.accountId, kind: 'BILL_PAYMENT', payload, expiresAt: new Date(this.now().getTime() + VALIDATION_TTL_MS) });
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
    const payload: InstallmentSimulationPayload = { bill, amountMinor, options };
    await this.validations.create({ id: simulationId, accountId: context.accountId, kind: 'INSTALLMENT_SIMULATION', payload, expiresAt: new Date(this.now().getTime() + VALIDATION_TTL_MS) });
    return { simulationId, environment: 'SANDBOX', simulated: true, options };
  }
  private ensureChallenge(context: AuthContext, challengeId: string | undefined, operationId: string) {
    if (!challengeId || !this.challenges.isVerified(context, challengeId, operationId)) throw new ApiError('AUTH_CHALLENGE_REQUIRED', 'Challenge OTP verificado é obrigatório.', { statusCode: 401 });
  }
  // Reconstrói o mesmo formato de resposta público de sempre a partir do
  // registro persistido (sandbox_operations) — assim getPayment/getReceipt
  // também sobrevivem a um restart real do backend, não só o saldo/extrato.
  private toPublicPayment(row: SandboxOperationRecord): Payment {
    const details = row.details as unknown as PaymentDetails;
    return {
      paymentId: row.id, operationId: details.operationId, requestId: details.requestId, accountId: row.accountId, environment: 'SANDBOX', simulated: true,
      status: row.status, createdAt: row.createdAt.toISOString(), amountMinor: row.amountMinor, currency: 'BRL', beneficiary: details.beneficiary, barcodeMasked: details.barcodeMasked,
      ...(details.description ? { description: details.description } : {}),
      ...(row.scheduledFor ? { scheduledFor: row.scheduledFor.toISOString() } : {}),
      ...(details.installments ? { installments: details.installments } : {}),
    };
  }
  // Etapa 5.1 (Prioridade 2): idempotência PERSISTIDA — ver comentário
  // equivalente em SandboxPixProvider.submit(). `check` roda ANTES da
  // validação/simulação (que continuam em memória) — um replay com o
  // mesmo payload devolve o pagamento já persistido mesmo depois de um
  // restart real, em vez de falhar com "validação não encontrada".
  private async recordPayment(context: AuthContext, key: string, raw: unknown, build: () => Promise<{ bill: Bill; amountMinor: number; status: 'COMPLETED' | 'SCHEDULED'; input: { description?: string; scheduledFor?: string }; requestId: string; installments?: number }>): Promise<Payment> {
    const operation = await withPersistedIdempotency({
      raw,
      find: () => this.ledger.findByIdempotencyKey(context.accountId, 'BILL_PAYMENT', key),
      requestHashOf: (row) => (row.details as unknown as PaymentDetails).requestHash,
      create: async () => {
        const { bill, amountMinor, status, input, requestId, installments } = await build();
        const paymentId = `sbx_payment_${randomUUID()}`;
        const details: PaymentDetails = { operationId: `sbx_operation_${randomUUID()}`, requestId, beneficiary, barcodeMasked: `${bill.barcode.slice(0, 5)}••••••••${bill.barcode.slice(-5)}`, ...(input.description ? { description: input.description } : {}), ...(installments ? { installments } : {}), requestHash: hashPayload(raw) };
        // Única escrita financeira: opera + saldo + extrato, atomicamente,
        // com checagem final de saldo negativo dentro da própria transação.
        return this.ledger.recordOperation({
          operationId: paymentId, accountId: context.accountId, kind: 'BILL_PAYMENT', status, amountMinor,
          ...(status === 'SCHEDULED' ? { scheduledFor: new Date(input.scheduledFor!) } : {}),
          details, idempotencyKey: key,
          ...(status === 'COMPLETED' ? { ledgerEntry: {
            balanceField: 'availableMinor' as const, deltaMinor: -amountMinor,
            transaction: {
              id: `sbx_txn_${context.accountId}_payment_${randomUUID()}`, accountId: context.accountId, occurredAt: this.now(), type: installments ? 'INSTALLMENT_PAYMENT' : 'BILL_PAYMENT', direction: 'DEBIT',
              description: input.description || 'Pagamento de boleto', counterparty: beneficiary.name, amountMinor, currency: 'BRL', status: 'COMPLETED',
              category: 'Pagamento', feeMinor: 0, receiptAvailable: true, institution: bill.bankName, document: beneficiary.documentMasked, reason: null,
            },
          } } : {}),
        });
      },
    });
    return this.toPublicPayment(operation);
  }
  async payBill(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const input = raw as { validationId?: string; challengeId?: string; description?: string };
    return this.recordPayment(context, key, raw, async () => {
      const validationRow = await this.validations.findById(input.validationId ?? '', context.accountId, 'BILL_PAYMENT');
      const validation = validationRow?.payload as unknown as BillValidationPayload | undefined;
      if (!validation || validation.scheduledFor) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Validação de pagamento inválida.', { statusCode: 422 });
      this.ensureChallenge(context, input.challengeId, input.validationId!);
      return { bill: validation.bill, amountMinor: validation.amountMinor, status: 'COMPLETED', input, requestId };
    });
  }
  async scheduleBill(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const input = raw as { validationId?: string; challengeId?: string; description?: string; scheduledFor?: string };
    return this.recordPayment(context, key, raw, async () => {
      const validationRow = await this.validations.findById(input.validationId ?? '', context.accountId, 'BILL_PAYMENT');
      const validation = validationRow?.payload as unknown as BillValidationPayload | undefined;
      if (!validation || !validation.scheduledFor || validation.scheduledFor !== input.scheduledFor) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Validação de agendamento inválida.', { statusCode: 422 });
      this.ensureChallenge(context, input.challengeId, input.validationId!);
      return { bill: validation.bill, amountMinor: validation.amountMinor, status: 'SCHEDULED', input, requestId };
    });
  }
  async payInstallments(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const input = raw as { simulationId?: string; optionId?: string; challengeId?: string; description?: string };
    return this.recordPayment(context, key, raw, async () => {
      const simulationRow = await this.validations.findById(input.simulationId ?? '', context.accountId, 'INSTALLMENT_SIMULATION');
      const simulation = simulationRow?.payload as unknown as InstallmentSimulationPayload | undefined;
      const option = simulation?.options.find((item) => item.optionId === input.optionId) as { installments: number; totalAmountMinor: number } | undefined;
      if (!simulation || !option) throw new ApiError('PAYMENT_VALIDATION_FAILED', 'Simulação de parcelamento inválida.', { statusCode: 422 });
      this.ensureChallenge(context, input.challengeId, input.simulationId!);
      return { bill: simulation.bill, amountMinor: option.totalAmountMinor, status: 'COMPLETED', input, requestId, installments: option.installments };
    });
  }
  async getPayment(context: AuthContext, paymentId: string) {
    const operation = await this.ledger.findById(paymentId, context.accountId);
    if (!operation || operation.kind !== 'BILL_PAYMENT') throw new ApiError('PAYMENT_NOT_FOUND', 'Pagamento não encontrado.', { statusCode: 404 });
    return this.toPublicPayment(operation);
  }
  async getReceipt(context: AuthContext, paymentId: string, requestId: string) {
    const payment = await this.getPayment(context, paymentId) as Payment;
    return { operationId: payment.operationId, paymentId, createdAt: payment.createdAt, amountMinor: payment.amountMinor, currency: payment.currency, beneficiary: payment.beneficiary, barcodeMasked: payment.barcodeMasked, status: payment.status, environment: 'SANDBOX', simulated: true, requestId };
  }
}
