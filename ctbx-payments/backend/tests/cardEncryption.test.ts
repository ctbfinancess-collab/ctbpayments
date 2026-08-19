import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { decryptCardField, encryptCardField } from '../src/security/cardEncryption.js';

const KEY = randomBytes(32).toString('base64');

test('encrypt then decrypt round-trips to the exact original value', () => {
  const encrypted = encryptCardField('4111111111111234', KEY);
  assert.notEqual(encrypted, '4111111111111234'); // nunca em texto puro
  assert.equal(decryptCardField(encrypted, KEY), '4111111111111234');
});

test('same plaintext encrypted twice produces different ciphertext (random IV)', () => {
  const first = encryptCardField('123', KEY);
  const second = encryptCardField('123', KEY);
  assert.notEqual(first, second);
  assert.equal(decryptCardField(first, KEY), '123');
  assert.equal(decryptCardField(second, KEY), '123');
});

test('decrypting with the wrong key fails instead of silently returning garbage', () => {
  const encrypted = encryptCardField('999', KEY);
  const wrongKey = randomBytes(32).toString('base64');
  assert.throws(() => decryptCardField(encrypted, wrongKey));
});

test('fails closed without a configured key, never falls back to plaintext', () => {
  assert.throws(() => encryptCardField('123', undefined), /SANDBOX_CARD_ENCRYPTION_KEY/);
  assert.throws(() => decryptCardField('a:b:c', undefined), /SANDBOX_CARD_ENCRYPTION_KEY/);
});

test('rejects a key that is not exactly 32 bytes', () => {
  const shortKey = randomBytes(16).toString('base64');
  assert.throws(() => encryptCardField('123', shortKey), /32 bytes/);
});
