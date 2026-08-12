import { isDemoMode, isProductionMode, isSandboxMode } from '../config';

let memorySession = null;

export async function readSession() {
  if (isProductionMode) return null;
  return memorySession;
}

export async function writeSession(session) {
  if (isProductionMode) throw new Error('Secure storage not configured');
  memorySession = isDemoMode ? { ...session, accessToken: null, refreshToken: null } : { ...session };
}

export async function clearSession() { memorySession = null; }

// TODO: adotar SecureStore/Keychain antes de persistir sessões fora do processo.
// Refresh tokens SANDBOX permanecem exclusivamente em memória e nunca usam AsyncStorage.
export const sessionStorageSecurity = Object.freeze({ persistent: false, productionReady: false, sandboxMemoryOnly: isSandboxMode });
