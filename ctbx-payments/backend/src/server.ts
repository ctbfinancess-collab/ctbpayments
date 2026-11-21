import { buildApp } from './app.js';
import { safeError } from './observability/logger.js';
import { loadConfig } from './config/env.js';
import { loadLocalEnvFiles } from './config/loadLocalEnv.js';

loadLocalEnvFiles();
const config = loadConfig();
// Fail-closed: em produção a API NUNCA sobe sem banco real. Sem isso,
// cadastros e sessões de clientes cairiam em memória e se perderiam a
// cada reinício.
if (config.nodeEnv === 'production' && !config.databaseUrl) {
  console.error('DATABASE_URL é obrigatório em produção. A API não foi iniciada.');
  process.exit(1);
}
const app = await buildApp({ config });

// Falhas fora de uma requisição: registra (sem dados pessoais) e alerta.
process.on('unhandledRejection', (reason) => {
  const err = safeError(reason);
  app.log.error({ err }, 'unhandled rejection');
  void app.criticalAlerter?.notify({ kind: 'PROCESS_ERROR', type: err.type, code: err.code });
});
process.on('uncaughtException', (error) => {
  const err = safeError(error);
  app.log.fatal({ err }, 'uncaught exception');
  // Dá tempo de enviar o alerta; o Railway reinicia o processo em seguida.
  void Promise.resolve(app.criticalAlerter?.notify({ kind: 'PROCESS_ERROR', type: err.type, code: err.code })).finally(() => setTimeout(() => process.exit(1), 2000).unref());
});

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error({ err: safeError(error) }, 'server startup failed');
  process.exitCode = 1;
}
