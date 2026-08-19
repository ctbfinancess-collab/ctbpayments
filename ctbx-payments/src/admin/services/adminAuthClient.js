import { env } from '../../config/env';

// Cliente de autenticação do Painel Administrativo — separado do apiClient
// bancário de propósito: usa cookie de sessão (credentials: 'include'),
// não Bearer token, e nunca deve reaproveitar a lógica de refresh/device-id
// do app cliente (domínios de sessão completamente diferentes).
export class AdminAuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AdminAuthError';
    this.code = code;
  }
}

function baseUrl() {
  return (env.apiBaseUrl || '').replace(/\/$/, '');
}

async function request(path, options = {}) {
  const base = baseUrl();
  if (!base) throw new AdminAuthError('Backend não configurado (EXPO_PUBLIC_API_BASE_URL ausente).', 'BACKEND_NOT_CONFIGURED');
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new AdminAuthError('Falha de rede ao contatar o backend.', 'NETWORK_ERROR');
  }
  if (response.status === 204) return null;
  let body = null;
  try { body = await response.json(); } catch { /* resposta sem corpo JSON */ }
  if (!response.ok) {
    throw new AdminAuthError(body?.error?.message || 'Não foi possível processar a solicitação.', body?.error?.code || 'API_ERROR');
  }
  return body?.data ?? null;
}

export async function adminLogin(email, password) {
  return request('/v1/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function adminLogout() {
  await request('/v1/admin/auth/logout', { method: 'POST', body: JSON.stringify({}) });
}

// Nunca lança para "sem sessão" — trata como sessão ausente (null), já que
// isso é o estado normal de quem ainda não fez login.
export async function adminGetSession() {
  try {
    return await request('/v1/admin/auth/session', { method: 'GET' });
  } catch (error) {
    if (error.code === 'ADMIN_SESSION_REQUIRED' || error.code === 'ADMIN_SESSION_INVALID') return null;
    throw error;
  }
}
