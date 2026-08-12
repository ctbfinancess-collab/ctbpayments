import { env } from '../config';

export function hasSessionExpired(lastActivity, now = Date.now()) {
  if (!lastActivity) return false;
  return now - lastActivity >= env.sessionTimeoutMs;
}
