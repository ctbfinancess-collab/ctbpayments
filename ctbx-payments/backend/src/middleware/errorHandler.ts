import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../errors/ApiError.js';
import type { CriticalEvent } from '../observability/alerts.js';
import { safeError } from '../observability/logger.js';

function safeDetails(error: ApiError, production: boolean): unknown {
  if (production || error.details === undefined) return undefined;
  return error.details;
}

// Erros do próprio Fastify causados pelo cliente (corpo grande demais,
// formato não aceito, JSON malformado...) mantêm o status 4xx em vez de
// virar um 500 genérico. A mensagem continua genérica.
function fromFastifyClientError(error: FastifyError): ApiError | undefined {
  if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') return new ApiError('REQUEST_TOO_LARGE', 'O arquivo passa do limite permitido (10 MB).', { statusCode: 413 });
  if (error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') return new ApiError('UNSUPPORTED_MEDIA_TYPE', 'Formato de envio não aceito.', { statusCode: 415 });
  if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
    return new ApiError('BAD_REQUEST', 'A requisição não pôde ser processada.', { statusCode: error.statusCode });
  }
  return undefined;
}

export function registerErrorHandler(app: FastifyInstance, production: boolean, onCritical?: (event: CriticalEvent) => Promise<unknown>): void {
  app.setErrorHandler((error: FastifyError | ApiError, request: FastifyRequest, reply: FastifyReply) => {
    const validation = 'validation' in error && error.validation;
    const normalized = error instanceof ApiError
      ? error
      : validation
        ? new ApiError('VALIDATION_ERROR', 'A requisição contém campos inválidos.', { statusCode: 422, details: validation })
        : fromFastifyClientError(error as FastifyError) ?? new ApiError('INTERNAL_ERROR', 'Não foi possível processar a requisição.', { statusCode: 500 });

    if (normalized.statusCode >= 500) {
      const err = safeError(error);
      request.log.error({ err, code: normalized.code }, 'request failed');
      // 503 "não configurado" é esperado (recurso desligado); o resto alerta.
      if (onCritical && !(normalized.statusCode === 503 && normalized.code.endsWith('NOT_CONFIGURED'))) {
        void onCritical({ kind: 'REQUEST_ERROR', method: request.method, route: request.routeOptions?.url ?? 'rota desconhecida', statusCode: normalized.statusCode, code: normalized.code, type: err.type, requestId: String(request.id) }).catch(() => undefined);
      }
    }
    const details = safeDetails(normalized, production);
    return reply.status(normalized.statusCode).send({
      error: {
        code: normalized.code,
        message: normalized.message,
        retryable: normalized.retryable,
        ...(details === undefined ? {} : { details }),
      },
      requestId: request.id,
    });
  });
}
