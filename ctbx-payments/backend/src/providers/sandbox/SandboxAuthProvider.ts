import type { Account, User } from '../../domain/models.js';
import { ApiError } from '../../errors/ApiError.js';
import type { AuthProvider, AuthResult, DeviceBindingProvider, SessionStore } from '../ports.js';

export const SANDBOX_EMAIL = 'demo@ctbx.local';
export const SANDBOX_PASSWORD = 'DEMO_ONLY';

interface LoginInput { username?: string; password?: string; device?: unknown }

export class SandboxAuthProvider implements AuthProvider {
  constructor(private readonly sessions: SessionStore, private readonly devices: DeviceBindingProvider, environment: string) {
    if (environment === 'production') throw new Error('SandboxAuthProvider is forbidden in production');
  }

  async login(raw: unknown): Promise<AuthResult> {
    const input = raw as LoginInput;
    if (input.username !== SANDBOX_EMAIL || input.password !== SANDBOX_PASSWORD) {
      throw new ApiError('AUTH_INVALID_CREDENTIALS', 'Credenciais inválidas.', { statusCode: 401 });
    }
    const user: User = { id: 'sbx_usr_nonperson', type: 'PF', displayName: 'Usuário Sandbox' };
    const account: Account = {
      id: 'sbx_acc_nonbanking', type: 'PERSONAL', accountType: 'CHECKING', currency: 'BRL',
      status: 'ACTIVE', maskedAgency: 'SBX-0001', maskedNumber: 'SBX-000000-0',
    };
    const device = await this.devices.register(input.device);
    return this.sessions.create({ user, account, deviceId: device.id });
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    return this.sessions.refresh(refreshToken);
  }
}
