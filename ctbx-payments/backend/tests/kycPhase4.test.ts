import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { loadConfig } from '../src/config/env.js';
import type { InMemorySecurityAuditRepository } from '../src/repositories/SecurityAuditRepository.js';
import { InMemoryCustomerKycRepository, InMemoryKycDocumentRepository } from '../src/repositories/InMemoryCustomerKycRepository.js';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { CustomerKycService } from '../src/services/customerKycService.js';
import { InMemoryDocumentStorage } from '../src/storage/DocumentStorage.js';
import { EncryptedDocumentVault } from '../src/storage/EncryptedDocumentVault.js';
import { verifyEmail } from './helpers/verifyEmail.js';

// Fase 4 — KYC completo: endereço, declarações, documentos criptografados e
// envio para análise.
const config: AppConfig = {
  nodeEnv: 'test', host: '0.0.0.0', port: 3000, apiVersion: 'v1', logLevel: 'silent', corsOrigins: [],
  adminApiToken: undefined, databaseUrl: undefined, adminSessionSecret: undefined, sandboxCardEncryptionKey: undefined, resendApiKey: undefined, emailFrom: undefined, customerAppBaseUrl: undefined,
};
const A = { name: 'Cliente Fictício A', document: '111.444.777-35', email: 'a@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' };
const B = { name: 'Cliente Fictício B', document: '529.982.247-25', email: 'b@sandbox.invalid', phone: '11988880000', password: 'senha-forte-456' };

// Arquivos mínimos com a "assinatura" real de cada formato.
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('conteudo-ficticio-do-documento-JPEG')]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('conteudo-ficticio-PNG')]);
const PDF = Buffer.from('%PDF-1.7\nconteudo-ficticio-PDF');

const ADDRESS = { cep: '01310-100', street: 'Avenida Paulista', number: '1000', complement: 'Sala 1', district: 'Bela Vista', city: 'São Paulo', state: 'sp' };
const DECLARATIONS = { isPep: false, occupation: 'Analista', incomeRange: 'DE_5K_A_10K' };

async function setup() {
  const app = await buildApp({ config, providers: {}, logger: false });
  const login = async (p: typeof A) => {
    await app.inject({ method: 'POST', url: '/v1/customers/register', payload: p });
    await verifyEmail(app, p.email);
    return (await app.inject({ method: 'POST', url: '/v1/customers/login', payload: { email: p.email, password: p.password } })).json().data.token as string;
  };
  const as = (token: string) => ({
    get: (url: string) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } }),
    put: (url: string, payload: unknown) => app.inject({ method: 'PUT', url, payload: payload as object, headers: { authorization: `Bearer ${token}` } }),
    post: (url: string, payload: unknown = {}) => app.inject({ method: 'POST', url, payload: payload as object, headers: { authorization: `Bearer ${token}` } }),
    upload: (kind: string, bytes: Buffer, type = 'application/octet-stream') => app.inject({ method: 'POST', url: `/v1/customers/kyc/documents/${kind}`, payload: bytes, headers: { authorization: `Bearer ${token}`, 'content-type': type } }),
  });
  const storage = (app as unknown as { testKycStorage: InMemoryDocumentStorage }).testKycStorage;
  const audit = (app as unknown as { testAuditLog: InMemorySecurityAuditRepository }).testAuditLog;
  return { app, login, as, storage, audit };
}

async function completeEverything(c: ReturnType<Awaited<ReturnType<typeof setup>>['as']>) {
  await c.put('/v1/customers/kyc/personal-info', { birthDate: '1990-05-15', motherName: 'Mãe Fictícia', nationality: 'Brasileira' });
  await c.put('/v1/customers/kyc/address', ADDRESS);
  await c.put('/v1/customers/kyc/declarations', DECLARATIONS);
  await c.put('/v1/customers/kyc/document-type', { documentType: 'RG' });
  for (const [kind, bytes] of [['ID_FRONT', JPEG], ['ID_BACK', JPEG], ['SELFIE', PNG], ['PROOF_OF_ADDRESS', PDF]] as const) {
    const r = await c.upload(kind, bytes);
    assert.equal(r.statusCode, 201, `${kind}: ${r.body}`);
  }
}

test('full KYC: every step completes, submit moves to SUBMITTED and then everything is locked', async (t) => {
  const { app, login, as } = await setup();
  t.after(() => app.close());
  const c = as(await login(A));
  const start = (await c.get('/v1/customers/kyc')).json().data.kyc;
  assert.deepEqual(start.missing, ['PERSONAL_INFO', 'ADDRESS', 'DECLARATIONS', 'ID_DOCUMENT_TYPE', 'ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS']);
  assert.equal(start.canSubmit, false);
  await completeEverything(c);
  const ready = (await c.get('/v1/customers/kyc')).json().data.kyc;
  assert.deepEqual(ready.missing, []);
  assert.equal(ready.canSubmit, true);
  assert.equal(ready.address.cep, '01310100');
  assert.equal(ready.address.state, 'SP');
  assert.equal(ready.documents.items.length, 4);
  const submitted = await c.post('/v1/customers/kyc/submit');
  assert.equal(submitted.statusCode, 200);
  assert.equal(submitted.json().data.kyc.status, 'SUBMITTED');
  assert.ok(submitted.json().data.kyc.submittedAt);
  for (const r of [await c.put('/v1/customers/kyc/address', ADDRESS), await c.put('/v1/customers/kyc/personal-info', { nationality: 'Outra' }), await c.upload('SELFIE', PNG), await c.post('/v1/customers/kyc/submit')]) {
    assert.equal(r.statusCode, 409);
    assert.equal(r.json().error.code, 'KYC_LOCKED');
  }
  assert.equal((await c.get('/v1/customers/me')).json().data.kyc.status, 'SUBMITTED');
});

test('submit is refused while something is missing, and says what is missing', async (t) => {
  const { app, login, as } = await setup();
  t.after(() => app.close());
  const c = as(await login(A));
  await c.put('/v1/customers/kyc/address', ADDRESS);
  const r = await c.post('/v1/customers/kyc/submit');
  assert.equal(r.statusCode, 422);
  assert.equal(r.json().error.code, 'KYC_INCOMPLETE');
});

test('uploads check the REAL file type, size and kind', async (t) => {
  const { app, login, as } = await setup();
  t.after(() => app.close());
  const c = as(await login(A));
  const fakeImage = await c.upload('ID_FRONT', Buffer.from('<html>não sou uma imagem</html>'), 'image/jpeg');
  assert.equal(fakeImage.statusCode, 415);
  assert.equal((await c.upload('SELFIE', PDF, 'application/pdf')).statusCode, 415); // selfie só foto
  assert.equal((await c.upload('ID_FRONT', Buffer.alloc(0))).statusCode, 422);
  assert.equal((await c.upload('OUTRA_COISA', JPEG)).statusCode, 422);
  const tooBig = await c.upload('ID_FRONT', Buffer.concat([JPEG, Buffer.alloc(10 * 1024 * 1024)]));
  assert.equal(tooBig.statusCode, 413);
});

test('files are stored ENCRYPTED: the bucket never sees the original bytes, and they decrypt back exactly', async () => {
  const storage = new InMemoryDocumentStorage();
  const key = Buffer.alloc(32, 7);
  const vault = new EncryptedDocumentVault(storage, key);
  const customers = new InMemoryCustomerRepository();
  const docs = new InMemoryKycDocumentRepository();
  const service = new CustomerKycService(customers, new InMemoryCustomerKycRepository(), undefined, docs, vault, true);
  const customer = await customers.create({ type: 'PF', name: 'X', document: '11144477735', email: 'x@sandbox.invalid', phone: '11999990000', passwordHash: 'h' });
  await service.uploadDocument(customer.id, 'ID_FRONT', JPEG);
  const [stored] = [...storage.objects.values()];
  assert.ok(stored);
  assert.equal(stored.includes(Buffer.from('conteudo-ficticio-do-documento-JPEG')), false);
  assert.notDeepEqual(stored, JPEG);
  const [record] = docs.documents;
  assert.deepEqual(await vault.open(record!), JPEG);
  assert.match(record!.storageKey, new RegExp(`^kyc/${customer.id}/[0-9a-f-]+\\.bin$`)); // nome sem dado pessoal
  // Com a chave errada, não abre.
  await assert.rejects(new EncryptedDocumentVault(storage, Buffer.alloc(32, 9)).open(record!));
});

test('a new file replaces the previous one of the same kind (history kept as REPLACED)', async () => {
  const customers = new InMemoryCustomerRepository();
  const docs = new InMemoryKycDocumentRepository();
  const service = new CustomerKycService(customers, new InMemoryCustomerKycRepository(), undefined, docs, new EncryptedDocumentVault(new InMemoryDocumentStorage(), Buffer.alloc(32, 1)), true);
  const customer = await customers.create({ type: 'PF', name: 'X', document: '11144477735', email: 'x@sandbox.invalid', phone: '11999990000', passwordHash: 'h' });
  await service.uploadDocument(customer.id, 'SELFIE', JPEG);
  await service.uploadDocument(customer.id, 'SELFIE', PNG);
  assert.deepEqual(docs.documents.map((d) => d.status), ['REPLACED', 'ACTIVE']);
  const overview = await service.getOverview(customer.id);
  assert.equal(overview.documents.items.length, 1);
  assert.equal(overview.documents.items[0]!.contentType, 'image/png');
});

test('a PDF of the ID front (front and back together) makes the back optional', async (t) => {
  const { app, login, as } = await setup();
  t.after(() => app.close());
  const c = as(await login(A));
  await c.upload('ID_FRONT', PDF, 'application/pdf');
  const kyc = (await c.get('/v1/customers/kyc')).json().data.kyc;
  assert.equal(kyc.missing.includes('ID_BACK'), false);
});

test('one customer never sees or changes another customer KYC (identity only from the token)', async (t) => {
  const { app, login, as } = await setup();
  t.after(() => app.close());
  const a = as(await login(A));
  const b = as(await login(B));
  await completeEverything(a);
  const bView = (await b.get('/v1/customers/kyc')).json().data.kyc;
  assert.equal(bView.documents.items.length, 0);
  assert.equal(bView.address.cep, null);
});

test('address and declarations are validated', async (t) => {
  const { app, login, as } = await setup();
  t.after(() => app.close());
  const c = as(await login(A));
  assert.equal((await c.put('/v1/customers/kyc/address', { ...ADDRESS, state: 'XX' })).json().error.code, 'KYC_STATE_INVALID');
  assert.equal((await c.put('/v1/customers/kyc/address', { ...ADDRESS, cep: '0131010a' })).json().error.code, 'KYC_CEP_INVALID');
  assert.equal((await c.put('/v1/customers/kyc/declarations', { ...DECLARATIONS, incomeRange: 'MUITO' })).statusCode, 422);
  assert.equal((await c.put('/v1/customers/kyc/document-type', { documentType: 'PASSAPORTE' })).statusCode, 422);
});

test('the audit log records uploads and submission with kind and size only, never the file or the address', async (t) => {
  const { app, login, as, audit } = await setup();
  t.after(() => app.close());
  const c = as(await login(A));
  await completeEverything(c);
  await c.post('/v1/customers/kyc/submit');
  const uploads = audit.events.filter((e) => e.event === 'CUSTOMER_KYC_DOCUMENT_UPLOAD');
  assert.equal(uploads.length, 4);
  assert.deepEqual(Object.keys(uploads[0]!.details!).sort(), ['contentType', 'kind', 'sizeBytes', 'statusCode']);
  assert.ok(audit.events.some((e) => e.event === 'CUSTOMER_KYC_SUBMIT' && e.outcome === 'SUCCESS'));
  const dump = JSON.stringify(audit.events);
  for (const secret of ['Avenida Paulista', '01310', 'Analista', 'conteudo-ficticio', 'Mãe Fictícia']) assert.equal(dump.includes(secret), false, secret);
});

test('in production, document uploads stay OFF unless explicitly enabled AND configured', async () => {
  assert.equal(loadConfig({ NODE_ENV: 'production' }).kyc?.uploadsEnabled, false);
  assert.equal(loadConfig({ NODE_ENV: 'production', KYC_DOCUMENT_UPLOADS_ENABLED: 'true' }).kyc?.bucket, undefined);
  const customers = new InMemoryCustomerRepository();
  const service = new CustomerKycService(customers, new InMemoryCustomerKycRepository(), undefined, new InMemoryKycDocumentRepository(), undefined, true);
  const customer = await customers.create({ type: 'PF', name: 'X', document: '11144477735', email: 'x@sandbox.invalid', phone: '11999990000', passwordHash: 'h' });
  await assert.rejects(service.uploadDocument(customer.id, 'ID_FRONT', JPEG), (e: unknown) => (e as { code?: string }).code === 'KYC_UPLOADS_DISABLED');
  assert.equal((await service.getOverview(customer.id)).documents.uploadsEnabled, false);
});
