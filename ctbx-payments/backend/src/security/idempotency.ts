import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../errors/ApiError.js';

export interface IdempotencyRecord {
  key: string;
  route: string;
  createdAt: string;
  status: 'STARTED' | 'COMPLETED';
}

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | undefined>;
  put(record: IdempotencyRecord): Promise<void>;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();
  async get(key: string) { return this.records.get(key); }
  async put(record: IdempotencyRecord) { this.records.set(record.key, record); }
}

const validKey = /^[A-Za-z0-9._:-]{16,128}$/;

export async function requireIdempotencyKey(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const key = request.headers['idempotency-key'];
  if (typeof key !== 'string' || !validKey.test(key)) {
    throw new ApiError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key válida é obrigatória.', { statusCode: 400 });
  }
}
