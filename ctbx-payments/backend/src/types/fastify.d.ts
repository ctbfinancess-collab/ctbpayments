import 'fastify';
import type { AuthContext } from '../providers/ports.js';
import type { AuthenticatedAdmin } from '../services/adminAuthService.js';
import type { AuthenticatedCustomer } from '../services/customerAuthService.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
    adminAuth?: AuthenticatedAdmin;
    customerAuth?: AuthenticatedCustomer;
  }
}
