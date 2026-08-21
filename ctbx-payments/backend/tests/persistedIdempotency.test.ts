import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPayload, isUniqueViolation, withPersistedIdempotency } from '../src/providers/sandbox/persistedIdempotency.js';

test('isUniqueViolation recognizes only Postgres error code 23505', () => {
  assert.equal(isUniqueViolation(Object.assign(new Error('x'), { code: '23505' })), true);
  assert.equal(isUniqueViolation(Object.assign(new Error('x'), { code: '23503' })), false);
  assert.equal(isUniqueViolation(new Error('plain')), false);
  assert.equal(isUniqueViolation(null), false);
  assert.equal(isUniqueViolation('not an object'), false);
});

test('hashPayload is deterministic for the same payload and differs for a different one', () => {
  const a = hashPayload({ amountMinor: 1000, currency: 'BRL' });
  const b = hashPayload({ amountMinor: 1000, currency: 'BRL' });
  const c = hashPayload({ amountMinor: 2000, currency: 'BRL' });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('withPersistedIdempotency: no prior record — runs create() once and returns its result', async () => {
  let calls = 0;
  const result = await withPersistedIdempotency({
    raw: { a: 1 },
    find: async () => undefined,
    requestHashOf: (row: { hash: string }) => row.hash,
    create: async () => { calls += 1; return { hash: hashPayload({ a: 1 }), id: 'created-1' }; },
  });
  assert.equal(calls, 1);
  assert.equal(result.id, 'created-1');
});

test('withPersistedIdempotency: existing record with the SAME payload hash — returns it without calling create()', async () => {
  let calls = 0;
  const existing = { hash: hashPayload({ a: 1 }), id: 'already-there' };
  const result = await withPersistedIdempotency({
    raw: { a: 1 },
    find: async () => existing,
    requestHashOf: (row: typeof existing) => row.hash,
    create: async () => { calls += 1; return { hash: hashPayload({ a: 1 }), id: 'should-not-run' }; },
  });
  assert.equal(calls, 0);
  assert.equal(result.id, 'already-there');
});

test('withPersistedIdempotency: existing record with a DIFFERENT payload hash — 409 conflict, create() never runs', async () => {
  let calls = 0;
  const existing = { hash: hashPayload({ a: 1 }), id: 'already-there' };
  await assert.rejects(
    withPersistedIdempotency({
      raw: { a: 2 }, // payload diferente da vez que criou "already-there"
      find: async () => existing,
      requestHashOf: (row: typeof existing) => row.hash,
      create: async () => { calls += 1; return { hash: hashPayload({ a: 2 }), id: 'should-not-run' }; },
    }),
    { code: 'IDEMPOTENCY_KEY_CONFLICT' },
  );
  assert.equal(calls, 0);
});

test('withPersistedIdempotency: concurrent race — create() loses the unique-index race, recovers the winner\'s result instead of failing', async () => {
  // Simula duas requisições concorrentes: a primeira "find" não encontra
  // nada (ainda não foi commitado), mas quando "create" tenta gravar, a
  // OUTRA requisição já venceu e commitou primeiro — o índice único no
  // Postgres rejeita esta segunda inserção (código 23505). Uma segunda
  // busca (dentro do próprio helper) deve então recuperar o resultado da
  // vencedora, sem propagar o erro.
  const winner = { hash: hashPayload({ a: 1 }), id: 'winner' };
  let findCalls = 0;
  const result = await withPersistedIdempotency({
    raw: { a: 1 },
    find: async () => { findCalls += 1; return findCalls === 1 ? undefined : winner; },
    requestHashOf: (row: typeof winner) => row.hash,
    create: async () => { throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' }); },
  });
  assert.equal(result.id, 'winner');
  assert.equal(findCalls, 2);
});

test('withPersistedIdempotency: concurrent race with a genuinely different payload — 409 conflict, not a silent pass-through', async () => {
  const winner = { hash: hashPayload({ a: 1 }), id: 'winner' };
  await assert.rejects(
    withPersistedIdempotency({
      raw: { a: 2 }, // essa requisição usou a MESMA idempotency-key só que com payload diferente do que venceu a corrida
      find: async () => winner, // sempre devolve o "winner" (simula a 2ª busca já achando o registro)
      requestHashOf: (row: typeof winner) => row.hash,
      create: async () => { throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' }); },
    }),
    { code: 'IDEMPOTENCY_KEY_CONFLICT' },
  );
});

test('withPersistedIdempotency: a non-unique-violation error from create() propagates unchanged', async () => {
  await assert.rejects(
    withPersistedIdempotency({
      raw: { a: 1 },
      find: async () => undefined,
      requestHashOf: () => null,
      create: async () => { throw new Error('some other database error'); },
    }),
    /some other database error/,
  );
});
