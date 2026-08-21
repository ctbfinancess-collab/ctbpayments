import assert from 'node:assert/strict';
import test from 'node:test';
import customerAuthClientModule from '../src/services/customerAuthClient.js';
import ApiErrorModule from '../src/api/ApiError.js';

const { registerCustomer, loginCustomer, verifyCustomerEmail, resendCustomerEmailVerification, requestCustomerPasswordReset, confirmCustomerPasswordReset, confirmCustomerEmailChange } = customerAuthClientModule;
const ApiError = ApiErrorModule.default || ApiErrorModule;

// Cadastro e login reais — usados por CustomerRegisterScreen e por
// authService.login (branch PRODUCTION). skipAuth:true nos dois, mesmo
// espírito de todo o resto deste arquivo: nenhuma das duas chamadas
// exige sessão prévia.

test('registerCustomer calls POST /v1/customers/register with the full payload, skipping auth', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: { customer: { id: 'cust-1', type: 'PF', name: 'Cliente Exemplo', email: 'cliente@sandbox.invalid', documentMasked: '***.111.***-**', status: 'ACTIVE', createdAt: new Date().toISOString() } } };
  };
  const result = await registerCustomer({ name: 'Cliente Exemplo', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999998888', password: 'senha-nova-456' }, client);
  assert.equal(call.path, '/v1/customers/register');
  assert.equal(call.options.method, 'POST');
  assert.deepEqual(call.body, { name: 'Cliente Exemplo', document: '111.444.777-35', email: 'cliente@sandbox.invalid', phone: '11999998888', password: 'senha-nova-456' });
  assert.equal(call.options.skipAuth, true);
  assert.equal(call.options.retryOnUnauthorized, false);
  assert.equal(result.data.customer.id, 'cust-1');
});

test('registerCustomer propagates a duplicate e-mail/document error untouched (the screen decides the message)', async () => {
  const client = async () => { throw new ApiError('Este e-mail já está cadastrado.', { code: 'CUSTOMER_EMAIL_ALREADY_REGISTERED', status: 409 }); };
  await assert.rejects(registerCustomer({ name: 'a', document: '1', email: 'a@a.invalid', phone: '1', password: 'senha-nova-456' }, client), (error) => error.code === 'CUSTOMER_EMAIL_ALREADY_REGISTERED' && error.status === 409);
});

test('loginCustomer calls POST /v1/customers/login with e-mail and password, skipping auth', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: { token: 'token-de-sessao', expiresAt: new Date().toISOString(), customer: { id: 'cust-1', type: 'PF', name: 'Cliente Exemplo', email: 'cliente@sandbox.invalid', status: 'ACTIVE' } } };
  };
  const result = await loginCustomer({ email: 'cliente@sandbox.invalid', password: 'senha-nova-456' }, client);
  assert.equal(call.path, '/v1/customers/login');
  assert.equal(call.options.method, 'POST');
  assert.deepEqual(call.body, { email: 'cliente@sandbox.invalid', password: 'senha-nova-456' });
  assert.equal(call.options.skipAuth, true);
  assert.equal(call.options.retryOnUnauthorized, false);
  assert.equal(result.data.token, 'token-de-sessao');
});

test('loginCustomer propagates invalid-credentials error untouched (never reveals which field failed)', async () => {
  const client = async () => { throw new ApiError('E-mail ou senha inválidos.', { code: 'CUSTOMER_LOGIN_INVALID', status: 401 }); };
  await assert.rejects(loginCustomer({ email: 'cliente@sandbox.invalid', password: 'errada' }, client), (error) => error.code === 'CUSTOMER_LOGIN_INVALID' && error.status === 401);
});

// Customer Identity, Etapa 3 (verificação real de e-mail) — integração
// frontend -> /v1/customers/verify-email(/resend). Cobre exatamente o que
// a tela (VerifyEmailScreen) depende: sucesso, token inválido/expirado
// (sempre o mesmo erro, nunca revela detalhe), e o reenvio nunca vazando
// se a conta existe.

test('verifyCustomerEmail calls POST /v1/customers/verify-email with the token, skipping auth', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: null };
  };
  await verifyCustomerEmail('token-de-teste', client);
  assert.equal(call.path, '/v1/customers/verify-email');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.body.token, 'token-de-teste');
  assert.equal(call.options.skipAuth, true);
  assert.equal(call.options.retryOnUnauthorized, false);
});

test('verifyCustomerEmail propagates an invalid/expired token error untouched (the screen decides the message)', async () => {
  const client = async () => { throw new ApiError('Link de verificação inválido ou expirado.', { code: 'CUSTOMER_EMAIL_VERIFICATION_INVALID', status: 400 }); };
  await assert.rejects(verifyCustomerEmail('token-invalido', client), (error) => error.code === 'CUSTOMER_EMAIL_VERIFICATION_INVALID' && error.status === 400);
});

test('resendCustomerEmailVerification calls POST /v1/customers/verify-email/resend with the e-mail, skipping auth', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: { message: 'Se este e-mail estiver cadastrado e ainda não verificado, um novo link foi enviado.' } };
  };
  const result = await resendCustomerEmailVerification('cliente@sandbox.invalid', client);
  assert.equal(call.path, '/v1/customers/verify-email/resend');
  assert.equal(call.body.email, 'cliente@sandbox.invalid');
  assert.equal(call.options.skipAuth, true);
  assert.ok(result.data.message);
});

test('resendCustomerEmailVerification resolves the exact same way for a real and a made-up e-mail (the backend never reveals which is which)', async () => {
  const client = async (path, options) => ({ data: { message: 'Se este e-mail estiver cadastrado e ainda não verificado, um novo link foi enviado.' } });
  const forReal = await resendCustomerEmailVerification('cliente-real@sandbox.invalid', client);
  const forFake = await resendCustomerEmailVerification('nunca-existiu@sandbox.invalid', client);
  assert.deepEqual(forReal, forFake);
});

// Recuperação de senha — mesmo espírito dos testes acima. Cobre o que a
// tela (CustomerForgotPasswordScreen / ResetPasswordScreen) depende:
// pedido sempre com a mesma resposta genérica, confirmação propagando o
// erro de token inválido/expirado sem tocar na mensagem.

test('requestCustomerPasswordReset calls POST /v1/customers/password/forgot with the e-mail, skipping auth', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: { message: 'Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha.' } };
  };
  const result = await requestCustomerPasswordReset('cliente@sandbox.invalid', client);
  assert.equal(call.path, '/v1/customers/password/forgot');
  assert.equal(call.body.email, 'cliente@sandbox.invalid');
  assert.equal(call.options.skipAuth, true);
  assert.equal(call.options.retryOnUnauthorized, false);
  assert.ok(result.data.message);
});

test('requestCustomerPasswordReset resolves the exact same way for a real and a made-up e-mail (the backend never reveals which is which)', async () => {
  const client = async (path, options) => ({ data: { message: 'Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha.' } });
  const forReal = await requestCustomerPasswordReset('cliente-real@sandbox.invalid', client);
  const forFake = await requestCustomerPasswordReset('nunca-existiu@sandbox.invalid', client);
  assert.deepEqual(forReal, forFake);
});

test('confirmCustomerPasswordReset calls POST /v1/customers/password/reset with the token and new password, skipping auth', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: null };
  };
  await confirmCustomerPasswordReset('token-de-teste', 'senha-nova-456', client);
  assert.equal(call.path, '/v1/customers/password/reset');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.body.token, 'token-de-teste');
  assert.equal(call.body.password, 'senha-nova-456');
  assert.equal(call.options.skipAuth, true);
  assert.equal(call.options.retryOnUnauthorized, false);
});

test('confirmCustomerPasswordReset propagates an invalid/expired token error untouched (the screen decides the message)', async () => {
  const client = async () => { throw new ApiError('Link de redefinição inválido ou expirado.', { code: 'CUSTOMER_PASSWORD_RESET_INVALID', status: 400 }); };
  await assert.rejects(confirmCustomerPasswordReset('token-invalido', 'senha-nova-456', client), (error) => error.code === 'CUSTOMER_PASSWORD_RESET_INVALID' && error.status === 400);
});

// Troca de e-mail — mesmo espírito de verifyCustomerEmail (mesma tela,
// mesmo formato de chamada).

test('confirmCustomerEmailChange calls POST /v1/customers/email/change/confirm with the token, skipping auth', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: null };
  };
  await confirmCustomerEmailChange('token-de-teste', client);
  assert.equal(call.path, '/v1/customers/email/change/confirm');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.body.token, 'token-de-teste');
  assert.equal(call.options.skipAuth, true);
  assert.equal(call.options.retryOnUnauthorized, false);
});

test('confirmCustomerEmailChange propagates an invalid/expired token error untouched (the screen decides the message)', async () => {
  const client = async () => { throw new ApiError('Link de confirmação inválido ou expirado.', { code: 'CUSTOMER_EMAIL_CHANGE_TOKEN_INVALID', status: 400 }); };
  await assert.rejects(confirmCustomerEmailChange('token-invalido', client), (error) => error.code === 'CUSTOMER_EMAIL_CHANGE_TOKEN_INVALID' && error.status === 400);
});
