import { isDemoMode } from '../config';
import { ApiError } from '../api';
export function demoOrThrow(factory) {
  if (isDemoMode) return Promise.resolve().then(factory);
  throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' });
}
