import { apiClient } from '../api';

let refreshPromise = null;

export function mapSandboxSession(data) {
  return {
    user: data.user,
    account: data.account,
    sessionId: data.sessionId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
    device: { id: data.deviceId, name: 'DISPOSITIVO SANDBOX' },
    deviceId: data.deviceId,
    demoMode: false,
    sandboxMode: true,
    lastActivity: Date.now(),
  };
}

export async function sandboxLogin(credentials, device, client = apiClient) {
  const response = await client('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: credentials.email, password: credentials.password, device }),
    skipAuth: true,
    retryOnUnauthorized: false,
  });
  return mapSandboxSession(response.data);
}

export async function refreshSandboxSession(session, client = apiClient) {
  if (!refreshPromise) {
    refreshPromise = client('/v1/auth/refresh', {
      method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }), skipAuth: true, retryOnUnauthorized: false,
    }).then((response) => mapSandboxSession(response.data)).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function logoutSandboxSession(client = apiClient) {
  return client('/v1/auth/logout', { method: 'POST', body: JSON.stringify({}), retryOnUnauthorized: false });
}
