import type { FastifyInstance } from 'fastify';
import type { ProviderRegistry } from '../providers/ports.js';
import { ApiError, providerNotConfigured } from '../errors/ApiError.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireIdempotencyKey } from '../security/idempotency.js';
import { envelope } from '../utils/envelope.js';
import { emptyObjectSchema, idSchema, moneySchema, objectSchema } from '../validation/schemas.js';

const string = { type: 'string', minLength: 1, maxLength: 512 } as const;
const shortString = { type: 'string', minLength: 1, maxLength: 128 } as const;
const boolean = { type: 'boolean' } as const;
const idParams = { type: 'object', additionalProperties: false, required: ['id'], properties: { id: idSchema } } as const;
const unavailable = (domain: string) => async () => { throw providerNotConfigured(domain); };

export async function v1Routes(app: FastifyInstance, providers: ProviderRegistry): Promise<void> {
  const authenticated = authenticate(providers.sessions, providers.deviceBinding);
  app.post('/auth/login', {
    schema: { body: objectSchema(['username', 'password', 'device'], {
      username: shortString,
      password: { type: 'string', minLength: 8, maxLength: 256 },
      device: objectSchema(['installationId', 'platform'], {
        installationId: idSchema, name: shortString,
        platform: { type: 'string', enum: ['ANDROID', 'IOS'] }, appVersion: shortString,
      }),
    }) },
  }, async (request) => {
    if (!providers.auth) throw new ApiError('AUTH_PROVIDER_NOT_CONFIGURED', 'O provedor de autenticação não está configurado.', { statusCode: 503 });
    const data = await providers.auth.login(request.body);
    return envelope(request, { state: 'AUTHENTICATED', ...data });
  });
  app.post('/auth/refresh', { schema: { body: objectSchema(['refreshToken'], { refreshToken: string }) } }, async (request) => {
    if (!providers.auth) throw new ApiError('AUTH_PROVIDER_NOT_CONFIGURED', 'O provedor de autenticação não está configurado.', { statusCode: 503 });
    const data = await providers.auth.refresh((request.body as { refreshToken: string }).refreshToken);
    return envelope(request, { state: 'AUTHENTICATED', ...data });
  });
  app.post('/auth/logout', { preHandler: authenticated, schema: { body: emptyObjectSchema } }, async (request, reply) => {
    await providers.sessions?.revoke(request.auth!.sessionId);
    return reply.status(204).send();
  });
  app.get('/auth/session', { preHandler: authenticated }, async (request) => {
    const auth = request.auth!;
    return envelope(request, {
      user: auth.user,
      account: auth.account,
      session: { id: auth.sessionId, deviceId: auth.deviceId, expiresAt: auth.expiresAt, environment: 'sandbox' },
    });
  });

  app.get('/accounts/current', { preHandler: authenticated }, async (request) => {
    if (!providers.account) throw providerNotConfigured('de contas');
    return envelope(request, await providers.account.getCurrent(request.auth!));
  });
  app.get('/accounts/current/balances', { preHandler: authenticated }, async (request) => {
    if (!providers.account) throw providerNotConfigured('de contas');
    return envelope(request, await providers.account.getBalances(request.auth!));
  });
  app.get('/accounts/current/statement', {
    schema: { querystring: objectSchema([], { cursor: shortString, from: { type: 'string', format: 'date' }, to: { type: 'string', format: 'date' }, direction: { type: 'string', enum: ['CREDIT', 'DEBIT'] } }) },
  }, unavailable('de contas'));

  app.post('/pix/keys/lookup', { schema: { body: objectSchema(['key'], { key: string }) } }, unavailable('PIX'));
  app.get('/pix/keys', unavailable('PIX'));
  app.post('/pix/keys', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['type', 'value'], { type: { type: 'string', enum: ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'] }, value: string }) },
  }, unavailable('PIX'));
  app.delete('/pix/keys/:id', { preHandler: requireIdempotencyKey, schema: { params: idParams } }, unavailable('PIX'));
  app.post('/pix/qr/lookup', { schema: { body: objectSchema(['payload'], { payload: string }) } }, unavailable('PIX'));
  app.post('/pix/receive/qr', { schema: { body: objectSchema(['keyId'], { keyId: idSchema, amount: moneySchema, description: string }) } }, unavailable('PIX'));
  const pixIntent = objectSchema(['beneficiaryToken', 'amount'], { beneficiaryToken: idSchema, amount: moneySchema, description: string, saveFavorite: boolean, challengeId: idSchema });
  app.post('/pix/transfers/validate', { schema: { body: pixIntent } }, unavailable('PIX'));
  app.post('/pix/transfers', { preHandler: requireIdempotencyKey, schema: { body: pixIntent } }, unavailable('PIX'));
  app.post('/pix/transfers/schedule', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['beneficiaryToken', 'amount', 'scheduledFor'], { beneficiaryToken: idSchema, amount: moneySchema, scheduledFor: { type: 'string', format: 'date-time' }, description: string, saveFavorite: boolean, challengeId: idSchema }) },
  }, unavailable('PIX'));

  app.get('/transfers/banks', unavailable('de transferências'));
  app.get('/transfers/favorites', unavailable('de transferências'));
  app.post('/transfers/beneficiaries/lookup', {
    schema: { body: objectSchema(['type'], { type: { type: 'string', enum: ['INTERNAL_PHONE', 'INTERNAL_DOCUMENT', 'INTERNAL_ACCOUNT', 'EXTERNAL_ACCOUNT'] }, phone: shortString, document: shortString, bankId: idSchema, agency: shortString, account: shortString, accountDigit: shortString }) },
  }, unavailable('de transferências'));
  const transferIntent = objectSchema(['type', 'beneficiaryId', 'amount'], { type: { type: 'string', enum: ['INTERNAL', 'EXTERNAL'] }, beneficiaryId: idSchema, amount: moneySchema, purpose: string, description: string, saveFavorite: boolean, challengeId: idSchema });
  app.post('/transfers/validate', { schema: { body: transferIntent } }, unavailable('de transferências'));
  app.post('/transfers', { preHandler: requireIdempotencyKey, schema: { body: transferIntent } }, unavailable('de transferências'));
  app.post('/transfers/schedule', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['type', 'beneficiaryId', 'amount', 'scheduledFor'], { type: { type: 'string', enum: ['INTERNAL', 'EXTERNAL'] }, beneficiaryId: idSchema, amount: moneySchema, scheduledFor: { type: 'string', format: 'date-time' }, purpose: string, description: string, saveFavorite: boolean, challengeId: idSchema }) },
  }, unavailable('de transferências'));

  app.post('/payments/bills/lookup', { schema: { body: objectSchema(['code'], { code: { type: 'string', minLength: 8, maxLength: 64, pattern: '^[0-9 ]+$' } }) } }, unavailable('de pagamentos'));
  const billIntent = objectSchema(['billId', 'amount'], { billId: idSchema, amount: moneySchema, description: string, challengeId: idSchema });
  app.post('/payments/bills/validate', { schema: { body: billIntent } }, unavailable('de pagamentos'));
  app.post('/payments/bills', { preHandler: requireIdempotencyKey, schema: { body: billIntent } }, unavailable('de pagamentos'));
  app.post('/payments/bills/schedule', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['billId', 'amount', 'scheduledFor'], { billId: idSchema, amount: moneySchema, scheduledFor: { type: 'string', format: 'date-time' }, description: string, challengeId: idSchema }) },
  }, unavailable('de pagamentos'));
  app.post('/payments/installments/simulate', { schema: { body: objectSchema(['billId', 'amount'], { billId: idSchema, amount: moneySchema }) } }, unavailable('de pagamentos'));
  app.post('/payments/installments', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['simulationId', 'optionId', 'paymentMethodToken'], { simulationId: idSchema, optionId: idSchema, paymentMethodToken: string }) },
  }, unavailable('de pagamentos'));

  app.get('/cards', unavailable('de cartões'));
  app.post('/cards/requests', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['productId', 'termsAcceptanceId'], { productId: idSchema, designId: idSchema, termsAcceptanceId: idSchema }) },
  }, unavailable('de cartões'));
  app.get('/cards/:id', { schema: { params: idParams } }, unavailable('de cartões'));
  app.post('/cards/:id/activation/challenge', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: emptyObjectSchema } }, unavailable('de cartões'));
  app.post('/cards/:id/activate', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: objectSchema(['challengeId'], { challengeId: idSchema }) } }, unavailable('de cartões'));
  app.post('/cards/:id/block', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: emptyObjectSchema } }, unavailable('de cartões'));
  app.post('/cards/:id/unblock', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: objectSchema(['challengeId'], { challengeId: idSchema }) } }, unavailable('de cartões'));
  app.post('/cards/:id/password', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: objectSchema(['encryptedPinBlock', 'challengeId'], { encryptedPinBlock: string, challengeId: idSchema }) } }, unavailable('de cartões'));
  app.get('/cards/:id/transactions', { schema: { params: idParams } }, unavailable('de cartões'));
  app.post('/cards/:id/recharge', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: objectSchema(['amount'], { amount: moneySchema }) } }, unavailable('de cartões'));

  app.post('/security/challenges', { schema: { body: objectSchema(['purpose', 'operationId'], { purpose: shortString, operationId: idSchema }) } }, unavailable('de segurança'));
  app.post('/security/challenges/:id/verify', { schema: { params: idParams, body: objectSchema(['proof'], { proof: string }) } }, unavailable('de segurança'));
}
