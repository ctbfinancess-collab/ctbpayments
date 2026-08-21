import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { isDemoMode, isProductionMode, isSandboxMode } from '../config';

let memorySession = null;
const STORAGE_KEY = 'ctbx_customer_session';

// Armazenamento seguro real (PRODUCTION apenas) — Keychain no iOS/Keystore
// no Android via expo-secure-store; no Web não existe keychain do SO, então
// usa localStorage (isolado por origem pelo próprio navegador, mesmo
// mecanismo que qualquer app web usa pra manter sessão logada). Sessão
// expirada nunca é restaurada — evita autenticar por um instante com um
// token que a primeira chamada à API rejeitaria de qualquer forma.
function isExpired(session) {
  return !session?.expiresAt || new Date(session.expiresAt).getTime() <= Date.now();
}

async function readPersisted() {
  let raw = null;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
  } else {
    raw = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
  }
  if (!raw) return null;
  let session;
  try { session = JSON.parse(raw); } catch { return null; }
  if (isExpired(session)) { await clearPersisted(); return null; }
  return session;
}

async function writePersisted(session) {
  const raw = JSON.stringify(session);
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, raw);
}

async function clearPersisted() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
}

// DEMO e SANDBOX continuam exatamente como sempre — só em memória, sem
// nenhuma mudança de comportamento. Só PRODUCTION passou a persistir de
// verdade.
export async function readSession() {
  if (isProductionMode) return readPersisted();
  return memorySession;
}

export async function writeSession(session) {
  if (isProductionMode) { await writePersisted(session); return; }
  memorySession = isDemoMode ? { ...session, accessToken: null, refreshToken: null } : { ...session };
}

export async function clearSession() {
  if (isProductionMode) { await clearPersisted(); return; }
  memorySession = null;
}

export const sessionStorageSecurity = Object.freeze({
  persistent: isProductionMode,
  productionReady: isProductionMode,
  sandboxMemoryOnly: isSandboxMode,
  productionMemoryOnly: false,
});
