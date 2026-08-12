import { randomUUID } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthContext, ChallengeProvider } from '../ports.js';

type Challenge = { id: string; accountId: string; operationId: string; purpose: string; type: 'OTP'; status: 'PENDING' | 'VERIFIED'; createdAt: string; expiresAt: string };

export class SandboxChallengeProvider implements ChallengeProvider {
  private readonly challenges = new Map<string, Challenge>();
  constructor(environment: string, private readonly now: () => Date = () => new Date()) {
    if (environment === 'production') throw new Error('SandboxChallengeProvider is forbidden in production');
  }
  async create(context: AuthContext, raw: unknown) {
    const input = raw as { purpose?: string; operationId?: string; type?: string };
    if (!input.purpose || !input.operationId || (input.type && input.type !== 'OTP')) throw new ApiError('AUTH_CHALLENGE_INVALID', 'Challenge SANDBOX inválido.', { statusCode: 400 });
    const createdAt = this.now();
    const challenge: Challenge = { id: `sbx_challenge_${randomUUID()}`, accountId: context.accountId, operationId: input.operationId, purpose: input.purpose, type: 'OTP', status: 'PENDING', createdAt: createdAt.toISOString(), expiresAt: new Date(createdAt.getTime() + 5 * 60_000).toISOString() };
    this.challenges.set(challenge.id, challenge);
    return { ...challenge, environment: 'SANDBOX' };
  }
  async verify(context: AuthContext, id: string, raw: unknown) {
    const challenge = this.challenges.get(id);
    if (!challenge || challenge.accountId !== context.accountId) throw new ApiError('AUTH_CHALLENGE_NOT_FOUND', 'Challenge não encontrado.', { statusCode: 401 });
    if (Date.parse(challenge.expiresAt) < this.now().getTime()) throw new ApiError('AUTH_CHALLENGE_EXPIRED', 'Challenge expirado.', { statusCode: 401 });
    if ((raw as { proof?: string }).proof !== '123456') throw new ApiError('AUTH_CHALLENGE_INVALID', 'OTP SANDBOX inválido.', { statusCode: 401 });
    challenge.status = 'VERIFIED';
    return { ...challenge, environment: 'SANDBOX' };
  }
  isVerified(context: AuthContext, id: string, operationId: string) {
    const challenge = this.challenges.get(id);
    return Boolean(challenge && challenge.accountId === context.accountId && challenge.operationId === operationId && challenge.status === 'VERIFIED' && Date.parse(challenge.expiresAt) >= this.now().getTime());
  }
}
