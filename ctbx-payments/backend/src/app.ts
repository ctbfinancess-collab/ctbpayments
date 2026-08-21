import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { adminAuthRoutes } from './routes/adminAuth.js';
import { adminCmsRoutes } from './routes/adminCms.js';
import { adminCmsSectionsRoutes } from './routes/adminCmsSections.js';
import { adminMediaRoutes } from './routes/adminMedia.js';
import { loadCloudinaryConfig } from './config/cloudinaryConfig.js';
import { loadConfig, type AppConfig } from './config/env.js';
import { createDbConnection } from './db/client.js';
import { registerErrorHandler } from './middleware/errorHandler.js';
import { requestIdFactory } from './middleware/requestId.js';
import { loggerOptions } from './observability/logger.js';
import type { ProviderRegistry } from './providers/ports.js';
import { SandboxAccountProvider } from './providers/sandbox/SandboxAccountProvider.js';
import { SandboxAuthProvider } from './providers/sandbox/SandboxAuthProvider.js';
import { SandboxCardProvider } from './providers/sandbox/SandboxCardProvider.js';
import { SandboxChallengeProvider } from './providers/sandbox/SandboxChallengeProvider.js';
import { SandboxDeviceBindingProvider } from './providers/sandbox/SandboxDeviceBindingProvider.js';
import { SandboxPixProvider } from './providers/sandbox/SandboxPixProvider.js';
import { SandboxPaymentProvider } from './providers/sandbox/SandboxPaymentProvider.js';
import { InMemorySandboxAccountRepository } from './providers/sandbox/InMemorySandboxAccountRepository.js';
import { InMemorySandboxSessionRepository } from './providers/sandbox/InMemorySandboxSessionRepository.js';
import { SandboxSessionStore } from './providers/sandbox/SandboxSessionStore.js';
import { SandboxTransferProvider } from './providers/sandbox/SandboxTransferProvider.js';
import { SandboxInvestmentProvider } from './providers/sandbox/SandboxInvestmentProvider.js';
import { SandboxBillingProvider } from './providers/sandbox/SandboxBillingProvider.js';
import { SandboxConsignedProvider } from './providers/sandbox/SandboxConsignedProvider.js';
import { AdminSessionRepository } from './repositories/AdminSessionRepository.js';
import { AdminUserRepository } from './repositories/AdminUserRepository.js';
import { CmsItemsRepository } from './repositories/CmsItemsRepository.js';
import { CmsSectionsRepository } from './repositories/CmsSectionsRepository.js';
import { PostgresCompanyRepository, type CompanyRepository } from './repositories/CompanyRepository.js';
import { PostgresCompanyRepresentativeRepository, type CompanyRepresentativeRepository } from './repositories/CompanyRepresentativeRepository.js';
import { PostgresCustomerKycRepository, type CustomerKycRepository } from './repositories/CustomerKycRepository.js';
import { PostgresCustomerEmailChangeRepository, type CustomerEmailChangeRepository } from './repositories/CustomerEmailChangeRepository.js';
import { PostgresCustomerEmailVerificationRepository, type CustomerEmailVerificationRepository } from './repositories/CustomerEmailVerificationRepository.js';
import { PostgresCustomerPasswordResetRepository, type CustomerPasswordResetRepository } from './repositories/CustomerPasswordResetRepository.js';
import { PostgresCustomerRepository, type CustomerRepository } from './repositories/CustomerRepository.js';
import { PostgresCustomerSessionRepository, type CustomerSessionRepository } from './repositories/CustomerSessionRepository.js';
import { InMemoryCompanyRepository } from './repositories/InMemoryCompanyRepository.js';
import { InMemoryCompanyRepresentativeRepository } from './repositories/InMemoryCompanyRepresentativeRepository.js';
import { InMemoryCustomerKycRepository } from './repositories/InMemoryCustomerKycRepository.js';
import { InMemoryCustomerEmailChangeRepository } from './repositories/InMemoryCustomerEmailChangeRepository.js';
import { InMemoryCustomerEmailVerificationRepository } from './repositories/InMemoryCustomerEmailVerificationRepository.js';
import { InMemoryCustomerPasswordResetRepository } from './repositories/InMemoryCustomerPasswordResetRepository.js';
import { InMemoryCustomerRepository } from './repositories/InMemoryCustomerRepository.js';
import { InMemoryCustomerSessionRepository } from './repositories/InMemoryCustomerSessionRepository.js';
import { MediaRepository } from './repositories/MediaRepository.js';
import { PostgresPhysicalCardRepository, type PhysicalCardRepository } from './repositories/PhysicalCardRepository.js';
import { PostgresSandboxAccountRepository, type SandboxAccountRepository } from './repositories/SandboxAccountRepository.js';
import { PostgresSandboxBillingRepository, type SandboxBillingRepository } from './repositories/SandboxBillingRepository.js';
import { PostgresSandboxConsignedRepository, type SandboxConsignedRepository } from './repositories/SandboxConsignedRepository.js';
import { PostgresSandboxInvestmentSimulationRepository, type SandboxInvestmentSimulationRepository } from './repositories/SandboxInvestmentSimulationRepository.js';
import { PostgresSandboxLedgerRepository, type SandboxLedgerRepository } from './repositories/SandboxLedgerRepository.js';
import { PostgresSandboxPixKeyRepository, type SandboxPixKeyRepository } from './repositories/SandboxPixKeyRepository.js';
import { PostgresSandboxSessionRepository, type SandboxSessionRepository } from './repositories/SandboxSessionRepository.js';
import { PostgresSandboxValidationRepository, type SandboxValidationRepository } from './repositories/SandboxValidationRepository.js';
import { PostgresTransportCardRepository, type TransportCardRepository } from './repositories/TransportCardRepository.js';
import { InMemoryPhysicalCardRepository } from './providers/sandbox/InMemoryPhysicalCardRepository.js';
import { InMemorySandboxBillingRepository } from './providers/sandbox/InMemorySandboxBillingRepository.js';
import { InMemorySandboxConsignedRepository } from './providers/sandbox/InMemorySandboxConsignedRepository.js';
import { InMemorySandboxInvestmentSimulationRepository } from './providers/sandbox/InMemorySandboxInvestmentSimulationRepository.js';
import { InMemorySandboxLedgerRepository } from './providers/sandbox/InMemorySandboxLedgerRepository.js';
import { InMemorySandboxPixKeyRepository } from './providers/sandbox/InMemorySandboxPixKeyRepository.js';
import { InMemorySandboxValidationRepository } from './providers/sandbox/InMemorySandboxValidationRepository.js';
import { InMemoryTransportCardRepository } from './providers/sandbox/InMemoryTransportCardRepository.js';
import { VirtualCardRepository } from './repositories/VirtualCardRepository.js';
import { customerRoutes } from './routes/customers.js';
import { healthRoutes } from './routes/health.js';
import { v1Routes } from './routes/v1.js';
import { AdminAuthService } from './services/adminAuthService.js';
import { CompanyService } from './services/companyService.js';
import { CustomerAuthService } from './services/customerAuthService.js';
import { CustomerKycService } from './services/customerKycService.js';
import { CustomerEmailChangeService } from './services/customerEmailChangeService.js';
import { CustomerEmailVerificationService } from './services/customerEmailVerificationService.js';
import { CustomerPasswordResetService } from './services/customerPasswordResetService.js';
import { createEmailProvider } from './providers/createEmailProvider.js';

export interface BuildAppOptions { config?: AppConfig; providers?: ProviderRegistry; logger?: boolean }

// virtualCards/cardEncryptionKey são opcionais de propósito: sem
// DATABASE_URL configurado, o cartão virtual falha fechado
// (PROVIDER_NOT_CONFIGURED) e todo o resto do sandbox (PIX, pagamentos,
// cartão físico, transferências) continua funcionando normalmente em
// memória, como sempre foi. sessionRepository é diferente: SEMPRE existe
// (Postgres quando há DATABASE_URL, senão InMemorySandboxSessionRepository
// como fallback) — sessão/login é a base de todo o resto do sandbox, então
// nunca falha fechado, só perde persistência entre restarts se não houver banco.
function sandboxProviders(
  config: AppConfig,
  sessionRepository: SandboxSessionRepository,
  accountRepository: SandboxAccountRepository,
  ledgerRepository: SandboxLedgerRepository,
  pixKeyRepository: SandboxPixKeyRepository,
  physicalCardRepository: PhysicalCardRepository,
  transportCardRepository: TransportCardRepository,
  investmentSimulationRepository: SandboxInvestmentSimulationRepository,
  consignedRepository: SandboxConsignedRepository,
  billingRepository: SandboxBillingRepository,
  validationRepository: SandboxValidationRepository,
  virtualCards?: VirtualCardRepository,
): ProviderRegistry {
  if (config.nodeEnv === 'production') return {};
  const sessions = new SandboxSessionStore(sessionRepository, { environment: config.nodeEnv });
  const deviceBinding = new SandboxDeviceBindingProvider(config.nodeEnv);
  const challenge = new SandboxChallengeProvider(config.nodeEnv);
  return {
    sessions,
    deviceBinding,
    auth: new SandboxAuthProvider(sessions, deviceBinding, config.nodeEnv),
    account: new SandboxAccountProvider(config.nodeEnv, accountRepository),
    card: new SandboxCardProvider(config.nodeEnv, accountRepository, ledgerRepository, physicalCardRepository, transportCardRepository, challenge, () => new Date(), virtualCards, config.sandboxCardEncryptionKey),
    pix: new SandboxPixProvider(config.nodeEnv, accountRepository, ledgerRepository, pixKeyRepository, validationRepository, challenge),
    transfer: new SandboxTransferProvider(config.nodeEnv, accountRepository, ledgerRepository, validationRepository, challenge),
    challenge,
    payment: new SandboxPaymentProvider(config.nodeEnv, accountRepository, ledgerRepository, validationRepository, challenge),
    investment: new SandboxInvestmentProvider(config.nodeEnv, accountRepository, ledgerRepository, investmentSimulationRepository),
    billing: new SandboxBillingProvider(config.nodeEnv, billingRepository),
    consigned: new SandboxConsignedProvider(config.nodeEnv, consignedRepository),
  };
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({
    logger: loggerOptions(config.logLevel, options.logger ?? config.nodeEnv !== 'test'),
    genReqId: requestIdFactory,
  });

  // Cartão virtual sandbox e sessão do cliente sandbox são os dois
  // domínios "de negócio" com persistência real (ver SandboxCardProvider e
  // SandboxSessionStore) — só dependem de DATABASE_URL, não de
  // ADMIN_SESSION_SECRET (que é exclusivo do painel admin, registrado mais
  // abaixo com sua própria conexão). options.providers (usado pelos testes)
  // pula tudo isso e nunca toca o banco.
  let virtualCards: VirtualCardRepository | undefined;
  let sessionRepository: SandboxSessionRepository = new InMemorySandboxSessionRepository();
  const inMemoryAccountRepository = new InMemorySandboxAccountRepository();
  let accountRepository: SandboxAccountRepository = inMemoryAccountRepository;
  // Ledger/chaves PIX seguem o mesmo par real+fallback dos demais — em
  // memória, o ledger compartilha a MESMA instância de conta acima (fonte
  // única de saldo mesmo sem Postgres).
  let ledgerRepository: SandboxLedgerRepository = new InMemorySandboxLedgerRepository(inMemoryAccountRepository);
  let pixKeyRepository: SandboxPixKeyRepository = new InMemorySandboxPixKeyRepository();
  // Cartão físico/transporte seguem o mesmo par real+fallback — ver
  // SandboxCardProvider (Etapa 4).
  let physicalCardRepository: PhysicalCardRepository = new InMemoryPhysicalCardRepository();
  let transportCardRepository: TransportCardRepository = new InMemoryTransportCardRepository();
  // Investimentos/consignado (Etapa 5) seguem o mesmo par real+fallback.
  let investmentSimulationRepository: SandboxInvestmentSimulationRepository = new InMemorySandboxInvestmentSimulationRepository();
  let consignedRepository: SandboxConsignedRepository = new InMemorySandboxConsignedRepository();
  // Cobrança (Etapa 5.1, Prioridade 4) — mesmo par real+fallback.
  let billingRepository: SandboxBillingRepository = new InMemorySandboxBillingRepository();
  // Validações de PIX/Transferência/Pagamento (Etapa 5.2) — mesmo par
  // real+fallback; rascunho de vida curta (ver sandboxValidations.ts).
  let validationRepository: SandboxValidationRepository = new InMemorySandboxValidationRepository();
  // Customer Identity (Etapa 1 — cadastro real PF). Mesmo par real+
  // fallback dos domínios financeiros acima (nunca fail-closed sem
  // DATABASE_URL, diferente do admin/CMS) — é o cadastro real de cliente,
  // não uma ferramenta interna.
  let customerRepository: CustomerRepository = new InMemoryCustomerRepository();
  // Sessão real de cliente (Etapa 2) — mesmo par real+fallback.
  let customerSessionRepository: CustomerSessionRepository = new InMemoryCustomerSessionRepository();
  // Verificação de e-mail real de cliente (Etapa 3) — mesmo par real+fallback.
  let customerEmailVerificationRepository: CustomerEmailVerificationRepository = new InMemoryCustomerEmailVerificationRepository();
  // Recuperação de senha real de cliente — mesmo par real+fallback.
  let customerPasswordResetRepository: CustomerPasswordResetRepository = new InMemoryCustomerPasswordResetRepository();
  // Troca de e-mail autenticada — mesmo par real+fallback.
  let customerEmailChangeRepository: CustomerEmailChangeRepository = new InMemoryCustomerEmailChangeRepository();
  // Estrutura PJ (empresas + representantes) — mesmo par real+fallback.
  let companyRepository: CompanyRepository = new InMemoryCompanyRepository();
  let companyRepresentativeRepository: CompanyRepresentativeRepository = new InMemoryCompanyRepresentativeRepository();
  // KYC (Etapa 1 — dados pessoais complementares) — mesmo par real+
  // fallback dos demais domínios de Customer Identity.
  let customerKycRepository: CustomerKycRepository = new InMemoryCustomerKycRepository();
  if (!options.providers && config.databaseUrl) {
    const { db, close } = createDbConnection(config.databaseUrl);
    app.addHook('onClose', async () => { await close(); });
    virtualCards = new VirtualCardRepository(db);
    sessionRepository = new PostgresSandboxSessionRepository(db);
    accountRepository = new PostgresSandboxAccountRepository(db);
    ledgerRepository = new PostgresSandboxLedgerRepository(db);
    pixKeyRepository = new PostgresSandboxPixKeyRepository(db);
    physicalCardRepository = new PostgresPhysicalCardRepository(db);
    transportCardRepository = new PostgresTransportCardRepository(db);
    investmentSimulationRepository = new PostgresSandboxInvestmentSimulationRepository(db);
    consignedRepository = new PostgresSandboxConsignedRepository(db);
    billingRepository = new PostgresSandboxBillingRepository(db);
    validationRepository = new PostgresSandboxValidationRepository(db);
    customerRepository = new PostgresCustomerRepository(db);
    customerSessionRepository = new PostgresCustomerSessionRepository(db);
    customerEmailVerificationRepository = new PostgresCustomerEmailVerificationRepository(db);
    customerPasswordResetRepository = new PostgresCustomerPasswordResetRepository(db);
    customerEmailChangeRepository = new PostgresCustomerEmailChangeRepository(db);
    companyRepository = new PostgresCompanyRepository(db);
    companyRepresentativeRepository = new PostgresCompanyRepresentativeRepository(db);
    customerKycRepository = new PostgresCustomerKycRepository(db);
  }
  const providers: ProviderRegistry = options.providers ?? sandboxProviders(config, sessionRepository, accountRepository, ledgerRepository, pixKeyRepository, physicalCardRepository, transportCardRepository, investmentSimulationRepository, consignedRepository, billingRepository, validationRepository, virtualCards);
  const customerAuthService = new CustomerAuthService(customerRepository, customerSessionRepository);
  // Estrutura PJ — nunca fail-closed sem DATABASE_URL, mesmo par real+
  // fallback de tudo em Customer Identity. Sem EmailProvider nenhum
  // (empresa nunca recebe e-mail própria — quem recebe é sempre um
  // customer/representante).
  const companyService = new CompanyService(companyRepository, companyRepresentativeRepository);
  // KYC — nunca fail-closed sem DATABASE_URL, mesmo par real+fallback de
  // tudo em Customer Identity (ver comentário acima em
  // customerKycRepository).
  const kycService = new CustomerKycService(customerRepository, customerKycRepository);
  // Etapa 3 — mesmo EmailProvider criado na Etapa 1 (createEmailProvider):
  // Resend real em produção, InMemory em dev/test por padrão. Nenhuma
  // segunda integração com o Resend é feita em lugar nenhum.
  //
  // createEmailProvider() é fail-closed em produção (lança sem as duas
  // variáveis) — de propósito, nunca cai pro mock em produção de verdade.
  // Mas isso não pode derrubar o BOOT inteiro do resto do app (conta,
  // PIX, cartões...) só porque o Resend não está configurado; mesmo
  // espírito do admin/CMS logo abaixo, que também fica undefined (e
  // responde PROVIDER_NOT_CONFIGURED por rota) em vez de travar tudo.
  // Mesmo raciocínio pra recuperação de senha — mesmo EmailProvider,
  // mesmo undefined-em-vez-de-derrubar-o-boot quando o Resend não está
  // configurado em produção.
  let emailVerificationService: CustomerEmailVerificationService | undefined;
  let passwordResetService: CustomerPasswordResetService | undefined;
  let emailChangeService: CustomerEmailChangeService | undefined;
  if (config.nodeEnv !== 'production' || (config.resendApiKey && config.emailFrom)) {
    const emailProvider = createEmailProvider({ nodeEnv: config.nodeEnv, resendApiKey: config.resendApiKey, emailFrom: config.emailFrom });
    emailVerificationService = new CustomerEmailVerificationService(customerRepository, customerEmailVerificationRepository, emailProvider, config.customerAppBaseUrl);
    passwordResetService = new CustomerPasswordResetService(customerRepository, customerPasswordResetRepository, customerSessionRepository, emailProvider, config.customerAppBaseUrl);
    emailChangeService = new CustomerEmailChangeService(customerRepository, customerEmailChangeRepository, emailProvider, config.customerAppBaseUrl);
  }

  await app.register(helmet, { contentSecurityPolicy: false });
  // Em staging e production, só as origens listadas em CORS_ORIGINS
  // (comma-separated) são aceitas — nunca origin:true/'*'. Sem a variável
  // definida, nenhuma origem é aceita (comportamento seguro por padrão).
  // Em development/test, mantém a regex de desenvolvimento local inalterada.
  //
  // credentials:true (mudou nesta etapa): o cookie de sessão do painel
  // admin só atravessa localhost:8081 → localhost:3000 (origens
  // diferentes) se o navegador receber Access-Control-Allow-Credentials.
  // @fastify/cors não permite registrar o plugin duas vezes com política
  // diferente por rota (decorator global, colide) — então isso é uma
  // política única para toda a API. O risco extra é baixo: origin nunca é
  // wildcard (sempre allowlist explícita ou o regex de localhost), e as
  // rotas bancárias sandbox não usam cookie nenhum — só passam a poder
  // enviar/receber um cookie que, para elas, nunca existe.
  const requiresExplicitCorsOrigins = config.nodeEnv === 'staging' || config.nodeEnv === 'production';
  await app.register(cors, {
    origin: requiresExplicitCorsOrigins ? config.corsOrigins : /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    credentials: true,
    // @fastify/cors só libera GET/HEAD/POST por padrão quando "methods" não
    // é informado — as rotas de CRUD do CMS (PUT/DELETE) ficariam
    // bloqueadas no preflight do navegador sem isto.
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.addHook('onRequest', async (request, reply) => { reply.header('x-request-id', request.id); });
  registerErrorHandler(app, config.nodeEnv === 'production');
  await app.register(healthRoutes);
  await app.register(async (api) => v1Routes(api, providers), { prefix: `/${config.apiVersion}` });
  // Customer Identity — rota isolada, fora do ProviderRegistry sandbox
  // (não implementa nenhuma das interfaces de ports.ts). Etapa 1: só
  // cadastro PF, sem sessão/login próprios ainda.
  await app.register(async (api) => customerRoutes(api, { customerAuthService, emailVerificationService, passwordResetService, emailChangeService, companyService, kycService }), { prefix: `/${config.apiVersion}/customers` });

  await app.register(async (adminApi) => {
    // Persistência real do CMS (Etapa 1 — fundação). Fail closed: sem
    // DATABASE_URL/ADMIN_SESSION_SECRET configurados, authService fica
    // undefined e tudo que depende dele (mídia + auth) responde
    // PROVIDER_NOT_CONFIGURED — não existe "modo aberto" por omissão.
    // Precisa vir ANTES do registro das rotas de mídia logo abaixo, que
    // agora dependem da sessão real (ver comentário nelas).
    let authService: AdminAuthService | undefined;
    let cmsItems: CmsItemsRepository | undefined;
    let cmsSections: CmsSectionsRepository | undefined;
    let mediaRepo: MediaRepository | undefined;
    if (config.databaseUrl && config.adminSessionSecret) {
      const { db, close } = createDbConnection(config.databaseUrl);
      app.addHook('onClose', async () => { await close(); });

      await adminApi.register(cookie, { secret: config.adminSessionSecret });
      await adminApi.register(rateLimit, { global: false });
      authService = new AdminAuthService(new AdminUserRepository(db), new AdminSessionRepository(db));
      cmsItems = new CmsItemsRepository(db);
      cmsSections = new CmsSectionsRepository(db);
      mediaRepo = new MediaRepository(db);
    }

    // Mídia do CMS (Cloudinary): mesma filosofia sandbox-only do restante
    // do BFF — em production essas rotas nem são registradas. Etapa 2:
    // agora exigem a sessão real do admin (requireAdminSession) em vez do
    // X-Admin-Token provisório — X-Admin-Token/ADMIN_API_TOKEN não são
    // mais usados por nenhuma rota (ficam só documentados por enquanto).
    if (config.nodeEnv !== 'production') {
      const cloudinary = loadCloudinaryConfig();
      await adminApi.register(async (api) => adminMediaRoutes(api, { cloudinary, authService, media: mediaRepo }));
    }

    if (authService) {
      const auth = authService;
      await adminApi.register(async (api) => adminAuthRoutes(api, { authService: auth, cookieSecure: config.nodeEnv === 'production' }));
      // CRUD real do CMS (Etapa 3 — começando por banners/campanhas).
      // Mesmo fail-closed: sem authService, esta rota nem registra.
      await adminApi.register(async (api) => adminCmsRoutes(api, { authService: auth, items: cmsItems }), { prefix: '/cms' });
      // Home/Login/Tema/SEO (cms_sections) — mesmo prefixo /cms, rotas
      // próprias (/cms/sections) porque são só GET+PUT (ver comentário em
      // adminCmsSections.ts).
      await adminApi.register(async (api) => adminCmsSectionsRoutes(api, { authService: auth, sections: cmsSections }), { prefix: '/cms' });
    }
  }, { prefix: `/${config.apiVersion}/admin` });

  return app;
}
