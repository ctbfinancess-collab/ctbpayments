import { env } from './env';

export const apiConfig = Object.freeze({
  baseURL: env.apiBaseUrl.replace(/\/$/, ''),
  timeout: env.apiTimeoutMs,
  defaultHeaders: Object.freeze({ Accept: 'application/json', 'Content-Type': 'application/json' }),
});
