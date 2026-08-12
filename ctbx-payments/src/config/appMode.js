export const APP_MODES = Object.freeze({ DEMO: 'DEMO', SANDBOX: 'SANDBOX', PRODUCTION: 'PRODUCTION' });

const requestedMode = process.env.EXPO_PUBLIC_APP_MODE;
export const appMode = Object.values(APP_MODES).includes(requestedMode) ? requestedMode : APP_MODES.DEMO;
export const isDemoMode = appMode === APP_MODES.DEMO;
export const isSandboxMode = appMode === APP_MODES.SANDBOX;
export const isProductionMode = appMode === APP_MODES.PRODUCTION;
