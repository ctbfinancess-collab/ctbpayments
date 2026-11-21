import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../errors/ApiError.js';
import type { SecurityAuditOutcome, SecurityAuditRepository } from '../repositories/SecurityAuditRepository.js';
import type { KycReviewService } from '../services/kycReviewService.js';
import type { CompanyReviewService } from '../services/companyReviewService.js';
import type { StaffCustomerService } from '../services/staffCustomerService.js';
import type { StaffAuthService } from '../services/staffAuthService.js';
import { safeError } from '../observability/logger.js';
import { envelope } from '../utils/envelope.js';
import { emptyObjectSchema, idSchema, objectSchema } from '../validation/schemas.js';
import type { LgpdService } from '../services/lgpdService.js';
import type { PanelReportsService } from '../services/panelReportsService.js';

export interface StaffRoutesOptions { auth: StaffAuthService; review: KycReviewService; companyReview: CompanyReviewService; staffCustomers: StaffCustomerService; audit: SecurityAuditRepository; lgpd: LgpdService; reports: PanelReportsService }

// Toda ação do painel é auditada (inclusive LEITURAS de fichas e documentos),
// com quem fez, sobre qual cliente, IP e resultado. Nunca o conteúdo.
const AUDITED: Record<string, string> = {
  'POST /auth/login': 'STAFF_LOGIN_PASSWORD',
  'POST /auth/mfa': 'STAFF_LOGIN_MFA',
  'POST /auth/logout': 'STAFF_LOGOUT',
  'POST /auth/password/forgot': 'STAFF_PASSWORD_RESET_REQUEST',
  'POST /auth/password/reset': 'STAFF_PASSWORD_RESET',
  'POST /invites/accept': 'STAFF_INVITE_ACCEPT',
  'POST /invites/confirm': 'STAFF_MFA_ENROLL',
  'GET /users': 'STAFF_USERS_VIEW',
  'POST /users': 'STAFF_USER_INVITE',
  'POST /users/:staffId/disable': 'STAFF_USER_DISABLE',
  'POST /users/:staffId/resend-invite': 'STAFF_USER_INVITE_RESEND',
  'POST /users/:staffId/reset-access': 'STAFF_USER_ACCESS_RESET',
  'GET /kyc/queue': 'STAFF_KYC_QUEUE_VIEW',
  'GET /kyc/cases/:customerId': 'STAFF_KYC_CASE_VIEW',
  'GET /kyc/cases/:customerId/documents/:documentId': 'STAFF_KYC_DOCUMENT_VIEW',
  'POST /kyc/cases/:customerId/decision': 'STAFF_KYC_DECISION',
  'GET /companies/queue': 'STAFF_COMPANY_QUEUE_VIEW',
  'GET /companies/cases/:companyId': 'STAFF_COMPANY_CASE_VIEW',
  'GET /companies/cases/:companyId/documents/:documentId': 'STAFF_COMPANY_DOCUMENT_VIEW',
  'POST /companies/cases/:companyId/decision': 'STAFF_COMPANY_DECISION',
  'GET /overview': 'STAFF_OVERVIEW_VIEW',
  'GET /dashboard': 'STAFF_DASHBOARD_VIEW',
  'GET /customers': 'STAFF_CUSTOMER_SEARCH',
  'GET /customers/:customerId': 'STAFF_CUSTOMER_VIEW',
  'POST /customers/:customerId/block': 'STAFF_CUSTOMER_BLOCK',
  'POST /customers/:customerId/unblock': 'STAFF_CUSTOMER_UNBLOCK',
  'POST /customers/:customerId/revoke-sessions': 'STAFF_CUSTOMER_SESSIONS_REVOKE',
  'GET /audit': 'STAFF_AUDIT_VIEW',
  'GET /lgpd/requests': 'STAFF_LGPD_LIST',
  'POST /lgpd/requests': 'STAFF_LGPD_CREATE',
  'GET /lgpd/requests/:requestId': 'STAFF_LGPD_VIEW',
  'POST /lgpd/requests/:requestId/update': 'STAFF_LGPD_UPDATE',
  'POST /lgpd/requests/:requestId/close': 'STAFF_LGPD_CLOSE',
  'GET /reports/monthly': 'STAFF_REPORTS_VIEW',
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
  const { auth, review, companyReview, staffCustomers, audit, lgpd, reports } = options;
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
        customerId: params.customerId && /^[0-9a-f-]{36}$/i.test(params.customerId) ? params.customerId : (request.auditCustomerId ?? null),
        ip: request.ip, userAgent: typeof ua === 'string' ? ua.slice(0, 200) : null, requestId: request.id,
        details: { statusCode: reply.statusCode, ...(params.companyId ? { companyId: params.companyId } : {}), ...(request.auditDetails ?? {}) },
      });
    } catch (error) {
      request.log.error({ event, err: safeError(error) }, 'falha ao gravar o registro de auditoria');
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

  // ---- Senha esquecida (com o autenticador em mãos) -----------------------
  // Resposta sempre igual (202), exista ou não o e-mail na equipe.
  app.post('/auth/password/forgot', { config: limit(3), schema: { body: objectSchema(['email'], { email: str(3, 254) }) } }, async (request, reply) => {
    const { email } = request.body as { email: string };
    const { staffId } = await auth.requestPasswordReset(email);
    if (staffId) request.auditStaffId = staffId;
    return reply.status(202).send(envelope(request, { message: 'Se este e-mail for de alguém da equipe, enviamos um link para redefinir a senha. Ele vale por 30 minutos.' }));
  });

  app.post('/auth/password/reset', { config: limit(5), schema: { body: objectSchema(['token', 'password', 'code'], { token: str(1, 128), password: str(1, 256), code: str(6, 6) }) } }, async (request, reply) => {
    const { token, password, code } = request.body as { token: string; password: string; code: string };
    const { staffId } = await auth.resetPassword(token, password, code);
    request.auditStaffId = staffId;
    return reply.status(204).send();
  });

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

  // Redefinição de acesso por outro administrador (celular perdido): exige
  // o código do autenticador de quem redefine e o motivo, que fica na
  // auditoria e vai no aviso aos administradores.
  app.post('/users/:staffId/reset-access', { preValidation: requireAdmin, config: limit(3), schema: { params: staffIdParams, body: objectSchema(['reason', 'code'], { reason: str(1, 600), code: str(6, 6) }) } }, async (request) => {
    const { staffId } = request.params as { staffId: string };
    const { reason, code } = request.body as { reason: string; code: string };
    request.auditDetails = { targetStaffId: staffId, reason: reason.trim().slice(0, 500) };
    const result = await auth.resetAccess(request.staffAuth!, staffId, reason, code);
    request.auditDetails = { ...request.auditDetails, linkEmailed: result.linkEmailed, notifiedAdmins: result.notifiedAdmins };
    return envelope(request, result);
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

  // ---- Painel administrativo (Fase 6) -------------------------------------
  app.get('/overview', { preValidation: requireStaff }, async (request) => envelope(request, { overview: await staffCustomers.overview() }));
  app.get('/dashboard', { preValidation: requireStaff }, async (request) => envelope(request, { dashboard: await staffCustomers.dashboard() }));
  // Contadores do menu: só números, consultados a cada página; sem auditoria.
  app.get('/badges', { preValidation: requireStaff }, async (request) => {
    const base = await staffCustomers.badges();
    return envelope(request, { badges: request.staffAuth?.role === 'ADMIN' ? { ...base, lgpd: await lgpd.counts() } : base });
  });

  // Etapa D — solicitações de titulares (LGPD) e relatório mensal. Só
  // administradores. A auditoria registra o protocolo, nunca o conteúdo.
  const lgpdParams = { type: 'object', additionalProperties: false, required: ['requestId'], properties: { requestId: idSchema } } as const;
  const lstr = (max: number) => ({ type: 'string', maxLength: max }) as const;
  app.get('/lgpd/requests', { preValidation: requireAdmin, config: limit(60), schema: { querystring: { type: 'object', additionalProperties: false, properties: { filter: { type: 'string', enum: ['open', 'closed', 'all'] } } } } }, async (request) => {
    const filter = ((request.query as { filter?: 'open' | 'closed' | 'all' }).filter) ?? 'open';
    request.auditDetails = { filter };
    return envelope(request, { requests: await lgpd.list(filter) });
  });
  app.post('/lgpd/requests', {
    preValidation: requireAdmin, config: limit(20),
    schema: { body: { type: 'object', additionalProperties: false, required: ['right', 'channel', 'requesterName', 'requesterContact', 'description', 'receivedAt'], properties: { right: lstr(40), channel: lstr(10), requesterName: lstr(200), requesterContact: lstr(240), description: lstr(2200), receivedAt: lstr(40), customerLookup: lstr(200) } } },
  }, async (request, reply) => {
    const created = await lgpd.create(request.staffAuth!, request.body as Parameters<LgpdService['create']>[1]);
    request.auditDetails = { protocol: created.protocol, right: created.right, linkedCustomer: created.linkedCustomer };
    const full = await lgpd.detail(created.id);
    if (full.customer) request.auditCustomerId = full.customer.id;
    reply.code(201);
    return envelope(request, { request: full });
  });
  app.get('/lgpd/requests/:requestId', { preValidation: requireAdmin, config: limit(60), schema: { params: lgpdParams } }, async (request) => {
    const r = await lgpd.detail((request.params as { requestId: string }).requestId);
    request.auditDetails = { protocol: r.protocol };
    if (r.customer) request.auditCustomerId = r.customer.id;
    return envelope(request, { request: r });
  });
  app.post('/lgpd/requests/:requestId/update', {
    preValidation: requireAdmin, config: limit(30),
    schema: { params: lgpdParams, body: { type: 'object', additionalProperties: false, properties: { note: lstr(2200), inProgress: { type: 'boolean' }, identityVerified: { type: 'boolean' } } } },
  }, async (request) => {
    const body = request.body as { note?: string; inProgress?: boolean; identityVerified?: boolean };
    const r = await lgpd.update(request.staffAuth!, (request.params as { requestId: string }).requestId, body);
    request.auditDetails = { protocol: r.protocol, note: Boolean(body.note?.trim()), inProgress: body.inProgress === true, identityVerified: body.identityVerified === true };
    if (r.customer) request.auditCustomerId = r.customer.id;
    return envelope(request, { request: r });
  });
  app.post('/lgpd/requests/:requestId/close', {
    preValidation: requireAdmin, config: limit(10),
    schema: { params: lgpdParams, body: { type: 'object', additionalProperties: false, required: ['outcome', 'response'], properties: { outcome: lstr(20), response: lstr(4200) } } },
  }, async (request) => {
    const r = await lgpd.close(request.staffAuth!, (request.params as { requestId: string }).requestId, request.body as { outcome: string; response: string });
    request.auditDetails = { protocol: r.protocol, outcome: r.status, onTime: !r.overdue };
    if (r.customer) request.auditCustomerId = r.customer.id;
    return envelope(request, { request: r });
  });
  app.get('/reports/monthly', { preValidation: requireAdmin, config: limit(30) }, async (request) => envelope(request, { report: await reports.monthly(12) }));

  // Busca: o termo pesquisado (nome, e-mail ou CPF) NUNCA vai para a
  // auditoria — só o tipo de busca e quantos resultados vieram.
  app.get('/customers', {
    preValidation: requireStaff,
    config: limit(60),
    schema: { querystring: { type: 'object', additionalProperties: false, required: ['q'], properties: { q: { type: 'string', minLength: 1, maxLength: 120 } } } },
  }, async (request) => {
    const { q } = request.query as { q: string };
    const items = await staffCustomers.search(q);
    request.auditDetails = { kind: /\d{11}/.test(q.replace(/\D/g, '')) && !/[a-z@]/i.test(q) ? 'cpf' : q.includes('@') ? 'email' : 'name', results: items.length };
    return envelope(request, { items });
  });

  const customerParams = { type: 'object', additionalProperties: false, required: ['customerId'], properties: { customerId: idSchema } } as const;
  app.get('/customers/:customerId', { preValidation: requireStaff, schema: { params: customerParams } }, async (request) => {
    const { customerId } = request.params as { customerId: string };
    return envelope(request, { customer: await staffCustomers.detail(customerId, { fullIp: request.staffAuth?.role === 'ADMIN' }) });
  });

  for (const [action, blocked] of [['block', true], ['unblock', false]] as const) {
    app.post(`/customers/:customerId/${action}`, {
      preValidation: requireAdmin,
      config: limit(20),
      schema: { params: customerParams, body: objectSchema(['reason'], { reason: { type: 'string', minLength: 1, maxLength: 500 } }) },
    }, async (request) => {
      const { customerId } = request.params as { customerId: string };
      const result = await staffCustomers.setBlocked(request.staffAuth!, customerId, blocked, (request.body as { reason: string }).reason);
      request.auditDetails = { notified: result.notified };
      return envelope(request, result);
    });
  }

  app.post('/customers/:customerId/revoke-sessions', { preValidation: requireAdmin, config: limit(20), schema: { params: customerParams, body: emptyObjectSchema } }, async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    await staffCustomers.revokeSessions(customerId);
    return reply.status(204).send();
  });

  // Trilha de auditoria (só ADMIN). Consultar a trilha também é auditado.
  app.get('/audit', {
    preValidation: requireAdmin,
    config: limit(60),
    schema: { querystring: { type: 'object', additionalProperties: false, properties: { event: { type: 'string', maxLength: 80 }, customerId: idSchema, staffId: idSchema, from: { type: 'string', maxLength: 40 }, to: { type: 'string', maxLength: 40 }, before: { type: 'string', maxLength: 40 } } } },
  }, async (request) => {
    const filters = request.query as Record<string, string>;
    // Registra QUAL filtro foi usado (o tipo de evento não é dado pessoal) e se
    // a consulta foi sobre um cliente específico — nunca quem.
    request.auditDetails = { filter: filters.event || 'todos', byCustomer: Boolean(filters.customerId) };
    return envelope(request, { events: await staffCustomers.auditLog(filters) });
  });
}
