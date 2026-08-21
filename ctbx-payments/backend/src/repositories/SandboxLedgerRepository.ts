import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sandboxAccountTransactions, sandboxAccounts, sandboxOperations } from '../db/schema/index.js';
import type { CreateSandboxAccountTransactionInput } from './SandboxAccountRepository.js';

export type OperationKind = 'PIX_TRANSFER' | 'BANK_TRANSFER' | 'BILL_PAYMENT' | 'CARD_RECHARGE' | 'TRANSPORT_RECHARGE' | 'INVESTMENT_ORDER';
export type OperationStatus = 'COMPLETED' | 'SCHEDULED';

export interface SandboxOperationRecord {
  id: string; accountId: string; kind: OperationKind; status: OperationStatus; amountMinor: number;
  currency: string; scheduledFor: Date | null; accountTransactionId: string | null; details: Record<string, unknown>;
  idempotencyKey: string | null; createdAt: Date;
}

export interface RecordOperationInput {
  operationId: string; accountId: string; kind: OperationKind; status: OperationStatus; amountMinor: number;
  scheduledFor?: Date; details: Record<string, unknown>;
  // Só definido quando status === 'COMPLETED' — um agendamento não debita/
  // credita nem lança no extrato agora, só quando for de fato executado
  // (fora do escopo desta etapa, mesmo comportamento de antes).
  ledgerEntry?: { transaction: CreateSandboxAccountTransactionInput; balanceField: 'availableMinor' | 'ledgerMinor'; deltaMinor: number };
  // Etapa 5 — só investimentos usam isto (ver findByIdempotencyKey). Nulo
  // em todo o resto (PIX/Transferência/Pagamento/Cartão), que segue com o
  // cache de idempotência em memória (ressalva já registrada).
  idempotencyKey?: string;
}

// Interface própria — mesmo motivo dos outros repositórios desta
// consolidação (Etapas 1/2): PIX/Transferência/Pagamento nunca sabem se
// estão falando com Postgres de verdade ou com o fallback em memória.
export interface SandboxLedgerRepository {
  recordOperation(input: RecordOperationInput): Promise<SandboxOperationRecord>;
  findById(id: string, accountId: string): Promise<SandboxOperationRecord | undefined>;
  // Usado pelas posições de investimento (Etapa 5) — a única leitura que
  // precisa enumerar TODAS as operações de um tipo de uma conta, em vez de
  // buscar uma por id (PIX/Transferência/Pagamento/Cartão nunca precisaram
  // disso: cada um sempre foi consultado por id específico).
  listByAccountAndKind(accountId: string, kind: OperationKind): Promise<SandboxOperationRecord[]>;
  // Idempotência persistida (Etapa 5, só investimentos — ver comentário em
  // RecordOperationInput.idempotencyKey): permite que "aplicar" detecte um
  // replay mesmo depois de um restart, sem depender de nenhum Map() em
  // memória do processo.
  findByIdempotencyKey(accountId: string, kind: OperationKind, idempotencyKey: string): Promise<SandboxOperationRecord | undefined>;
}

// Único lugar que escreve nas 3 tabelas de uma operação financeira
// (sandbox_operations + sandbox_account_transactions + sandbox_accounts)
// numa transação real do Postgres — "operação financeira + alteração de
// saldo + lançamento no extrato devem ocorrer atomicamente": se qualquer
// parte falhar (ex.: saldo ficaria negativo), a transação inteira é
// revertida, nada fica aplicado pela metade. PIX/Transferência/Pagamento
// nunca tocam sandbox_accounts diretamente — só por aqui.
export class PostgresSandboxLedgerRepository implements SandboxLedgerRepository {
  constructor(private readonly db: Db) {}

  async recordOperation(input: RecordOperationInput): Promise<SandboxOperationRecord> {
    return this.db.transaction(async (tx) => {
      let accountTransactionId: string | null = null;
      if (input.ledgerEntry) {
        const [account] = await tx.select().from(sandboxAccounts).where(eq(sandboxAccounts.id, input.accountId)).limit(1);
        if (!account) throw new Error('sandbox account not found for ledger operation');
        const currentValue = account[input.ledgerEntry.balanceField] as number;
        const nextValue = currentValue + input.ledgerEntry.deltaMinor;
        if (nextValue < 0) throw new Error('INSUFFICIENT_FUNDS'); // checagem final dentro da própria transação — nunca deixa saldo negativo
        await tx.update(sandboxAccounts).set({ [input.ledgerEntry.balanceField]: nextValue, updatedAt: new Date() }).where(eq(sandboxAccounts.id, input.accountId));
        const [transactionRow] = await tx.insert(sandboxAccountTransactions).values(input.ledgerEntry.transaction).returning();
        if (!transactionRow) throw new Error('failed to record account transaction');
        accountTransactionId = transactionRow.id;
      }
      const [operationRow] = await tx.insert(sandboxOperations).values({
        id: input.operationId, accountId: input.accountId, kind: input.kind, status: input.status, amountMinor: input.amountMinor,
        currency: 'BRL', scheduledFor: input.scheduledFor, accountTransactionId, details: input.details, idempotencyKey: input.idempotencyKey ?? null,
      }).returning();
      if (!operationRow) throw new Error('failed to record sandbox operation');
      return operationRow as SandboxOperationRecord;
    });
  }

  async findById(id: string, accountId: string): Promise<SandboxOperationRecord | undefined> {
    const [row] = await this.db.select().from(sandboxOperations).where(and(eq(sandboxOperations.id, id), eq(sandboxOperations.accountId, accountId))).limit(1);
    return row as SandboxOperationRecord | undefined;
  }

  async listByAccountAndKind(accountId: string, kind: OperationKind): Promise<SandboxOperationRecord[]> {
    return (await this.db.select().from(sandboxOperations).where(and(eq(sandboxOperations.accountId, accountId), eq(sandboxOperations.kind, kind))).orderBy(desc(sandboxOperations.createdAt))) as SandboxOperationRecord[];
  }

  async findByIdempotencyKey(accountId: string, kind: OperationKind, idempotencyKey: string): Promise<SandboxOperationRecord | undefined> {
    const [row] = await this.db.select().from(sandboxOperations).where(and(eq(sandboxOperations.accountId, accountId), eq(sandboxOperations.kind, kind), eq(sandboxOperations.idempotencyKey, idempotencyKey))).limit(1);
    return row as SandboxOperationRecord | undefined;
  }
}
