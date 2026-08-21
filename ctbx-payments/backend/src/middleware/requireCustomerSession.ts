import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../errors/ApiError.js';
import type { CustomerAuthService } from '../services/customerAuthService.js';

// Protege rotas que exigem cliente autenticado (Bearer token, mesmo
// padrão do app cliente sandbox — ver middleware/authenticate.ts).
// Diferente do admin (cookie), aqui é Bearer porque é a mesma API
// consumida pelo app mobile. Nunca fail-closed por falta de banco — esse
// serviço sempre existe (Postgres ou InMemory, ver app.ts).
export function requireCustomerSession(customerAuthService: CustomerAuthService) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new ApiError('CUSTOMER_AUTH_REQUIRED', 'Autenticação obrigatória.', { statusCode: 401 });
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) throw new ApiError('CUSTOMER_AUTH_REQUIRED', 'Autenticação obrigatória.', { statusCode: 401 });
    const customer = await customerAuthService.validateSession(token);
    if (!customer) throw new ApiError('CUSTOMER_SESSION_INVALID', 'Sessão inválida ou expirada.', { statusCode: 401 });
    request.customerAuth = customer;
  };
}
