// Nomes em português dos eventos da auditoria (o código fica visível ao lado).
export const EVENT_LABELS = {
  CUSTOMER_REGISTER: 'Cadastro', CUSTOMER_LOGIN: 'Login do cliente', CUSTOMER_LOGOUT: 'Saída do cliente', CUSTOMER_EMAIL_VERIFY: 'Confirmação de e-mail',
  CUSTOMER_EMAIL_VERIFY_RESEND_REQUEST: 'Reenvio de confirmação', CUSTOMER_PASSWORD_RESET_REQUEST: 'Pedido de nova senha', CUSTOMER_PASSWORD_RESET: 'Senha redefinida',
  CUSTOMER_PASSWORD_CHANGE: 'Troca de senha', CUSTOMER_EMAIL_CHANGE_REQUEST: 'Pedido de troca de e-mail', CUSTOMER_EMAIL_CHANGE: 'E-mail trocado',
  CUSTOMER_KYC_PERSONAL_INFO_UPDATE: 'KYC: dados pessoais', CUSTOMER_KYC_ADDRESS_UPDATE: 'KYC: endereço', CUSTOMER_KYC_DECLARATIONS_UPDATE: 'KYC: declarações',
  CUSTOMER_KYC_DOCUMENT_TYPE_UPDATE: 'KYC: tipo de documento', CUSTOMER_KYC_DOCUMENT_UPLOAD: 'KYC: envio de arquivo', CUSTOMER_KYC_SUBMIT: 'KYC enviado para análise',
  CUSTOMER_KYC_WITHDRAW: 'KYC retirado da análise', COMPANY_APPLICATION_CREATE: 'PJ: pedido criado', COMPANY_DATA_UPDATE: 'PJ: dados', COMPANY_ADDRESS_UPDATE: 'PJ: endereço',
  COMPANY_DOCUMENT_UPLOAD: 'PJ: envio de arquivo', COMPANY_SUBMIT: 'PJ enviado para análise', COMPANY_WITHDRAW: 'PJ retirado da análise',
  STAFF_LOGIN_PASSWORD: 'Equipe: senha', STAFF_LOGIN_MFA: 'Equipe: código (2ª etapa)', STAFF_LOGOUT: 'Equipe: saída', STAFF_INVITE_ACCEPT: 'Equipe: convite aceito',
  STAFF_MFA_ENROLL: 'Equipe: autenticador cadastrado', STAFF_USERS_VIEW: 'Equipe: lista vista', STAFF_USER_INVITE: 'Equipe: convite enviado', STAFF_USER_INVITE_CLI: 'Equipe: convite (servidor)',
  STAFF_USER_INVITE_RESEND: 'Equipe: convite reenviado', STAFF_USER_DISABLE: 'Equipe: acesso desativado', STAFF_KYC_QUEUE_VIEW: 'Fila KYC vista', STAFF_KYC_CASE_VIEW: 'Ficha KYC aberta',
  STAFF_KYC_DOCUMENT_VIEW: 'Documento KYC aberto', STAFF_KYC_DECISION: 'Decisão de KYC', STAFF_COMPANY_QUEUE_VIEW: 'Fila PJ vista', STAFF_COMPANY_CASE_VIEW: 'Ficha PJ aberta',
  STAFF_COMPANY_DOCUMENT_VIEW: 'Documento PJ aberto', STAFF_COMPANY_DECISION: 'Decisão de PJ', STAFF_OVERVIEW_VIEW: 'Visão geral vista', STAFF_DASHBOARD_VIEW: 'Dashboard visto', STAFF_PASSWORD_RESET_REQUEST: 'Pedido de nova senha (equipe)', STAFF_PASSWORD_RESET: 'Senha da equipe redefinida', STAFF_USER_ACCESS_RESET: 'Acesso de membro redefinido', STAFF_USER_ACCESS_RESET_CLI: 'Acesso redefinido (emergência)', STAFF_CUSTOMER_SEARCH: 'Busca de clientes',
  STAFF_CUSTOMER_VIEW: 'Ficha de cliente aberta', STAFF_CUSTOMER_BLOCK: 'Conta de cliente suspensa', STAFF_CUSTOMER_UNBLOCK: 'Conta de cliente reativada',
  STAFF_CUSTOMER_SESSIONS_REVOKE: 'Sessões do cliente encerradas', STAFF_AUDIT_VIEW: 'Auditoria consultada',
};
export const OUTCOME_LABELS = { SUCCESS: ['Sucesso', 'success'], FAILURE: ['Falha', 'danger'], BLOCKED: ['Bloqueado', 'warning'] };
export const eventLabel = (code) => EVENT_LABELS[code] || code;

// Detalhes técnicos da auditoria em português.
const DETAIL_LABELS = { filter: 'filtro', byCustomer: 'de um cliente específico', kind: 'tipo', results: 'resultados', notified: 'e-mail enviado', decision: 'decisão', documentId: 'documento', companyId: 'empresa', role: 'perfil', fields: 'campos', filters: 'filtros', contentType: 'formato', sizeBytes: 'tamanho', documentType: 'documento', accountCreated: 'conta criada', targetStaffId: 'pessoa da equipe' };
const VALUE_LABELS = { true: 'sim', false: 'não', cpf: 'CPF', email: 'e-mail', name: 'nome', APPROVED: 'aprovado', CHANGES_REQUESTED: 'ajustes', REJECTED: 'recusado', ADMIN: 'administrador', ANALYST: 'analista', nenhum: 'nenhum' };
const HIDE = new Set(['statusCode', 'companyId', 'documentId', 'targetStaffId']);
export function describeDetails(details) {
  if (!details) return '';
  return Object.entries(details).filter(([k]) => !HIDE.has(k))
    .filter(([k, v]) => !(k === 'byCustomer' && v === false))
    .map(([k, v]) => `${DETAIL_LABELS[k] || k}: ${k === 'sizeBytes' ? `${Math.max(1, Math.round(Number(v) / 1024))} KB` : k === 'filter' ? (v === 'todos' ? 'todos' : eventLabel(String(v))) : VALUE_LABELS[String(v)] || v}`).join(' · ');
}
