import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../errors/ApiError.js';

function safeDetails(error: ApiError, production: boolean): unknown {
  if (production || error.details === undefined) return undefined;
  return error.details;
}

export function registerErrorHandler(app: FastifyInstance, production: boolean): void {
  app.setErrorHandler((error: FastifyError | ApiError, request: FastifyRequest, reply: FastifyReply) => {
    const validation = 'validation' in error && error.validation;
    const normalized = error instanceof ApiError
      ? error
      : validation
        ? new ApiError('VALIDATION_ERROR', 'A requisição contém campos inválidos.', { statusCode: 422, details: validation })
        : new ApiError('INTERNAL_ERROR', 'Não foi possível processar a requisição.', { statusCode: 500 });

    if (normalized.statusCode >= 500) request.log.error({ err: error, code: normalized.code }, 'request failed');
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
