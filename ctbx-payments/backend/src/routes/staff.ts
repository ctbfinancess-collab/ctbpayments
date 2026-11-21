import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../errors/ApiError.js';
import type { SecurityAuditOutcome, SecurityAuditRepository } from '../repositories/SecurityAuditRepository.js';
import type { KycReviewService } from '../services/kycReviewService.js';
import type { CompanyReviewService } from '../services/companyReviewService.js';
import type { StaffAuthService } from '../services/staffAuthService.js';
import { envelope } from '../utils/envelope.js';
import { emptyObjectSchema, idSchema, objectSchema } from '../validation/schemas.js';

export interface StaffRoutesOptions { auth: StaffAuthService; review: KycReviewService; companyReview: CompanyReviewService; audit: SecurityAuditRepository }

// Toda ação do painel é auditada (inclusive LEITURAS de fichas e documentos),
// com quem fez, sobre qual cliente, IP e resultado. Nunca o conteúdo.
const AUDITED: Record<string, string> = {
  'POST /auth/login': 'STAFF_LOGIN_PASSWORD',
  'POST /auth/mfa': 'STAFF_LOGIN_MFA',
  'POST /auth/logout': 'STAFF_LOGOUT',
  'POST /invites/accept': 'STAFF_INVITE_ACCEPT',
  'POST /invites/confirm': 'STAFF_MFA_ENROLL',
  'GET /users': 'STAFF_USERS_VIEW',
  'POST /users': 'STAFF_USER_INVITE',
  'POST /users/:staffId/disable': 'STAFF_USER_DISABLE',
  'POST /users/:staffId/resend-invite': 'STAFF_USER_INVITE_RESEND',
  'GET /kyc/queue': 'STAFF_KYC_QUEUE_VIEW',
  'GET /kyc/cases/:customerId': 'STAFF_KYC_CASE_VIEW',
  'GET /kyc/cases/:customerId/documents/:documentId': 'STAFF_KYC_DOCUMENT_VIEW',
  'POST /kyc/cases/:customerId/decision': 'STAFF_KYC_DECISION',
  'GET /companies/queue': 'STAFF_COMPANY_QUEUE_VIEW',
  'GET /companies/cases/:companyId': 'STAFF_COMPANY_CASE_VIEW',
  'GET /companies/cases/:companyId/documents/:documentId': 'STAFF_COMPANY_DOCUMENT_VIEW',
  'POST /companies/cases/:companyId/decision': 'STAFF_COMPANY_DECISION',
};

function outcome(status: number): SecurityAuditOutcome {
  if (status === 429 || status === 423 || status === 403) return 'BLOCKED';
  return status < 400 ? 'SUCCESS' : 'FAILURE';
}

const tokenOf = (request: FastifyRequest) => {
  const header = request.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

export async function staffRoutes(app: FastifyInstance, options: StaffRoutesOptions): Promise<void> {
  const { auth, review, companyReview, audit } = options;
  const prefix = app.prefix;

  app.addHook('onResponse', async (request, reply) => {
    const routeUrl = request.routeOptions.url ?? '';
    const route = routeUrl.startsWith(prefix) ? routeUrl.slice(prefix.length) || '/' : routeUrl;
    const event = AUDITED[`${request.method} ${route}`];
    if (!event) return;
    const params = (request.params ?? {}) as Record<string, string>;
    const ua = request.headers['user-agent'];
    try {
      await audit.record({
        event, outcome: outcome(reply.statusCode),
        staffId: request.staffAuth?.id ?? request.auditStaffId ?? null,
        customerId: params.customerId && /^[0-9a-f-]{36}$/i.test(params.customerId) ? params.customerId : null,
        ip: request.ip, userAgent: typeof ua === 'string' ? ua.slice(0, 200) : null, requestId: request.id,
        details: { statusCode: reply.statusCode, ...(params.companyId ? { companyId: params.companyId } : {}), ...(request.auditDetails ?? {}) },
      });
    } catch (error) {
      request.log.error({ event, err: (error as Error).message }, 'falha ao gravar o registro de auditoria');
    }
  });

  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) => new ApiError('STAFF_RATE_LIMITED', `Muitas tentativas. Tente novamente em ${context.after}.`, { statusCode: context.statusCode, retryable: true }),
  });

  const requireStaff = async (request: FastifyRequest) => {
    const token = tokenOf(request);
    if (!token) throw new ApiError('STAFF_AUTH_REQUIRED', 'Entre no painel para continuar.', { statusCode: 401 });
    const staff = await auth.validateSession(token);
    if (!staff) throw new ApiError('STAFF_SESSION_INVALID', 'Sua sessão terminou. Entre novamente.', { statusCode: 401 });
    request.staffAuth = staff;
  };
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    await requireStaff(request);
    if (request.staffAuth?.role !== 'ADMIN') { void reply; throw new ApiError('STAFF_FORBIDDEN', 'Apenas administradores podem fazer isto.', { statusCode: 403 }); }
  };
  const limit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });
  const str = (min: number, max: number) => ({ type: 'string', minLength: min, maxLength: max }) as const;

  // ---- Login em duas etapas ---------------------------------------------
  app.post('/auth/login', { config: limit(5), schema: { body: objectSchema(['email', 'password'], { email: str(3, 254), password: str(1, 256) }) } }, async (request) => {
    const { email, password } = request.body as { email: string; password: string };
    const { mfaToken, staffId } = await auth.login(email, password);
    request.auditStaffId = staffId;
    return envelope(request, { mfaToken });
  });

  app.post('/auth/mfa', { config: limit(5), schema: { body: objectSchema(['mfaToken', 'code'], { mfaToken: str(1, 128), code: str(6, 6) }) } }, async (request) => {
    const { mfaToken, code } = request.body as { mfaToken: string; code: string };
    const result = await auth.verifyMfa(mfaToken, code);
    request.auditStaffId = result.staff.id;
    return envelope(request, { token: result.token, expiresAt: result.expiresAt.toISOString(), staff: result.staff });
  });

  app.post('/auth/logout', { preValidation: requireStaff, schema: { body: emptyObjectSchema } }, async (request, reply) => {
    await auth.logout(tokenOf(request));
    return reply.status(204).send();
  });

  app.get('/auth/session', { preValidation: requireStaff }, async (request) => envelope(request, { staff: request.staffAuth }));

  // ---- Convite e autenticador -------------------------------------------
  app.post('/invites/accept', { config: limit(5), schema: { body: objectSchema(['token', 'password'], { token: str(1, 128), password: str(1, 256) }) } }, async (request) => {
    const { token, password } = request.body as { token: string; password: string };
    return envelope(request, await auth.acceptInvite(token, password));
  });

  app.post('/invites/confirm', { config: limit(5), schema: { body: objectSchema(['enrollmentToken', 'code'], { enrollmentToken: str(1, 128), code: str(6, 6) }) } }, async (request, reply) => {
    const { enrollmentToken, code } = request.body as { enrollmentToken: string; code: string };
    await auth.confirmEnrollment(enrollmentToken, code);
    return reply.status(204).send();
  });

  // ---- Equipe (só ADMIN) ------------------------------------------------
  const staffIdParams = { type: 'object', additionalProperties: false, required: ['staffId'], properties: { staffId: idSchema } } as const;
  app.get('/users', { preValidation: requireAdmin }, async (request) => envelope(request, { users: await auth.listUsers() }));

  app.post('/users', { preValidation: requireAdmin, config: limit(10), schema: { body: objectSchema(['name', 'email', 'role'], { name: str(2, 120), email: str(3, 254), role: { type: 'string', enum: ['ADMIN', 'ANALYST'] } }) } }, async (request, reply) => {
    const input = request.body as { name: string; email: string; role: string };
    request.auditDetails = { role: input.role };
    const user = await auth.invite(input);
    return reply.status(201).send(envelope(request, { user }));
  });

  app.post('/users/:staffId/disable', { preValidation: requireAdmin, schema: { params: staffIdParams, body: emptyObjectSchema } }, async (request, reply) => {
    const { staffId } = request.params as { staffId: string };
    request.auditDetails = { targetStaffId: staffId };
    await auth.disableUser(request.staffAuth!, staffId);
    return reply.status(204).send();
  });

  app.post('/users/:staffId/resend-invite', { preValidation: requireAdmin, config: limit(10), schema: { params: staffIdParams, body: emptyObjectSchema } }, async (request, reply) => {
    const { staffId } = request.params as { staffId: string };
    request.auditDetails = { targetStaffId: staffId };
    await auth.resendInvite(staffId);
    return reply.status(204).send();
  });

  // ---- Análise de KYC (ANALYST e ADMIN) ---------------------------------
  const caseParams = { type: 'object', additionalProperties: false, required: ['customerId'], properties: { customerId: idSchema } } as const;
  app.get('/kyc/queue', { preValidation: requireStaff }, async (request) => envelope(request, { items: await review.queue() }));

  app.get('/kyc/cases/:customerId', { preValidation: requireStaff, schema: { params: caseParams } }, async (request) => {
    const { customerId } = request.params as { customerId: string };
    return envelope(request, { case: await review.caseDetail(customerId) });
  });

  // Documento descriptografado SÓ para visualização: sem cache e inline.
  app.get('/kyc/cases/:customerId/documents/:documentId', {
    preValidation: requireStaff,
    config: limit(60),
    schema: { params: { type: 'object', additionalProperties: false, required: ['customerId', 'documentId'], properties: { customerId: idSchema, documentId: idSchema } } },
  }, async (request, reply) => {
    const { customerId, documentId } = request.params as { customerId: string; documentId: string };
    const doc = await review.openDocument(customerId, documentId);
    request.auditDetails = { documentId, kind: doc.kind };
    return reply
      .header('Content-Type', doc.contentType)
      .header('Cache-Control', 'no-store, private')
      .header('Pragma', 'no-cache')
      .header('Content-Disposition', 'inline')
      .header('Content-Security-Policy', "default-src 'none'; sandbox")
      .send(doc.bytes);
  });

  app.post('/kyc/cases/:customerId/decision', {
    preValidation: requireStaff,
    config: limit(20),
    schema: { params: caseParams, body: objectSchema(['decision'], { decision: { type: 'string', enum: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] }, reason: { type: 'string', maxLength: 1000 } }) },
  }, async (request) => {
    const { customerId } = request.params as { customerId: string };
    const { decision, reason } = request.body as { decision: string; reason?: string };
    const result = await review.decide(request.staffAuth!, customerId, decision, reason);
    // Auditoria: a decisão e se o e-mail saiu — o motivo fica em kyc_reviews.
    request.auditDetails = { decision, notified: result.notified };
    return envelope(request, result);
  });

  // ---- Análise de conta PJ (ANALYST e ADMIN) — Fase 5 ----------------------
  const companyParams = { type: 'object', additionalProperties: false, required: ['companyId'], properties: { companyId: idSchema } } as const;
  app.get('/companies/queue', { preValidation: requireStaff }, async (request) => envelope(request, { items: await companyReview.queue() }));

  app.get('/companies/cases/:companyId', { preValidation: requireStaff, schema: { params: companyParams } }, async (request) => {
    const { companyId } = request.params as { companyId: string };
    return envelope(request, { case: await companyReview.caseDetail(companyId) });
  });

  app.get('/companies/cases/:companyId/documents/:documentId', {
    preValidation: requireStaff,
    config: limit(60),
    schema: { params: { type: 'object', additionalProperties: false, required: ['companyId', 'documentId'], properties: { companyId: idSchema, documentId: idSchema } } },
  }, async (request, reply) => {
    const { companyId, documentId } = request.params as { companyId: string; documentId: string };
    const doc = await companyReview.openDocument(companyId, documentId);
    request.auditDetails = { documentId, kind: doc.kind };
    return reply.header('Content-Type', doc.contentType).header('Cache-Control', 'no-store, private').header('Pragma', 'no-cache')
      .header('Content-Disposition', 'inline').header('Content-Security-Policy', "default-src 'none'; sandbox").send(doc.bytes);
  });

  app.post('/companies/cases/:companyId/decision', {
    preValidation: requireStaff,
    config: limit(20),
    schema: { params: companyParams, body: objectSchema(['decision'], { decision: { type: 'string', enum: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] }, reason: { type: 'string', maxLength: 1000 } }) },
  }, async (request) => {
    const { companyId } = request.params as { companyId: string };
    const { decision, reason } = request.body as { decision: string; reason?: string };
    const result = await companyReview.decide(request.staffAuth!, companyId, decision, reason);
    request.auditDetails = { decision, notified: result.notified };
    return envelope(request, result);
  });
}
