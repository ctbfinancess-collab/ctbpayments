import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Armazenamento dos arquivos do KYC (Fase 4). Recebe SEMPRE bytes já
// criptografados (ver EncryptedDocumentVault) — o bucket nunca vê um
// documento em claro. Bucket privado: não existe URL pública de leitura.
export interface DocumentStorage {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

export class InMemoryDocumentStorage implements DocumentStorage {
  readonly objects = new Map<string, Buffer>();
  async put(key: string, bytes: Buffer): Promise<void> { this.objects.set(key, Buffer.from(bytes)); }
  async get(key: string): Promise<Buffer> {
    const value = this.objects.get(key);
    if (!value) throw new Error('Objeto não encontrado.');
    return Buffer.from(value);
  }
}

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export class S3DocumentStorage implements DocumentStorage {
  private readonly client: S3Client;
  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: bytes, ContentType: 'application/octet-stream' }));
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error('Objeto vazio.');
    return Buffer.from(bytes);
  }
}
