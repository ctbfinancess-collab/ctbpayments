import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, TransferProvider } from '../ports.js';
import type { SandboxChallengeProvider } from './SandboxChallengeProvider.js';

const banks = Object.freeze([
  { id: 'sbx_bank_a', code: 'SBX001', name: 'Banco Sandbox A', ispb: 'SBX00001', status: 'ACTIVE' },
  { id: 'sbx_bank_b', code: 'SBX002', name: 'Banco Sandbox B', ispb: 'SBX00002', status: 'ACTIVE' },
]);

const beneficiaries = Object.freeze({
  internal: { beneficiaryId: 'sbx_beneficiary_internal', name: 'Cliente Interno SANDBOX', documentMasked: '***.***.***-**', bank: banks[0], branch: '0001', accountMasked: '*****-1', accountType: 'Conta digital', transferType: 'INTERNAL', status: 'ACTIVE' },
  external: { beneficiaryId: 'sbx_beneficiary_external', name: 'Cliente Externo SANDBOX', documentMasked: '**.***.***/****-**', bank: banks[1], branch: '0002', accountMasked: '*****-2', accountType: 'Conta corrente', transferType: 'EXTERNAL', status: 'ACTIVE' },
});

const favorites = Object.freeze([
  { id: 'sbx_favorite_internal', ...beneficiaries.internal },
  { id: 'sbx_favorite_external', ...beneficiaries.external },
]);

const invalid = () => new ApiError('TRANSFER_BENEFICIARY_INVALID', 'Dados do favorecido inválidos.', { statusCode: 400 });
const missing = () => new ApiError('TRANSFER_BENEFICIARY_NOT_FOUND', 'Favorecido não encontrado.', { statusCode: 404 });

export class SandboxTransferProvider implements TransferProvider {
  private readonly validations = new Map<string, { accountId: string; beneficiary: typeof beneficiaries.internal | typeof beneficiaries.external; amountMinor: number; feeMinor: number; totalDebitMinor: number; description?: string; purpose?: string; scheduledFor?: string }>();
  private readonly transfers = new Map<string, Record<string, unknown> & { accountId: string }>();
  private readonly idempotency = new Map<string, { hash: string; result: Record<string, unknown> & { accountId: string } }>();

  constructor(environment: string, private readonly challenges?: SandboxChallengeProvider, private readonly now: () => Date = () => new Date()) {
    if (environment === 'production') throw new Error('SandboxTransferProvider is forbidden in production');
  }

  async listBanks(_context: AuthContext) { return banks.map((item) => ({ ...item })); }
  async listFavorites(_context: AuthContext) { return favorites.map((item) => ({ ...item, bank: { ...item.bank } })); }

  async lookupBeneficiary(_context: AuthContext, raw: unknown) {
    const input = raw as { type?: string; phone?: string; document?: string; bankId?: string; agency?: string; account?: string; accountDigit?: string; favoriteId?: string };
    if (!input.type) throw invalid();
    if (input.type === 'INTERNAL_PHONE') {
      if (!/^\+?\d{12,13}$/.test(input.phone ?? '')) throw invalid();
      if (input.phone !== '+5511988880000') throw missing();
      return beneficiaries.internal;
    }
    if (input.type === 'INTERNAL_DOCUMENT') {
      if (!/^\d{11,14}$/.test(input.document ?? '')) throw invalid();
      if (input.document !== '11144477735') throw missing();
      return beneficiaries.internal;
    }
    if (input.type === 'INTERNAL_ACCOUNT') {
      if (!/^\d{4}$/.test(input.agency ?? '') || !/^\d{6}$/.test(input.account ?? '')) throw invalid();
      if (input.agency !== '0001' || input.account !== '123456') throw missing();
      return beneficiaries.internal;
    }
    if (input.type === 'EXTERNAL_ACCOUNT') {
      if (!input.bankId || !/^\d{4}$/.test(input.agency ?? '') || !/^\d{6}$/.test(input.account ?? '') || !/^\d$/.test(input.accountDigit ?? '')) throw invalid();
      if (!banks.some((item) => item.id === input.bankId) || input.agency !== '0002' || input.account !== '654321' || input.accountDigit !== '2') throw missing();
      return beneficiaries.external;
    }
    if (input.type === 'FAVORITE') {
      const favorite = favorites.find((item) => item.id === input.favoriteId);
      if (!favorite) throw missing();
      return favorite;
    }
    throw invalid();
  }

  async validate(context: AuthContext, raw: unknown) {
    const input = raw as { beneficiaryId?: string; amountMinor?: number; currency?: string; description?: string; purpose?: string; scheduledFor?: string };
    const beneficiary = Object.values(beneficiaries).find((item) => item.beneficiaryId === input.beneficiaryId);
    if (!beneficiary) throw missing();
    if (!Number.isInteger(input.amountMinor) || (input.amountMinor ?? 0) <= 0) throw new ApiError('TRANSFER_AMOUNT_INVALID', 'Valor da transferência inválido.', { statusCode: 422 });
    if (input.currency !== 'BRL') throw new ApiError('TRANSFER_CURRENCY_INVALID', 'Moeda da transferência inválida.', { statusCode: 422 });
    if ((input.amountMinor ?? 0) > 125_000) throw new ApiError('TRANSFER_INSUFFICIENT_BALANCE', 'Saldo SANDBOX insuficiente.', { statusCode: 422 });
    if (input.scheduledFor) {
      const scheduled = Date.parse(input.scheduledFor);
      if (!Number.isFinite(scheduled) || scheduled < this.now().getTime()) throw new ApiError('TRANSFER_SCHEDULE_INVALID', 'Data de agendamento inválida.', { statusCode: 422 });
    }
    const amountMinor = input.amountMinor as number;
    const feeMinor = 0;
    const validationId = `sbx_transfer_validation_${randomUUID()}`;
    const validation = { accountId: context.accountId, beneficiary, amountMinor, feeMinor, totalDebitMinor: amountMinor + feeMinor, ...(input.description ? { description: input.description } : {}), ...(input.purpose ? { purpose: input.purpose } : {}), ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}) };
    this.validations.set(validationId, validation);
    return { validationId, beneficiary, amountMinor, currency: 'BRL', feeMinor, totalDebitMinor: validation.totalDebitMinor, ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}), status: 'VALIDATED', requiresChallenge: true, warnings: input.scheduledFor ? ['AGENDAMENTO SANDBOX · NÃO SERÁ EXECUTADO AUTOMATICAMENTE'] : [] };
  }

  private ensureChallenge(context: AuthContext, challengeId: string | undefined, validationId: string) {
    if (!this.challenges?.isVerified(context, challengeId ?? '', validationId)) throw new ApiError('AUTH_CHALLENGE_REQUIRED', 'Challenge OTP verificado é obrigatório.', { statusCode: 401 });
  }

  private publicTransfer(transfer: Record<string, unknown> & { accountId: string }) {
    const { accountId: _accountId, ...publicTransfer } = transfer;
    return publicTransfer;
  }

  private submit(context: AuthContext, raw: unknown, idempotencyKey: string, requestId: string, scheduled: boolean) {
    const input = raw as { validationId?: string; challengeId?: string; description?: string; purpose?: string; scheduledFor?: string };
    const validation = this.validations.get(input.validationId ?? '');
    if (!validation || validation.accountId !== context.accountId) throw new ApiError('TRANSFER_VALIDATION_NOT_FOUND', 'Validação da transferência não encontrada.', { statusCode: 404 });
    if (scheduled && (!validation.scheduledFor || input.scheduledFor !== validation.scheduledFor)) throw new ApiError('TRANSFER_VALIDATION_FAILED', 'Agendamento da transferência inválido.', { statusCode: 422 });
    if (!scheduled && validation.scheduledFor) throw new ApiError('TRANSFER_VALIDATION_FAILED', 'Use a rota de agendamento.', { statusCode: 422 });
    this.ensureChallenge(context, input.challengeId, input.validationId!);
    const route = scheduled ? 'schedule' : 'transfer';
    const scope = `${context.accountId}:${route}:${idempotencyKey}`;
    const hash = createHash('sha256').update(JSON.stringify(raw)).digest('hex');
    const existing = this.idempotency.get(scope);
    if (existing) {
      if (existing.hash !== hash) throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key reutilizada com payload diferente.', { statusCode: 409 });
      return this.publicTransfer(existing.result);
    }
    const transferId = `sbx_transfer_${randomUUID()}`;
    const result = {
      transferId,
      operationId: `sbx_transfer_operation_${randomUUID()}`,
      accountId: context.accountId,
      createdAt: this.now().toISOString(),
      amountMinor: validation.amountMinor,
      feeMinor: validation.feeMinor,
      totalDebitMinor: validation.totalDebitMinor,
      currency: 'BRL',
      beneficiary: validation.beneficiary,
      transferType: validation.beneficiary.transferType,
      description: input.description || validation.description || '',
      purpose: input.purpose || validation.purpose || '',
      status: scheduled ? 'SCHEDULED' : 'COMPLETED',
      ...(scheduled ? { scheduledFor: validation.scheduledFor } : {}),
      environment: 'SANDBOX',
      simulated: true,
      sandboxReference: `SBX-TRANSFER-${randomUUID()}`,
      requestId,
    };
    this.idempotency.set(scope, { hash, result });
    this.transfers.set(transferId, result);
    return this.publicTransfer(result);
  }

  async createTransfer(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string) { return this.submit(context, input, idempotencyKey, requestId, false); }
  async scheduleTransfer(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string) { return this.submit(context, input, idempotencyKey, requestId, true); }
  async getTransfer(context: AuthContext, transferId: string) {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.accountId !== context.accountId) throw new ApiError('TRANSFER_NOT_FOUND', 'Transferência não encontrada.', { statusCode: 404 });
    return this.publicTransfer(transfer);
  }
  async getReceipt(context: AuthContext, transferId: string, requestId: string) {
    const transfer = await this.getTransfer(context, transferId) as Record<string, unknown>;
    return { operationId: transfer.operationId, transferId, createdAt: transfer.createdAt, amountMinor: transfer.amountMinor, feeMinor: transfer.feeMinor, currency: transfer.currency, payer: 'Conta CTBX SANDBOX', beneficiary: transfer.beneficiary, transferType: transfer.transferType, description: transfer.description, purpose: transfer.purpose, status: transfer.status, ...(transfer.scheduledFor ? { scheduledFor: transfer.scheduledFor } : {}), sandboxReference: transfer.sandboxReference, simulated: true, environment: 'SANDBOX', requestId };
  }
}
