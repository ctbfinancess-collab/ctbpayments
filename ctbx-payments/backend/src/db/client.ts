import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export interface DbConnection {
  db: Db;
  close: () => Promise<void>;
}

// Nunca um singleton de módulo — cada chamada a buildApp() (produção ou
// teste) cria sua própria conexão, mesmo padrão dos demais providers
// (ver sandboxProviders em app.ts). O caller é responsável por chamar
// close() (ex.: no hook 'onClose' do Fastify).
export function createDbConnection(databaseUrl: string): DbConnection {
  const client = postgres(databaseUrl, { max: 10 });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}
