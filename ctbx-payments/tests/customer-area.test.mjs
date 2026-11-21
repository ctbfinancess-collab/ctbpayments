import assert from 'node:assert/strict';
import test from 'node:test';
import logicModule from '../src/customer-area/logic.js';
import routesModule from '../src/customer-area/routes.js';

const { lookupCep, maskCepInput, uploadKycDocument, MISSING_LABELS, DOCUMENT_KINDS, INCOME_OPTIONS, incomeLabel, formatBytes, brazilianToIso, formatDate, isoToBrazilian, isSessionError, kycStatusInfo, maskCpfInput, maskDateInput, maskPhoneInput, messageFor, passwordProblem, validateKyc, validateRegister } = logicModule;
const { linking } = routesModule;

// Fase 3 — Área do Cliente: lógica pura (sem interface).
const VALID = { name: 'Mariana Souza', document: '529.982.247-25', email: 'mariana@sandbox.invalid', phone: '(11) 98765-4321', password: 'Senha2026x', confirmPassword: 'Senha2026x' };

test('masks format CPF, phone and date while typing', () => {
  assert.equal(maskCpfInput('52998224725'), '529.982.247-25');
  assert.equal(maskCpfInput('529.98'), '529.98');
  assert.equal(maskPhoneInput('11987654321'), '(11) 98765-4321');
  assert.equal(maskPhoneInput('1134567890'), '(11) 3456-7890');
  assert.equal(maskDateInput('15051990'), '15/05/1990');
  assert.equal(maskCpfInput('529982247251234'), '529.982.247-25'); // nunca passa de 11 dígitos
});

test('register validation accepts a valid form and flags each invalid field', () => {
  assert.deepEqual(validateRegister(VALID), {});
  const errors = validateRegister({ name: 'Mariana', document: '111.111.111-11', email: 'x@', phone: '1199', password: 'abcdefgh', confirmPassword: 'outra' });
  assert.deepEqual(Object.keys(errors).sort(), ['confirmPassword', 'document', 'email', 'name', 'password', 'phone']);
});

test('password rule: at least 8 characters with letters and numbers', () => {
  assert.ok(passwordProblem('curta1'));
  assert.ok(passwordProblem('somenteletras'));
  assert.ok(passwordProblem('12345678'));
  assert.equal(passwordProblem('Senha2026'), '');
});

test('KYC validation rejects impossible dates and accepts partial saves', () => {
  assert.deepEqual(validateKyc({ birthDate: '31/02/1990', motherName: '', nationality: '' }), { birthDate: 'Data de nascimento inválida.' });
  assert.deepEqual(validateKyc({ birthDate: '', motherName: 'Joana Souza', nationality: '' }), {});
  assert.equal(brazilianToIso('15/05/1990'), '1990-05-15');
  assert.equal(isoToBrazilian('1990-05-15'), '15/05/1990');
});

test('error messages are friendly and never reveal whether an account exists', () => {
  assert.equal(messageFor({ code: 'CUSTOMER_LOGIN_INVALID' }), 'E-mail ou senha inválidos.');
  assert.match(messageFor({ code: 'CUSTOMER_EMAIL_NOT_VERIFIED' }), /Confirme seu e-mail/);
  assert.match(messageFor({ code: 'AUTH_PROVIDER_NOT_CONFIGURED', status: 503 }), /temporariamente indisponível/);
  assert.equal(messageFor({ code: 'ALGO_DESCONHECIDO' }, 'padrão'), 'padrão');
  assert.doesNotMatch(messageFor({ code: 'CUSTOMER_EMAIL_ALREADY_REGISTERED' }), /já está cadastrado/);
});

test('session errors are detected so the app returns to the login page', () => {
  assert.equal(isSessionError({ status: 401, code: 'CUSTOMER_SESSION_INVALID' }), true);
  assert.equal(isSessionError({ status: 401, code: 'CUSTOMER_LOGIN_INVALID' }), false);
  assert.equal(isSessionError({ status: 403, code: 'CUSTOMER_SESSION_INVALID' }), false);
});

test('KYC status labels cover every backend status, with a safe default', () => {
  for (const s of ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED']) assert.ok(kycStatusInfo(s).label);
  assert.equal(kycStatusInfo('INVENTADO').label, 'Não iniciada');
  assert.equal(formatDate('2026-11-21T00:48:06.402Z'), '21/11/2026');
  assert.equal(formatDate(null), '—');
});

test('every page has its own Portuguese address, and e-mail links keep the paths the API sends', () => {
  const s = linking.config.screens;
  assert.equal(s.Login, 'entrar');
  assert.equal(s.Dashboard, 'painel');
  assert.equal(s.Kyc, 'verificacao');
  assert.equal(s.VerifyEmail, 'verify-email');
  assert.equal(s.ResetPassword, 'reset-password');
  assert.equal(s.ConfirmEmailChange, 'confirm-email-change');
  assert.equal(new Set(Object.values(s)).size, Object.values(s).length);
});

test('KYC upload sends the raw file with the token, and refuses bad files before hitting the network', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 201, json: async () => ({ data: { document: { kind: 'SELFIE', sizeBytes: 3 } } }) }; };
  const file = { size: 3, type: 'image/png' };
  const doc = await uploadKycDocument({ kind: 'SELFIE', file, token: 'tok', baseUrl: 'https://api.test/', fetchImpl: fakeFetch });
  assert.equal(doc.kind, 'SELFIE');
  assert.equal(calls[0].url, 'https://api.test/v1/customers/kyc/documents/SELFIE');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer tok');
  assert.equal(calls[0].init.headers['Content-Type'], 'image/png');
  assert.equal(calls[0].init.body, file);
  const refuse = async (f, kind = 'ID_FRONT') => { try { await uploadKycDocument({ kind, file: f, token: 't', baseUrl: 'x', fetchImpl: fakeFetch }); return null; } catch (e) { return e.code; } };
  assert.equal(await refuse({ size: 11 * 1024 * 1024, type: 'image/jpeg' }), 'KYC_DOCUMENT_TOO_LARGE');
  assert.equal(await refuse({ size: 10, type: 'image/gif' }), 'KYC_DOCUMENT_FORMAT_INVALID');
  assert.equal(await refuse({ size: 10, type: 'application/pdf' }, 'SELFIE'), 'KYC_SELFIE_PDF');
  assert.equal(await refuse(null), 'KYC_DOCUMENT_EMPTY');
  assert.equal(calls.length, 1); // nenhuma das recusas chegou à rede
});

test('KYC upload surfaces the API error code (e.g. locked after submission)', async () => {
  const fakeFetch = async () => ({ ok: false, status: 409, json: async () => ({ error: { code: 'KYC_LOCKED', message: 'x' } }) });
  await assert.rejects(uploadKycDocument({ kind: 'ID_FRONT', file: { size: 3, type: 'image/jpeg' }, token: 't', baseUrl: 'x', fetchImpl: fakeFetch }), (e) => e.code === 'KYC_LOCKED' && e.status === 409);
});

test('CEP lookup fills the address, and fails quietly for unknown or malformed CEPs', async () => {
  const ok = async (url) => ({ ok: true, json: async () => (url.includes('01310100') ? { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' } : { erro: true }) });
  assert.deepEqual(await lookupCep('01310-100', ok), { street: 'Avenida Paulista', district: 'Bela Vista', city: 'São Paulo', state: 'SP' });
  assert.equal(await lookupCep('99999-999', ok), null);
  assert.equal(await lookupCep('123', ok), null);
  assert.equal(await lookupCep('01310-100', async () => { throw new Error('offline'); }), null);
  assert.equal(maskCepInput('01310100'), '01310-100');
});

test('KYC labels cover every pending item, document kind and income range', () => {
  for (const m of ['PERSONAL_INFO', 'ADDRESS', 'DECLARATIONS', 'ID_DOCUMENT_TYPE', 'ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS']) assert.ok(MISSING_LABELS[m], m);
  assert.deepEqual(DOCUMENT_KINDS.map((d) => d.kind), ['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS']);
  assert.deepEqual(INCOME_OPTIONS.map((o) => o.value), ['ATE_2K', 'DE_2K_A_5K', 'DE_5K_A_10K', 'DE_10K_A_20K', 'ACIMA_20K']);
  assert.equal(incomeLabel('ACIMA_20K'), 'Acima de R$ 20.000');
  assert.equal(formatBytes(1536), '2 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3,0 MB');
});
