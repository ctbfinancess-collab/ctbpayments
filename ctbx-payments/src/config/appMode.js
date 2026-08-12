export const APP_MODES = Object.freeze({ DEMO: 'DEMO', PRODUCTION: 'PRODUCTION' });

const requestedMode = process.env.EXPO_PUBLIC_APP_MODE;
export const appMode = requestedMode === APP_MODES.PRODUCTION ? APP_MODES.PRODUCTION : APP_MODES.DEMO;
export const isDemoMode = appMode === APP_MODES.DEMO;
export const isProductionMode = appMode === APP_MODES.PRODUCTION;
