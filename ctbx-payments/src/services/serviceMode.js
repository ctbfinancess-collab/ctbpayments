import { isDemoMode, isSandboxMode } from '../config';
import { ApiError } from '../api';
export function demoOrThrow(factory) {
  if (isDemoMode) return Promise.resolve().then(factory);
  if (isSandboxMode) throw new ApiError('Operação indisponível no ambiente sandbox', { code: 'SANDBOX_OPERATION_UNAVAILABLE' });
  throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' });
}
