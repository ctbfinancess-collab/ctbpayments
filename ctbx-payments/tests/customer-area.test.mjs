import assert from 'node:assert/strict';
import test from 'node:test';
import logicModule from '../src/customer-area/logic.js';
import routesModule from '../src/customer-area/routes.js';

const { brazilianToIso, formatDate, isoToBrazilian, isSessionError, kycStatusInfo, maskCpfInput, maskDateInput, maskPhoneInput, messageFor, passwordProblem, validateKyc, validateRegister } = logicModule;
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
