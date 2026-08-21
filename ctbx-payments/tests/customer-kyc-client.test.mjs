import assert from 'node:assert/strict';
import test from 'node:test';
import customerKycClientModule from '../src/services/customerKycClient.js';
import ApiErrorModule from '../src/api/ApiError.js';

const { getKycPersonalInfo, saveKycPersonalInfo } = customerKycClientModule;
const ApiError = ApiErrorModule.default || ApiErrorModule;

// KYC real (Customer Identity, Etapa 1) — integração frontend ->
// /v1/customers/kyc/personal-info. Mesmo espírito de
// customer-auth-client.test.mjs: cobre exatamente o que a tela
// (KycPersonalInfoScreen) depende — método/rota/corpo corretos e erros
// propagados sem transformação (a tela decide a mensagem).

test('getKycPersonalInfo calls GET /v1/customers/kyc/personal-info (authenticated — no skipAuth)', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options };
    return { data: { personalInfo: { status: 'NOT_STARTED', name: 'Cliente Exemplo', document: '11144477735', email: 'cliente@sandbox.invalid', phone: '11999998888', birthDate: null, motherName: null, nationality: null, personalInfoCompletedAt: null } } };
  };
  const result = await getKycPersonalInfo(client);
  assert.equal(call.path, '/v1/customers/kyc/personal-info');
  assert.equal(call.options.method, 'GET');
  assert.equal(call.options.skipAuth, undefined);
  assert.equal(result.data.personalInfo.status, 'NOT_STARTED');
});

test('getKycPersonalInfo propagates a session error untouched (the screen decides what to do)', async () => {
  const client = async () => { throw new ApiError('Sessão inválida ou expirada.', { code: 'CUSTOMER_SESSION_INVALID', status: 401 }); };
  await assert.rejects(getKycPersonalInfo(client), (error) => error.code === 'CUSTOMER_SESSION_INVALID' && error.status === 401);
});

test('saveKycPersonalInfo calls PUT /v1/customers/kyc/personal-info with exactly the given partial patch', async () => {
  let call;
  const client = async (path, options) => {
    call = { path, options, body: JSON.parse(options.body) };
    return { data: { personalInfo: { status: 'IN_PROGRESS', name: 'Cliente Exemplo', document: '11144477735', email: 'cliente@sandbox.invalid', phone: '11999998888', birthDate: '1990-05-20', motherName: null, nationality: null, personalInfoCompletedAt: null } } };
  };
  const result = await saveKycPersonalInfo({ birthDate: '1990-05-20' }, client);
  assert.equal(call.path, '/v1/customers/kyc/personal-info');
  assert.equal(call.options.method, 'PUT');
  assert.deepEqual(call.body, { birthDate: '1990-05-20' });
  assert.equal(result.data.personalInfo.status, 'IN_PROGRESS');
});

test('saveKycPersonalInfo propagates a validation error untouched (e.g. an invalid birth date)', async () => {
  const client = async () => { throw new ApiError('Data de nascimento inválida.', { code: 'KYC_BIRTH_DATE_INVALID', status: 422 }); };
  await assert.rejects(saveKycPersonalInfo({ birthDate: '2099-01-01' }, client), (error) => error.code === 'KYC_BIRTH_DATE_INVALID' && error.status === 422);
});
