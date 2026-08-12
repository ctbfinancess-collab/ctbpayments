import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyInstance } from 'fastify';
import { loadConfig, type AppConfig } from './config/env.js';
import { registerErrorHandler } from './middleware/errorHandler.js';
import { requestIdFactory } from './middleware/requestId.js';
import { loggerOptions } from './observability/logger.js';
import { DemoAuthProvider } from './providers/DemoAuthProvider.js';
import type { ProviderRegistry } from './providers/ports.js';
import { healthRoutes } from './routes/health.js';
import { v1Routes } from './routes/v1.js';

export interface BuildAppOptions { config?: AppConfig; providers?: ProviderRegistry; logger?: boolean }

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const providers: ProviderRegistry = options.providers ?? (config.nodeEnv === 'production' ? {} : { auth: new DemoAuthProvider(config.nodeEnv) });
  const app = Fastify({
    logger: loggerOptions(config.logLevel, options.logger ?? config.nodeEnv !== 'test'),
    genReqId: requestIdFactory,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.nodeEnv === 'production' ? false : /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    credentials: false,
  });
  app.addHook('onRequest', async (request, reply) => { reply.header('x-request-id', request.id); });
  registerErrorHandler(app, config.nodeEnv === 'production');
  await app.register(healthRoutes);
  await app.register(async (api) => v1Routes(api, providers), { prefix: `/${config.apiVersion}` });
  return app;
}
