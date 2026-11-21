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
  resendApiKey: string | undefined;
  emailFrom: string | undefined;
  customerAppBaseUrl: string | undefined;
  // Quantos proxies confiáveis existem na frente da API (Railway = 1).
  // Sem isso, atrás de um proxy todo cliente parece ter o mesmo IP e o
  // limite de tentativas por IP vira um bloqueio coletivo.
  trustProxy?: boolean | number;
  // Fase 4 — documentos do KYC. O envio só liga com
  // KYC_DOCUMENT_UPLOADS_ENABLED=true E com bucket + chave configurados.
  // Painel da equipe (análise de KYC). Em produção só liga com
  // STAFF_PANEL_ENABLED=true e a chave do autenticador configurada.
  staff?: { enabled: boolean; appBaseUrl: string | undefined; totpEncryptionKey: string | undefined };
  // Alertas de erro crítico por e-mail (lista separada por vírgula) e o nome
  // do ambiente que aparece no assunto.
  alerts?: { emails: string | undefined; environmentName: string | undefined };
  kyc?: {
    uploadsEnabled: boolean;
    encryptionKey: string | undefined;
    bucket: { endpoint: string; region: string; name: string; accessKeyId: string; secretAccessKey: string; forcePathStyle: boolean } | undefined;
  };
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
  // Envio de e-mail (Resend) — ver providers/createEmailProvider.ts. Ainda
  // não consumido por nenhuma rota (nenhum fluxo real de e-mail existe no
  // produto hoje); só a infraestrutura fica pronta nesta etapa.
  const resendApiKey = source.RESEND_API_KEY?.trim() || undefined;
  const emailFrom = source.EMAIL_FROM?.trim() || undefined;
  // Base do link de verificação de e-mail/recuperação de senha (ex.:
  // https://app.ctbxpayments.com). Ainda não definido — sem domínio
  // decidido, cai num fallback só de desenvolvimento local (ver
  // services/customerEmailVerificationService.ts). Nunca inventado aqui.
  const customerAppBaseUrl = source.CUSTOMER_APP_BASE_URL?.trim() || undefined;

  const rawTrustProxy = source.TRUST_PROXY?.trim().toLowerCase();
  const trustProxy: boolean | number = !rawTrustProxy || rawTrustProxy === 'false' || rawTrustProxy === '0'
    ? false
    : rawTrustProxy === 'true' ? true : Number(rawTrustProxy);
  if (typeof trustProxy === 'number' && (!Number.isInteger(trustProxy) || trustProxy < 1)) throw new Error('TRUST_PROXY must be true, false or a positive integer');

  const bucketVars = [source.KYC_BUCKET_ENDPOINT, source.KYC_BUCKET_NAME, source.KYC_BUCKET_ACCESS_KEY_ID, source.KYC_BUCKET_SECRET_ACCESS_KEY].map((v) => v?.trim() || undefined);
  const kyc = {
    uploadsEnabled: source.KYC_DOCUMENT_UPLOADS_ENABLED?.trim().toLowerCase() === 'true',
    encryptionKey: source.KYC_DOCUMENT_ENCRYPTION_KEY?.trim() || undefined,
    bucket: bucketVars.every(Boolean)
      ? { endpoint: bucketVars[0]!, name: bucketVars[1]!, accessKeyId: bucketVars[2]!, secretAccessKey: bucketVars[3]!, region: source.KYC_BUCKET_REGION?.trim() || 'auto', forcePathStyle: source.KYC_BUCKET_URL_STYLE?.trim().toLowerCase() === 'path' }
      : undefined,
  };

  const staff = {
    enabled: source.STAFF_PANEL_ENABLED?.trim().toLowerCase() === 'true',
    appBaseUrl: source.STAFF_APP_BASE_URL?.trim() || undefined,
    totpEncryptionKey: source.STAFF_TOTP_ENCRYPTION_KEY?.trim() || undefined,
  };

  const alerts = { emails: source.ALERT_EMAILS?.trim() || undefined, environmentName: source.ALERT_ENVIRONMENT_NAME?.trim() || source.RAILWAY_ENVIRONMENT_NAME?.trim() || undefined };

  return {
    kyc,
    staff,
    alerts,
    nodeEnv: rawEnvironment as Environment, host, port, apiVersion, logLevel: source.LOG_LEVEL ?? 'info', corsOrigins,
    adminApiToken, databaseUrl, adminSessionSecret, sandboxCardEncryptionKey, resendApiKey, emailFrom, customerAppBaseUrl, trustProxy,
  };
}
