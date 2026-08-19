import { defineConfig } from 'drizzle-kit';
import { loadLocalEnvFiles } from './src/config/loadLocalEnv.js';

// drizzle-kit roda como CLI separado (não passa por server.ts), então
// carrega o .env.local aqui do mesmo jeito, para reaproveitar o
// DATABASE_URL já configurado localmente sem precisar exportá-lo à mão.
loadLocalEnvFiles();

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
