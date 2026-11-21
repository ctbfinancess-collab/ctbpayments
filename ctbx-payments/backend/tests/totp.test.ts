import assert from 'node:assert/strict';
import test from 'node:test';
import { base32Decode, base32Encode, generateTotpSecret, openTotpSecret, otpauthUrl, sealTotpSecret, totpCode, totpStep, verifyTotp } from '../src/security/totp.js';

test('TOTP matches the official RFC 6238 test vector (SHA-1)', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  // RFC 6238, T=59s → 94287082; com 6 dígitos → 287082.
  assert.equal(totpCode(secret, totpStep(new Date(59_000)), 8), '94287082');
  assert.equal(totpCode(secret, totpStep(new Date(1_111_111_109_000)), 8), '07081804');
  assert.equal(totpCode(secret, totpStep(new Date(59_000))), '287082');
});

test('verifyTotp accepts the current code (±1 step), rejects reuse and wrong codes', () => {
  const secret = generateTotpSecret();
  const now = new Date('2026-11-21T12:00:10Z');
  const step = totpStep(now);
  assert.equal(verifyTotp(secret, totpCode(secret, step), now, null), step);
  assert.equal(verifyTotp(secret, totpCode(secret, step - 1), now, null), step - 1);
  assert.equal(verifyTotp(secret, totpCode(secret, step), now, step), null); // já usado
  assert.equal(verifyTotp(secret, totpCode(secret, step - 3), now, null), null); // velho demais
  assert.equal(verifyTotp(secret, '12345', now, null), null);
  assert.equal(verifyTotp(secret, 'abcdef', now, null), null);
});

test('base32 round-trips and the secret is stored encrypted', () => {
  const raw = Buffer.from('qualquer-coisa-123');
  assert.deepEqual(base32Decode(base32Encode(raw)), raw);
  const key = Buffer.alloc(32, 5);
  const secret = generateTotpSecret();
  const sealed = sealTotpSecret(secret, key);
  assert.equal(sealed.includes(secret), false);
  assert.equal(openTotpSecret(sealed, key), secret);
  assert.throws(() => openTotpSecret(sealed, Buffer.alloc(32, 6)));
  assert.match(otpauthUrl('CTBX Payments', 'a@b.c', secret), /^otpauth:\/\/totp\/CTBX%20Payments%3Aa%40b\.c\?secret=[A-Z2-7]+&issuer=CTBX%20Payments/);
});
