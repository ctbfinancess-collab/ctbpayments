import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError, providerNotConfigured } from '../errors/ApiError.js';
import type { AdminAuthService } from '../services/adminAuthService.js';

export const ADMIN_SESSION_COOKIE = 'ctbx_admin_session';

// Protege as rotas de escrita do CMS (item 6 do brief: "TODAS as rotas de
// escrita do CMS"). Fail closed: sem authService configurado (sem
// DATABASE_URL/ADMIN_SESSION_SECRET), a rota nunca fica aberta — responde
// PROVIDER_NOT_CONFIGURED em vez de aceitar qualquer chamada.
export function requireAdminSession(authService: AdminAuthService | undefined) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!authService) throw providerNotConfigured('de autenticação administrativa');
    const raw = request.cookies[ADMIN_SESSION_COOKIE];
    if (!raw) throw new ApiError('ADMIN_SESSION_REQUIRED', 'Sessão administrativa obrigatória.', { statusCode: 401 });
    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) {
      throw new ApiError('ADMIN_SESSION_INVALID', 'Sessão administrativa inválida.', { statusCode: 401 });
    }
    const admin = await authService.validateSession(unsigned.value);
    if (!admin) throw new ApiError('ADMIN_SESSION_INVALID', 'Sessão administrativa inválida ou expirada.', { statusCode: 401 });
    request.adminAuth = admin;
  };
}
