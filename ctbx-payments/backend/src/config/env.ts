export type Environment = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  nodeEnv: Environment;
  host: string;
  port: number;
  apiVersion: string;
  logLevel: string;
  corsOrigins: string[];
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

  return { nodeEnv: rawEnvironment as Environment, host, port, apiVersion, logLevel: source.LOG_LEVEL ?? 'info', corsOrigins };
}
