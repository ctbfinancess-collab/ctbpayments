import { ApiError } from '../errors/ApiError.js';
import type { AuthProvider, AuthResult } from './ports.js';

interface DemoLogin { username?: string; password?: string; device?: { installationId?: string; platform?: 'ANDROID' | 'IOS' } }

export class DemoAuthProvider implements AuthProvider {
  constructor(environment: string) {
    if (environment === 'production') throw new Error('DemoAuthProvider is forbidden in production');
  }

  async login(raw: unknown): Promise<AuthResult> {
    const input = raw as DemoLogin;
    if (input.username !== 'demo' || input.password !== 'DEMO_ONLY') {
      throw new ApiError('AUTH_INVALID_CREDENTIALS', 'Credenciais de demonstração inválidas.', { statusCode: 401 });
    }
    return {
      user: { id: 'usr_demo', type: 'PF', displayName: 'Cliente Demonstração' },
      account: { id: 'acc_demo', type: 'PERSONAL', status: 'ACTIVE' },
      device: { id: input.device?.installationId ?? 'dev_demo', platform: input.device?.platform ?? 'ANDROID', trusted: false },
      accessToken: null,
      refreshToken: null,
    };
  }

  async refresh(): Promise<AuthResult> {
    throw new ApiError('AUTH_REFRESH_NOT_CONFIGURED', 'Renovação de sessão não está configurada.', { statusCode: 503 });
  }
}
