import { isDemoMode } from '../config';
import { ApiError } from '../api';
import { MOCK_ACCOUNT, MOCK_PROFILE } from '../data/profileMockData';
import { clearSession, readSession } from '../session/sessionStorage';

const DEMO_DEVICE = Object.freeze({ id: 'demo-device', name: 'DISPOSITIVO DEMONSTRAÇÃO' });
export async function login() {
  if (!isDemoMode) throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' });
  return { user: MOCK_PROFILE, account: MOCK_ACCOUNT, device: DEMO_DEVICE, accessToken: null, refreshToken: null, demoMode: true, lastActivity: Date.now() };
}
export async function logout() { await clearSession(); return true; }
export async function refreshSession() { if (!isDemoMode) throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); return readSession(); }
export async function getCurrentSession() { return readSession(); }
