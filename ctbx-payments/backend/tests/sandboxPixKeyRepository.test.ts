import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemorySandboxPixKeyRepository } from '../src/providers/sandbox/InMemorySandboxPixKeyRepository.js';

test('create + listActiveByAccount returns only ACTIVE keys for that account', async () => {
  const repo = new InMemorySandboxPixKeyRepository();
  await repo.create({ id: 'k1', accountId: 'acc_a', type: 'EMAIL', keyMasked: 'a@b.c', status: 'ACTIVE' });
  await repo.create({ id: 'k2', accountId: 'acc_b', type: 'EMAIL', keyMasked: 'x@y.z', status: 'ACTIVE' });
  const listA = await repo.listActiveByAccount('acc_a');
  assert.equal(listA.length, 1);
  assert.equal(listA[0]?.id, 'k1');
});

test('remove is a soft delete (status REMOVED), never a hard delete — findById still returns it', async () => {
  const repo = new InMemorySandboxPixKeyRepository();
  await repo.create({ id: 'k1', accountId: 'acc_a', type: 'RANDOM', keyMasked: 'sbx-••••', status: 'ACTIVE' });
  const removed = await repo.remove('k1', 'acc_a');
  assert.equal(removed?.status, 'REMOVED');
  assert.equal((await repo.listActiveByAccount('acc_a')).length, 0);
  const stillThere = await repo.findById('k1', 'acc_a');
  assert.equal(stillThere?.status, 'REMOVED');
});

test('remove refuses a key that belongs to a different account', async () => {
  const repo = new InMemorySandboxPixKeyRepository();
  await repo.create({ id: 'k1', accountId: 'acc_a', type: 'CPF', keyMasked: '***.***.***-**', status: 'ACTIVE' });
  const result = await repo.remove('k1', 'acc_other');
  assert.equal(result, undefined);
  assert.equal((await repo.findById('k1', 'acc_a'))?.status, 'ACTIVE');
});

test('createMany seeds several keys at once', async () => {
  const repo = new InMemorySandboxPixKeyRepository();
  await repo.createMany([
    { id: 'k1', accountId: 'acc_a', type: 'EMAIL', keyMasked: 'a@b.c', status: 'ACTIVE' },
    { id: 'k2', accountId: 'acc_a', type: 'PHONE', keyMasked: '+55 (**) *****-0000', status: 'ACTIVE' },
  ]);
  assert.equal((await repo.listActiveByAccount('acc_a')).length, 2);
});
