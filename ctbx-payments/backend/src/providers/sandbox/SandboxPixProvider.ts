import { randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, PixProvider } from '../ports.js';

type KeyType = 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
const beneficiary = Object.freeze({ name: 'Cliente Recebedor SANDBOX', documentMasked: '***.***.***-**', bankName: 'Banco SANDBOX', branch: '0001', accountMasked: '******-0', accountType: 'Conta corrente' });
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
  constructor(environment: string, private readonly now: () => Date = () => new Date()) {
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
}
