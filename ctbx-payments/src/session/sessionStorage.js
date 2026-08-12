import { isDemoMode } from '../config';

let demoSession = null;

export async function readSession() {
  if (!isDemoMode) return null;
  return demoSession;
}

export async function writeSession(session) {
  if (!isDemoMode) throw new Error('Secure storage not configured');
  demoSession = { ...session, accessToken: null, refreshToken: null };
}

export async function clearSession() { demoSession = null; }

// Produção deve usar um adaptador seguro (por exemplo, SecureStore). Este fallback
// é deliberadamente volátil e recusa persistência fora do modo DEMO.
export const sessionStorageSecurity = Object.freeze({ persistent: false, productionReady: false });
