import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError, providerNotConfigured } from '../errors/ApiError.js';

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// NÃO USADO MAIS por nenhuma rota (deixado só de referência) — media/sign e
// media/destroy passaram a exigir requireAdminSession (sessão real de
// admin) em vez do X-Admin-Token provisório. Mantido no repo porque ainda
// pode servir de exemplo de guard "fail closed"; ADMIN_API_TOKEN também
// ficou sem uso — nenhum dos dois é mais necessário para o CMS funcionar.
//
// Protegia (quando em uso) as rotas administrativas de mídia. Falha
// fechado: sem ADMIN_API_TOKEN configurado, a rota nunca ficava
// publicamente acessível — respondia PROVIDER_NOT_CONFIGURED em vez de
// aceitar qualquer chamada.
export function requireAdminToken(expectedToken: string | undefined) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!expectedToken) throw providerNotConfigured('administrativo de mídia');
    const presented = request.headers['x-admin-token'];
    if (typeof presented !== 'string' || !constantTimeEquals(presented, expectedToken)) {
      throw new ApiError('ADMIN_TOKEN_INVALID', 'Token administrativo inválido ou ausente.', { statusCode: 401 });
    }
  };
}
