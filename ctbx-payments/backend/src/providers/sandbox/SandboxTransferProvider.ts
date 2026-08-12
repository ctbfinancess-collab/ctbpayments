import { randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, TransferProvider } from '../ports.js';

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
  constructor(environment: string, private readonly now: () => Date = () => new Date()) {
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

  async validate(_context: AuthContext, raw: unknown) {
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
    return { validationId: `sbx_transfer_validation_${randomUUID()}`, beneficiary, amountMinor, currency: 'BRL', feeMinor, totalDebitMinor: amountMinor + feeMinor, ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}), status: 'VALIDATED', requiresChallenge: true, warnings: input.scheduledFor ? ['Agendamento validado no ambiente sandbox'] : [] };
  }
}
