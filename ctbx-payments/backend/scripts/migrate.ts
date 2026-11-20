import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Aplica as migrações pendentes (pasta drizzle/) — Fase 2. Roda no Railway
// como "pre-deploy": a versão nova da API só entra no ar se as migrações
// passarem; se falharem, a versão anterior continua no ar. Migrações já
// aplicadas são puladas (o Drizzle registra cada uma na tabela
// drizzle.__drizzle_migrations). Nunca imprime a connection string.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[migrate] DATABASE_URL ausente — nada foi feito.');
  process.exit(1);
}

// dist/scripts/migrate.js → ../../drizzle ; scripts/migrate.ts (tsx) → ../drizzle
const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [path.resolve(here, '../../drizzle'), path.resolve(here, '../drizzle')];
const { existsSync } = await import('node:fs');
const migrationsFolder = candidates.find((dir) => existsSync(path.join(dir, 'meta', '_journal.json')));
if (!migrationsFolder) {
  console.error('[migrate] pasta de migrações não encontrada.');
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
try {
  const started = Date.now();
  await migrate(drizzle(client), { migrationsFolder });
  const [row] = await client`select count(*)::int as n from drizzle.__drizzle_migrations`;
  console.log(`[migrate] OK — ${row?.n ?? '?'} migrações registradas (${Date.now() - started} ms).`);
} catch (error) {
  console.error('[migrate] FALHOU:', (error as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}
