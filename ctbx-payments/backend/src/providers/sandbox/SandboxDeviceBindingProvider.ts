import { randomUUID } from 'node:crypto';
import type { Device } from '../../domain/models.js';
import type { DeviceBindingProvider } from '../ports.js';

interface DeviceInput { installationId?: string; platform?: 'ANDROID' | 'IOS'; name?: string }

export class SandboxDeviceBindingProvider implements DeviceBindingProvider {
  private readonly devices = new Map<string, Device>();

  constructor(environment: string) {
    if (environment === 'production') throw new Error('SandboxDeviceBindingProvider is forbidden in production');
  }

  async register(raw: unknown): Promise<Device> {
    const input = raw as DeviceInput;
    const installationId = input.installationId ?? `installation_${randomUUID()}`;
    const existing = this.devices.get(installationId);
    if (existing) return existing;
    const device: Device = { id: `sbx_dev_${randomUUID()}`, platform: input.platform ?? 'ANDROID', trusted: true };
    this.devices.set(installationId, device);
    return device;
  }

  async verify(expectedDeviceId: string, presentedDeviceId: string): Promise<boolean> {
    return expectedDeviceId === presentedDeviceId && expectedDeviceId.startsWith('sbx_dev_');
  }
}
