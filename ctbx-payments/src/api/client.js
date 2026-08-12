import { apiConfig } from '../config';
import ApiError from './ApiError';
import { request } from './request';

let accessTokenProvider = () => null;
let refreshHandler = null;
export function configureApiClient({ getAccessToken, onUnauthorized } = {}) {
  if (getAccessToken) accessTokenProvider = getAccessToken;
  if (onUnauthorized) refreshHandler = onUnauthorized;
}
export async function apiClient(path, options = {}) {
  if (!apiConfig.baseURL) throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' });
  const token = accessTokenProvider();
  const headers = { ...apiConfig.defaultHeaders, ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  try { return await request(`${apiConfig.baseURL}/${String(path).replace(/^\//, '')}`, { ...options, headers }, apiConfig.timeout); }
  catch (error) { if (error.status === 401 && refreshHandler) await refreshHandler(); throw error; }
}
