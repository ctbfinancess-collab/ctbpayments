import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { ApiError, providerNotConfigured } from '../errors/ApiError.js';
import { requireCustomerSession } from '../middleware/requireCustomerSession.js';
import type { CompanyService } from '../services/companyService.js';
import type { CustomerAuthService } from '../services/customerAuthService.js';
import type { CustomerEmailChangeService } from '../services/customerEmailChangeService.js';
import type { CustomerEmailVerificationService } from '../services/customerEmailVerificationService.js';
import type { CustomerPasswordResetService } from '../services/customerPasswordResetService.js';
import { envelope } from '../utils/envelope.js';
import { emptyObjectSchema, idSchema, objectSchema } from '../validation/schemas.js';

export interface CustomerRoutesOptions {
  customerAuthService: CustomerAuthService | undefined;
  emailVerificationService: CustomerEmailVerificationService | undefined;
  passwordResetService: CustomerPasswordResetService | undefined;
  emailChangeService: CustomerEmailChangeService | undefined;
  companyService: CompanyService | undefined;
}

const nameSchema = { type: 'string', minLength: 1, maxLength: 160 } as const;
const documentSchema = { type: 'string', minLength: 11, maxLength: 14 } as const; // CPF com ou sem máscara
const emailSchema = { type: 'string', format: 'email', maxLength: 254 } as const;
const phoneSchema = { type: 'string', minLength: 8, maxLength: 20 } as const;
const passwordSchema = { type: 'string', minLength: 8, maxLength: 256 } as const;
const tokenSchema = { type: 'string', minLength: 1, maxLength: 512 } as const;
const cnpjSchema = { type: 'string', minLength: 14, maxLength: 18 } as const; // CNPJ com ou sem máscara
const roleSchema = { type: 'string', enum: ['ADMIN', 'MEMBER'] } as const;
const companyIdParams = { type: 'object', additionalProperties: false, required: ['companyId'], properties: { companyId: idSchema } } as const;

// Cadastro + login + verificação de e-mail reais de cliente PF — Customer
// Identity, Etapas 1, 2, 2.5 e 3. Rotas novas e isoladas (/v1/customers/*),
// não tocam em /v1/auth/login (SandboxAuthProvider, credencial fixa
// DEMO_ONLY) nem em nenhuma outra rota existente.
export async function customerRoutes(app: FastifyInstance, options: CustomerRoutesOptions): Promise<void> {
  const { customerAuthService, emailVerificationService, passwordResetService, emailChangeService, companyService } = options;
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
      const code = request.url.includes('/verify-email')
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

  app.post('/register', {
    schema: {
      body: objectSchema(['name', 'document', 'email', 'phone', 'password'], {
        name: nameSchema, document: documentSchema, email: emailSchema, phone: phoneSchema, password: passwordSchema,
      }),
    },
  }, async (request, reply) => {
    if (!customerAuthService) throw providerNotConfigured('de cadastro de clientes');
    const input = request.body as { name: string; document: string; email: string; phone: string; password: string };
    const customer = await customerAuthService.register(input);
    // Etapa 3 — dispara a verificação de e-mail logo após o cadastro.
    // Nunca bloqueia/derruba o cadastro se o envio falhar (o cliente já
    // foi criado; o reenvio cobre o caso de falha de entrega).
    if (emailVerificationService) await emailVerificationService.sendVerification(customer.id).catch(() => undefined);
    return reply.status(201).send(envelope(request, { customer }));
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
    const result = await customerAuthService.login(email, password);
    // Mesma mensagem/código pra e-mail inexistente e senha errada — nunca
    // revela qual dos dois falhou.
    if (!result) throw new ApiError('CUSTOMER_LOGIN_INVALID', 'E-mail ou senha inválidos.', { statusCode: 401 });
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
    await emailVerificationService.confirm(token);
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
    await passwordResetService.confirmReset(token, password);
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
    await emailChangeService.confirmChange(token);
    return reply.status(204).send();
  });

  // Estrutura PJ — todas as rotas abaixo exigem sessão real (sessionGuard);
  // CompanyService já existia pronto e testado, só faltava a camada HTTP
  // (ver comentário histórico em companyService.ts). Identidade de quem
  // está agindo vem sempre de request.customerAuth, nunca de body/params
  // — mesmo item 5 já aplicado no resto deste arquivo.
  app.post('/companies', {
    preHandler: sessionGuard,
    schema: { body: objectSchema(['cnpj', 'legalName'], { cnpj: cnpjSchema, legalName: nameSchema, tradeName: nameSchema }) },
  }, async (request, reply) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    const input = request.body as { cnpj: string; legalName: string; tradeName?: string };
    const company = await companyService.registerCompany(input, request.customerAuth!.id);
    return reply.status(201).send(envelope(request, { company }));
  });

  app.get('/companies', { preHandler: sessionGuard }, async (request) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    const companies = await companyService.listCompaniesForCustomer(request.customerAuth!.id);
    return envelope(request, { companies });
  });

  // Só um representante com papel ADMIN pode adicionar outro representante
  // — sem essa checagem, qualquer cliente autenticado poderia se auto-
  // vincular a uma empresa alheia só sabendo o companyId (IDOR). O
  // customerId do novo representante vem direto no corpo (precisa já ser
  // um cliente cadastrado); não existe busca por e-mail nesta etapa.
  app.post('/companies/:companyId/representatives', {
    preHandler: sessionGuard,
    schema: { params: companyIdParams, body: objectSchema(['customerId'], { customerId: idSchema, role: roleSchema }) },
  }, async (request, reply) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    const { companyId } = request.params as { companyId: string };
    const { customerId, role } = request.body as { customerId: string; role?: string };
    const callerRole = await companyService.getRepresentativeRole(companyId, request.customerAuth!.id);
    if (callerRole !== 'ADMIN') throw new ApiError('COMPANY_FORBIDDEN', 'Você não tem permissão para gerenciar representantes desta empresa.', { statusCode: 403 });
    await companyService.addRepresentative(companyId, customerId, role);
    return reply.status(201).send(envelope(request, { message: 'Representante adicionado.' }));
  });

  // Ver a lista de representantes exige ao menos representar a empresa
  // (qualquer papel) — mesma lógica anti-IDOR do endpoint acima.
  app.get('/companies/:companyId/representatives', {
    preHandler: sessionGuard,
    schema: { params: companyIdParams },
  }, async (request) => {
    if (!companyService) throw providerNotConfigured('de empresas');
    const { companyId } = request.params as { companyId: string };
    const callerRole = await companyService.getRepresentativeRole(companyId, request.customerAuth!.id);
    if (!callerRole) throw new ApiError('COMPANY_FORBIDDEN', 'Você não representa esta empresa.', { statusCode: 403 });
    const representativeIds = await companyService.listRepresentativesForCompany(companyId);
    return envelope(request, { representativeIds });
  });
}
