import { apiClient } from '../api';
import { isValidCpf, isValidEmail, onlyDigits } from '../utils/pixValidation';
import { parseBrazilianDate } from '../utils/dateValidation';

// Lógica pura da Área do Cliente (Fase 3): chamadas à API, mensagens de
// erro e máscaras. Sem nenhum componente visual — testada em
// tests/customer-area.test.mjs.

export const getMe = (client = apiClient) => client('/v1/customers/me', { method: 'GET' });
export const changePassword = (currentPassword, newPassword, client = apiClient) => client('/v1/customers/password/change', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
export const requestEmailChange = (newEmail, currentPassword, client = apiClient) => client('/v1/customers/email/change', { method: 'POST', body: JSON.stringify({ newEmail, currentPassword }) });

// Mensagens para o cliente. Nunca revelam se um e-mail ou CPF existe.
const MESSAGES = {
  CUSTOMER_LOGIN_INVALID: 'E-mail ou senha inválidos.',
  CUSTOMER_EMAIL_NOT_VERIFIED: 'Confirme seu e-mail para entrar. Procure o link que enviamos no cadastro (veja também a caixa de spam).',
  CUSTOMER_LOGIN_RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.',
  CUSTOMER_REGISTER_RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.',
  CUSTOMER_PASSWORD_RESET_RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.',
  CUSTOMER_VERIFY_EMAIL_RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.',
  CUSTOMER_PASSWORD_CHANGE_RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.',
  CUSTOMER_EMAIL_CHANGE_RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.',
  CUSTOMER_DOCUMENT_INVALID: 'CPF inválido.',
  CUSTOMER_NAME_INVALID: 'Informe seu nome completo.',
  CUSTOMER_PHONE_INVALID: 'Telefone inválido.',
  CUSTOMER_EMAIL_VERIFICATION_INVALID: 'Este link de confirmação é inválido, expirou ou já foi usado.',
  CUSTOMER_PASSWORD_RESET_INVALID: 'Este link de redefinição é inválido, expirou ou já foi usado. Peça um novo em "Esqueci minha senha".',
  CUSTOMER_EMAIL_CHANGE_TOKEN_INVALID: 'Este link de confirmação é inválido, expirou ou já foi usado.',
  CUSTOMER_PASSWORD_CHANGE_INVALID: 'A senha atual está incorreta.',
  CUSTOMER_EMAIL_CHANGE_INVALID: 'A senha atual está incorreta.',
  CUSTOMER_EMAIL_CHANGE_COOLDOWN: 'Você acabou de pedir uma troca de e-mail. Aguarde alguns minutos para pedir outra.',
  CUSTOMER_EMAIL_CHANGE_SAME_EMAIL: 'Este já é o seu e-mail atual.',
  CUSTOMER_EMAIL_ALREADY_REGISTERED: 'Não foi possível usar este e-mail. Escolha outro endereço.',
  KYC_BIRTH_DATE_INVALID: 'Data de nascimento inválida.',
  KYC_MOTHER_NAME_INVALID: 'Informe o nome completo da mãe.',
  KYC_NATIONALITY_INVALID: 'Informe a nacionalidade.',
  NETWORK_ERROR: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  TIMEOUT: 'O servidor demorou para responder. Tente novamente.',
};

export function messageFor(error, fallback = 'Não foi possível concluir. Tente novamente.') {
  if (!error) return fallback;
  if (MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 503 || /NOT_CONFIGURED/.test(error.code || '')) return 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
  return fallback;
}

export const isSessionError = (error) => error?.status === 401 && /SESSION_INVALID|AUTH_REQUIRED/.test(error.code || '');

export const KYC_STATUS = {
  NOT_STARTED: { label: 'Não iniciada', tone: 'warning', hint: 'Complete seus dados pessoais para iniciar a verificação.' },
  IN_PROGRESS: { label: 'Em preenchimento', tone: 'warning', hint: 'Seus dados pessoais foram salvos. As próximas etapas (endereço e documentos) serão liberadas em breve.' },
  SUBMITTED: { label: 'Em análise', tone: 'neutral', hint: 'Recebemos seus dados e nossa equipe está analisando.' },
  APPROVED: { label: 'Aprovada', tone: 'success', hint: 'Sua identidade foi verificada.' },
  REJECTED: { label: 'Precisa de ajustes', tone: 'danger', hint: 'Revise seus dados. Nossa equipe pode entrar em contato.' },
};
export const kycStatusInfo = (status) => KYC_STATUS[status] || KYC_STATUS.NOT_STARTED;

export function maskCpfInput(value = '') {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskPhoneInput(value = '') {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskDateInput(value = '') {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export const isoToBrazilian = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
export const brazilianToIso = (value) => value.split('/').reverse().join('-');

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

// Regras de senha (iguais às da API: mínimo 8) mais um mínimo de
// qualidade: letras e números.
export function passwordProblem(password = '') {
  if (password.length < 8) return 'Use pelo menos 8 caracteres.';
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return 'Use letras e números.';
  return '';
}

export function validateRegister(form) {
  const errors = {};
  if (form.name.trim().split(/\s+/).length < 2) errors.name = 'Informe seu nome completo.';
  if (!isValidCpf(onlyDigits(form.document))) errors.document = 'CPF inválido.';
  if (!isValidEmail(form.email.trim())) errors.email = 'E-mail inválido.';
  if (onlyDigits(form.phone).length < 10) errors.phone = 'Informe o telefone com DDD.';
  const pw = passwordProblem(form.password);
  if (pw) errors.password = pw;
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'As senhas não conferem.';
  return errors;
}

export function validateKyc({ birthDate, motherName, nationality }) {
  const errors = {};
  if (birthDate && (birthDate.length !== 10 || !parseBrazilianDate(birthDate))) errors.birthDate = 'Data de nascimento inválida.';
  if (motherName && motherName.trim().length < 2) errors.motherName = 'Informe o nome completo da mãe.';
  if (nationality && nationality.trim().length < 2) errors.nationality = 'Informe a nacionalidade.';
  return errors;
}

// Lê ?token= da URL atual (links enviados por e-mail).
export function tokenFromUrl() {
  if (typeof window === 'undefined' || !window.location) return '';
  try { return new URL(window.location.href).searchParams.get('token') || ''; } catch { return ''; }
}
