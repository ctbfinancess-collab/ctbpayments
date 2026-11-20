import { appMode, appModeError, isProductionMode, isSandboxMode } from './appMode';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';

// Erro de configuração do build. Quando existe, o app não abre nada além
// de uma tela de "serviço indisponível" (ver App.js) — nunca um modo
// inseguro ou de demonstração no lugar.
export const configError = appModeError
  || ((isProductionMode || isSandboxMode) && !apiBaseUrl ? 'EXPO_PUBLIC_API_BASE_URL ausente neste build.' : null);

export const env = Object.freeze({
  appMode,
  apiBaseUrl,
  apiTimeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) || 15000,
  sessionTimeoutMs: Number(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MS) || 15 * 60 * 1000,
  // Painel administrativo embutido neste app: DESLIGADO por padrão. A Área
  // do Cliente publicada nunca expõe /admin; o painel terá endereço próprio
  // (Fase 6). Só liga com EXPO_PUBLIC_ENABLE_ADMIN=true (uso interno/local).
  adminEnabled: process.env.EXPO_PUBLIC_ENABLE_ADMIN === 'true',
});
