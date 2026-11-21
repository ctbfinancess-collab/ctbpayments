import 'fastify';
import type { AuthContext } from '../providers/ports.js';
import type { AuthenticatedAdmin } from '../services/adminAuthService.js';
import type { AuthenticatedCustomer } from '../services/customerAuthService.js';
import type { AuthenticatedStaff } from '../services/staffAuthService.js';

import type { CriticalAlerter } from '../observability/alerts.js';

declare module 'fastify' {
  interface FastifyInstance {
    criticalAlerter?: CriticalAlerter;
  }
  interface FastifyRequest {
    auth?: AuthContext;
    adminAuth?: AuthenticatedAdmin;
    customerAuth?: AuthenticatedCustomer;
    // Preenchidos pelas rotas de cliente só para o registro de auditoria.
    auditCustomerId?: string;
    staffAuth?: AuthenticatedStaff;
    auditStaffId?: string;
    auditDetails?: Record<string, string | number | boolean>;
  }
}
