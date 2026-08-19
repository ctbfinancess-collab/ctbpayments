export type Environment = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  nodeEnv: Environment;
  host: string;
  port: number;
  apiVersion: string;
  logLevel: string;
  corsOrigins: string[];
  adminApiToken: string | undefined;
  databaseUrl: string | undefined;
  adminSessionSecret: string | undefined;
  sandboxCardEncryptionKey: string | undefined;
}

const environments = new Set<Environment>(['development', 'test', 'staging', 'production']);

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawEnvironment = source.NODE_ENV ?? 'development';
  if (!environments.has(rawEnvironment as Environment)) throw new Error('NODE_ENV must be development, test, staging, or production');

  const port = Number(source.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

  const defaultHost = rawEnvironment === 'production' ? '127.0.0.1' : '0.0.0.0';
  const host = source.HOST?.trim() || defaultHost;
  if (!/^[A-Za-z0-9.:-]+$/.test(host)) throw new Error('HOST must be a valid hostname or IP address');

  const apiVersion = source.API_VERSION ?? 'v1';
  if (!/^v[1-9][0-9]*$/.test(apiVersion)) throw new Error('API_VERSION must match v<number>');

  // Lista explícita de origens liberadas em staging/production (ver app.ts).
  // Em development/test o CORS continua usando a regex fixa de
  // localhost/127.0.0.1, então esta variável só importa em staging/production.
  const corsOrigins = (source.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  // Token administrativo (não é segredo do Cloudinary) exigido no header
  // X-Admin-Token pelas rotas /admin/media/*. Sem ele, essas rotas ficam
  // indisponíveis (ver requireAdminToken) — nunca há fallback inseguro.
  const adminApiToken = source.ADMIN_API_TOKEN?.trim() || undefined;
  // Sem DATABASE_URL, nenhuma rota que depende de Postgres é registrada
  // (mesmo padrão fail-closed do Cloudinary) — nunca um valor inventado.
  const databaseUrl = source.DATABASE_URL?.trim() || undefined;
  // Assina/deriva o hash do token de sessão do admin (ver adminAuthService).
  // Sem ele, login real fica indisponível.
  const adminSessionSecret = source.ADMIN_SESSION_SECRET?.trim() || undefined;
  // Criptografa PAN completo/CVV do cartão virtual SANDBOX (ver
  // security/cardEncryption.ts). Sem ela, criar/revelar cartão virtual
  // falha fechado (PROVIDER_NOT_CONFIGURED) em vez de guardar em texto puro.
  const sandboxCardEncryptionKey = source.SANDBOX_CARD_ENCRYPTION_KEY?.trim() || undefined;

  return {
    nodeEnv: rawEnvironment as Environment, host, port, apiVersion, logLevel: source.LOG_LEVEL ?? 'info', corsOrigins,
    adminApiToken, databaseUrl, adminSessionSecret, sandboxCardEncryptionKey,
  };
}
