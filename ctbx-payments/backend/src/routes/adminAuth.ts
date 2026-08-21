import type { FastifyInstance } from 'fastify';
import { ApiError, providerNotConfigured } from '../errors/ApiError.js';
import { ADMIN_SESSION_COOKIE, requireAdminSession } from '../middleware/requireAdminSession.js';
import type { AdminAuthService } from '../services/adminAuthService.js';
import { envelope } from '../utils/envelope.js';
import { emptyObjectSchema, objectSchema } from '../validation/schemas.js';

export interface AdminAuthOptions {
  authService: AdminAuthService | undefined;
  cookieSecure: boolean;
}

const emailSchema = { type: 'string', format: 'email', maxLength: 254 } as const;
const passwordSchema = { type: 'string', minLength: 8, maxLength: 256 } as const;

// Login/logout/sessão do Painel Administrativo. Item 6 do brief: sem
// OAuth/social login, senha com hash seguro (argon2, no service), sessão
// em cookie httpOnly+secure+sameSite, rate limiting no login, logout
// revoga a sessão no banco, expiração checada a cada request.
export async function adminAuthRoutes(app: FastifyInstance, options: AdminAuthOptions): Promise<void> {
  const { authService, cookieSecure } = options;
  const sessionGuard = requireAdminSession(authService);

  app.post('/auth/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: { body: objectSchema(['email', 'password'], { email: emailSchema, password: passwordSchema }) },
  }, async (request, reply) => {
    if (!authService) throw providerNotConfigured('de autenticação administrativa');
    const { email, password } = request.body as { email: string; password: string };
    const result = await authService.login(email, password);
    if (!result) throw new ApiError('ADMIN_LOGIN_INVALID', 'E-mail ou senha inválidos.', { statusCode: 401 });
    reply.setCookie(ADMIN_SESSION_COOKIE, result.token, {
      httpOnly: true, secure: cookieSecure, sameSite: 'lax', path: '/', signed: true, expires: result.expiresAt,
    });
    return envelope(request, { admin: result.admin, expiresAt: result.expiresAt.toISOString() });
  });

  app.post('/auth/logout', { preHandler: sessionGuard, schema: { body: emptyObjectSchema } }, async (request, reply) => {
    const raw = request.cookies[ADMIN_SESSION_COOKIE];
    if (raw) {
      const unsigned = request.unsignCookie(raw);
      if (unsigned.valid && unsigned.value) await authService!.logout(unsigned.value);
    }
    reply.clearCookie(ADMIN_SESSION_COOKIE, { path: '/' });
    return reply.status(204).send();
  });

  app.get('/auth/session', { preHandler: sessionGuard }, async (request) => envelope(request, { admin: request.adminAuth }));
}
