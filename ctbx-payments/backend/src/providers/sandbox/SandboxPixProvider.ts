import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, PixProvider } from '../ports.js';
import type { SandboxChallengeProvider } from './SandboxChallengeProvider.js';

type KeyType = 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
const beneficiary = Object.freeze({ beneficiaryId: 'sbx_pix_beneficiary_001', name: 'Cliente Recebedor SANDBOX', documentMasked: '***.***.***-**', bankName: 'Banco SANDBOX', branch: '0001', accountMasked: '******-0', accountType: 'Conta corrente' });
const lookupFixtures = new Map<string, KeyType>([
  ['11144477735', 'CPF'], ['11222333000181', 'CNPJ'], ['+5511999990000', 'PHONE'],
  ['recebedor@sandbox.invalid', 'EMAIL'], ['sbx-random-key-A7k2M9p4', 'RANDOM'],
]);
const ownKeys = Object.freeze([
  { id: 'sbx_pix_key_email_A1', type: 'EMAIL', keyMasked: 'conta@sandbox.invalid', status: 'ACTIVE', createdAt: '2025-01-01T12:00:00.000Z' },
  { id: 'sbx_pix_key_phone_B2', type: 'PHONE', keyMasked: '+55 (**) *****-0000', status: 'ACTIVE', createdAt: '2025-01-02T12:00:00.000Z' },
  { id: 'sbx_pix_key_random_C3', type: 'RANDOM', keyMasked: 'sbx-••••-••••-C3', status: 'ACTIVE', createdAt: '2025-01-03T12:00:00.000Z' },
]);

export class SandboxPixProvider implements PixProvider {
  private readonly validations = new Map<string, { accountId: string; amountMinor: number; scheduledFor?: string; description?: string }>();
  private readonly transfers = new Map<string, Record<string, unknown> & { accountId: string }>();
  private readonly idempotency = new Map<string, { hash: string; result: Record<string, unknown> & { accountId: string } }>();
  constructor(environment: string, private readonly challenges?: SandboxChallengeProvider, private readonly now: () => Date = () => new Date()) {
    if (environment === 'production') throw new Error('SandboxPixProvider is forbidden in production');
  }
  async lookupKey(_context: AuthContext, raw: unknown, requestId: string) {
    const key = String((raw as { key?: string }).key ?? '').trim();
    const keyType = lookupFixtures.get(key);
    if (!keyType) throw new ApiError('PIX_KEY_NOT_FOUND', 'Chave PIX não encontrada.', { statusCode: 404 });
    return { key, keyType, beneficiary, status: 'ACTIVE', requestId };
  }
  async lookupQr(_context: AuthContext, raw: unknown) {
    const payload = String((raw as { payload?: string }).payload ?? '');
    if (!['CTBXPIX-SANDBOX|QR|001', 'CTBXPIX-SANDBOX|QR|12500'].includes(payload)) {
      throw new ApiError('PIX_QR_INVALID', 'QR PIX SANDBOX inválido.', { statusCode: 400 });
    }
    const withAmount = payload.endsWith('12500');
    return { payloadId: 'sbx_pix_qr_P8m2', key: 'recebedor@sandbox.invalid', keyType: 'EMAIL', beneficiary, ...(withAmount ? { amountMinor: 12_500 } : {}), currency: 'BRL', txId: 'SBXQR001', ...(withAmount ? { description: 'Cobrança SANDBOX' } : {}), status: 'VALID' };
  }
  async listKeys(_context: AuthContext) { return ownKeys.map((item) => ({ ...item })); }
  async createReceiveQr(_context: AuthContext, raw: unknown) {
    const input = raw as { keyId?: string; amountMinor?: number; description?: string };
    if (!ownKeys.some((item) => item.id === input.keyId)) throw new ApiError('PIX_KEY_NOT_FOUND', 'Chave PIX não encontrada.', { statusCode: 404 });
    if (input.amountMinor !== undefined && (!Number.isInteger(input.amountMinor) || input.amountMinor < 0)) throw new ApiError('PIX_AMOUNT_INVALID', 'Valor PIX inválido.', { statusCode: 422 });
    const qrId = `sbx_pix_receive_${randomUUID()}`;
    const amountMinor = input.amountMinor ?? 0;
    const qrPayload = `CTBXPIX-SANDBOX|RECEIVE|${qrId}|${amountMinor}`;
    return { qrId, copyPaste: qrPayload, qrPayload, amountMinor, currency: 'BRL', expiresAt: new Date(this.now().getTime() + 30 * 60_000).toISOString(), status: 'READY', ...(input.description ? { description: input.description } : {}) };
  }
  async validateTransfer(context: AuthContext, raw: unknown) {
    const input = raw as { beneficiaryId?: string; amountMinor?: number; currency?: string; description?: string; scheduledFor?: string };
    if (input.beneficiaryId !== beneficiary.beneficiaryId) throw new ApiError('PIX_BENEFICIARY_NOT_FOUND', 'Favorecido PIX não encontrado.', { statusCode: 404 });
    if (!Number.isInteger(input.amountMinor) || (input.amountMinor ?? 0) <= 0 || input.currency !== 'BRL') throw new ApiError('PIX_VALIDATION_FAILED', 'Dados do PIX inválidos.', { statusCode: 422 });
    if ((input.amountMinor ?? 0) > 125_000) throw new ApiError('INSUFFICIENT_FUNDS', 'Saldo SANDBOX insuficiente.', { statusCode: 422 });
    if (input.scheduledFor && (!Number.isFinite(Date.parse(input.scheduledFor)) || Date.parse(input.scheduledFor) < this.now().getTime())) throw new ApiError('PIX_VALIDATION_FAILED', 'Data de agendamento inválida.', { statusCode: 422 });
    const validationId = `sbx_pix_validation_${randomUUID()}`;
    const amountMinor = input.amountMinor as number;
    this.validations.set(validationId, { accountId: context.accountId, amountMinor, ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}), ...(input.description ? { description: input.description } : {}) });
    return { validationId, beneficiary, amountMinor, feeMinor: 0, totalDebitMinor: amountMinor, currency: 'BRL', ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}), status: 'VALIDATED', requiresChallenge: true, warnings: input.scheduledFor ? ['AGENDAMENTO SANDBOX · OPERAÇÃO SIMULADA'] : [] };
  }
  private ensureChallenge(context: AuthContext, challengeId: string | undefined, validationId: string) {
    if (!this.challenges?.isVerified(context, challengeId ?? '', validationId)) throw new ApiError('AUTH_CHALLENGE_REQUIRED', 'Challenge OTP verificado é obrigatório.', { statusCode: 401 });
  }
  private publicTransfer(transfer: Record<string, unknown> & { accountId: string }) {
    const { accountId: _accountId, ...publicTransfer } = transfer;
    return publicTransfer;
  }
  private submit(context: AuthContext, raw: unknown, key: string, requestId: string, scheduled: boolean) {
    const input = raw as { validationId?: string; challengeId?: string; scheduledFor?: string; description?: string };
    const validation = this.validations.get(input.validationId ?? '');
    if (!validation || validation.accountId !== context.accountId) throw new ApiError('PIX_VALIDATION_NOT_FOUND', 'Validação PIX não encontrada.', { statusCode: 404 });
    if (scheduled && (!validation.scheduledFor || input.scheduledFor !== validation.scheduledFor)) throw new ApiError('PIX_VALIDATION_FAILED', 'Agendamento PIX inválido.', { statusCode: 422 });
    if (!scheduled && validation.scheduledFor) throw new ApiError('PIX_VALIDATION_FAILED', 'Use a rota de agendamento.', { statusCode: 422 });
    this.ensureChallenge(context, input.challengeId, input.validationId!);
    const route = scheduled ? 'schedule' : 'transfer';
    const scope = `${context.accountId}:${route}:${key}`;
    const hash = createHash('sha256').update(JSON.stringify(raw)).digest('hex');
    const existing = this.idempotency.get(scope);
    if (existing) { if (existing.hash !== hash) throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key reutilizada com payload diferente.', { statusCode: 409 }); return this.publicTransfer(existing.result); }
    const createdAt = this.now().toISOString();
    const pixTransferId = `sbx_pix_transfer_${randomUUID()}`;
    const result = { pixTransferId, operationId: `sbx_pix_operation_${randomUUID()}`, accountId: context.accountId, createdAt, amountMinor: validation.amountMinor, currency: 'BRL', beneficiary, description: input.description || validation.description || '', status: scheduled ? 'SCHEDULED' : 'COMPLETED', ...(scheduled ? { scheduledFor: validation.scheduledFor } : {}), environment: 'SANDBOX', simulated: true, sandboxReference: `SBX-PIX-${randomUUID()}`, requestId };
    this.idempotency.set(scope, { hash, result }); this.transfers.set(pixTransferId, result); return this.publicTransfer(result);
  }
  async createTransfer(context: AuthContext, input: unknown, key: string, requestId: string) { return this.submit(context, input, key, requestId, false); }
  async scheduleTransfer(context: AuthContext, input: unknown, key: string, requestId: string) { return this.submit(context, input, key, requestId, true); }
  async getTransfer(context: AuthContext, pixTransferId: string) {
    const transfer = this.transfers.get(pixTransferId);
    if (!transfer || transfer.accountId !== context.accountId) throw new ApiError('PIX_TRANSFER_NOT_FOUND', 'Transferência PIX não encontrada.', { statusCode: 404 });
    return this.publicTransfer(transfer);
  }
  async getTransferReceipt(context: AuthContext, pixTransferId: string, requestId: string) {
    const transfer = await this.getTransfer(context, pixTransferId) as Record<string, unknown>;
    return { operationId: transfer.operationId, pixTransferId, createdAt: transfer.createdAt, amountMinor: transfer.amountMinor, currency: transfer.currency, payer: 'Conta SANDBOX', beneficiary: transfer.beneficiary, description: transfer.description, status: transfer.status, sandboxReference: transfer.sandboxReference, simulated: true, environment: 'SANDBOX', requestId };
  }
}
