import type { FastifyRequest } from 'fastify';

export const envelope = <T>(request: FastifyRequest, data: T, meta: Record<string, unknown> = {}) => ({ data, meta, requestId: request.id });
