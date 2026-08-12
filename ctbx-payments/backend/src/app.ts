import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyInstance } from 'fastify';
import { loadConfig, type AppConfig } from './config/env.js';
import { registerErrorHandler } from './middleware/errorHandler.js';
import { requestIdFactory } from './middleware/requestId.js';
import { loggerOptions } from './observability/logger.js';
import type { ProviderRegistry } from './providers/ports.js';
import { SandboxAccountProvider } from './providers/sandbox/SandboxAccountProvider.js';
import { SandboxAuthProvider } from './providers/sandbox/SandboxAuthProvider.js';
import { SandboxCardProvider } from './providers/sandbox/SandboxCardProvider.js';
import { SandboxChallengeProvider } from './providers/sandbox/SandboxChallengeProvider.js';
import { SandboxDeviceBindingProvider } from './providers/sandbox/SandboxDeviceBindingProvider.js';
import { SandboxPixProvider } from './providers/sandbox/SandboxPixProvider.js';
import { SandboxPaymentProvider } from './providers/sandbox/SandboxPaymentProvider.js';
import { SandboxSessionStore } from './providers/sandbox/SandboxSessionStore.js';
import { SandboxTransferProvider } from './providers/sandbox/SandboxTransferProvider.js';
import { SandboxInvestmentProvider } from './providers/sandbox/SandboxInvestmentProvider.js';
import { SandboxBillingProvider } from './providers/sandbox/SandboxBillingProvider.js';
import { SandboxConsignedProvider } from './providers/sandbox/SandboxConsignedProvider.js';
import { healthRoutes } from './routes/health.js';
import { v1Routes } from './routes/v1.js';

export interface BuildAppOptions { config?: AppConfig; providers?: ProviderRegistry; logger?: boolean }

function sandboxProviders(config: AppConfig): ProviderRegistry {
  if (config.nodeEnv === 'production') return {};
  const sessions = new SandboxSessionStore({ environment: config.nodeEnv });
  const deviceBinding = new SandboxDeviceBindingProvider(config.nodeEnv);
  const challenge = new SandboxChallengeProvider(config.nodeEnv);
  return {
    sessions,
    deviceBinding,
    auth: new SandboxAuthProvider(sessions, deviceBinding, config.nodeEnv),
    account: new SandboxAccountProvider(config.nodeEnv),
    card: new SandboxCardProvider(config.nodeEnv, challenge),
    pix: new SandboxPixProvider(config.nodeEnv, challenge),
    transfer: new SandboxTransferProvider(config.nodeEnv, challenge),
    challenge,
    payment: new SandboxPaymentProvider(config.nodeEnv, challenge),
    investment: new SandboxInvestmentProvider(config.nodeEnv),
    billing: new SandboxBillingProvider(config.nodeEnv),
    consigned: new SandboxConsignedProvider(config.nodeEnv),
  };
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const providers: ProviderRegistry = options.providers ?? sandboxProviders(config);
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
