import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { ApiError, providerNotConfigured } from '../errors/ApiError.js';
import { requireCustomerSession } from '../middleware/requireCustomerSession.js';
import type { CompanyService } from '../services/companyService.js';
import type { CustomerAuthService } from '../services/customerAuthService.js';
import { LEGAL_TERMS_VERSION } from '../services/customerAuthService.js';
import type { CustomerEmailChangeService } from '../services/customerEmailChangeService.js';
import type { CustomerEmailVerificationService } from '../services/customerEmailVerificationService.js';
import { DOCUMENT_KINDS, ID_DOCUMENT_TYPES, INCOME_RANGES, MAX_DOCUMENT_BYTES, type CustomerKycService } from '../services/customerKycService.js';
import { COMPANY_DOCUMENT_KINDS, COMPANY_POSITIONS, COMPANY_REVENUE_RANGES } from '../services/companyService.js';
import type { CustomerPasswordResetService } from '../services/customerPasswordResetService.js';
import type { SecurityAuditOutcome, SecurityAuditRepository } from '../repositories/SecurityAuditRepository.js';
import { envelope } from '../utils/envelope.js';
import { emptyObjectSchema, idSchema, objectSchema } from '../validation/schemas.js';

export interface CustomerRoutesOptions {
  customerAuthService: CustomerAuthService | undefined;
  emailVerificationService: CustomerEmailVerificationService | undefined;
  passwordResetService: CustomerPasswordResetService | undefined;
  emailChangeService: CustomerEmailChangeService | undefined;
  companyService: CompanyService | undefined;
  kycService: CustomerKycService | undefined;
  audit?: SecurityAuditRepository | undefined;
}

const nameSchema = { type: 'string', minLength: 1, maxLength: 160 } as const;
const documentSchema = { type: 'string', minLength: 11, maxLength: 14 } as const; // CPF com ou sem máscara
const emailSchema = { type: 'string', format: 'email', maxLength: 254 } as const;
const phoneSchema = { type: 'string', minLength: 8, maxLength: 20 } as const;
const passwordSchema = { type: 'string', minLength: 8, maxLength: 256 } as const;
const tokenSchema = { type: 'string', minLength: 1, maxLength: 512 } as const;
const cnpjSchema = { type: 'string', minLength: 14, maxLength: 18 } as const; // CNPJ com ou sem máscara
const companyIdParams = { type: 'object', additionalProperties: false, required: ['companyId'], properties: { companyId: idSchema } } as const;
const birthDateSchema = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } as const; // YYYY-MM-DD
const kycFreeTextSchema = { type: 'string', minLength: 2, maxLength: 160 } as const;

// Registro de auditoria (Fase 2): quais ações deste escopo são gravadas.
// GETs (só leitura) ficam de fora. A chave é "MÉTODO rota".
const AUDITED_ROUTES: Record<string, string> = {
  'POST /register': 'CUSTOMER_REGISTER',
  'POST /login': 'CUSTOMER_LOGIN',
  'POST /logout': 'CUSTOMER_LOGOUT',
  'POST /password/change': 'CUSTOMER_PASSWORD_CHANGE',
  'POST /verify-email': 'CUSTOMER_EMAIL_VERIFY',
  'POST /verify-email/resend': 'CUSTOMER_EMAIL_VERIFY_RESEND_REQUEST',
  'POST /password/forgot': 'CUSTOMER_PASSWORD_RESET_REQUEST',
  'POST /password/reset': 'CUSTOMER_PASSWORD_RESET',
  'POST /email/change': 'CUSTOMER_EMAIL_CHANGE_REQUEST',
  'POST /email/change/confirm': 'CUSTOMER_EMAIL_CHANGE',
  'PUT /kyc/personal-info': 'CUSTOMER_KYC_PERSONAL_INFO_UPDATE',
  'PUT /kyc/address': 'CUSTOMER_KYC_ADDRESS_UPDATE',
  'PUT /kyc/declarations': 'CUSTOMER_KYC_DECLARATIONS_UPDATE',
  'PUT /kyc/document-type': 'CUSTOMER_KYC_DOCUMENT_TYPE_UPDATE',
  'POST /kyc/documents/:kind': 'CUSTOMER_KYC_DOCUMENT_UPLOAD',
  'POST /kyc/submit': 'CUSTOMER_KYC_SUBMIT',
  'POST /kyc/withdraw': 'CUSTOMER_KYC_WITHDRAW',
  'POST /companies': 'COMPANY_APPLICATION_CREATE',
  'PUT /companies/:companyId/data': 'COMPANY_DATA_UPDATE',
  'PUT /companies/:companyId/address': 'COMPANY_ADDRESS_UPDATE',
  'POST /companies/:companyId/documents/:kind': 'COMPANY_DOCUMENT_UPLOAD',
  'POST /companies/:companyId/submit': 'COMPANY_SUBMIT',
  'POST /companies/:companyId/withdraw': 'COMPANY_WITHDRAW',
};

function auditOutcome(statusCode: number, event: string): SecurityAuditOutcome {
  if (statusCode === 429) return 'BLOCKED';
  if (statusCode === 403 && event === 'CUSTOMER_LOGIN') return 'BLOCKED'; // e-mail não confirmado
  return statusCode < 400 ? 'SUCCESS' : 'FAILURE';
}

// Cadastro + login + verificação de e-mail reais de cliente PF — Customer
// Identity, Etapas 1, 2, 2.5 e 3. Rotas novas e isoladas (/v1/customers/*),
// não tocam em /v1/auth/login (SandboxAuthProvider, credencial fixa
// DEMO_ONLY) nem em nenhuma outra rota existente.
export async function customerRoutes(app: FastifyInstance, options: CustomerRoutesOptions): Promise<void> {
  const { customerAuthService, emailVerificationService, passwordResetService, emailChangeService, companyService, kycService } = options;
  // Auditoria: grava DEPOIS da resposta enviada, então uma falha aqui
  // nunca afeta o cliente. Nunca grava corpo, senha, token, e-mail nem CPF.
  if (options.audit) {
    const audit = options.audit;
    const prefix = app.prefix;
    app.addHook('onResponse', async (request, reply) => {
      const routeUrl = request.routeOptions.url ?? '';
      const route = routeUrl.startsWith(prefix) ? routeUrl.slice(prefix.length) || '/' : routeUrl;
      const event = AUDITED_ROUTES[`${request.method} ${route}`];
      if (!event) return;
      const userAgent = request.headers['user-agent'];
      try {
        await audit.record({
          event,
          outcome: auditOutcome(reply.statusCode, event),
          customerId: request.customerAuth?.id ?? request.auditCustomerId ?? null,
          ip: request.ip,
          userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 200) : null,
          requestId: request.id,
          details: { statusCode: reply.statusCode, ...(request.auditDetails ?? {}) },
        });
      } catch (error) {
        request.log.error({ event, err: (error as Error).message }, 'falha ao gravar o registro de auditoria');
      }
    });
  }

  const sessionGuard = customerAuthService ? requireCustomerSession(customerAuthService) : async () => { throw providerNotConfigured('de autenticação de clientes'); };

  // Etapa 2.5, item 1 — rate limiting só neste escopo (/v1/customers),
  // mesmo padrão de isolamento já usado pelo painel admin (global:false —
  // não afeta nenhuma outra rota, incluindo o login sandbox).
  // @fastify/rate-limit faz `throw errorResponseBuilder(...)` quando o
  // limite estoura — devolvendo um ApiError aqui, o setErrorHandler
  // global já existente cuida do resto sozinho, no MESMO formato de todo
  // erro desta API. O código varia por rota (login vs. reenvio de
  // verificação) pra cada mensagem continuar fazendo sentido.
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (request, context) => {
      const code = request.url.includes('/kyc') || request.url.includes('/companies')
        ? 'CUSTOMER_KYC_RATE_LIMITED'
        : request.url.includes('/register')
        ? 'CUSTOMER_REGISTER_RATE_LIMITED'
        : request.url.includes('/verify-email')
        ? 'CUSTOMER_VERIFY_EMAIL_RATE_LIMITED'
        : request.url.includes('/password/change')
          ? 'CUSTOMER_PASSWORD_CHANGE_RATE_LIMITED'
          : request.url.includes('/password/')
            ? 'CUSTOMER_PASSWORD_RESET_RATE_LIMITED'
            : request.url.includes('/email/change')
              ? 'CUSTOMER_EMAIL_CHANGE_RATE_LIMITED'
              : 'CUSTOMER_LOGIN_RATE_LIMITED';
      return new ApiError(code, `Muitas tentativas. Tente novamente em ${context.after}.`, { statusCode: context.statusCode, retryable: true });
    },
  });

  // Cadastro: 3 por minuto e 20 por hora por IP (dificulta testar CPFs em
  // massa). A resposta é SEMPRE a mesma (202), tenha ou não sido criada uma
  // conta nova — nunca revela se o e-mail ou o CPF já estão cadastrados.
  app.post('/register', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      body: objectSchema(['name', 'document', 'email', 'phone', 'password', 'acceptTerms'], {
        name: nameSchema, document: documentSchema, email: emailSchema, phone: phoneSchema, password: passwordSchema, acceptTerms: { type: 'boolean' },
      }),
    },
  }, async (request, reply) => {
    if (!customerAuthService) throw providerNotConfigured('de cadastro de clientes');
    const input = request.body as { name: string; document: string; email: string; phone: string; password: string; acceptTerms: boolean };
    const { customer } = await customerAuthService.register(input);
    // Só para auditoria interna — a resposta continua idêntica nos dois casos.
    request.auditDetails = { accountCreated: Boolean(customer), termsVersion: LEGAL_TERMS_VERSION };
    if (customer) request.auditCustomerId = customer.id;
    // Conta nova: dispara a verificação de e-mail. Falha de envio nunca
    // derruba o cadastro (o reenvio cobre esse caso).
    if (customer && emailVerificationService) await emailVerificationService.sendVerification(customer.id).catch(() => undefined);
    return reply.status(202).send(envelope(request, {
      message: 'Se os dados estiverem corretos, enviamos um link de confirmação para o seu e-mail. Se você já tem conta, entre ou use "Esqueci minha senha".',
    }));
  });

  // Item 1 — 5 tentativas por minuto por IP, mesmo teto já usado no login
  // do admin. Não distingue e-mail existente/inexistente na contagem (a
  // chave padrão do plugin é por IP, não por e-mail) — continua sem
  // revelar nada sobre qual conta existe.
  app.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: { body: objectSchema(['email', 'password'], { email: emailSchema, password: { type: 'string', minLength: 1, maxLength: 256 } }) },
  }, async (request) => {
    if (!customerAuthService) throw providerNotConfigured('de autenticação de clientes');
    const { email, password } = request.body as { email: string; password: string };
    // Auditoria interna: em toda falha (senha errada, e-mail não confirmado,
    // conta suspensa) registra DE QUAL conta foi a tentativa, se o e-mail
    // existir. A busca acontece em todos os casos (exista ou não), e a
    // resposta ao cliente continua idêntica — nada é revelado.
    const markAttempt = async () => { const id = await customerAuthService.findIdByEmail(email); if (id) request.auditCustomerId = id; };
    let result;
    try { result = await customerAuthService.login(email, password); }
    catch (error) { await markAttempt(); throw error; }
    // Mesma mensagem/código pra e-mail inexistente e senha errada — nunca
    // revela qual dos dois falhou.
    if (!result) { await markAttempt(); throw new ApiError('CUSTOMER_LOGIN_INVALID', 'E-mail ou senha inválidos.', { statusCode: 401 }); }
    request.auditCustomerId = result.customer.id;
    return envelope(request, { token: result.token, expiresAt: result.expiresAt.toISOString(), customer: result.customer });
  });

  app.post('/logout', { preHandler: sessionGuard, schema: { body: emptyObjectSchema } }, async (request, reply) => {
    if (!customerAuthService) throw providerNotConfigured('de autenticação de clientes');
    const token = request.headers.authorization!.slice('Bearer '.length).trim();
    await customerAuthService.logout(token);
    return reply.status(204).send();
  });

  // Item 5 — identidade vem SOMENTE de request.customerAuth (populado
  // pelo middleware a partir do token validado); a rota nunca lê query/
  // body/params pra decidir "quem" é o cliente, então não existe
  // parâmetro de customer_id pra um cliente malicioso manipular aqui.
  app.get('/session', { preHandler: sessionGuard }, async (request) => envelope(request, { customer: request.customerAuth }));

  // Painel do cliente (Fase 3): perfil com CPF/telefone mascarados e o
  // status do KYC, numa chamada só. Identidade só do token.
  app.get('/me', { preHandler: sessionGuard }, async (request) => {
    if (!customerAuthService) throw providerNotConfigured('de autenticação de clientes');
    const profile = await customerAuthService.getProfile(request.customerAuth!.id);
    const kycStatus = kycService ? (await kycService.getPersonalInfo(request.customerAuth!.id)).status : 'NOT_STARTED';
    return envelope(request, { profile, kyc: { status: kycStatus } });
  });

  // Troca de senha autenticada — diferente de /password/reset (aquele é
  // o "esqueci minha senha", sem sessão, via token de e-mail). Rate limit
  // próprio: 5/min por IP, mesmo teto do login (é essencialmente uma
  // reautenticação).
  app.post('/password/change', {
    preHandler: sessionGuard,
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: { body: objectSchema(['currentPassword', 'newPassword'], { currentPassword: { type: 'string', minLength: 1, maxLength: 256 }, newPassword: passwordSchema }) },
  }, async (request) => {
    if (!customerAuthService) throw providerNotConfigured('de autenticação de clientes');
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };
    const result = await customerAuthService.changePassword(request.customerAuth!.id, currentPassword, newPassword);
    return envelope(request, { token: result.token, expiresAt: result.expiresAt.toISOString(), customer: result.customer });
  });

  // Etapa 3 — confirmação do token de verificação (token inválido/
  // expirado/já usado devolvem sempre o mesmo erro genérico).
  app.post('/verify-email', {
    schema: { body: objectSchema(['token'], { token: tokenSchema }) },
  }, async (request, reply) => {
    if (!emailVerificationService) throw providerNotConfigured('de verificação de e-mail');
    const { token } = request.body as { token: string };
    request.auditCustomerId = await emailVerificationService.confirm(token);
    return reply.status(204).send();
  });

  // Etapa 3, itens 5 e 6 — reenvio público (sem exigir sessão, igual
  // "esqueci minha senha"): sempre responde a MESMA mensagem genérica,
  // nunca revela se o e-mail existe, já está verificado, ou está em
  // cooldown (o service trata os três casos em silêncio). Rate limit
  // próprio (3/min por IP) além do cooldown por conta já no service.
  app.post('/verify-email/resend', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: { body: objectSchema(['email'], { email: emailSchema }) },
  }, async (request) => {
    if (!emailVerificationService) throw providerNotConfigured('de verificação de e-mail');
    const { email } = request.body as { email: string };
    await emailVerificationService.resend(email);
    return envelope(request, { message: 'Se este e-mail estiver cadastrado e ainda não verificado, um novo link foi enviado.' });
  });

  // Recuperação de senha — pedido público (sem exigir sessão), mesmo
  // espírito do reenvio de verificação: sempre a MESMA mensagem
  // genérica, nunca revela se o e-mail existe ou está em cooldown (o
  // service trata tudo em silêncio). Rate limit próprio (3/min por IP)
  // além do cooldown por conta já no service.
  app.post('/password/forgot', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: { body: objectSchema(['email'], { email: emailSchema }) },
  }, async (request) => {
    if (!passwordResetService) throw providerNotConfigured('de recuperação de senha');
    const { email } = request.body as { email: string };
    await passwordResetService.requestReset(email);
    return envelope(request, { message: 'Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha.' });
  });

  // Confirmação — token inválido/expirado/já usado devolvem sempre o
  // mesmo erro genérico (mesmo padrão de /verify-email).
  app.post('/password/reset', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: { body: objectSchema(['token', 'password'], { token: tokenSchema, password: passwordSchema }) },
  }, async (request, reply) => {
    if (!passwordResetService) throw providerNotConfigured('de recuperação de senha');
    const { token, password } = request.body as { token: string; password: string };
    request.auditCustomerId = await passwordResetService.confirmReset(token, password);
    return reply.status(204).send();
  });

  // Troca de e-mail autenticada — diferente do resto de Customer Identity
  // (verificação/reset são sempre silenciosos): aqui o cliente já está
  // logado e agindo sobre a PRÓPRIA conta, então erros explícitos (senha
  // errada, e-mail já em uso) fazem sentido, mesmo espírito do /register.
  // O e-mail em customers só muda quando /email/change/confirm é chamado
  // com o token que caiu no NOVO endereço.
  app.post('/email/change', {
    preHandler: sessionGuard,
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: { body: objectSchema(['newEmail', 'currentPassword'], { newEmail: emailSchema, currentPassword: { type: 'string', minLength: 1, maxLength: 256 } }) },
  }, async (request) => {
    if (!emailChangeService) throw providerNotConfigured('de troca de e-mail');
    const { newEmail, currentPassword } = request.body as { newEmail: string; currentPassword: string };
    await emailChangeService.requestChange(request.customerAuth!.id, newEmail, currentPassword);
    return envelope(request, { message: 'Enviamos um link de confirmação para o novo e-mail.' });
  });

  // Confirmação — token inválido/expirado/já usado devolvem sempre o
  // mesmo erro genérico (mesmo padrão de /verify-email). Sem sessão
  // exigida de propósito: o link é clicado a partir da caixa de entrada
  // do NOVO e-mail, que pode estar aberta num dispositivo diferente de
  // onde o pedido foi feito.
  app.post('/email/change/confirm', {
    schema: { body: objectSchema(['token'], { token: tokenSchema }) },
  }, async (request, reply) => {
    if (!emailChangeService) throw providerNotConfigured('de troca de e-mail');
    const { token } = request.body as { token: string };
    request.auditCustomerId = await emailChangeService.confirmChange(token);
    return reply.status(204).send();
  });

  // KYC — Etapa 1 (dados pessoais complementares do titular PF). Igual ao
  // resto de Customer Identity: sessão real exigida (sessionGuard) e
  // identidade SEMPRE de request.customerAuth, nunca de um customerId
  // enviado pelo cliente (mesmo item 5 já aplicado no resto deste
  // arquivo — sem isso seria possível ler/gravar o KYC de outra pessoa).
  // GET faz o "carregar automaticamente os dados que já temos do
  // cliente"; PUT aceita um patch parcial — cada chamada só precisa
  // enviar os campos que o cliente completou naquela visita, o resto do
  // que já foi salvo antes é preservado (ver CustomerKycService).
  app.get('/kyc/personal-info', { preHandler: sessionGuard }, async (request) => {
    if (!kycService) throw providerNotConfigured('de KYC');
    const personalInfo = await kycService.getPersonalInfo(request.customerAuth!.id);
    return envelope(request, { personalInfo });
  });

  app.put('/kyc/personal-info', {
    preHandler: sessionGuard,
    schema: { body: objectSchema([], { birthDate: birthDateSchema, motherName: kycFreeTextSchema, nationality: kycFreeTextSchema }) },
  }, async (request) => {
    if (!kycService) throw providerNotConfigured('de KYC');
    const input = request.body as { birthDate?: string; motherName?: string; nationality?: string };
    // Auditoria: só QUAIS campos mudaram, nunca os valores.
    request.auditDetails = { fields: Object.keys(input).sort().join(',') };
    const personalInfo = await kycService.savePersonalInfo(request.customerAuth!.id, input);
    return envelope(request, { personalInfo });
  });

  // ---- KYC completo (Fase 4) ------------------------------------------
  // Resumo do andamento (o que falta, documentos enviados, se pode enviar).
  app.get('/kyc', { preHandler: sessionGuard }, async (request) => {
    if (!kycService) throw providerNotConfigured('de KYC');
    return envelope(request, { kyc: await kycService.getOverview(request.customerAuth!.id) });
  });

  const shortText = (max: number) => ({ type: 'string', minLength: 1, maxLength: max }) as const;
  app.put('/kyc/address', {
    preHandler: sessionGuard,
    schema: { body: objectSchema(['cep', 'street', 'number', 'district', 'city', 'state'], { cep: { type: 'string', minLength: 8, maxLength: 9 }, street: shortText(160), number: shortText(20), complement: { type: 'string', maxLength: 80 }, district: shortText(80), city: shortText(80), state: { type: 'string', minLength: 2, maxLength: 2 } }) },
  }, async (request) => {
    if (!kycService) throw providerNotConfigured('de KYC');
    const input = request.body as { cep: string; street: string; number: string; complement?: string; district: string; city: string; state: string };
    request.auditDetails = { fields: Object.keys(input).sort().join(',') };
    return envelope(request, { kyc: await kycService.saveAddress(request.customerAuth!.id, input) });
  });

  app.put('/kyc/declarations', {
    preHandler: sessionGuard,
    schema: { body: objectSchema(['isPep', 'occupation', 'incomeRange'], { isPep: { type: 'boolean' }, occupation: shortText(80), incomeRange: { type: 'string', enum: [...INCOME_RANGES] } }) },
  }, async (request) => {
    if (!kycService) throw providerNotConfigured('de KYC');
    const input = request.body as { isPep: boolean; occupation: string; incomeRange: string };
    request.auditDetails = { fields: 'incomeRange,isPep,occupation' };
    return envelope(request, { kyc: await kycService.saveDeclarations(request.customerAuth!.id, input) });
  });

  app.put('/kyc/document-type', {
    preHandler: sessionGuard,
    schema: { body: objectSchema(['documentType'], { documentType: { type: 'string', enum: [...ID_DOCUMENT_TYPES] } }) },
  }, async (request) => {
    if (!kycService) throw providerNotConfigured('de KYC');
    const { documentType } = request.body as { documentType: string };
    request.auditDetails = { documentType };
    return envelope(request, { kyc: await kycService.saveIdDocumentType(request.customerAuth!.id, documentType) });
  });

  // Arquivo enviado como bytes puros (sem multipart). O tipo REAL é
  // conferido pelos primeiros bytes no service; o Content-Type do
  // navegador só serve para o servidor aceitar o corpo.
  app.addContentTypeParser(['image/jpeg', 'image/png', 'application/pdf', 'application/octet-stream'], { parseAs: 'buffer', bodyLimit: MAX_DOCUMENT_BYTES }, (_request, body, done) => done(null, body));
  app.post('/kyc/documents/:kind', {
    preHandler: sessionGuard,
    bodyLimit: MAX_DOCUMENT_BYTES,
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: { params: { type: 'object', additionalProperties: false, required: ['kind'], properties: { kind: { type: 'string', enum: [...DOCUMENT_KINDS] } } } },
  }, async (request, reply) => {
    if (!kycService) throw providerNotConfigured('de KYC');
    const { kind } = request.params as { kind: string };
    const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    const document = await kycService.uploadDocument(request.customerAuth!.id, kind, body);
    // Auditoria: tipo, formato e tamanho — nunca o conteúdo.
    request.auditDetails = { kind, contentType: document.contentType, sizeBytes: document.sizeBytes };
    return reply.status(201).send(envelope(request, { document }));
  });

  app.post('/kyc/submit', {
    preHandler: sessionGuard,
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: { body: emptyObjectSchema },
  }, async (request) => {
    if (!kycService) throw providerNotConfigured('de KYC');
    return envelope(request, { kyc: await kycService.submit(request.customerAuth!.id) });
  });

  app.post('/kyc/withdraw', {
    preHandler: sessionGuard,
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: { body: emptyObjectSchema },
  }, async (request) => {
    if (!kycService) throw providerNotConfigured('de KYC');
    return envelope(request, { kyc: await kycService.withdraw(request.customerAuth!.id) });
  });

  // ---- Conta PJ (Fase 5) ----------------------------------------------
  // Pedido de conta PJ analisado pela equipe. Identidade sempre do token;
  // empresa de outra pessoa responde 404 (nunca revela que existe).
  const companyDocParams = { type: 'object', additionalProperties: false, required: ['companyId', 'kind'], properties: { companyId: idSchema, kind: { type: 'string', enum: [...COMPANY_DOCUMENT_KINDS] } } } as const;
  app.post('/companies', {
    preHandler: sessionGuard,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { body: objectSchema(['cnpj'], { cnpj: cnpjSchema }) },
  }, async (request, reply) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    const company = await companyService.create(request.customerAuth!.id, (request.body as { cnpj: string }).cnpj);
    request.auditDetails = { companyId: company.id };
    return reply.status(201).send(envelope(request, { company }));
  });

  app.get('/companies', { preHandler: sessionGuard }, async (request) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    return envelope(request, { companies: await companyService.list(request.customerAuth!.id) });
  });

  app.get('/companies/:companyId', { preHandler: sessionGuard, schema: { params: companyIdParams } }, async (request) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    const { companyId } = request.params as { companyId: string };
    return envelope(request, { company: await companyService.get(request.customerAuth!.id, companyId) });
  });

  const t = (max: number) => ({ type: 'string', minLength: 1, maxLength: max }) as const;
  app.put('/companies/:companyId/data', {
    preHandler: sessionGuard,
    schema: { params: companyIdParams, body: objectSchema(['legalName', 'openingDate', 'legalNature', 'mainActivity', 'businessEmail', 'businessPhone', 'annualRevenueRange', 'applicantPosition'], {
      legalName: t(200), tradeName: { type: 'string', maxLength: 200 }, openingDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, legalNature: t(160), mainActivity: t(300),
      businessEmail: emailSchema, businessPhone: t(20), annualRevenueRange: { type: 'string', enum: [...COMPANY_REVENUE_RANGES] }, applicantPosition: { type: 'string', enum: [...COMPANY_POSITIONS] },
    }) },
  }, async (request) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    const { companyId } = request.params as { companyId: string };
    request.auditDetails = { companyId };
    return envelope(request, { company: await companyService.saveData(request.customerAuth!.id, companyId, request.body as never) });
  });

  app.put('/companies/:companyId/address', {
    preHandler: sessionGuard,
    schema: { params: companyIdParams, body: objectSchema(['cep', 'street', 'number', 'district', 'city', 'state'], { cep: { type: 'string', minLength: 8, maxLength: 9 }, street: t(160), number: t(20), complement: { type: 'string', maxLength: 80 }, district: t(80), city: t(80), state: { type: 'string', minLength: 2, maxLength: 2 } }) },
  }, async (request) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    const { companyId } = request.params as { companyId: string };
    request.auditDetails = { companyId };
    return envelope(request, { company: await companyService.saveAddress(request.customerAuth!.id, companyId, request.body as never) });
  });

  app.post('/companies/:companyId/documents/:kind', {
    preHandler: sessionGuard,
    bodyLimit: MAX_DOCUMENT_BYTES,
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: { params: companyDocParams },
  }, async (request, reply) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    const { companyId, kind } = request.params as { companyId: string; kind: string };
    const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    const document = await companyService.uploadDocument(request.customerAuth!.id, companyId, kind, body);
    request.auditDetails = { companyId, kind, contentType: document.contentType, sizeBytes: document.sizeBytes };
    return reply.status(201).send(envelope(request, { document }));
  });

  for (const action of ['submit', 'withdraw'] as const) {
    app.post(`/companies/:companyId/${action}`, {
      preHandler: sessionGuard,
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: { params: companyIdParams, body: emptyObjectSchema },
    }, async (request) => {
      if (!companyService) throw providerNotConfigured('de empresas');
      const { companyId } = request.params as { companyId: string };
      request.auditDetails = { companyId };
      const company = action === 'submit' ? await companyService.submit(request.customerAuth!.id, companyId) : await companyService.withdraw(request.customerAuth!.id, companyId);
      return envelope(request, { company });
    });
  }
}
