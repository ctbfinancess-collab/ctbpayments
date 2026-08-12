import { apiConfig } from '../config';
import ApiError from './ApiError';
import { request } from './request';

let accessTokenProvider = () => null;
let deviceIdProvider = () => null;
let refreshHandler = null;
let invalidSessionHandler = null;
let refreshInFlight = null;
let baseURLProvider = () => apiConfig.baseURL;
export function buildAuthHeaders(baseHeaders, token, deviceId) {
  return {
    ...baseHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
  };
}
export function configureApiClient({ getAccessToken, getDeviceId, getBaseURL, onUnauthorized, onSessionInvalid } = {}) {
  accessTokenProvider = getAccessToken || (() => null);
  deviceIdProvider = getDeviceId || (() => null);
  baseURLProvider = getBaseURL || (() => apiConfig.baseURL);
  refreshHandler = onUnauthorized || null;
  invalidSessionHandler = onSessionInvalid || null;
}
export async function apiClient(path, options = {}) {
  const baseURL = baseURLProvider();
  if (!baseURL) throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' });
  const { retryOnUnauthorized = false, skipAuth = false, ...requestOptions } = options;
  const token = skipAuth ? null : accessTokenProvider();
  const deviceId = skipAuth ? null : deviceIdProvider();
  const headers = buildAuthHeaders({ ...apiConfig.defaultHeaders, ...requestOptions.headers }, token, deviceId);
  try {
    return await request(`${baseURL.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`, { ...requestOptions, headers }, apiConfig.timeout);
  } catch (error) {
    const terminalAuthError = error.code === 'AUTH_DEVICE_MISMATCH' || error.code === 'AUTH_REFRESH_TOKEN_REUSED';
    if (error.status === 401 && terminalAuthError) {
      await invalidSessionHandler?.();
      throw error;
    }
    if (error.status === 401 && retryOnUnauthorized && refreshHandler) {
      if (!refreshInFlight) refreshInFlight = Promise.resolve(refreshHandler()).finally(() => { refreshInFlight = null; });
      await refreshInFlight;
      return apiClient(path, { ...options, retryOnUnauthorized: false });
    }
    throw error;
  }
}
