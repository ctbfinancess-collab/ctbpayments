import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

let sandboxDevice = null;

export function getSandboxDeviceRegistration() {
  if (!sandboxDevice) {
    sandboxDevice = Object.freeze({
      installationId: `sbx_app_${Crypto.randomUUID()}`,
      name: `CTBX SANDBOX ${Platform.OS.toUpperCase()}`,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
  }
  return sandboxDevice;
}
