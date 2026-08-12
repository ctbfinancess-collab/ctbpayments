import type { FastifyRequest } from 'fastify';
import { providerNotConfigured } from '../errors/ApiError.js';

export function unavailable(domain: string) {
  return async (_request: FastifyRequest): Promise<never> => { throw providerNotConfigured(domain); };
}
