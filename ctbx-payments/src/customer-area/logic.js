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
  KYC_LOCKED: 'Seus dados já foram enviados para análise e não podem ser alterados agora.',
  KYC_INCOMPLETE: 'Complete todas as etapas antes de enviar para análise.',
  COMPANY_KYC_REQUIRED: 'Para abrir uma conta PJ, primeiro conclua a verificação da sua identidade.',
  COMPANY_CNPJ_INVALID: 'CNPJ inválido.',
  COMPANY_ALREADY_REQUESTED: 'Você já tem um pedido para este CNPJ.',
  COMPANY_INCOMPLETE: 'Complete todas as etapas antes de enviar para análise.',
  COMPANY_LOCKED: 'Este pedido já foi enviado para análise e não pode ser alterado agora.',
  COMPANY_NOT_WITHDRAWABLE: 'Este pedido não está mais em análise e não pode ser retirado.',
  COMPANY_NOT_FOUND: 'Empresa não encontrada.',
  COMPANY_OPENING_DATE_INVALID: 'Data de abertura inválida.',
  COMPANY_EMAIL_INVALID: 'E-mail da empresa inválido.',
  COMPANY_PHONE_INVALID: 'Telefone da empresa inválido.',
  COMPANY_LEGAL_NAME_INVALID: 'Informe a razão social.',
  COMPANY_LEGAL_NATURE_INVALID: 'Informe a natureza jurídica.',
  COMPANY_ACTIVITY_INVALID: 'Informe a atividade principal.',
  COMPANY_CEP_INVALID: 'CEP inválido.',
  COMPANY_STATE_INVALID: 'Estado (UF) inválido.',
  KYC_NOT_WITHDRAWABLE: 'Nossa equipe já concluiu a análise; não é mais possível retirar o envio.',
  KYC_CEP_INVALID: 'CEP inválido.',
  KYC_STATE_INVALID: 'Estado (UF) inválido.',
  KYC_STREET_INVALID: 'Informe a rua.',
  KYC_NUMBER_INVALID: 'Informe o número (ou "S/N").',
  KYC_DISTRICT_INVALID: 'Informe o bairro.',
  KYC_CITY_INVALID: 'Informe a cidade.',
  KYC_OCCUPATION_INVALID: 'Informe sua profissão.',
  KYC_INCOME_INVALID: 'Escolha a faixa de renda.',
  KYC_PEP_INVALID: 'Responda se você é pessoa politicamente exposta.',
  KYC_DOCUMENT_TYPE_INVALID: 'Escolha o tipo de documento.',
  KYC_DOCUMENT_EMPTY: 'Selecione um arquivo.',
  KYC_DOCUMENT_TOO_LARGE: 'O arquivo passa de 10 MB. Envie uma foto menor.',
  REQUEST_TOO_LARGE: 'O arquivo passa de 10 MB. Envie uma foto menor.',
  KYC_DOCUMENT_FORMAT_INVALID: 'Envie um arquivo JPG, PNG ou PDF.',
  KYC_SELFIE_PDF: 'A selfie precisa ser uma foto (JPG ou PNG).',
  KYC_UPLOADS_DISABLED: 'O envio de documentos ainda não está disponível.',
  CUSTOMER_KYC_RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.',
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
  NOT_STARTED: { label: 'Não iniciada', tone: 'warning', hint: 'Informe seus dados, endereço e documentos para verificar sua identidade.' },
  IN_PROGRESS: { label: 'Em preenchimento', tone: 'warning', hint: 'Sua verificação está em andamento. Complete as etapas que faltam e envie para análise.' },
  SUBMITTED: { label: 'Em análise', tone: 'neutral', hint: 'Recebemos seus dados e documentos. Nossa equipe está analisando; acompanhe a situação por aqui.' },
  APPROVED: { label: 'Aprovada', tone: 'success', hint: 'Sua identidade foi verificada.' },
  CHANGES_REQUESTED: { label: 'Ajustes solicitados', tone: 'warning', hint: 'Nossa equipe pediu um ajuste. Veja o que corrigir e envie novamente.' },
  REJECTED: { label: 'Não aprovada', tone: 'danger', hint: 'Não foi possível aprovar a sua verificação. Veja o motivo abaixo.' },
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

// ---- Fase 4: KYC completo ----------------------------------------------
export const getKyc = (client = apiClient) => client('/v1/customers/kyc', { method: 'GET' });
export const saveKycAddress = (address, client = apiClient) => client('/v1/customers/kyc/address', { method: 'PUT', body: JSON.stringify(address) });
export const saveKycDeclarations = (input, client = apiClient) => client('/v1/customers/kyc/declarations', { method: 'PUT', body: JSON.stringify(input) });
export const saveKycDocumentType = (documentType, client = apiClient) => client('/v1/customers/kyc/document-type', { method: 'PUT', body: JSON.stringify({ documentType }) });
export const submitKyc = (client = apiClient) => client('/v1/customers/kyc/submit', { method: 'POST', body: JSON.stringify({}) });
export const withdrawKyc = (client = apiClient) => client('/v1/customers/kyc/withdraw', { method: 'POST', body: JSON.stringify({}) });

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

// Envia o arquivo como bytes puros (sem multipart). Usa fetch direto porque
// o apiClient sempre manda JSON. O tipo REAL é conferido pela API.
export async function uploadKycDocument({ kind, file, token, baseUrl, fetchImpl = fetch }) {
  if (!file) throw Object.assign(new Error('Selecione um arquivo.'), { code: 'KYC_DOCUMENT_EMPTY' });
  if (file.size > MAX_UPLOAD_BYTES) throw Object.assign(new Error('Arquivo grande demais.'), { code: 'KYC_DOCUMENT_TOO_LARGE' });
  if (file.type && !UPLOAD_TYPES.includes(file.type)) throw Object.assign(new Error('Formato inválido.'), { code: 'KYC_DOCUMENT_FORMAT_INVALID' });
  if (kind === 'SELFIE' && file.type === 'application/pdf') throw Object.assign(new Error('Selfie em PDF.'), { code: 'KYC_SELFIE_PDF' });
  const res = await fetchImpl(`${String(baseUrl).replace(/\/$/, '')}/v1/customers/kyc/documents/${kind}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  let json = null;
  try { json = await res.json(); } catch { /* corpo vazio */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || 'Falha no envio.'), { code: json?.error?.code || 'UPLOAD_FAILED', status: res.status });
  return json?.data?.document;
}

// CEP → endereço (ViaCEP, serviço público). Só o CEP sai do navegador.
export async function lookupCep(cep, fetchImpl = fetch) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetchImpl(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const j = await res.json();
    if (j.erro) return null;
    return { street: j.logradouro || '', district: j.bairro || '', city: j.localidade || '', state: j.uf || '' };
  } catch { return null; }
}

export function maskCepInput(value = '') {
  const d = onlyDigits(value).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

export const INCOME_OPTIONS = [
  { value: 'ATE_2K', label: 'Até R$ 2.000' },
  { value: 'DE_2K_A_5K', label: 'De R$ 2.000 a R$ 5.000' },
  { value: 'DE_5K_A_10K', label: 'De R$ 5.000 a R$ 10.000' },
  { value: 'DE_10K_A_20K', label: 'De R$ 10.000 a R$ 20.000' },
  { value: 'ACIMA_20K', label: 'Acima de R$ 20.000' },
];
export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'RG', label: 'RG (identidade)' },
  { value: 'CNH', label: 'CNH (carteira de motorista)' },
  { value: 'RNE', label: 'RNE / CRNM (estrangeiro)' },
];
export const DOCUMENT_KINDS = [
  { kind: 'ID_FRONT', label: 'Documento: frente', hint: 'Foto nítida da frente do documento. Um PDF com frente e verso também vale.' },
  { kind: 'ID_BACK', label: 'Documento: verso', hint: 'Foto nítida do verso. Dispensado se a frente for um PDF com os dois lados.' },
  { kind: 'SELFIE', label: 'Selfie', hint: 'Tirada agora pela câmera: rosto de frente, bem iluminado, sem óculos escuros ou boné.' },
  { kind: 'PROOF_OF_ADDRESS', label: 'Comprovante de residência', hint: 'Conta de consumo ou extrato emitido nos últimos 90 dias.' },
];
export const MISSING_LABELS = {
  PERSONAL_INFO: 'Dados pessoais', ADDRESS: 'Endereço', DECLARATIONS: 'Declarações', ID_DOCUMENT_TYPE: 'Tipo de documento',
  ID_FRONT: 'Documento: frente', ID_BACK: 'Documento: verso', SELFIE: 'Selfie', PROOF_OF_ADDRESS: 'Comprovante de residência',
};
export const incomeLabel = (v) => INCOME_OPTIONS.find((o) => o.value === v)?.label || '—';
export const documentTypeLabel = (v) => DOCUMENT_TYPE_OPTIONS.find((o) => o.value === v)?.label || '—';
export const formatBytes = (n) => (n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// ---- Fase 5: conta PJ ---------------------------------------------------
export const listCompanies = (client = apiClient) => client('/v1/customers/companies', { method: 'GET' });
export const createCompany = (cnpj, client = apiClient) => client('/v1/customers/companies', { method: 'POST', body: JSON.stringify({ cnpj }) });
export const getCompany = (id, client = apiClient) => client(`/v1/customers/companies/${id}`, { method: 'GET' });
export const saveCompanyData = (id, data, client = apiClient) => client(`/v1/customers/companies/${id}/data`, { method: 'PUT', body: JSON.stringify(data) });
export const saveCompanyAddress = (id, address, client = apiClient) => client(`/v1/customers/companies/${id}/address`, { method: 'PUT', body: JSON.stringify(address) });
export const submitCompany = (id, client = apiClient) => client(`/v1/customers/companies/${id}/submit`, { method: 'POST', body: JSON.stringify({}) });
export const withdrawCompany = (id, client = apiClient) => client(`/v1/customers/companies/${id}/withdraw`, { method: 'POST', body: JSON.stringify({}) });

export async function uploadCompanyDocument({ companyId, kind, file, token, baseUrl, fetchImpl = fetch }) {
  if (!file) throw Object.assign(new Error('Selecione um arquivo.'), { code: 'KYC_DOCUMENT_EMPTY' });
  if (file.size > MAX_UPLOAD_BYTES) throw Object.assign(new Error('Arquivo grande demais.'), { code: 'KYC_DOCUMENT_TOO_LARGE' });
  if (file.type && !UPLOAD_TYPES.includes(file.type)) throw Object.assign(new Error('Formato inválido.'), { code: 'KYC_DOCUMENT_FORMAT_INVALID' });
  const res = await fetchImpl(`${String(baseUrl).replace(/\/$/, '')}/v1/customers/companies/${companyId}/documents/${kind}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream' }, body: file,
  });
  let json = null;
  try { json = await res.json(); } catch { /* corpo vazio */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || 'Falha no envio.'), { code: json?.error?.code || 'UPLOAD_FAILED', status: res.status });
  return json?.data?.document;
}

// Consulta pública do CNPJ (BrasilAPI) só para PREENCHER o formulário. O
// cliente confere e pode corrigir; a equipe consulta de novo na análise.
export async function lookupCnpjPublic(cnpj, fetchImpl = fetch) {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return null;
  try {
    const res = await fetchImpl(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!res.ok) return null;
    const j = await res.json();
    return {
      legalName: j.razao_social || '', tradeName: j.nome_fantasia || '', openingDate: j.data_inicio_atividade || '',
      legalNature: j.natureza_juridica || '', mainActivity: [j.cnae_fiscal, j.cnae_fiscal_descricao].filter(Boolean).join(' - '),
      situacao: j.descricao_situacao_cadastral || '',
      address: { cep: j.cep ? String(j.cep) : '', street: [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(' '), number: j.numero || '', complement: j.complemento || '', district: j.bairro || '', city: j.municipio || '', state: j.uf || '' },
    };
  } catch { return null; }
}

export function maskCnpjInput(value = '') {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export const COMPANY_POSITION_OPTIONS = [
  { value: 'SOCIO_ADMINISTRADOR', label: 'Sócio(a)-administrador(a)' },
  { value: 'SOCIO', label: 'Sócio(a)' },
  { value: 'ADMINISTRADOR', label: 'Administrador(a) não sócio(a)' },
  { value: 'PROCURADOR', label: 'Procurador(a)' },
];
export const COMPANY_REVENUE_OPTIONS = [
  { value: 'ATE_81K', label: 'Até R$ 81 mil por ano (MEI)' },
  { value: 'DE_81K_A_360K', label: 'De R$ 81 mil a R$ 360 mil (ME)' },
  { value: 'DE_360K_A_4_8M', label: 'De R$ 360 mil a R$ 4,8 milhões (EPP)' },
  { value: 'ACIMA_4_8M', label: 'Acima de R$ 4,8 milhões' },
];
export const COMPANY_DOCUMENTS = [
  { kind: 'SOCIAL_CONTRACT', label: 'Contrato social ou requerimento de empresário', hint: 'Última alteração consolidada (ou certificado MEI). PDF de preferência.' },
  { kind: 'ADDRESS_PROOF', label: 'Comprovante de endereço da empresa', hint: 'Conta de consumo, contrato de locação ou extrato em nome da empresa (últimos 90 dias).' },
  { kind: 'POWER_OF_ATTORNEY', label: 'Procuração', hint: 'Obrigatória para procurador(a): procuração com poderes para abrir e movimentar a conta.' },
  { kind: 'CNPJ_CARD', label: 'Cartão CNPJ (opcional)', hint: 'Comprovante de inscrição no CNPJ. Ajuda na análise, mas é opcional.' },
];
export const COMPANY_MISSING_LABELS = {
  COMPANY_DATA: 'Dados da empresa', COMPANY_ADDRESS: 'Endereço da empresa', SOCIAL_CONTRACT: 'Contrato social',
  ADDRESS_PROOF: 'Comprovante de endereço', POWER_OF_ATTORNEY: 'Procuração',
};
export const COMPANY_STATUS = {
  DRAFT: { label: 'Em preenchimento', tone: 'warning' },
  SUBMITTED: { label: 'Em análise', tone: 'neutral' },
  CHANGES_REQUESTED: { label: 'Ajustes solicitados', tone: 'warning' },
  APPROVED: { label: 'Aprovada', tone: 'success' },
  REJECTED: { label: 'Não aprovada', tone: 'danger' },
};
export const formatCnpj = (v = '') => maskCnpjInput(v);
export const optionLabel = (options, v) => options.find((o) => o.value === v)?.label || '—';
