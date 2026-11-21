import type { FastifyInstance } from 'fastify';
import { envelope } from '../utils/envelope.js';

export interface HealthOptions { databasePing?: (() => Promise<void>) | undefined }

export async function healthRoutes(app: FastifyInstance, options: HealthOptions = {}): Promise<void> {
  // Vivo (usado pelo Railway para saber se o processo subiu).
  app.get('/health', async (request) => envelope(request, { status: 'UP' }));
  // Completo (usado pelo monitoramento): também confere o banco, com limite
  // de 3 segundos. Não revela detalhes do erro, só se está de pé.
  app.get('/health/deep', async (request, reply) => {
    if (!options.databasePing) return envelope(request, { status: 'UP', database: 'NOT_CONFIGURED' });
    try {
      await Promise.race([options.databasePing(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))]);
      return envelope(request, { status: 'UP', database: 'UP' });
    } catch {
      return reply.status(503).send(envelope(request, { status: 'DOWN', database: 'DOWN' }));
    }
  });
  app.get('/ready', async (request) => envelope(request, {
    status: 'LIMITED',
    ready: true,
    providersConfigured: false,
    message: 'Skeleton pronto; providers financeiros não configurados.',
  }));
}
