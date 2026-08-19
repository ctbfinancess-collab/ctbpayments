import assert from 'node:assert/strict';
import test from 'node:test';
import * as argon2 from 'argon2';
import type { AdminSessionRepository, AdminSessionRecord } from '../src/repositories/AdminSessionRepository.js';
import type { AdminUserRepository, AdminUserRecord } from '../src/repositories/AdminUserRepository.js';
import { AdminAuthService } from '../src/services/adminAuthService.js';

// Fakes em memória — nenhum banco real é necessário para testar a lógica
// de autenticação (hash de senha, emissão/validação/expiração/revogação de
// sessão). Os repositórios reais (Drizzle/Postgres) só serão exercidos
// quando DATABASE_URL existir.
function fakeUserRepository(users: AdminUserRecord[]): AdminUserRepository {
  return {
    findByEmail: async (email: string) => users.find((user) => user.email === email),
    findById: async (id: string) => users.find((user) => user.id === id),
    touchLastLogin: async () => {},
  } as unknown as AdminUserRepository;
}

function fakeSessionRepository() {
  const store = new Map<string, AdminSessionRecord>();
  const repository = {
    create: async (input: { adminUserId: string; tokenHash: string; expiresAt: Date }) => {
      store.set(input.tokenHash, { id: input.tokenHash, adminUserId: input.adminUserId, tokenHash: input.tokenHash, expiresAt: input.expiresAt, revokedAt: null });
    },
    findByTokenHash: async (tokenHash: string) => store.get(tokenHash),
    revoke: async (tokenHash: string) => {
      const record = store.get(tokenHash);
      if (record) record.revokedAt = new Date();
    },
  };
  return { repository: repository as unknown as AdminSessionRepository, store };
}

async function buildFixture(overrides: Partial<AdminUserRecord> = {}) {
  const passwordHash = await argon2.hash('correct horse battery staple');
  const user: AdminUserRecord = {
    id: 'admin-1', name: 'Ana Admin', email: 'ana@ctbxpayments.com', passwordHash, role: 'admin', active: true, ...overrides,
  };
  const users = fakeUserRepository([user]);
  const { repository: sessions } = fakeSessionRepository();
  return { service: new AdminAuthService(users, sessions), user };
}

test('login succeeds with correct credentials and creates a session token', async () => {
  const { service } = await buildFixture();
  const result = await service.login('ana@ctbxpayments.com', 'correct horse battery staple');
  assert.ok(result);
  assert.equal(result!.admin.email, 'ana@ctbxpayments.com');
  assert.equal(typeof result!.token, 'string');
  assert.ok(result!.token.length >= 32);
});

test('login rejects a wrong password', async () => {
  const { service } = await buildFixture();
  const result = await service.login('ana@ctbxpayments.com', 'wrong password');
  assert.equal(result, null);
});

test('login rejects an unknown e-mail without throwing', async () => {
  const { service } = await buildFixture();
  const result = await service.login('unknown@ctbxpayments.com', 'anything at all');
  assert.equal(result, null);
});

test('login rejects an inactive admin even with the correct password', async () => {
  const { service } = await buildFixture({ active: false });
  const result = await service.login('ana@ctbxpayments.com', 'correct horse battery staple');
  assert.equal(result, null);
});

test('validateSession accepts a freshly issued token and rejects a random one', async () => {
  const { service } = await buildFixture();
  const login = await service.login('ana@ctbxpayments.com', 'correct horse battery staple');
  const validated = await service.validateSession(login!.token);
  assert.equal(validated?.email, 'ana@ctbxpayments.com');
  const invalid = await service.validateSession('not-a-real-token');
  assert.equal(invalid, null);
});

test('logout revokes the session so it can no longer be validated', async () => {
  const { service } = await buildFixture();
  const login = await service.login('ana@ctbxpayments.com', 'correct horse battery staple');
  await service.logout(login!.token);
  const validated = await service.validateSession(login!.token);
  assert.equal(validated, null);
});

test('an expired session is rejected even if never revoked', async () => {
  const passwordHash = await argon2.hash('correct horse battery staple');
  const user: AdminUserRecord = { id: 'admin-1', name: 'Ana Admin', email: 'ana@ctbxpayments.com', passwordHash, role: 'admin', active: true };
  const users = fakeUserRepository([user]);
  const { repository: sessions, store } = fakeSessionRepository();
  const service = new AdminAuthService(users, sessions);
  const login = await service.login('ana@ctbxpayments.com', 'correct horse battery staple');
  // Simula expiração retroagindo o expiresAt gravado, sem depender de temporizador real.
  for (const record of store.values()) record.expiresAt = new Date(Date.now() - 1000);
  const validated = await service.validateSession(login!.token);
  assert.equal(validated, null);
});
