import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, InvestmentProvider } from '../ports.js';

const products = [
  { id: 'sbx_inv_liquidity_30', name: 'Liquidez SANDBOX', type: 'STRUCTURAL', currency: 'BRL', minimumAmountMinor: 1000, maximumAmountMinor: 5000000, termDays: 30, rateDisplay: 'Projeção demonstrativa A', riskLabel: 'Risco não avaliado', status: 'ACTIVE' },
  { id: 'sbx_inv_fixed_180', name: 'Renda Fixa SANDBOX', type: 'STRUCTURAL', currency: 'BRL', minimumAmountMinor: 10000, maximumAmountMinor: 10000000, termDays: 180, rateDisplay: 'Projeção demonstrativa B', riskLabel: 'Risco não avaliado', status: 'ACTIVE' },
  { id: 'sbx_inv_term_360', name: 'Prazo SANDBOX', type: 'STRUCTURAL', currency: 'BRL', minimumAmountMinor: 5000, maximumAmountMinor: 20000000, termDays: 360, rateDisplay: 'Projeção demonstrativa C', riskLabel: 'Risco não avaliado', status: 'ACTIVE' },
];

export class SandboxInvestmentProvider implements InvestmentProvider {
  private simulations = new Map<string, any>();
  private orders = new Map<string, any>();
  private idem = new Map<string, { h: string; r: any }>();

  constructor(env: string, private now = () => new Date()) {
    if (env === 'production') throw new Error('SandboxInvestmentProvider is forbidden in production');
  }

  async listProducts(_context: AuthContext) { return products; }

  async simulate(context: AuthContext, raw: unknown) {
    const input = raw as any;
    const product = products.find((item) => item.id === input.productId);
    if (!product) throw new ApiError('INVESTMENT_PRODUCT_NOT_FOUND', 'Produto não encontrado.', { statusCode: 404 });
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < product.minimumAmountMinor || input.amountMinor > product.maximumAmountMinor) {
      throw new ApiError('INVESTMENT_AMOUNT_INVALID', 'Valor inválido.', { statusCode: 422 });
    }
    const rate = product.termDays === 30 ? 1 : product.termDays === 180 ? 6 : 10;
    const projectedGrossMinor = Math.round(input.amountMinor * (100 + rate) / 100);
    const projectedNetMinor = projectedGrossMinor - Math.round((projectedGrossMinor - input.amountMinor) * 0.15);
    const simulationId = `sbx_inv_sim_${randomUUID()}`;
    const result = { simulationId, product, amountMinor: input.amountMinor, projectedGrossMinor, projectedNetMinor, termDays: product.termDays, rateDisplay: product.rateDisplay, simulated: true, environment: 'SANDBOX', warnings: ['Projeção puramente demonstrativa; não representa rentabilidade real.'] };
    this.simulations.set(simulationId, { ...result, accountId: context.accountId });
    return result;
  }

  async createOrder(context: AuthContext, raw: unknown, key: string, requestId: string) {
    return this.once(context, 'order', key, raw, () => {
      const input = raw as any;
      const simulation = this.simulations.get(input.simulationId);
      if (!simulation || simulation.accountId !== context.accountId) throw new ApiError('INVESTMENT_SIMULATION_NOT_FOUND', 'Simulação não encontrada.', { statusCode: 404 });
      if (input.termsAccepted !== true) throw new ApiError('INVESTMENT_TERMS_REQUIRED', 'Aceite necessário.', { statusCode: 422 });
      const result = { orderId: `sbx_inv_order_${randomUUID()}`, operationId: `sbx_inv_op_${randomUUID()}`, amountMinor: simulation.amountMinor, product: simulation.product, status: 'COMPLETED', createdAt: this.now().toISOString(), simulated: true, environment: 'SANDBOX', sandboxReference: `SBX-INV-${randomUUID()}`, requestId, accountId: context.accountId };
      this.orders.set(result.orderId, result);
      return this.publicResult(result);
    });
  }

  private once(context: AuthContext, type: string, key: string, input: unknown, factory: () => any) {
    const mapKey = `${context.accountId}:${type}:${key}`;
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const existing = this.idem.get(mapKey);
    if (existing) {
      if (existing.h !== hash) throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', 'Chave conflitante.', { statusCode: 409 });
      return existing.r;
    }
    const result = factory();
    this.idem.set(mapKey, { h: hash, r: result });
    return result;
  }

  private publicResult(value: any) { const { accountId: _, ...result } = value; return result; }

  async getOrder(context: AuthContext, id: string) {
    const result = this.orders.get(id);
    if (!result || result.accountId !== context.accountId) throw new ApiError('INVESTMENT_ORDER_NOT_FOUND', 'Ordem não encontrada.', { statusCode: 404 });
    return this.publicResult(result);
  }

  async listPositions(context: AuthContext) {
    return [...this.orders.values()].filter((item) => item.accountId === context.accountId).map((item) => ({ positionId: `pos_${item.orderId}`, orderId: item.orderId, product: item.product, investedMinor: item.amountMinor, currentMinor: item.amountMinor, status: 'ACTIVE', simulated: true, environment: 'SANDBOX' }));
  }

  async getReceipt(context: AuthContext, id: string, requestId: string) {
    const result = await this.getOrder(context, id) as any;
    return { ...result, receiptType: 'INVESTMENT_SANDBOX', requestId };
  }
}
