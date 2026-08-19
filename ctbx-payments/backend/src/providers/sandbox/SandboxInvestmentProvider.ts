import { randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, InvestmentProvider } from '../ports.js';
import type { SandboxAccountRepository } from '../../repositories/SandboxAccountRepository.js';
import type { SandboxInvestmentSimulationRepository } from '../../repositories/SandboxInvestmentSimulationRepository.js';
import type { SandboxLedgerRepository, SandboxOperationRecord } from '../../repositories/SandboxLedgerRepository.js';
import { ensureSandboxAccount } from './ensureSandboxAccount.js';
import { hashPayload, withPersistedIdempotency } from './persistedIdempotency.js';

// Catálogo estático — puramente demonstrativo, permitido continuar como
// seed/config em memória (nunca muda por cliente, não é "estado do
// cliente"). O que precisa persistir é a simulação/ordem, não o produto.
const products = [
  { id: 'sbx_inv_liquidity_30', name: 'Liquidez SANDBOX', type: 'STRUCTURAL', currency: 'BRL', minimumAmountMinor: 1000, maximumAmountMinor: 5000000, termDays: 30, rateDisplay: 'Projeção demonstrativa A', riskLabel: 'Risco não avaliado', status: 'ACTIVE' },
  { id: 'sbx_inv_fixed_180', name: 'Renda Fixa SANDBOX', type: 'STRUCTURAL', currency: 'BRL', minimumAmountMinor: 10000, maximumAmountMinor: 10000000, termDays: 180, rateDisplay: 'Projeção demonstrativa B', riskLabel: 'Risco não avaliado', status: 'ACTIVE' },
  { id: 'sbx_inv_term_360', name: 'Prazo SANDBOX', type: 'STRUCTURAL', currency: 'BRL', minimumAmountMinor: 5000, maximumAmountMinor: 20000000, termDays: 360, rateDisplay: 'Projeção demonstrativa C', riskLabel: 'Risco não avaliado', status: 'ACTIVE' },
];
type Product = (typeof products)[number];
type OrderDetails = { operationId: string; product: Product; sandboxReference: string; requestId: string; simulationId: string; requestHash: string };

export class SandboxInvestmentProvider implements InvestmentProvider {
  constructor(
    environment: string,
    private readonly accounts: SandboxAccountRepository,
    private readonly ledger: SandboxLedgerRepository,
    private readonly simulations: SandboxInvestmentSimulationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (environment === 'production') throw new Error('SandboxInvestmentProvider is forbidden in production');
  }

  async listProducts(_context: AuthContext) { return products; }

  async simulate(context: AuthContext, raw: unknown) {
    const input = raw as { productId?: string; amountMinor?: number };
    const product = products.find((item) => item.id === input.productId);
    if (!product) throw new ApiError('INVESTMENT_PRODUCT_NOT_FOUND', 'Produto não encontrado.', { statusCode: 404 });
    if (!Number.isInteger(input.amountMinor) || (input.amountMinor ?? 0) < product.minimumAmountMinor || (input.amountMinor ?? 0) > product.maximumAmountMinor) {
      throw new ApiError('INVESTMENT_AMOUNT_INVALID', 'Valor inválido.', { statusCode: 422 });
    }
    const amountMinor = input.amountMinor as number;
    const rate = product.termDays === 30 ? 1 : product.termDays === 180 ? 6 : 10;
    const projectedGrossMinor = Math.round(amountMinor * (100 + rate) / 100);
    const projectedNetMinor = projectedGrossMinor - Math.round((projectedGrossMinor - amountMinor) * 0.15);
    const simulationId = `sbx_inv_sim_${randomUUID()}`;
    // Persistida de propósito (Etapa 5): "aplicar" não pode depender de
    // Map()/memória do processo — a simulação precisa sobreviver a um
    // restart entre simular e confirmar, igual qualquer outro estado do
    // cliente.
    await this.simulations.create({ id: simulationId, accountId: context.accountId, productId: product.id, amountMinor, projectedGrossMinor, projectedNetMinor, termDays: product.termDays });
    return { simulationId, product, amountMinor, projectedGrossMinor, projectedNetMinor, termDays: product.termDays, rateDisplay: product.rateDisplay, simulated: true, environment: 'SANDBOX', warnings: ['Projeção puramente demonstrativa; não representa rentabilidade real.'] };
  }

  private toPublicOrder(row: SandboxOperationRecord) {
    const details = row.details as unknown as OrderDetails;
    return { orderId: row.id, operationId: details.operationId, amountMinor: row.amountMinor, product: details.product, status: row.status, createdAt: row.createdAt.toISOString(), simulated: true, environment: 'SANDBOX', sandboxReference: details.sandboxReference, requestId: details.requestId };
  }

  // Etapa 5.1 — reescrito sobre o mesmo mecanismo compartilhado
  // (withPersistedIdempotency) usado agora por PIX/Transferência/
  // Pagamento/Cartão/Consignado, com o bônus de também tratar corretamente
  // duas requisições concorrentes com a mesma chave (a que perder a
  // corrida no índice único recupera o resultado da vencedora em vez de
  // estourar um erro).
  async createOrder(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const input = raw as { simulationId?: string; termsAccepted?: boolean };
    const operation = await withPersistedIdempotency({
      raw,
      find: () => this.ledger.findByIdempotencyKey(context.accountId, 'INVESTMENT_ORDER', key),
      requestHashOf: (row) => (row.details as unknown as OrderDetails).requestHash,
      create: async () => {
        const simulation = await this.simulations.findById(input.simulationId ?? '', context.accountId);
        if (!simulation) throw new ApiError('INVESTMENT_SIMULATION_NOT_FOUND', 'Simulação não encontrada.', { statusCode: 404 });
        if (input.termsAccepted !== true) throw new ApiError('INVESTMENT_TERMS_REQUIRED', 'Aceite necessário.', { statusCode: 422 });
        const product = products.find((item) => item.id === simulation.productId)!;

        // Saldo REAL da conta (fonte única de verdade) — nunca um teto
        // fixo, nunca uma carteira de investimentos paralela.
        const account = await ensureSandboxAccount(this.accounts, context, this.now);
        if (simulation.amountMinor > account.availableMinor) throw new ApiError('INVESTMENT_INSUFFICIENT_FUNDS', 'Saldo SANDBOX insuficiente.', { statusCode: 422 });

        const orderId = `sbx_inv_order_${randomUUID()}`;
        const details: OrderDetails = { operationId: `sbx_inv_op_${randomUUID()}`, product, sandboxReference: `SBX-INV-${randomUUID()}`, requestId, simulationId: simulation.id, requestHash: hashPayload(raw) };
        // Única escrita financeira: conta → débito → lançamento no extrato
        // → ordem/aplicação, atomicamente (sandbox_operations com
        // kind='INVESTMENT_ORDER'). "Posição" é sempre derivada 1:1 da
        // ordem (ver listPositions), não uma entidade própria.
        return this.ledger.recordOperation({
          operationId: orderId, accountId: context.accountId, kind: 'INVESTMENT_ORDER', status: 'COMPLETED', amountMinor: simulation.amountMinor,
          details, idempotencyKey: key,
          ledgerEntry: {
            balanceField: 'availableMinor', deltaMinor: -simulation.amountMinor,
            transaction: {
              id: `sbx_txn_${context.accountId}_investment_${randomUUID()}`, accountId: context.accountId, occurredAt: this.now(), type: 'INVESTMENT_ORDER', direction: 'DEBIT',
              description: `Aplicação em ${product.name}`, counterparty: product.name, amountMinor: simulation.amountMinor, currency: 'BRL', status: 'COMPLETED',
              category: 'Investimentos', feeMinor: 0, receiptAvailable: true, institution: 'CTBX Payments Sandbox', document: '—', reason: null,
            },
          },
        });
      },
    });
    return this.toPublicOrder(operation);
  }

  async getOrder(context: AuthContext, id: string) {
    const operation = await this.ledger.findById(id, context.accountId);
    if (!operation || operation.kind !== 'INVESTMENT_ORDER') throw new ApiError('INVESTMENT_ORDER_NOT_FOUND', 'Ordem não encontrada.', { statusCode: 404 });
    return this.toPublicOrder(operation);
  }

  async listPositions(context: AuthContext) {
    const orders = await this.ledger.listByAccountAndKind(context.accountId, 'INVESTMENT_ORDER');
    return orders.map((row) => {
      const details = row.details as unknown as OrderDetails;
      return { positionId: `pos_${row.id}`, orderId: row.id, product: details.product, investedMinor: row.amountMinor, currentMinor: row.amountMinor, status: 'ACTIVE', simulated: true, environment: 'SANDBOX' };
    });
  }

  async getReceipt(context: AuthContext, id: string, requestId: string) {
    const order = await this.getOrder(context, id) as Record<string, unknown>;
    return { ...order, receiptType: 'INVESTMENT_SANDBOX', requestId };
  }
}
