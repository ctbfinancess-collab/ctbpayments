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
    preHandler: authenticated,
    schema: { querystring: objectSchema([], { cursor: shortString, from: { type: 'string', format: 'date' }, to: { type: 'string', format: 'date' }, direction: { type: 'string', enum: ['CREDIT', 'DEBIT'] } }) },
  }, async (request) => {
    if (!providers.account) throw providerNotConfigured('de contas');
    return envelope(request, await providers.account.listStatement(request.auth!, request.query));
  });
  app.get('/accounts/current/statement/future', { preHandler: authenticated }, async (request) => {
    if (!providers.account) throw providerNotConfigured('de contas');
    return envelope(request, await providers.account.listFutureTransactions(request.auth!));
  });
  app.get('/accounts/current/statement/blocked', { preHandler: authenticated }, async (request) => {
    if (!providers.account) throw providerNotConfigured('de contas');
    return envelope(request, await providers.account.listBlockedTransactions(request.auth!));
  });
  app.get('/accounts/current/transactions/:id', { preHandler: authenticated, schema: { params: idParams } }, async (request) => {
    if (!providers.account) throw providerNotConfigured('de contas');
    return envelope(request, await providers.account.getTransaction(request.auth!, (request.params as { id: string }).id));
  });
  app.get('/accounts/current/transactions/:id/receipt', { preHandler: authenticated, schema: { params: idParams } }, async (request) => {
    if (!providers.account) throw providerNotConfigured('de contas');
    return envelope(request, await providers.account.getTransactionReceipt(request.auth!, (request.params as { id: string }).id, request.id));
  });

  app.post('/pix/keys/lookup', { preHandler: authenticated, schema: { body: objectSchema(['key'], { key: string }) } }, async (request) => {
    if (!providers.pix) throw providerNotConfigured('PIX');
    return envelope(request, await providers.pix.lookupKey(request.auth!, request.body, request.id));
  });
  app.get('/pix/keys', { preHandler: authenticated }, async (request) => {
    if (!providers.pix) throw providerNotConfigured('PIX');
    return envelope(request, await providers.pix.listKeys(request.auth!));
  });
  app.post('/pix/keys', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['type', 'value'], { type: { type: 'string', enum: ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'] }, value: string }) },
  }, unavailable('PIX'));
  app.delete('/pix/keys/:id', { preHandler: requireIdempotencyKey, schema: { params: idParams } }, unavailable('PIX'));
  app.post('/pix/qr/lookup', { preHandler: authenticated, schema: { body: objectSchema(['payload'], { payload: string }) } }, async (request) => {
    if (!providers.pix) throw providerNotConfigured('PIX');
    return envelope(request, await providers.pix.lookupQr(request.auth!, request.body));
  });
  app.post('/pix/receive/qr', { preHandler: authenticated, schema: { body: objectSchema(['keyId'], { keyId: idSchema, amountMinor: { type: 'integer', minimum: 0 }, description: string }) } }, async (request) => {
    if (!providers.pix) throw providerNotConfigured('PIX');
    return envelope(request, await providers.pix.createReceiveQr(request.auth!, request.body));
  });
  const pixIntent = objectSchema(['beneficiaryToken', 'amount'], { beneficiaryToken: idSchema, amount: moneySchema, description: string, saveFavorite: boolean, challengeId: idSchema });
  app.post('/pix/transfers/validate', { schema: { body: pixIntent } }, unavailable('PIX'));
  app.post('/pix/transfers', { preHandler: requireIdempotencyKey, schema: { body: pixIntent } }, unavailable('PIX'));
  app.post('/pix/transfers/schedule', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['beneficiaryToken', 'amount', 'scheduledFor'], { beneficiaryToken: idSchema, amount: moneySchema, scheduledFor: { type: 'string', format: 'date-time' }, description: string, saveFavorite: boolean, challengeId: idSchema }) },
  }, unavailable('PIX'));

  app.get('/transfers/banks', { preHandler: authenticated }, async (request) => {
    if (!providers.transfer) throw providerNotConfigured('de transferências');
    return envelope(request, await providers.transfer.listBanks(request.auth!));
  });
  app.get('/transfers/favorites', { preHandler: authenticated }, async (request) => {
    if (!providers.transfer) throw providerNotConfigured('de transferências');
    return envelope(request, await providers.transfer.listFavorites(request.auth!));
  });
  app.post('/transfers/beneficiaries/lookup', {
    preHandler: authenticated,
    schema: { body: objectSchema(['type'], { type: { type: 'string', enum: ['INTERNAL_PHONE', 'INTERNAL_DOCUMENT', 'INTERNAL_ACCOUNT', 'EXTERNAL_ACCOUNT', 'FAVORITE'] }, phone: shortString, document: shortString, bankId: idSchema, agency: shortString, account: shortString, accountDigit: shortString, favoriteId: idSchema }) },
  }, async (request) => {
    if (!providers.transfer) throw providerNotConfigured('de transferências');
    return envelope(request, await providers.transfer.lookupBeneficiary(request.auth!, request.body));
  });
  const transferValidation = objectSchema(['beneficiaryId', 'amountMinor', 'currency'], { beneficiaryId: idSchema, amountMinor: { type: 'integer' }, currency: { type: 'string', enum: ['BRL'] }, purpose: string, description: string, scheduledFor: { type: 'string', format: 'date-time' } });
  app.post('/transfers/validate', { preHandler: authenticated, schema: { body: transferValidation } }, async (request) => {
    if (!providers.transfer) throw providerNotConfigured('de transferências');
    return envelope(request, await providers.transfer.validate(request.auth!, request.body));
  });
  const transferIntent = objectSchema(['type', 'beneficiaryId', 'amount'], { type: { type: 'string', enum: ['INTERNAL', 'EXTERNAL'] }, beneficiaryId: idSchema, amount: moneySchema, purpose: string, description: string, saveFavorite: boolean, challengeId: idSchema });
  app.post('/transfers', { preHandler: requireIdempotencyKey, schema: { body: transferIntent } }, unavailable('de transferências'));
  app.post('/transfers/schedule', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['type', 'beneficiaryId', 'amount', 'scheduledFor'], { type: { type: 'string', enum: ['INTERNAL', 'EXTERNAL'] }, beneficiaryId: idSchema, amount: moneySchema, scheduledFor: { type: 'string', format: 'date-time' }, purpose: string, description: string, saveFavorite: boolean, challengeId: idSchema }) },
  }, unavailable('de transferências'));

  app.post('/payments/bills/lookup', { preHandler: authenticated, schema: { body: objectSchema(['code'], { code: { type: 'string', minLength: 1, maxLength: 64 } }) } }, async (request) => {
    if (!providers.payment) throw providerNotConfigured('de pagamentos');
    return envelope(request, await providers.payment.lookupBill(request.auth!, request.body));
  });
  const billValidation = objectSchema(['billId', 'amountMinor', 'currency'], { billId: idSchema, amountMinor: { type: 'integer' }, currency: { type: 'string', enum: ['BRL'] }, scheduledFor: { type: 'string', format: 'date-time' }, description: string });
  app.post('/payments/bills/validate', { preHandler: authenticated, schema: { body: billValidation } }, async (request) => {
    if (!providers.payment) throw providerNotConfigured('de pagamentos');
    return envelope(request, await providers.payment.validateBill(request.auth!, request.body));
  });
  const billSubmit = objectSchema(['validationId', 'challengeId'], { validationId: idSchema, challengeId: idSchema, description: string });
  app.post('/payments/bills', { preHandler: [authenticated, requireIdempotencyKey], schema: { body: billSubmit } }, async (request) => {
    if (!providers.payment) throw providerNotConfigured('de pagamentos');
    return envelope(request, await providers.payment.payBill(request.auth!, request.body, request.headers['idempotency-key'] as string, request.id));
  });
  app.post('/payments/bills/schedule', {
    preHandler: [authenticated, requireIdempotencyKey],
    schema: { body: objectSchema(['validationId', 'challengeId', 'scheduledFor'], { validationId: idSchema, challengeId: idSchema, scheduledFor: { type: 'string', format: 'date-time' }, description: string }) },
  }, async (request) => {
    if (!providers.payment) throw providerNotConfigured('de pagamentos');
    return envelope(request, await providers.payment.scheduleBill(request.auth!, request.body, request.headers['idempotency-key'] as string, request.id));
  });
  app.post('/payments/installments/simulate', { preHandler: authenticated, schema: { body: objectSchema(['billId', 'amountMinor'], { billId: idSchema, amountMinor: { type: 'integer' }, installments: { type: 'integer', minimum: 1, maximum: 12 } }) } }, async (request) => {
    if (!providers.payment) throw providerNotConfigured('de pagamentos');
    return envelope(request, await providers.payment.simulateInstallments(request.auth!, request.body));
  });
  app.post('/payments/installments', {
    preHandler: [authenticated, requireIdempotencyKey],
    schema: { body: objectSchema(['simulationId', 'optionId', 'challengeId'], { simulationId: idSchema, optionId: idSchema, challengeId: idSchema, description: string }) },
  }, async (request) => {
    if (!providers.payment) throw providerNotConfigured('de pagamentos');
    return envelope(request, await providers.payment.payInstallments(request.auth!, request.body, request.headers['idempotency-key'] as string, request.id));
  });
  app.get('/payments/:id', { preHandler: authenticated, schema: { params: idParams } }, async (request) => {
    if (!providers.payment) throw providerNotConfigured('de pagamentos');
    return envelope(request, await providers.payment.getPayment(request.auth!, (request.params as { id: string }).id));
  });
  app.get('/payments/:id/receipt', { preHandler: authenticated, schema: { params: idParams } }, async (request) => {
    if (!providers.payment) throw providerNotConfigured('de pagamentos');
    return envelope(request, await providers.payment.getReceipt(request.auth!, (request.params as { id: string }).id, request.id));
  });

  app.get('/cards', { preHandler: authenticated }, async (request) => {
    if (!providers.card) throw providerNotConfigured('de cartões');
    return envelope(request, await providers.card.list(request.auth!));
  });
  app.post('/cards/requests', {
    preHandler: requireIdempotencyKey,
    schema: { body: objectSchema(['productId', 'termsAcceptanceId'], { productId: idSchema, designId: idSchema, termsAcceptanceId: idSchema }) },
  }, unavailable('de cartões'));
  app.get('/cards/:cardId', { preHandler: authenticated, schema: { params: { ...idParams, required: ['cardId'], properties: { cardId: idSchema } } } }, async (request) => {
    if (!providers.card) throw providerNotConfigured('de cartões');
    return envelope(request, await providers.card.get(request.auth!, (request.params as { cardId: string }).cardId));
  });
  app.post('/cards/:id/activation/challenge', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: emptyObjectSchema } }, unavailable('de cartões'));
  app.post('/cards/:id/activate', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: objectSchema(['challengeId'], { challengeId: idSchema }) } }, unavailable('de cartões'));
  app.post('/cards/:id/block', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: emptyObjectSchema } }, unavailable('de cartões'));
  app.post('/cards/:id/unblock', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: objectSchema(['challengeId'], { challengeId: idSchema }) } }, unavailable('de cartões'));
  app.post('/cards/:id/password', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: objectSchema(['encryptedPinBlock', 'challengeId'], { encryptedPinBlock: string, challengeId: idSchema }) } }, unavailable('de cartões'));
  const cardParams = { type: 'object', additionalProperties: false, required: ['cardId'], properties: { cardId: idSchema } } as const;
  const cardTransactionParams = { type: 'object', additionalProperties: false, required: ['cardId', 'transactionId'], properties: { cardId: idSchema, transactionId: idSchema } } as const;
  app.get('/cards/:cardId/transactions', { preHandler: authenticated, schema: { params: cardParams } }, async (request) => {
    if (!providers.card) throw providerNotConfigured('de cartões');
    return envelope(request, await providers.card.listTransactions(request.auth!, (request.params as { cardId: string }).cardId));
  });
  app.get('/cards/:cardId/transactions/:transactionId', { preHandler: authenticated, schema: { params: cardTransactionParams } }, async (request) => {
    if (!providers.card) throw providerNotConfigured('de cartões');
    const { cardId, transactionId } = request.params as { cardId: string; transactionId: string };
    return envelope(request, await providers.card.getTransaction(request.auth!, cardId, transactionId));
  });
  app.get('/cards/:cardId/receipts', { preHandler: authenticated, schema: { params: cardParams } }, async (request) => {
    if (!providers.card) throw providerNotConfigured('de cartões');
    return envelope(request, await providers.card.listReceipts(request.auth!, (request.params as { cardId: string }).cardId));
  });
  app.get('/cards/:cardId/transactions/:transactionId/receipt', { preHandler: authenticated, schema: { params: cardTransactionParams } }, async (request) => {
    if (!providers.card) throw providerNotConfigured('de cartões');
    const { cardId, transactionId } = request.params as { cardId: string; transactionId: string };
    return envelope(request, await providers.card.getTransactionReceipt(request.auth!, cardId, transactionId, request.id));
  });
  app.get('/transport-card', { preHandler: authenticated }, async (request) => {
    if (!providers.card) throw providerNotConfigured('de cartões');
    return envelope(request, await providers.card.getTransportCard(request.auth!));
  });
  app.post('/cards/:id/recharge', { preHandler: requireIdempotencyKey, schema: { params: idParams, body: objectSchema(['amount'], { amount: moneySchema }) } }, unavailable('de cartões'));

  app.post('/security/challenges', { preHandler: authenticated, schema: { body: objectSchema(['purpose', 'operationId'], { purpose: shortString, operationId: idSchema, type: { type: 'string', enum: ['OTP'] } }) } }, async (request, reply) => {
    if (!providers.challenge) throw providerNotConfigured('de segurança');
    return reply.status(201).send(envelope(request, await providers.challenge.create(request.auth!, request.body)));
  });
  app.post('/security/challenges/:id/verify', { preHandler: authenticated, schema: { params: idParams, body: objectSchema(['proof'], { proof: string }) } }, async (request) => {
    if (!providers.challenge) throw providerNotConfigured('de segurança');
    return envelope(request, await providers.challenge.verify(request.auth!, (request.params as { id: string }).id, request.body));
  });
}
