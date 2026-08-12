import 'fastify';
import type { AuthContext } from '../providers/ports.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}
