import { providerNotConfigured } from '../errors/ApiError.js';

export function requireProvider<T>(provider: T | undefined, domain: string): T {
  if (!provider) throw providerNotConfigured(domain);
  return provider;
}
