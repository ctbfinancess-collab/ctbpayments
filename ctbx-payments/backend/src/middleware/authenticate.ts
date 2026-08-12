import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../errors/ApiError.js';
import type { DeviceBindingProvider, SessionStore } from '../providers/ports.js';

export function authenticate(sessions: SessionStore | undefined, devices: DeviceBindingProvider | undefined) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!sessions || !devices) throw new ApiError('AUTH_PROVIDER_NOT_CONFIGURED', 'A autenticação não está configurada.', { statusCode: 503 });
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new ApiError('AUTH_REQUIRED', 'Autenticação obrigatória.', { statusCode: 401 });
    const accessToken = authorization.slice('Bearer '.length).trim();
    if (!accessToken) throw new ApiError('AUTH_REQUIRED', 'Autenticação obrigatória.', { statusCode: 401 });
    const context = await sessions.getByAccessToken(accessToken);
    if (!context) throw new ApiError('AUTH_ACCESS_TOKEN_INVALID', 'Access token inválido ou revogado.', { statusCode: 401 });
    const presentedDeviceId = request.headers['x-device-id'];
    if (typeof presentedDeviceId !== 'string') throw new ApiError('AUTH_DEVICE_REQUIRED', 'X-Device-Id é obrigatório.', { statusCode: 401 });
    if (!await devices.verify(context.deviceId, presentedDeviceId)) {
      throw new ApiError('AUTH_DEVICE_MISMATCH', 'A sessão não pertence a este dispositivo.', { statusCode: 401 });
    }
    request.auth = context;
  };
}
