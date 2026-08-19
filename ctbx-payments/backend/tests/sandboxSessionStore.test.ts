import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { InMemorySandboxSessionRepository } from '../src/providers/sandbox/InMemorySandboxSessionRepository.js';
import { SandboxSessionStore } from '../src/providers/sandbox/SandboxSessionStore.js';

// Mesmo espírito de sandboxCardProvider.test.ts: testa a lógica de
// verdade (rotação, expiração, reuso, logout) contra um repositório fake
// em memória — a implementação real (Postgres) usa a MESMA classe
// SandboxSessionStore por cima, só troca o repositório injetado (ver
// app.ts). A prova de que sobrevive a um restart real é feita ao vivo
// (curl + restart do backend), não aqui.

const USER = { id: 'sbx_usr_1', type: 'PF' as const, displayName: 'Cliente Sandbox' };
const ACCOUNT = { id: 'sbx_acc_1', type: 'PERSONAL' as const, status: 'ACTIVE' };

function buildStore(options: { now?: () => number; accessTtlMs?: number; refreshTtlMs?: number } = {}) {
  return new SandboxSessionStore(new InMemorySandboxSessionRepository(), { environment: 'test', ...options });
}

test('constructor is forbidden in production', () => {
  assert.throws(() => new SandboxSessionStore(new InMemorySandboxSessionRepository(), { environment: 'production' }), /forbidden in production/);
});

test('create returns opaque tokens and a context resolvable via getByAccessToken (session recovery)', async () => {
  const store = buildStore();
  const result = await store.create({ user: USER, account: ACCOUNT, deviceId: 'sbx_dev_1' });
  assert.match(result.accessToken, /^sbx_at_/);
  assert.match(result.refreshToken, /^sbx_rt_/);
  assert.match(result.sessionId, /^sbx_ses_/);

  const context = await store.getByAccessToken(result.accessToken);
  assert.ok(context);
  assert.equal(context!.sessionId, result.sessionId);
  assert.deepEqual(context!.user, USER);
  assert.deepEqual(context!.account, ACCOUNT);
});

test('an unknown access token resolves to undefined (invalid session), never throws', async () => {
  const store = buildStore();
  assert.equal(await store.getByAccessToken('sbx_at_not-a-real-token'), undefined);
});

test('an expired access token throws AUTH_ACCESS_TOKEN_EXPIRED', async () => {
  let now = 1_000_000;
  const store = buildStore({ now: () => now, accessTtlMs: 1_000 });
  const result = await store.create({ user: USER, account: ACCOUNT, deviceId: 'sbx_dev_1' });
  now += 2_000; // passa da validade do access token
  await assert.rejects(store.getByAccessToken(result.accessToken), { code: 'AUTH_ACCESS_TOKEN_EXPIRED' });
});

test('logout (revoke) invalidates the session — access token and refresh token both stop working', async () => {
  const store = buildStore();
  const result = await store.create({ user: USER, account: ACCOUNT, deviceId: 'sbx_dev_1' });
  await store.revoke(result.sessionId);
  assert.equal(await store.getByAccessToken(result.accessToken), undefined);
  await assert.rejects(store.refresh(result.refreshToken), { code: 'AUTH_REFRESH_TOKEN_INVALID' });
});

test('refresh rotates to a brand-new session (old access token stops working, new one works)', async () => {
  const store = buildStore();
  const first = await store.create({ user: USER, account: ACCOUNT, deviceId: 'sbx_dev_1' });
  const rotated = await store.refresh(first.refreshToken);
  assert.notEqual(rotated.accessToken, first.accessToken);
  assert.notEqual(rotated.refreshToken, first.refreshToken);
  assert.notEqual(rotated.sessionId, first.sessionId);
  assert.equal(await store.getByAccessToken(first.accessToken), undefined); // sessão antiga revogada
  assert.ok(await store.getByAccessToken(rotated.accessToken)); // sessão nova válida
});

test('reusing an already-rotated refresh token is rejected as AUTH_REFRESH_TOKEN_REUSED, distinct from a plain invalid token', async () => {
  const store = buildStore();
  const first = await store.create({ user: USER, account: ACCOUNT, deviceId: 'sbx_dev_1' });
  await store.refresh(first.refreshToken); // rotaciona uma vez, com sucesso
  await assert.rejects(store.refresh(first.refreshToken), { code: 'AUTH_REFRESH_TOKEN_REUSED' }); // reuso do mesmo token antigo
  await assert.rejects(store.refresh('sbx_rt_never-existed'), { code: 'AUTH_REFRESH_TOKEN_INVALID' }); // token que nunca existiu
});

test('an expired refresh token is rejected and the session is revoked', async () => {
  let now = 1_000_000;
  const store = buildStore({ now: () => now, refreshTtlMs: 1_000 });
  const result = await store.create({ user: USER, account: ACCOUNT, deviceId: 'sbx_dev_1' });
  now += 2_000;
  await assert.rejects(store.refresh(result.refreshToken), { code: 'AUTH_REFRESH_TOKEN_EXPIRED' });
});

test('revokeAllForUser invalidates every session for that user, and only that user', async () => {
  const store = buildStore();
  const sessionA1 = await store.create({ user: USER, account: ACCOUNT, deviceId: 'sbx_dev_1' });
  const sessionA2 = await store.create({ user: USER, account: ACCOUNT, deviceId: 'sbx_dev_2' });
  const otherUser = { id: 'sbx_usr_2', type: 'PF' as const, displayName: 'Outro Cliente' };
  const sessionB = await store.create({ user: otherUser, account: ACCOUNT, deviceId: 'sbx_dev_3' });

  await store.revokeAllForUser(USER.id);
  assert.equal(await store.getByAccessToken(sessionA1.accessToken), undefined);
  assert.equal(await store.getByAccessToken(sessionA2.accessToken), undefined);
  assert.ok(await store.getByAccessToken(sessionB.accessToken)); // outro usuário não afetado
});

test('never stores the raw token — only its SHA-256 hash — so a session record never leaks a usable credential', async () => {
  const repository = new InMemorySandboxSessionRepository();
  const store = new SandboxSessionStore(repository, { environment: 'test' });
  const result = await store.create({ user: USER, account: ACCOUNT, deviceId: 'sbx_dev_1' });
  const record = await repository.findByAccessTokenHash(createHash('sha256').update(result.accessToken).digest('hex'));
  assert.ok(record);
  const serialized = JSON.stringify(record);
  assert.equal(serialized.includes(result.accessToken), false);
  assert.equal(serialized.includes(result.refreshToken), false);
  assert.equal('password' in (record as object), false);
});
