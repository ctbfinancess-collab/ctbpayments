import { isDemoMode, isSandboxMode } from '../config';
import { ApiError } from '../api';
import { apiClient } from '../api';
import { MOCK_ACCOUNT, MOCK_PROFILE } from '../data/profileMockData';
import { getSandboxDeviceRegistration } from '../session/deviceIdentity';
import { clearSession, readSession } from '../session/sessionStorage';
import { logoutSandboxSession, mapSandboxSession, refreshSandboxSession, sandboxLogin } from './sandboxAuthClient';

const DEMO_DEVICE = Object.freeze({ id: 'demo-device', name: 'DISPOSITIVO DEMONSTRAÇÃO' });
export async function login(credentials = {}) {
  if (isDemoMode) return { user: MOCK_PROFILE, account: MOCK_ACCOUNT, device: DEMO_DEVICE, accessToken: null, refreshToken: null, demoMode: true, sandboxMode: false, lastActivity: Date.now() };
  if (!isSandboxMode) throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' });
  return sandboxLogin(credentials, getSandboxDeviceRegistration());
}
export async function logout(session) {
  if (isSandboxMode && session?.accessToken) {
    try { await logoutSandboxSession(); }
    catch { /* A revogação local é obrigatória mesmo se o BFF estiver indisponível. */ }
  }
  await clearSession();
  return true;
}
export async function refreshSession(session) {
  if (isDemoMode) return readSession();
  if (!isSandboxMode || !session?.refreshToken) throw new ApiError('Sessão expirada', { code: 'AUTH_SESSION_EXPIRED', status: 401 });
  return refreshSandboxSession(session);
}
export async function getCurrentSession() {
  if (!isSandboxMode) return readSession();
  const response = await apiClient('/v1/auth/session', { method: 'GET', retryOnUnauthorized: true });
  return response.data;
}
