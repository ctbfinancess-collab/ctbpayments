import { randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, ConsignedProvider } from '../ports.js';
import type { SandboxConsignedApplicationRecord, SandboxConsignedRepository } from '../../repositories/SandboxConsignedRepository.js';
import { hashPayload, withPersistedIdempotency } from './persistedIdempotency.js';

// Catálogo estático — puramente demonstrativo, permitido continuar como
// seed/config em memória (nunca muda por cliente).
const products = [
  { id: 'sbx_con_a', name: 'Consignado SANDBOX A', minAmountMinor: 10000, maxAmountMinor: 500000, installmentOptions: [6, 12, 18], rateDisplay: 'Taxa exclusivamente demonstrativa', status: 'ACTIVE', eligibilityLabel: 'Elegibilidade não verificada' },
  { id: 'sbx_con_b', name: 'Consignado SANDBOX B', minAmountMinor: 20000, maxAmountMinor: 1000000, installmentOptions: [12, 24, 36], rateDisplay: 'Taxa exclusivamente demonstrativa', status: 'ACTIVE', eligibilityLabel: 'Elegibilidade não verificada' },
];
type Product = (typeof products)[number];

export class SandboxConsignedProvider implements ConsignedProvider {
  constructor(
    environment: string,
    private readonly applications: SandboxConsignedRepository,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (environment === 'production') throw new Error('SandboxConsignedProvider is forbidden in production');
  }

  async listProducts(_context: AuthContext) { return products; }

  private product(id: string): Product {
    const product = products.find((item) => item.id === id);
    if (!product) throw new ApiError('CONSIGNED_PRODUCT_NOT_FOUND', 'Produto não encontrado.', { statusCode: 404 });
    return product;
  }

  async getDocuments(_context: AuthContext, id: string) {
    this.product(id);
    return [
      { id: 'doc_identity', name: 'Documento de identificação fictício', format: 'CHECKLIST', required: true, status: 'ACKNOWLEDGEMENT_ONLY' },
      { id: 'doc_income', name: 'Comprovante estrutural fictício', format: 'CHECKLIST', required: true, status: 'ACKNOWLEDGEMENT_ONLY' },
    ];
  }

  async getTerms(_context: AuthContext, id: string) {
    this.product(id);
    return { productId: id, title: 'Termos SANDBOX', content: 'Simulação sem oferta, elegibilidade ou contratação real.', simulated: true, environment: 'SANDBOX' };
  }

  private toPublicApplication(row: SandboxConsignedApplicationRecord) {
    const product = this.product(row.productId);
    return { applicationId: row.id, product, amountMinor: row.amountMinor, installments: row.installments, status: row.status, createdAt: row.createdAt.toISOString(), simulated: true, environment: 'SANDBOX', sandboxReference: row.sandboxReference, requestId: row.requestId };
  }

  // Fluxo atual é um único passo — não existe aprovação/liberação de
  // crédito implementada hoje (a solicitação nasce e permanece
  // UNDER_REVIEW), então esta operação nunca toca o ledger/conta: só a
  // solicitação em si precisa persistir (Etapa 5).
  // Etapa 5.1 — reescrito sobre withPersistedIdempotency (mesmo mecanismo
  // compartilhado do restante do backend, com tratamento de corrida
  // concorrente incluído).
  async apply(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const input = raw as { productId?: string; amountMinor?: number; installments?: number; termsAccepted?: boolean; documentsAcknowledged?: boolean };
    const row = await withPersistedIdempotency({
      raw,
      find: () => this.applications.findByIdempotencyKey(context.accountId, key),
      requestHashOf: (existing) => existing.requestHash,
      create: async () => {
        const product = this.product(input.productId ?? '');
        if (!Number.isInteger(input.amountMinor) || (input.amountMinor ?? 0) < product.minAmountMinor || (input.amountMinor ?? 0) > product.maxAmountMinor || !product.installmentOptions.includes(input.installments as number) || input.termsAccepted !== true || input.documentsAcknowledged !== true) {
          throw new ApiError('CONSIGNED_APPLICATION_INVALID', 'Solicitação inválida.', { statusCode: 422 });
        }
        const id = `sbx_con_app_${randomUUID()}`;
        return this.applications.create({
          id, accountId: context.accountId, productId: product.id, amountMinor: input.amountMinor as number, installments: input.installments as number,
          status: 'UNDER_REVIEW', sandboxReference: `SBX-CON-${randomUUID()}`, requestId, idempotencyKey: key, requestHash: hashPayload(raw),
        });
      },
    });
    return this.toPublicApplication(row);
  }

  async listApplications(context: AuthContext) {
    const rows = await this.applications.listByAccount(context.accountId);
    return rows.map((row) => this.toPublicApplication(row));
  }

  async getApplication(context: AuthContext, id: string) {
    const row = await this.applications.findById(id, context.accountId);
    if (!row) throw new ApiError('CONSIGNED_APPLICATION_NOT_FOUND', 'Solicitação não encontrada.', { statusCode: 404 });
    return this.toPublicApplication(row);
  }

  async getReceipt(context: AuthContext, id: string, requestId: string) {
    const application = await this.getApplication(context, id) as Record<string, unknown>;
    return { ...application, receiptType: 'CONSIGNED_SANDBOX', requestId };
  }
}
