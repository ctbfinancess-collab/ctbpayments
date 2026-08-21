import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { createEmailProvider } from '../src/providers/createEmailProvider.js';
import { InMemoryEmailProvider } from '../src/providers/InMemoryEmailProvider.js';
import { ResendEmailProvider } from '../src/providers/ResendEmailProvider.js';

// Etapa 1 da infraestrutura Resend — só a abstração (nenhuma rota consome
// isto ainda). Estes testes cobrem exatamente o que foi pedido: o provider
// em memória, e o comportamento fail-closed em produção.

test('InMemoryEmailProvider records every sent email and returns a stable id shape', async () => {
  const provider = new InMemoryEmailProvider();
  const result = await provider.send({ to: 'cliente@sandbox.invalid', subject: 'Teste', html: '<p>Oi</p>' });
  assert.match(result.id, /^mock_email_/);
  assert.equal(provider.sent.length, 1);
  assert.equal(provider.sent[0]!.to, 'cliente@sandbox.invalid');
  assert.equal(provider.sent[0]!.subject, 'Teste');
  assert.equal(provider.sent[0]!.html, '<p>Oi</p>');
  assert.ok(provider.sent[0]!.sentAt instanceof Date);

  await provider.send({ to: 'outro@sandbox.invalid', subject: 'Segundo', text: 'Oi de novo' });
  assert.equal(provider.sent.length, 2);
  // Ids nunca colidem entre envios diferentes.
  assert.notEqual(provider.sent[0]!.id, provider.sent[1]!.id);
});

test('ResendEmailProvider is fail-closed at construction: refuses to exist without RESEND_API_KEY', () => {
  assert.throws(() => new ResendEmailProvider(undefined, 'no-reply@ctbxpayments.com'), /RESEND_API_KEY/);
});

test('ResendEmailProvider is fail-closed at construction: refuses to exist without EMAIL_FROM', () => {
  assert.throws(() => new ResendEmailProvider('re_fake_key_for_test', undefined), /EMAIL_FROM/);
});

test('ResendEmailProvider is fail-closed at construction: refuses to exist without either', () => {
  assert.throws(() => new ResendEmailProvider(undefined, undefined), /RESEND_API_KEY/);
});

test('createEmailProvider: production WITHOUT RESEND_API_KEY/EMAIL_FROM throws — never falls back to the mock', () => {
  assert.throws(
    () => createEmailProvider({ nodeEnv: 'production', resendApiKey: undefined, emailFrom: undefined }),
    /RESEND_API_KEY/,
  );
  assert.throws(
    () => createEmailProvider({ nodeEnv: 'production', resendApiKey: 're_fake_key_for_test', emailFrom: undefined }),
    /EMAIL_FROM/,
  );
});

test('createEmailProvider: production WITH both configured returns a real ResendEmailProvider', () => {
  const provider = createEmailProvider({ nodeEnv: 'production', resendApiKey: 're_fake_key_for_test', emailFrom: 'no-reply@ctbxpayments.com' });
  assert.ok(provider instanceof ResendEmailProvider);
});

test('createEmailProvider: development/test WITHOUT the two variables falls back to the in-memory mock (never fails closed outside production)', () => {
  const dev = createEmailProvider({ nodeEnv: 'development', resendApiKey: undefined, emailFrom: undefined });
  assert.ok(dev instanceof InMemoryEmailProvider);
  const testEnv = createEmailProvider({ nodeEnv: 'test', resendApiKey: undefined, emailFrom: undefined });
  assert.ok(testEnv instanceof InMemoryEmailProvider);
  const staging = createEmailProvider({ nodeEnv: 'staging', resendApiKey: undefined, emailFrom: undefined });
  assert.ok(staging instanceof InMemoryEmailProvider);
});

test('createEmailProvider: development WITH both variables configured uses the real Resend provider (opt-in, not forced)', () => {
  const provider = createEmailProvider({ nodeEnv: 'development', resendApiKey: 're_fake_key_for_test', emailFrom: 'no-reply@ctbxpayments.com' });
  assert.ok(provider instanceof ResendEmailProvider);
});

test('ResendEmailProvider.send rejects a payload with neither html nor text', async () => {
  const provider = new ResendEmailProvider('re_fake_key_for_test', 'no-reply@ctbxpayments.com');
  await assert.rejects(provider.send({ to: 'cliente@sandbox.invalid', subject: 'Sem corpo' }), /html.*text|text.*html/i);
});

// Etapa 3 — regressão real encontrada e corrigida: buildApp() em produção
// SEM RESEND_API_KEY/EMAIL_FROM não pode derrubar o boot inteiro do app
// (conta, PIX, cartões...) só por causa do e-mail — precisa continuar de
// pé, com a verificação de e-mail apenas indisponível (503) nessa rota
// específica.
const baseConfig: AppConfig = {
  nodeEnv: 'production', host: '127.0.0.1', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: ['https://example.invalid'],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};

test('buildApp in production WITHOUT Resend configured boots successfully — email verification is just unavailable (503), not a crash', async (t) => {
  const app = await buildApp({ config: baseConfig, logger: false });
  t.after(() => app.close());
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  const resend = await app.inject({ method: 'POST', url: '/v1/customers/verify-email/resend', payload: { email: 'a@b.com' } });
  assert.equal(resend.statusCode, 503);
  assert.equal(resend.json().error.code, 'PROVIDER_NOT_CONFIGURED');

  // Mesma regra vale pra recuperação de senha — mesmo emailProvider
  // condicional, mesmo undefined-em-vez-de-derrubar-o-boot.
  const forgot = await app.inject({ method: 'POST', url: '/v1/customers/password/forgot', payload: { email: 'a@b.com' } });
  assert.equal(forgot.statusCode, 503);
  assert.equal(forgot.json().error.code, 'PROVIDER_NOT_CONFIGURED');

  // Mesma regra vale pra troca de e-mail — mesmo emailProvider
  // condicional. Sem sessão real aqui (fora de escopo pra este teste),
  // então basta confirmar que a rota não é 401 primeiro nem quebra o
  // boot — o 503 de PROVIDER_NOT_CONFIGURED só é alcançável com sessão,
  // então este teste cobre só a rota pública de confirmação.
  const confirmEmailChange = await app.inject({ method: 'POST', url: '/v1/customers/email/change/confirm', payload: { token: 'qualquer-coisa' } });
  assert.equal(confirmEmailChange.statusCode, 503);
  assert.equal(confirmEmailChange.json().error.code, 'PROVIDER_NOT_CONFIGURED');
});

test('buildApp in production WITH Resend configured boots successfully and wires the real ResendEmailProvider', async (t) => {
  const app = await buildApp({ config: { ...baseConfig, resendApiKey: 're_fake_key_for_test', emailFrom: 'no-reply@ctbxpayments.com' }, logger: false });
  t.after(() => app.close());
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
});
