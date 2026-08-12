import type { FastifyInstance } from 'fastify';
import { envelope } from '../utils/envelope.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (request) => envelope(request, { status: 'UP' }));
  app.get('/ready', async (request) => envelope(request, {
    status: 'LIMITED',
    ready: true,
    providersConfigured: false,
    message: 'Skeleton pronto; providers financeiros não configurados.',
  }));
}
