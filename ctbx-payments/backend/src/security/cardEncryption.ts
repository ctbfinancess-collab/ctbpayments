import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Criptografia simétrica (AES-256-GCM) só pra PAN completo e CVV do cartão
// virtual SANDBOX — nunca ficam em texto puro no banco. Chave vem de
// SANDBOX_CARD_ENCRYPTION_KEY (32 bytes, base64), gerada uma vez e nunca
// impressa/logada. Fail closed: sem a chave, encrypt/decrypt lançam erro em
// vez de guardar/revelar em texto puro por omissão.
const ALGORITHM = 'aes-256-gcm';

function resolveKey(rawKey: string | undefined): Buffer {
  if (!rawKey) throw new Error('SANDBOX_CARD_ENCRYPTION_KEY não configurada.');
  const key = Buffer.from(rawKey, 'base64');
  if (key.length !== 32) throw new Error('SANDBOX_CARD_ENCRYPTION_KEY deve ter 32 bytes (base64).');
  return key;
}

// Formato de saída: "<iv base64>:<authTag base64>:<ciphertext base64>" —
// tudo que precisa pra decriptar depois, sem guardar nada em outro lugar.
export function encryptCardField(plainText: string, rawKey: string | undefined): string {
  const key = resolveKey(rawKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptCardField(encoded: string, rawKey: string | undefined): string {
  const key = resolveKey(rawKey);
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error('Campo criptografado do cartão em formato inválido.');
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
}
