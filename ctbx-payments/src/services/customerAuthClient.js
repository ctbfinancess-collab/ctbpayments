import { apiClient } from '../api';

// Cliente de e-mail real (Customer Identity) — diferente do resto de
// src/services (que fala com o login SANDBOX de credencial fixa), este
// arquivo fala com /v1/customers/*, o cadastro/login/verificação reais
// implementados no backend. skipAuth:true nos dois porque nenhuma das
// duas chamadas exige sessão (confirmação por token, reenvio por e-mail).

// Cadastro e login reais — usados pelas telas de PRODUCTION
// (CustomerRegisterScreen, LoginScreen via authService). skipAuth:true
// nos dois: nenhuma das duas chamadas exige sessão prévia (é como a
// sessão nasce). Devolvem exatamente o envelope do backend
// ({ data: { customer } } / { data: { token, expiresAt, customer } }) —
// quem mapeia pro formato de sessão do app é authService, não este
// arquivo (mesmo espírito de sandboxAuthClient.mapSandboxSession).
export async function registerCustomer({ name, document, email, phone, password }, client = apiClient) {
  return client('/v1/customers/register', {
    method: 'POST',
    body: JSON.stringify({ name, document, email, phone, password }),
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}

export async function loginCustomer({ email, password }, client = apiClient) {
  return client('/v1/customers/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}

export async function verifyCustomerEmail(token, client = apiClient) {
  return client('/v1/customers/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}

// Sempre resolve com a mesma resposta genérica do backend, nunca revela
// se o e-mail existe, já está verificado ou está em cooldown — a tela
// (VerifyEmailScreen) deve mostrar a mesma mensagem pro usuário
// independentemente do resultado.
export async function resendCustomerEmailVerification(email, client = apiClient) {
  return client('/v1/customers/verify-email/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}

// Recuperação de senha — mesmo espírito das duas funções acima: sempre
// resolve com a mesma resposta genérica do backend, nunca revela se o
// e-mail existe.
export async function requestCustomerPasswordReset(email, client = apiClient) {
  return client('/v1/customers/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}

export async function confirmCustomerPasswordReset(token, password, client = apiClient) {
  return client('/v1/customers/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}

// Troca de e-mail — só a confirmação (pública, por token, mesmo padrão
// de verifyCustomerEmail acima). O pedido em si (autenticado, exige
// sessão + senha atual) ainda não tem função aqui de propósito: não
// existe tela de configurações de conta no app ainda pra chamá-lo.
export async function confirmCustomerEmailChange(token, client = apiClient) {
  return client('/v1/customers/email/change/confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}
