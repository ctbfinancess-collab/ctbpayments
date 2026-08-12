export interface ApiErrorOptions {
  statusCode?: number;
  retryable?: boolean;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(code: string, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = options.statusCode ?? 500;
    this.retryable = options.retryable ?? false;
    if (options.details !== undefined) this.details = options.details;
  }
}

export const providerNotConfigured = (domain: string) =>
  new ApiError('PROVIDER_NOT_CONFIGURED', `O serviço ${domain} ainda não está configurado.`, { statusCode: 503 });
