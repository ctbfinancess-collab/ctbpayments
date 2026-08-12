import ApiError from './ApiError';

export async function request(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new ApiError(data?.message || 'Request failed', { status: response.status, details: data });
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw new ApiError('Request timeout', { code: 'TIMEOUT' });
    throw new ApiError('Network request failed', { code: 'NETWORK_ERROR' });
  } finally { clearTimeout(timeout); }
}
