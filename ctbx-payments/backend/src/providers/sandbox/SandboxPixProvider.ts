import { randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, PixProvider } from '../ports.js';
import type { SandboxAccountRepository } from '../../repositories/SandboxAccountRepository.js';
import type { SandboxLedgerRepository, SandboxOperationRecord } from '../../repositories/SandboxLedgerRepository.js';
import type { PixKeyType, SandboxPixKeyRepository } from '../../repositories/SandboxPixKeyRepository.js';
import type { SandboxValidationRepository } from '../../repositories/SandboxValidationRepository.js';
import { ensureSandboxAccount } from './ensureSandboxAccount.js';
import { hashPayload, withPersistedIdempotency } from './persistedIdempotency.js';
import type { SandboxChallengeProvider } from './SandboxChallengeProvider.js';

type KeyType = 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
type PixOperationDetails = { operationId: string; beneficiary: typeof beneficiary; description: string; sandboxReference: string; requestHash: string };
type PixValidationPayload = { amountMinor: number; scheduledFor?: string; description?: string };
// Validação de PIX é um rascunho de vida curta (30min) — não é "estado do
// cliente" permanente, só deixou de depender da memória do processo pra
// sobreviver a um restart real dentro dessa janela (Etapa 5.2).
const VALIDATION_TTL_MS = 30 * 60_000;
const beneficiary = Object.freeze({ beneficiaryId: 'sbx_pix_beneficiary_001', name: 'Cliente Recebedor SANDBOX', documentMasked: '***.***.***-**', bankName: 'Banco SANDBOX', branch: '0001', accountMasked: '******-0', accountType: 'Conta corrente' });
const lookupFixtures = new Map<string, KeyType>([
  ['11144477735', 'CPF'], ['11222333000181', 'CNPJ'], ['+5511999990000', 'PHONE'],
  ['recebedor@sandbox.invalid', 'EMAIL'], ['sbx-random-key-A7k2M9p4', 'RANDOM'],
]);
// Chaves próprias do cliente — mesmos 3 valores que o app sempre mostrou,
// agora semeados de verdade por conta (Etapa 3) em vez de um array fixo
// global. keySuffix vira o id namespaced (ver ensureKeysSeeded).
const OWN_KEYS_SEED: Array<{ keySuffix: string; type: PixKeyType; keyMasked: string }> = [
  { keySuffix: 'email_A1', type: 'EMAIL', keyMasked: 'conta@sandbox.invalid' },
  { keySuffix: 'phone_B2', type: 'PHONE', keyMasked: '+55 (**) *****-0000' },
  { keySuffix: 'random_C3', type: 'RANDOM', keyMasked: 'sbx-••••-••••-C3' },
];

function maskPixKeyValue(type: PixKeyType, value: string): string {
  const digits = value.replace(/\D/g, '');
  if (type === 'CPF') return digits.length === 11 ? `***.${digits.slice(3, 6)}.***-**` : '***.***.***-**';
  if (type === 'CNPJ') return digits.length === 14 ? `**.${digits.slice(2, 5)}.***/****-**` : '**.***.***/****-**';
  if (type === 'PHONE') return digits.length >= 4 ? `+55 (**) *****-${digits.slice(-4)}` : '+55 (**) *****-0000';
  if (type === 'EMAIL') { const [user, domain] = value.split('@'); return domain ? `${(user ?? '').slice(0, 2)}${'•'.repeat(Math.max(1, (user ?? '').length - 2))}@${domain}` : value; }
  return `sbx-••••-••••-${randomUUID().slice(0, 2).toUpperCase()}`;
}

export class SandboxPixProvider implements PixProvider {
  constructor(
    environment: string,
    private readonly accounts: SandboxAccountRepository,
    private readonly ledger: SandboxLedgerRepository,
    private readonly pixKeys: SandboxPixKeyRepository,
    private readonly validations: SandboxValidationRepository,
    private readonly challenges?: SandboxChallengeProvider,
    private readonly now: () => Date = () => new Date(),
  ) {
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
  // Semeia as 3 chaves fixas na primeira vez que a conta acessa chaves PIX
  // — daí em diante, tudo (listar/criar/remover) lê/escreve do Postgres.
  private async ensureKeysSeeded(accountId: string) {
    const existing = await this.pixKeys.listActiveByAccount(accountId);
    if (existing.length > 0) return existing;
    await this.pixKeys.createMany(OWN_KEYS_SEED.map((seed) => ({ id: `sbx_pix_key_${accountId}_${seed.keySuffix}`, accountId, type: seed.type, keyMasked: seed.keyMasked, status: 'ACTIVE' as const })));
    return this.pixKeys.listActiveByAccount(accountId);
  }
  async listKeys(context: AuthContext) {
    const rows = await this.ensureKeysSeeded(context.accountId);
    return rows.map((row) => ({ id: row.id, type: row.type, keyMasked: row.keyMasked, status: row.status, createdAt: row.createdAt.toISOString() }));
  }
  async createKey(context: AuthContext, raw: unknown, _key: string, _requestId: string) {
    await this.ensureKeysSeeded(context.accountId);
    const input = raw as { type?: PixKeyType; value?: string };
    if (!input.type || !['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'].includes(input.type) || !String(input.value ?? '').trim()) {
      throw new ApiError('PIX_KEY_INVALID', 'Dados da chave PIX inválidos.', { statusCode: 422 });
    }
    const id = `sbx_pix_key_${context.accountId}_${randomUUID()}`;
    const row = await this.pixKeys.create({ id, accountId: context.accountId, type: input.type, keyMasked: maskPixKeyValue(input.type, input.value!), status: 'ACTIVE' });
    return { id: row.id, type: row.type, keyMasked: row.keyMasked, status: row.status, createdAt: row.createdAt.toISOString() };
  }
  async removeKey(context: AuthContext, id: string, _key: string, _requestId: string) {
    await this.ensureKeysSeeded(context.accountId);
    const removed = await this.pixKeys.remove(id, context.accountId);
    if (!removed) throw new ApiError('PIX_KEY_NOT_FOUND', 'Chave PIX não encontrada.', { statusCode: 404 });
    return { id: removed.id, status: removed.status };
  }
  async createReceiveQr(context: AuthContext, raw: unknown) {
    const input = raw as { keyId?: string; amountMinor?: number; description?: string };
    const keys = await this.ensureKeysSeeded(context.accountId);
    if (!keys.some((item) => item.id === input.keyId)) throw new ApiError('PIX_KEY_NOT_FOUND', 'Chave PIX não encontrada.', { statusCode: 404 });
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
    // Saldo REAL da conta (fonte única de verdade), não mais um teto fixo.
    const account = await ensureSandboxAccount(this.accounts, context, this.now);
    if ((input.amountMinor ?? 0) > account.availableMinor) throw new ApiError('INSUFFICIENT_FUNDS', 'Saldo SANDBOX insuficiente.', { statusCode: 422 });
    if (input.scheduledFor && (!Number.isFinite(Date.parse(input.scheduledFor)) || Date.parse(input.scheduledFor) < this.now().getTime())) throw new ApiError('PIX_VALIDATION_FAILED', 'Data de agendamento inválida.', { statusCode: 422 });
    const validationId = `sbx_pix_validation_${randomUUID()}`;
    const amountMinor = input.amountMinor as number;
    const payload: PixValidationPayload = { amountMinor, ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}), ...(input.description ? { description: input.description } : {}) };
    await this.validations.create({ id: validationId, accountId: context.accountId, kind: 'PIX_TRANSFER', payload, expiresAt: new Date(this.now().getTime() + VALIDATION_TTL_MS) });
    return { validationId, beneficiary, amountMinor, feeMinor: 0, totalDebitMinor: amountMinor, currency: 'BRL', ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}), status: 'VALIDATED', requiresChallenge: true, warnings: input.scheduledFor ? ['AGENDAMENTO SANDBOX · OPERAÇÃO SIMULADA'] : [] };
  }
  private ensureChallenge(context: AuthContext, challengeId: string | undefined, validationId: string) {
    if (!this.challenges?.isVerified(context, challengeId ?? '', validationId)) throw new ApiError('AUTH_CHALLENGE_REQUIRED', 'Challenge OTP verificado é obrigatório.', { statusCode: 401 });
  }
  // Reconstrói o mesmo formato de resposta público de sempre a partir do
  // registro persistido (sandbox_operations) — assim getTransfer/
  // getTransferReceipt também sobrevivem a um restart real do backend, não
  // só o saldo/extrato.
  private toPublicTransfer(row: SandboxOperationRecord, requestId: string) {
    const details = row.details as unknown as PixOperationDetails;
    return {
      pixTransferId: row.id, operationId: details.operationId, createdAt: row.createdAt.toISOString(), amountMinor: row.amountMinor, currency: row.currency,
      beneficiary: details.beneficiary, description: details.description, status: row.status,
      ...(row.scheduledFor ? { scheduledFor: row.scheduledFor.toISOString() } : {}),
      environment: 'SANDBOX', simulated: true, sandboxReference: details.sandboxReference, requestId,
    };
  }
  // Etapa 5.1 (Prioridade 2): idempotência PERSISTIDA em sandbox_operations
  // (mesmo mecanismo/índice único do Cartão) em vez de um Map() em memória.
  // Etapa 5.2: a própria validação (antes um Map() em memória, TTL curto)
  // agora também é persistida (sandbox_validations) — um restart real do
  // backend entre /validate e /submit não derruba mais a operação com
  // PIX_VALIDATION_NOT_FOUND; ela sobrevive dentro da janela de validade.
  private async submit(context: AuthContext, raw: unknown, key: string, requestId: string, scheduled: boolean) {
    const input = raw as { validationId?: string; challengeId?: string; scheduledFor?: string; description?: string };
    const operation = await withPersistedIdempotency({
      raw,
      find: () => this.ledger.findByIdempotencyKey(context.accountId, 'PIX_TRANSFER', key),
      requestHashOf: (row) => (row.details as unknown as PixOperationDetails).requestHash,
      create: async () => {
        const validationRow = await this.validations.findById(input.validationId ?? '', context.accountId, 'PIX_TRANSFER');
        if (!validationRow) throw new ApiError('PIX_VALIDATION_NOT_FOUND', 'Validação PIX não encontrada.', { statusCode: 404 });
        const validation = validationRow.payload as unknown as PixValidationPayload;
        if (scheduled && (!validation.scheduledFor || input.scheduledFor !== validation.scheduledFor)) throw new ApiError('PIX_VALIDATION_FAILED', 'Agendamento PIX inválido.', { statusCode: 422 });
        if (!scheduled && validation.scheduledFor) throw new ApiError('PIX_VALIDATION_FAILED', 'Use a rota de agendamento.', { statusCode: 422 });
        this.ensureChallenge(context, input.challengeId, input.validationId!);
        const pixTransferId = `sbx_pix_transfer_${randomUUID()}`;
        const description = input.description || validation.description || '';
        const details: PixOperationDetails = { operationId: `sbx_pix_operation_${randomUUID()}`, beneficiary, description, sandboxReference: `SBX-PIX-${randomUUID()}`, requestHash: hashPayload(raw) };
        // Única escrita financeira: opera + saldo + extrato, atomicamente,
        // com checagem final de saldo negativo dentro da própria transação.
        return this.ledger.recordOperation({
          operationId: pixTransferId, accountId: context.accountId, kind: 'PIX_TRANSFER', status: scheduled ? 'SCHEDULED' : 'COMPLETED', amountMinor: validation.amountMinor,
          ...(scheduled ? { scheduledFor: new Date(validation.scheduledFor!) } : {}),
          details, idempotencyKey: key,
          ...(scheduled ? {} : { ledgerEntry: {
            balanceField: 'availableMinor' as const, deltaMinor: -validation.amountMinor,
            transaction: {
              id: `sbx_txn_${context.accountId}_pix_${randomUUID()}`, accountId: context.accountId, occurredAt: this.now(), type: 'PIX_SENT', direction: 'DEBIT',
              description: description || 'Pix enviado', counterparty: beneficiary.name, amountMinor: validation.amountMinor, currency: 'BRL', status: 'COMPLETED',
              category: 'Pix', feeMinor: 0, receiptAvailable: true, institution: beneficiary.bankName, document: beneficiary.documentMasked, reason: null,
            },
          } }),
        });
      },
    });
    return this.toPublicTransfer(operation, requestId);
  }
  async createTransfer(context: AuthContext, input: unknown, key: string, requestId: string) { return this.submit(context, input, key, requestId, false); }
  async scheduleTransfer(context: AuthContext, input: unknown, key: string, requestId: string) { return this.submit(context, input, key, requestId, true); }
  async getTransfer(context: AuthContext, pixTransferId: string) {
    const operation = await this.ledger.findById(pixTransferId, context.accountId);
    if (!operation || operation.kind !== 'PIX_TRANSFER') throw new ApiError('PIX_TRANSFER_NOT_FOUND', 'Transferência PIX não encontrada.', { statusCode: 404 });
    return this.toPublicTransfer(operation, randomUUID());
  }
  async getTransferReceipt(context: AuthContext, pixTransferId: string, requestId: string) {
    const transfer = await this.getTransfer(context, pixTransferId) as Record<string, unknown>;
    return { operationId: transfer.operationId, pixTransferId, createdAt: transfer.createdAt, amountMinor: transfer.amountMinor, currency: transfer.currency, payer: 'Conta SANDBOX', beneficiary: transfer.beneficiary, description: transfer.description, status: transfer.status, sandboxReference: transfer.sandboxReference, simulated: true, environment: 'SANDBOX', requestId };
  }
}
