import { randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, BillingProvider } from '../ports.js';
import type { SandboxBillingBillRecord, SandboxBillingPayerRecord, SandboxBillingRepository } from '../../repositories/SandboxBillingRepository.js';
import { hashPayload, withPersistedIdempotency } from './persistedIdempotency.js';

// Etapa 5.1 (Prioridade 4) — antes 100% em memória (dois Map() do
// processo, perdidos em qualquer restart real do backend). "Cobrar" nunca
// move o saldo da PRÓPRIA conta (emitir uma cobrança pra alguém pagar não
// é uma movimentação de sandbox_accounts), então não há relação com o
// ledger aqui — só durabilidade dos cadastros de sacado/cobrança em si.
export class SandboxBillingProvider implements BillingProvider {
  constructor(
    environment: string,
    private readonly repository: SandboxBillingRepository,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (environment === 'production') throw new Error('SandboxBillingProvider is forbidden in production');
  }

  // Semeia o sacado fixo que o app sempre mostrou, na primeira vez que a
  // conta acessa Cobrança — mesmo padrão de ensureSandboxAccount/PIX keys.
  private async ensurePayerSeeded(accountId: string) {
    const existing = await this.repository.listPayers(accountId);
    if (existing.length > 0) return existing;
    await this.repository.createPayer({
      id: `sbx_payer_${accountId}_seed`, accountId, name: 'Sacado SANDBOX', documentMasked: '***.***.***-**',
      emailSandbox: 'sacado@sandbox.invalid', addressSandbox: 'Endereço fictício SANDBOX', status: 'ACTIVE',
      idempotencyKey: null, requestHash: null,
    });
    return this.repository.listPayers(accountId);
  }

  private publicPayer(row: SandboxBillingPayerRecord) {
    return { payerId: row.id, name: row.name, documentMasked: row.documentMasked, emailSandbox: row.emailSandbox, addressSandbox: row.addressSandbox, status: row.status };
  }

  private publicBill(row: SandboxBillingBillRecord) {
    return {
      billId: row.id, payer: row.payerSnapshot, externalReferenceSandbox: row.externalReferenceSandbox, digitableLineSandbox: row.digitableLineSandbox,
      barcodeSandbox: row.barcodeSandbox, status: row.status, dueDate: row.dueDate, amountMinor: row.amountMinor, description: row.description,
      simulated: true, environment: 'SANDBOX', createdAt: row.createdAt.toISOString(), requestId: row.requestId,
    };
  }

  async listPayers(context: AuthContext) {
    const rows = await this.ensurePayerSeeded(context.accountId);
    return rows.map((row) => this.publicPayer(row));
  }

  async createPayer(context: AuthContext, raw: unknown, key: string) {
    await this.ensurePayerSeeded(context.accountId);
    const row = await withPersistedIdempotency({
      raw,
      find: () => this.repository.findPayerByIdempotencyKey(context.accountId, key),
      requestHashOf: (existing) => existing.requestHash,
      create: () => {
        const input = raw as { name?: string };
        if (!input.name) throw new ApiError('BILLING_PAYER_INVALID', 'Sacado inválido.', { statusCode: 422 });
        return this.repository.createPayer({
          id: `sbx_payer_${randomUUID()}`, accountId: context.accountId, name: input.name, documentMasked: '***.***.***-**',
          emailSandbox: 'sacado@sandbox.invalid', addressSandbox: 'Endereço fictício SANDBOX', status: 'ACTIVE',
          idempotencyKey: key, requestHash: hashPayload(raw),
        });
      },
    });
    return this.publicPayer(row);
  }

  async updatePayer(context: AuthContext, id: string, raw: unknown) {
    const input = raw as { name?: string };
    const updated = await this.repository.updatePayer(id, context.accountId, input.name ? { name: input.name } : {});
    if (!updated) throw new ApiError('BILLING_PAYER_NOT_FOUND', 'Sacado não encontrado.', { statusCode: 404 });
    return this.publicPayer(updated);
  }

  async deletePayer(context: AuthContext, id: string) {
    const deleted = await this.repository.deletePayer(id, context.accountId);
    if (!deleted) throw new ApiError('BILLING_PAYER_NOT_FOUND', 'Sacado não encontrado.', { statusCode: 404 });
    return { payerId: id, deleted: true, simulated: true, environment: 'SANDBOX' };
  }

  async getLimits(context: AuthContext) {
    const bills = await this.repository.listBills(context.accountId);
    return { maximumBills: 20, issuedBills: bills.length, remainingBills: Math.max(0, 20 - bills.length), simulated: true, environment: 'SANDBOX' };
  }

  async listBills(context: AuthContext) {
    const rows = await this.repository.listBills(context.accountId);
    return rows.map((row) => this.publicBill(row));
  }

  async createBill(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const row = await withPersistedIdempotency({
      raw,
      find: () => this.repository.findBillByIdempotencyKey(context.accountId, key),
      requestHashOf: (existing) => existing.requestHash,
      create: async () => {
        const input = raw as { payerId?: string; dueDate?: string; amountMinor?: number; description?: string };
        const payer = await this.repository.findPayer(input.payerId ?? '', context.accountId);
        if (!payer) throw new ApiError('BILLING_PAYER_NOT_FOUND', 'Sacado não encontrado.', { statusCode: 404 });
        if (!Number.isInteger(input.amountMinor) || (input.amountMinor ?? 0) <= 0 || Date.parse(input.dueDate ?? '') <= this.now().getTime()) {
          throw new ApiError('BILLING_BILL_INVALID', 'Cobrança inválida.', { statusCode: 422 });
        }
        const id = `sbx_bill_${randomUUID()}`;
        return this.repository.createBill({
          id, accountId: context.accountId, payerId: payer.id, payerSnapshot: this.publicPayer(payer),
          externalReferenceSandbox: `SBX-BILL-${randomUUID()}`, digitableLineSandbox: `SANDBOX-NOT-A-BANK-BILL-${id}`, barcodeSandbox: `SANDBOX|INVALID-BARCODE|${id}`,
          status: 'ISSUED', dueDate: input.dueDate as string, amountMinor: input.amountMinor as number, description: input.description || '',
          requestId, idempotencyKey: key, requestHash: hashPayload(raw),
        });
      },
    });
    return this.publicBill(row);
  }

  async getBill(context: AuthContext, id: string) {
    const row = await this.repository.findBill(id, context.accountId);
    if (!row) throw new ApiError('BILLING_BILL_NOT_FOUND', 'Cobrança não encontrada.', { statusCode: 404 });
    return this.publicBill(row);
  }

  async shareBill(context: AuthContext, id: string) {
    await this.getBill(context, id);
    return { billId: id, shared: true, channel: 'SANDBOX', simulated: true, environment: 'SANDBOX' };
  }

  async getReceipt(context: AuthContext, id: string, requestId: string) {
    const bill = await this.getBill(context, id) as Record<string, unknown>;
    return { ...bill, receiptType: 'BILLING_SANDBOX_NOT_BANK_BILL', requestId };
  }
}
