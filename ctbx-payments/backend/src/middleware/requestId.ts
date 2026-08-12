import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

const safeRequestId = /^[A-Za-z0-9._:-]{8,128}$/;

export function requestIdFactory(request: IncomingMessage): string {
  const candidate = request.headers['x-request-id'];
  return typeof candidate === 'string' && safeRequestId.test(candidate) ? candidate : randomUUID();
}
