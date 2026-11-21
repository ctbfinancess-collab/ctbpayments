import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DocumentStorage } from './DocumentStorage.js';

// Cofre dos documentos do KYC (Fase 4): cada arquivo é criptografado com
// AES-256-GCM ANTES de sair da API, com um IV novo por arquivo. A chave
// vem de KYC_DOCUMENT_ENCRYPTION_KEY (32 bytes em base64) e nunca é
// gravada no banco nem no bucket; o banco guarda só o IV, a etiqueta de
// autenticação e o identificador da chave (para permitir troca de chave).
export interface SealedDocument {
  storageKey: string;
  keyId: string;
  iv: string;
  authTag: string;
  sha256: string;
}

export function parseEncryptionKey(raw: string | undefined): Buffer | undefined {
  if (!raw) return undefined;
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('KYC_DOCUMENT_ENCRYPTION_KEY deve ter 32 bytes em base64.');
  return key;
}

export class EncryptedDocumentVault {
  constructor(private readonly storage: DocumentStorage, private readonly key: Buffer, private readonly keyId = 'v1') {
    if (key.length !== 32) throw new Error('Chave de criptografia inválida.');
  }

  async seal(customerId: string, plaintext: Buffer): Promise<SealedDocument> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Nome do objeto sem nada pessoal: id do cliente + id aleatório.
    const storageKey = `kyc/${customerId}/${randomUUID()}.bin`;
    await this.storage.put(storageKey, ciphertext);
    return { storageKey, keyId: this.keyId, iv: iv.toString('base64'), authTag: authTag.toString('base64'), sha256: createHash('sha256').update(plaintext).digest('hex') };
  }

  // Usado só pela análise (painel administrativo) — nunca exposto ao cliente.
  async open(sealed: Pick<SealedDocument, 'storageKey' | 'iv' | 'authTag'>): Promise<Buffer> {
    const ciphertext = await this.storage.get(sealed.storageKey);
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(sealed.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(sealed.authTag, 'base64'));
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

// Confere o tipo REAL do arquivo pelos primeiros bytes (não pela extensão
// nem pelo cabeçalho enviado pelo navegador).
export function detectDocumentType(bytes: Buffer): 'image/jpeg' | 'image/png' | 'application/pdf' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
}
