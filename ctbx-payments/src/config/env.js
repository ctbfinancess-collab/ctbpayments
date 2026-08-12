import { appMode } from './appMode';

export const env = Object.freeze({
  appMode,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
  apiTimeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) || 15000,
  sessionTimeoutMs: Number(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MS) || 15 * 60 * 1000,
});
