import { appMode } from './appMode';

export const env = Object.freeze({
  appMode,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
  apiTimeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) || 15000,
  sessionTimeoutMs: Number(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MS) || 15 * 60 * 1000,
  // NÃO USADO MAIS — /v1/admin/media/* passou a exigir a sessão real do
  // admin (cookie), não mais o header X-Admin-Token. Mantido só por
  // retrocompatibilidade. Ver backend/.env.example (ADMIN_API_TOKEN).
  adminApiToken: process.env.EXPO_PUBLIC_ADMIN_API_TOKEN || '',
});
