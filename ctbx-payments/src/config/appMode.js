export const APP_MODES = Object.freeze({ DEMO: 'DEMO', SANDBOX: 'SANDBOX', PRODUCTION: 'PRODUCTION' });

// Regra de segurança (Fase 1 da Área do Cliente): o app NUNCA cai no modo
// demonstração por engano. Sem EXPO_PUBLIC_APP_MODE válido:
//  - em desenvolvimento local (__DEV__ = true), usa DEMO, como antes;
//  - em qualquer build publicado, o modo fica inválido e o app mostra uma
//    tela de erro de configuração (ver configError em env.js), em vez de
//    abrir um "banco de demonstração" que aceita qualquer senha.
const requestedMode = process.env.EXPO_PUBLIC_APP_MODE;
const isDevelopmentBuild = typeof __DEV__ !== 'undefined' && __DEV__ === true;
const isValidMode = Object.values(APP_MODES).includes(requestedMode);

export const appMode = isValidMode ? requestedMode : (isDevelopmentBuild ? APP_MODES.DEMO : null);
export const appModeError = appMode
  ? null
  : 'EXPO_PUBLIC_APP_MODE ausente ou inválido neste build (use PRODUCTION, SANDBOX ou DEMO).';
export const isDemoMode = appMode === APP_MODES.DEMO;
export const isSandboxMode = appMode === APP_MODES.SANDBOX;
export const isProductionMode = appMode === APP_MODES.PRODUCTION;
