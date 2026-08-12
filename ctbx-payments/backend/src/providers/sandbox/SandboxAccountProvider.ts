import { providerNotConfigured } from '../../errors/ApiError.js';
import type { AccountProvider, AuthContext } from '../ports.js';

const money = (amount: number) => ({ amount, currency: 'BRL' as const });

export class SandboxAccountProvider implements AccountProvider {
  constructor(environment: string) {
    if (environment === 'production') throw new Error('SandboxAccountProvider is forbidden in production');
  }

  async getCurrent(context: AuthContext) {
    return context.account;
  }

  async getBalances(_context: AuthContext) {
    return {
      available: money(125_000),
      ledger: money(130_000),
      components: {
        digitalAccount: money(125_000), blocked: money(5_000), investments: money(200_000),
        cardAccount: money(25_000), credit: money(75_000), foreignCurrency: money(0),
      },
      asOf: new Date().toISOString(),
      environment: 'sandbox',
    };
  }

  async listStatement(): Promise<never> {
    throw providerNotConfigured('de extrato');
  }
}
