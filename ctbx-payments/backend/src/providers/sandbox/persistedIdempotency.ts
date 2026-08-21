import { createHash } from 'node:crypto';
import { ApiError } from '../../errors/ApiError.js';

// Etapa 5.1 — Hardening financeiro: mecanismo de idempotência ÚNICO,
// reutilizado por PIX, Transferência, Pagamento, recarga de Cartão físico/
// TOP, criação de Cartão virtual, Investimentos e Consignado. Nunca um
// Map()/cache em memória do processo — a chave + o hash do payload vivem
// numa coluna real (`idempotency_key`/`request_hash`), com um índice único
// no Postgres garantindo que nem duas requisições concorrentes conseguem
// commitar a mesma chave duas vezes.
export function hashPayload(raw: unknown): string {
  return createHash('sha256').update(JSON.stringify(raw)).digest('hex');
}

// postgres.js expõe o código de erro do Postgres em `error.code` — '23505'
// é unique_violation. InMemoryX* replicam o mesmo formato de erro (ver
// InMemorySandboxLedgerRepository etc.) pra exercitar o MESMO caminho de
// código em teste, sem precisar de concorrência real.
export function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === '23505');
}

export interface PersistedIdempotencyOptions<Row> {
  raw: unknown;
  // Busca um registro já persistido para esta chave (accountId + escopo do
  // domínio + idempotencyKey) — implementado por cada repository.
  find: () => Promise<Row | undefined>;
  // Extrai o hash do payload gravado num registro já existente.
  requestHashOf: (row: Row) => string | null | undefined;
  // Grava o novo registro (já com idempotencyKey + hashPayload(raw) dentro).
  create: () => Promise<Row>;
}

// Replay com a MESMA chave + MESMO payload → devolve exatamente o
// resultado já persistido, sem executar `create()` de novo (sem novo
// débito). MESMA chave + payload DIFERENTE → 409 IDEMPOTENCY_KEY_CONFLICT.
// Duas requisições concorrentes com a mesma chave: a que perder a corrida
// no índice único do Postgres recupera o resultado da vencedora em vez de
// falhar (ou gera o mesmo 409, se o payload realmente for diferente).
export async function withPersistedIdempotency<Row>(options: PersistedIdempotencyOptions<Row>): Promise<Row> {
  const hash = hashPayload(options.raw);
  const existing = await options.find();
  if (existing) {
    if (options.requestHashOf(existing) !== hash) throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key reutilizada com payload diferente.', { statusCode: 409 });
    return existing;
  }
  try {
    return await options.create();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const winner = await options.find();
    if (!winner) throw error;
    if (options.requestHashOf(winner) !== hash) throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key reutilizada com payload diferente.', { statusCode: 409 });
    return winner;
  }
}
