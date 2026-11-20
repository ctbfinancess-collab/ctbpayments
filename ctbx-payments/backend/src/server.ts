import { buildApp } from './app.js';
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

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error({ err: error }, 'server startup failed');
  process.exitCode = 1;
}
