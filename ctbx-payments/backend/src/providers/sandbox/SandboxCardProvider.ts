import { createHash, randomUUID } from 'node:crypto';
import { ApiError, providerNotConfigured } from '../../errors/ApiError.js';
import type { AuthContext, CardProvider } from '../ports.js';
import type { PhysicalCardRecord, PhysicalCardRepository, PhysicalCardTransactionRecord } from '../../repositories/PhysicalCardRepository.js';
import type { SandboxAccountRepository } from '../../repositories/SandboxAccountRepository.js';
import type { SandboxLedgerRepository, SandboxOperationRecord } from '../../repositories/SandboxLedgerRepository.js';
import type { TransportCardRecord, TransportCardRepository } from '../../repositories/TransportCardRepository.js';
import type { VirtualCardRecord, VirtualCardRepository, VirtualCardStatus } from '../../repositories/VirtualCardRepository.js';
import { decryptCardField, encryptCardField } from '../../security/cardEncryption.js';
import { ensureSandboxAccount } from './ensureSandboxAccount.js';
import { hashPayload, withPersistedIdempotency } from './persistedIdempotency.js';
import type { SandboxChallengeProvider } from './SandboxChallengeProvider.js';

type RechargeDetails = { rechargeId: string; cardId?: string; newBalanceMinor: number; requestId: string; requestHash: string };

// Cores aceitas pro cartão virtual — mesma convenção de requestCard()
// (selectedColor) logo abaixo: enum em português, igual ao rótulo exibido.
const VIRTUAL_CARD_COLORS = ['Roxo', 'Verde', 'Preto', 'Dourado'] as const;
type VirtualCardColor = (typeof VIRTUAL_CARD_COLORS)[number];

export class SandboxCardProvider implements CardProvider {
  private readonly idempotency = new Map<string, { hash: string; result: Record<string, unknown> }>();
  // "Bolso" total disponível pra distribuir entre cartões virtuais — só um
  // teto SANDBOX (R$ 30.000,00) pra dar sentido ao "Limite disponível /
  // Limite total" do mockup. Cada cartão reserva uma fatia desse total ao
  // ser criado (ver virtualCardsAllocatedMinor). Diferente do resto deste
  // provider, os CARTÕES em si (ver virtualCards abaixo) são persistidos de
  // verdade — só este teto do "bolso" continua sendo uma constante em
  // memória, não uma linha de banco.
  private readonly virtualCardLimitPoolMinor = 3_000_000;

  constructor(
    environment: string,
    private readonly accounts: SandboxAccountRepository,
    private readonly ledger: SandboxLedgerRepository,
    private readonly physicalCards: PhysicalCardRepository,
    private readonly transportCards: TransportCardRepository,
    private readonly challenges?: SandboxChallengeProvider,
    private readonly now: () => Date = () => new Date(),
    private readonly virtualCards?: VirtualCardRepository,
    private readonly cardEncryptionKey?: string,
  ) {
    if (environment === 'production') throw new Error('SandboxCardProvider is forbidden in production');
  }

  // ---- Cartão físico (financialCard) ------------------------------------
  // Etapa 4 da consolidação de arquitetura — antes 100% em memória (campos
  // de instância: status/availableMinor/passwordChanged), agora persistido
  // via PhysicalCardRepository (Postgres real, ou
  // InMemoryPhysicalCardRepository como fallback/testes — mesmo padrão das
  // etapas anteriores). Um cartão por conta, id determinístico
  // (`sbx_card_fin_<accountId>`) — "ensure" idempotente: nunca cria um
  // segundo cartão pra mesma conta, mesmo restart não duplica.

  private seedPhysicalCardTransactions(cardId: string, now: Date): Array<Omit<PhysicalCardTransactionRecord, 'createdAt'>> {
    const shift = (days: number, hour: number) => { const value = new Date(now); value.setDate(value.getDate() + days); value.setHours(hour, 0, 0, 0); return value; };
    const seed = [
      { suffix: 'A1p9', occurredAt: shift(0, 10), type: 'PURCHASE', direction: 'DEBIT' as const, merchantName: 'Mercado Sandbox', description: 'Compra no débito', amountMinor: 8_640, status: 'APPROVED', authorizationCodeMasked: 'SBX-**01', receiptAvailable: true },
      { suffix: 'B2q8', occurredAt: shift(-1, 15), type: 'REVERSAL', direction: 'CREDIT' as const, merchantName: 'Loja Sandbox', description: 'Estorno de compra', amountMinor: 3_000, status: 'COMPLETED', authorizationCodeMasked: 'SBX-**02', receiptAvailable: true },
      { suffix: 'C3r7', occurredAt: shift(-4, 19), type: 'PURCHASE', direction: 'DEBIT' as const, merchantName: 'Farmácia Sandbox', description: 'Compra aprovada', amountMinor: 4_290, status: 'APPROVED', authorizationCodeMasked: 'SBX-**03', receiptAvailable: true },
      { suffix: 'D4s6', occurredAt: shift(-12, 12), type: 'PURCHASE', direction: 'DEBIT' as const, merchantName: 'Restaurante Sandbox', description: 'Compra aprovada', amountMinor: 12_750, status: 'APPROVED', authorizationCodeMasked: 'SBX-**04', receiptAvailable: true },
      { suffix: 'E5t5', occurredAt: shift(-25, 8), type: 'PURCHASE', direction: 'DEBIT' as const, merchantName: 'Mobilidade Sandbox', description: 'Compra aprovada', amountMinor: 2_250, status: 'APPROVED', authorizationCodeMasked: 'SBX-**05', receiptAvailable: false },
    ];
    return seed.map((item) => ({ id: `sbx_ctx_${cardId}_${item.suffix}`, cardId, currency: 'BRL', ...item }));
  }

  private async ensurePhysicalCard(context: AuthContext): Promise<PhysicalCardRecord> {
    const id = `sbx_card_fin_${context.accountId}`;
    const existing = await this.physicalCards.findById(id);
    if (existing) return existing;
    const created = await this.physicalCards.create({
      id, accountId: context.accountId, status: 'PENDING_ACTIVATION', brand: 'Mastercard', lastFour: '4821',
      holderName: 'CLIENTE SANDBOX', expiryMonth: 8, expiryYear: 2029, availableMinor: 245_080, passwordChanged: false,
    });
    await this.physicalCards.createTransactions(this.seedPhysicalCardTransactions(id, this.now()));
    return created;
  }

  private financialCardApiShape(card: PhysicalCardRecord) {
    return { id: card.id, type: 'PHYSICAL' as const, brand: card.brand, lastFour: card.lastFour, holderName: card.holderName, expiryMonth: card.expiryMonth, expiryYear: card.expiryYear, status: card.status, availableMinor: card.availableMinor, currency: 'BRL' as const };
  }

  private transactionApiShape(row: PhysicalCardTransactionRecord) {
    return { id: row.id, cardId: row.cardId, occurredAt: row.occurredAt.toISOString(), type: row.type, direction: row.direction, merchantName: row.merchantName, description: row.description, amountMinor: row.amountMinor, currency: row.currency, status: row.status, authorizationCodeMasked: row.authorizationCodeMasked, receiptAvailable: row.receiptAvailable };
  }

  private async requireCard(context: AuthContext, cardId: string): Promise<PhysicalCardRecord> {
    const card = await this.ensurePhysicalCard(context);
    if (cardId !== card.id) throw new ApiError('CARD_NOT_FOUND', 'Cartão não encontrado.', { statusCode: 404 });
    return card;
  }

  async list(context: AuthContext) { return [this.financialCardApiShape(await this.ensurePhysicalCard(context))]; }
  async get(context: AuthContext, cardId: string) { return this.financialCardApiShape(await this.requireCard(context, cardId)); }
  async listTransactions(context: AuthContext, cardId: string) {
    const card = await this.requireCard(context, cardId);
    const rows = await this.physicalCards.listTransactions(card.id);
    return rows.map((row) => this.transactionApiShape(row));
  }
  async getTransaction(context: AuthContext, cardId: string, transactionId: string) {
    const card = await this.requireCard(context, cardId);
    const rows = await this.physicalCards.listTransactions(card.id);
    const transaction = rows.find((item) => item.id === transactionId);
    if (!transaction) throw new ApiError('CARD_TRANSACTION_NOT_FOUND', 'Transação do cartão não encontrada.', { statusCode: 404 });
    return this.transactionApiShape(transaction);
  }
  async listReceipts(context: AuthContext, cardId: string) {
    const card = await this.requireCard(context, cardId);
    const rows = await this.physicalCards.listTransactions(card.id);
    return rows.filter((item) => item.receiptAvailable).map((item) => this.receipt(this.transactionApiShape(item), `sbx_req_${item.id.slice(-4)}`));
  }
  async getTransactionReceipt(context: AuthContext, cardId: string, transactionId: string, requestId: string) {
    const transaction = await this.getTransaction(context, cardId, transactionId);
    if (!transaction.receiptAvailable) throw new ApiError('CARD_RECEIPT_NOT_FOUND', 'Comprovante do cartão não encontrado.', { statusCode: 404 });
    return this.receipt(transaction, requestId);
  }

  private async ensureTransportCard(context: AuthContext): Promise<TransportCardRecord> {
    const id = `sbx_top_${context.accountId}`;
    const existing = await this.transportCards.findById(id);
    if (existing) return existing;
    return this.transportCards.create({ id, accountId: context.accountId, status: 'ACTIVE', brand: 'TOP', lastFour: '9073', holderName: 'CLIENTE SANDBOX', balanceMinor: 4_820 });
  }

  async getTransportCard(context: AuthContext) {
    const card = await this.ensureTransportCard(context);
    return { id: card.id, type: 'TRANSPORT' as const, brand: card.brand, lastFour: card.lastFour, holderName: card.holderName, status: card.status, balanceMinor: card.balanceMinor, currency: 'BRL' as const, updatedAt: card.updatedAt.toISOString() };
  }

  private receipt(transaction: ReturnType<SandboxCardProvider['transactionApiShape']>, requestId: string) {
    return { id: `sbx_cr_${transaction.id.slice(-4)}`, operationId: `sbx_cop_${transaction.id.slice(-4)}`, cardId: transaction.cardId, transactionId: transaction.id, occurredAt: transaction.occurredAt, direction: transaction.direction, merchantName: transaction.merchantName, amountMinor: transaction.amountMinor, currency: transaction.currency, status: transaction.status, authorizationCodeMasked: transaction.authorizationCodeMasked, requestId };
  }

  // Genérico em T (Etapa 5.2, Item 2): mesmo comportamento de sempre, só
  // deixa de "achatar" o retorno pra Record<string, unknown> — cada
  // chamador agora carrega o formato real do objeto que a própria factory
  // devolve, sem precisar duplicar isso à mão numa interface separada.
  private once<T extends Record<string, unknown>>(context: AuthContext, route: string, key: string, raw: unknown, factory: () => T): T {
    const scope = `${context.accountId}:${route}:${key}`; const hash = createHash('sha256').update(JSON.stringify(raw)).digest('hex'); const existing = this.idempotency.get(scope);
    if (existing) { if (existing.hash !== hash) throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key reutilizada com payload diferente.', { statusCode: 409 }); return existing.result as T; }
    const result = factory(); this.idempotency.set(scope, { hash, result }); return result;
  }
  // Mesma lógica de once() acima, mas pra fábricas assíncronas (as
  // mutações de cartão físico/virtual precisam bater no Postgres) —
  // reaproveita o mesmo Map de idempotência, só muda a assinatura pra
  // aceitar/esperar uma Promise em vez de rodar tudo de forma síncrona.
  private async onceAsync<T extends Record<string, unknown>>(context: AuthContext, route: string, key: string, raw: unknown, factory: () => Promise<T>): Promise<T> {
    const scope = `${context.accountId}:${route}:${key}`; const hash = createHash('sha256').update(JSON.stringify(raw)).digest('hex'); const existing = this.idempotency.get(scope);
    if (existing) { if (existing.hash !== hash) throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key reutilizada com payload diferente.', { statusCode: 409 }); return existing.result as T; }
    const result = await factory(); this.idempotency.set(scope, { hash, result }); return result;
  }
  async createActivationChallenge(context: AuthContext, cardId: string) { await this.requireCard(context, cardId); return this.challenges!.create(context, { purpose: 'CARD_ACTIVATION', operationId: cardId, type: 'OTP' }); }
  async activate(context: AuthContext, cardId: string, raw: unknown, key: string, requestId: string) {
    const card = await this.requireCard(context, cardId);
    return this.onceAsync(context, 'activate', key, raw, async () => {
      if (card.status === 'ACTIVE') throw new ApiError('CARD_ALREADY_ACTIVE', 'Cartão já está ativo.', { statusCode: 409 });
      if (card.status !== 'PENDING_ACTIVATION') throw new ApiError('CARD_INVALID_STATE', 'Estado do cartão inválido.', { statusCode: 409 });
      const challengeId = (raw as { challengeId?: string }).challengeId;
      if (!this.challenges?.isVerified(context, challengeId ?? '', cardId)) throw new ApiError('AUTH_CHALLENGE_INVALID', 'Challenge de ativação inválido.', { statusCode: 401 });
      const updated = await this.physicalCards.update(cardId, context.accountId, { status: 'ACTIVE' });
      return { cardId, status: updated!.status, activatedAt: this.now().toISOString(), environment: 'SANDBOX', simulated: true, requestId };
    });
  }
  async setBlocked(context: AuthContext, cardId: string, blocked: boolean, key: string, requestId: string) {
    const card = await this.requireCard(context, cardId);
    return this.onceAsync(context, blocked ? 'block' : 'unblock', key, {}, async () => {
      const expected = blocked ? 'ACTIVE' : 'BLOCKED';
      if (card.status !== expected) throw new ApiError('CARD_INVALID_STATE', 'Transição de estado inválida.', { statusCode: 409 });
      const updated = await this.physicalCards.update(cardId, context.accountId, { status: blocked ? 'BLOCKED' : 'ACTIVE' });
      return { cardId, status: updated!.status, changedAt: this.now().toISOString(), simulated: true, environment: 'SANDBOX', requestId };
    });
  }
  async changePassword(context: AuthContext, cardId: string, raw: unknown, key: string, requestId: string) {
    await this.requireCard(context, cardId);
    return this.onceAsync(context, 'password', key, raw, async () => {
      const password = String((raw as { password?: string }).password ?? '');
      if (!/^\d{4}$/.test(password)) throw new ApiError('CARD_PASSWORD_INVALID', 'Senha deve possuir quatro dígitos.', { statusCode: 422 });
      const updated = await this.physicalCards.update(cardId, context.accountId, { passwordChanged: true });
      return { cardId, passwordChanged: updated!.passwordChanged, changedAt: this.now().toISOString(), simulated: true, environment: 'SANDBOX', requestId };
    });
  }
  private toPublicRecharge(row: SandboxOperationRecord, includeCardId: boolean) {
    const details = row.details as unknown as RechargeDetails;
    return {
      rechargeId: details.rechargeId, ...(includeCardId ? { cardId: details.cardId } : {}), amountMinor: row.amountMinor,
      newBalanceMinor: details.newBalanceMinor, currency: 'BRL', status: row.status, simulated: true,
      environment: 'SANDBOX', createdAt: row.createdAt.toISOString(), requestId: details.requestId,
    };
  }

  // Etapa 5.1 (Prioridade 1 — crítica): idempotência PERSISTIDA, não mais
  // um Map() em memória. Um replay da mesma Idempotency-Key depois de um
  // restart real do backend agora encontra o registro em sandbox_operations
  // e devolve o MESMO resultado, sem debitar de novo — antes, o cache
  // sumia no restart e a recarga era executada uma segunda vez de verdade.
  async recharge(context: AuthContext, cardId: string, raw: unknown, key: string, requestId: string) {
    const card = await this.requireCard(context, cardId);
    const { amountMinor, currency } = raw as { amountMinor?: number; currency?: string };
    if (!Number.isInteger(amountMinor) || (amountMinor ?? 0) <= 0 || (amountMinor ?? 0) > 100_000 || currency !== 'BRL') throw new ApiError('CARD_RECHARGE_INVALID', 'Recarga SANDBOX inválida.', { statusCode: 422 });
    const operation = await withPersistedIdempotency({
      raw,
      find: () => this.ledger.findByIdempotencyKey(context.accountId, 'CARD_RECHARGE', key),
      requestHashOf: (row) => (row.details as unknown as RechargeDetails).requestHash,
      create: async () => {
        // A recarga move dinheiro DA CONTA (fonte única de verdade, Etapa 3)
        // PRO cartão — nunca um saldo bancário paralelo dentro do cartão.
        const account = await ensureSandboxAccount(this.accounts, context, this.now);
        if (amountMinor! > account.availableMinor) throw new ApiError('CARD_RECHARGE_INSUFFICIENT_FUNDS', 'Saldo SANDBOX insuficiente para recarga.', { statusCode: 422 });
        const details: RechargeDetails = { rechargeId: `sbx_card_recharge_${randomUUID()}`, cardId, newBalanceMinor: card.availableMinor + amountMinor!, requestId, requestHash: hashPayload(raw) };
        // O ledger é chamado ANTES de creditar o cartão: é ali que mora o
        // índice único (account_id, kind, idempotency_key) — só depois de
        // confirmado que essa chave "venceu" é seguro creditar o cartão
        // (evita creditar duas vezes se perder uma corrida concorrente).
        const recorded = await this.ledger.recordOperation({
          operationId: `sbx_card_recharge_op_${randomUUID()}`, accountId: context.accountId, kind: 'CARD_RECHARGE', status: 'COMPLETED', amountMinor: amountMinor!,
          details, idempotencyKey: key,
          ledgerEntry: {
            balanceField: 'availableMinor', deltaMinor: -amountMinor!,
            transaction: {
              id: `sbx_txn_${context.accountId}_card_recharge_${randomUUID()}`, accountId: context.accountId, occurredAt: this.now(), type: 'CARD_RECHARGE', direction: 'DEBIT',
              description: 'Recarga do cartão físico', counterparty: 'Cartão físico SANDBOX', amountMinor: amountMinor!, currency: 'BRL', status: 'COMPLETED',
              category: 'Cartão', feeMinor: 0, receiptAvailable: true, institution: 'CTBX Payments Sandbox', document: '—', reason: null,
            },
          },
        });
        await this.physicalCards.update(cardId, context.accountId, { availableMinor: details.newBalanceMinor });
        return recorded;
      },
    });
    return this.toPublicRecharge(operation, true);
  }
  async requestCard(context: AuthContext, raw: unknown, key: string, requestId: string) { return this.once(context, 'request', key, raw, () => { const { selectedColor, termsAccepted } = raw as { selectedColor?: string; termsAccepted?: boolean }; if (!['Azul', 'Roxo', 'Preto'].includes(selectedColor ?? '') || termsAccepted !== true) throw new ApiError('CARD_REQUEST_INVALID', 'Solicitação SANDBOX inválida.', { statusCode: 422 }); return { requestIdPublic: `sbx_card_request_${randomUUID()}`, status: 'RECEIVED', selectedColor, simulated: true, environment: 'SANDBOX', createdAt: this.now().toISOString(), requestId }; }); }
  // Mesma correção da Prioridade 1 aplicada aqui — TOP tinha exatamente o
  // mesmo risco de débito duplicado por replay pós-restart.
  async rechargeTransport(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const card = await this.ensureTransportCard(context);
    const { amountMinor, currency } = raw as { amountMinor?: number; currency?: string };
    if (!Number.isInteger(amountMinor) || (amountMinor ?? 0) <= 0 || (amountMinor ?? 0) > 50_000 || currency !== 'BRL') throw new ApiError('CARD_RECHARGE_INVALID', 'Recarga TOP SANDBOX inválida.', { statusCode: 422 });
    const operation = await withPersistedIdempotency({
      raw,
      find: () => this.ledger.findByIdempotencyKey(context.accountId, 'TRANSPORT_RECHARGE', key),
      requestHashOf: (row) => (row.details as unknown as RechargeDetails).requestHash,
      create: async () => {
        const account = await ensureSandboxAccount(this.accounts, context, this.now);
        if (amountMinor! > account.availableMinor) throw new ApiError('CARD_RECHARGE_INSUFFICIENT_FUNDS', 'Saldo SANDBOX insuficiente para recarga.', { statusCode: 422 });
        const details: RechargeDetails = { rechargeId: `sbx_top_recharge_${randomUUID()}`, newBalanceMinor: card.balanceMinor + amountMinor!, requestId, requestHash: hashPayload(raw) };
        const recorded = await this.ledger.recordOperation({
          operationId: `sbx_top_recharge_op_${randomUUID()}`, accountId: context.accountId, kind: 'TRANSPORT_RECHARGE', status: 'COMPLETED', amountMinor: amountMinor!,
          details, idempotencyKey: key,
          ledgerEntry: {
            balanceField: 'availableMinor', deltaMinor: -amountMinor!,
            transaction: {
              id: `sbx_txn_${context.accountId}_top_recharge_${randomUUID()}`, accountId: context.accountId, occurredAt: this.now(), type: 'TRANSPORT_RECHARGE', direction: 'DEBIT',
              description: 'Recarga do cartão de transporte', counterparty: 'Cartão de Transporte SANDBOX', amountMinor: amountMinor!, currency: 'BRL', status: 'COMPLETED',
              category: 'Transporte', feeMinor: 0, receiptAvailable: true, institution: 'CTBX Payments Sandbox', document: '—', reason: null,
            },
          },
        });
        await this.transportCards.update(card.id, context.accountId, { balanceMinor: details.newBalanceMinor });
        return recorded;
      },
    });
    return this.toPublicRecharge(operation, false);
  }

  // ---- Cartão virtual --------------------------------------------------
  // Persistência real (Postgres) desde a etapa anterior — inalterado nesta
  // etapa (só o cartão físico mudou). Ver repositories/VirtualCardRepository.ts
  // e db/schema/sandboxCards.ts. PAN completo/CVV só existem criptografados
  // (AES-256-GCM) no banco; "requireVirtualCards" falha fechado (503) se
  // DATABASE_URL ou SANDBOX_CARD_ENCRYPTION_KEY não estiverem configurados —
  // nunca um modo "aberto" por omissão, mesmo padrão do resto do backend.
  private requireVirtualCards(): VirtualCardRepository {
    if (!this.virtualCards || !this.cardEncryptionKey) throw providerNotConfigured('de cartão virtual');
    return this.virtualCards;
  }

  private encrypt(value: string): string { return encryptCardField(value, this.cardEncryptionKey); }
  private decrypt(value: string): string { return decryptCardField(value, this.cardEncryptionKey); }

  private generateCardCredentials(): { pan: string; cvv: string; lastFour: string } {
    const lastFour = String(Math.floor(1000 + Math.random() * 9000));
    const middle = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
    return { pan: `4${middle}${lastFour}`, cvv: String(Math.floor(100 + Math.random() * 900)), lastFour }; // prefixo 4 = Visa, 16 dígitos
  }

  // Transações fictícias geradas na criação/recriação — só pra dar sensação
  // de produto real (mesmo espírito de "transactions()" do cartão físico
  // acima), mas persistidas de verdade e ligadas ao card_id correto.
  private seedTransactions(cardId: string, now: Date) {
    const seed = [
      { merchantName: 'Streaming Sandbox', amountMinor: 3_990, status: 'APPROVED', daysAgo: 2 },
      { merchantName: 'Assinatura Sandbox', amountMinor: 2_990, status: 'APPROVED', daysAgo: 9 },
      { merchantName: 'Loja Online Sandbox', amountMinor: 15_900, status: 'DECLINED', daysAgo: 15 },
    ];
    return seed.map((item) => ({ id: `sbx_vctx_${randomUUID().slice(0, 8)}`, cardId, occurredAt: new Date(now.getTime() - item.daysAgo * 86_400_000), merchantName: item.merchantName, amountMinor: item.amountMinor, status: item.status }));
  }

  private virtualCardApiShape(card: VirtualCardRecord) {
    return {
      id: card.id, type: 'VIRTUAL' as const, brand: card.brand, status: card.status,
      nickname: card.nickname, color: card.color, lastFour: card.lastFour, holderName: card.holderName,
      expiryMonth: card.expiryMonth, expiryYear: card.expiryYear, limitMinor: card.limitMinor,
      usedMinor: card.usedMinor, availableMinor: card.limitMinor - card.usedMinor, currency: 'BRL' as const,
      createdAt: card.createdAt.toISOString(), updatedAt: card.updatedAt.toISOString(),
    };
  }

  private async requireVirtualCardRecord(context: AuthContext, cardId: string): Promise<VirtualCardRecord> {
    const repo = this.requireVirtualCards();
    const card = await repo.findById(cardId, context.accountId);
    if (!card) throw new ApiError('CARD_NOT_FOUND', 'Cartão virtual não encontrado.', { statusCode: 404 });
    return card;
  }

  // Soma o limite de todo cartão virtual NÃO cancelado — cancelar libera a
  // fatia de volta pro "bolso" (virtualCardLimitPoolMinor).
  private async virtualCardsAllocatedMinor(context: AuthContext, excludingCardId?: string): Promise<number> {
    const repo = this.requireVirtualCards();
    const cards = await repo.listByAccount(context.accountId);
    return cards.reduce((total, card) => (card.status === 'CANCELLED' || card.id === excludingCardId ? total : total + card.limitMinor), 0);
  }

  async listVirtualCards(context: AuthContext) {
    const repo = this.requireVirtualCards();
    const cards = await repo.listByAccount(context.accountId);
    return cards.map((card) => this.virtualCardApiShape(card));
  }

  async getVirtualCard(context: AuthContext, cardId: string) {
    return this.virtualCardApiShape(await this.requireVirtualCardRecord(context, cardId));
  }

  async getVirtualCardLimitPool(context: AuthContext) {
    const allocatedMinor = await this.virtualCardsAllocatedMinor(context);
    return { totalMinor: this.virtualCardLimitPoolMinor, allocatedMinor, availableMinor: this.virtualCardLimitPoolMinor - allocatedMinor, currency: 'BRL' };
  }

  // Etapa 5.1 (Prioridade 3): idempotência PERSISTIDA na própria tabela do
  // cartão virtual (idempotencyKey/requestHash + índice único por conta) —
  // antes, um replay pós-restart do mesmo Idempotency-Key criava um SEGUNDO
  // cartão virtual (o cache de dedupe vivia só num Map() em memória).
  async createVirtualCard(context: AuthContext, raw: unknown, key: string, requestId: string) {
    const repo = this.requireVirtualCards();
    // Etapa 5.2 — garante que a linha em sandbox_accounts já existe ANTES
    // de inserir o cartão virtual: agora que accountId é uma FK de verdade
    // (ver db/schema/sandboxCards.ts), criar um cartão pra uma conta que
    // nunca tocou saldo/PIX/etc. antes violaria a constraint sem isso.
    await ensureSandboxAccount(this.accounts, context, this.now);
    const created = await withPersistedIdempotency({
      raw,
      find: () => repo.findByIdempotencyKey(context.accountId, key),
      requestHashOf: (row) => row.requestHash,
      create: async () => {
        const { color, nickname, limitMinor } = raw as { color?: string; nickname?: string | null; limitMinor?: number };
        if (!VIRTUAL_CARD_COLORS.includes(color as VirtualCardColor)) throw new ApiError('CARD_REQUEST_INVALID', 'Cor do cartão virtual inválida.', { statusCode: 422 });
        if (!Number.isInteger(limitMinor) || (limitMinor ?? 0) <= 0) throw new ApiError('CARD_REQUEST_INVALID', 'Limite do cartão virtual inválido.', { statusCode: 422 });
        const poolAvailable = this.virtualCardLimitPoolMinor - (await this.virtualCardsAllocatedMinor(context));
        if (limitMinor! > poolAvailable) throw new ApiError('CARD_LIMIT_EXCEEDS_POOL', 'Limite solicitado excede o disponível na conta para cartões virtuais.', { statusCode: 422 });
        const now = this.now();
        const { pan, cvv, lastFour } = this.generateCardCredentials();
        const row = await repo.create({
          id: `sbx_card_vrt_${randomUUID().slice(0, 8)}`, accountId: context.accountId, nickname: nickname?.trim() || null,
          color: color as VirtualCardColor, brand: 'Visa', lastFour, panEncrypted: this.encrypt(pan), cvvEncrypted: this.encrypt(cvv),
          holderName: 'CLIENTE SANDBOX', expiryMonth: now.getMonth() + 1, expiryYear: now.getFullYear() + 4, limitMinor: limitMinor!,
          idempotencyKey: key, requestHash: hashPayload(raw), requestId,
        });
        await repo.createTransactions(this.seedTransactions(row.id, now));
        return row;
      },
    });
    // requestId sempre o da requisição ORIGINAL que criou o cartão — mesmo
    // padrão de PIX/Transferência/Pagamento/Investimento num replay.
    return { ...this.virtualCardApiShape(created), simulated: true, environment: 'SANDBOX', requestId: created.requestId };
  }

  async setVirtualCardLimit(context: AuthContext, cardId: string, raw: unknown, key: string, requestId: string) {
    const repo = this.requireVirtualCards();
    const card = await this.requireVirtualCardRecord(context, cardId);
    return this.onceAsync(context, 'virtual-limit', key, raw, async () => {
      if (card.status === 'CANCELLED') throw new ApiError('CARD_INVALID_STATE', 'Cartão virtual cancelado não pode ter o limite alterado.', { statusCode: 409 });
      const { limitMinor } = raw as { limitMinor?: number };
      if (!Number.isInteger(limitMinor) || (limitMinor ?? 0) <= 0) throw new ApiError('CARD_REQUEST_INVALID', 'Limite do cartão virtual inválido.', { statusCode: 422 });
      if (limitMinor! < card.usedMinor) throw new ApiError('CARD_LIMIT_BELOW_USED', 'Novo limite não pode ser menor que o valor já utilizado.', { statusCode: 422 });
      const poolAvailable = this.virtualCardLimitPoolMinor - (await this.virtualCardsAllocatedMinor(context, cardId));
      if (limitMinor! > poolAvailable) throw new ApiError('CARD_LIMIT_EXCEEDS_POOL', 'Limite solicitado excede o disponível na conta para cartões virtuais.', { statusCode: 422 });
      const updated = await repo.update(cardId, context.accountId, { limitMinor: limitMinor! });
      return { ...this.virtualCardApiShape(updated!), simulated: true, environment: 'SANDBOX', requestId };
    });
  }

  async setVirtualCardBlocked(context: AuthContext, cardId: string, blocked: boolean, key: string, requestId: string) {
    const repo = this.requireVirtualCards();
    const card = await this.requireVirtualCardRecord(context, cardId);
    return this.onceAsync(context, blocked ? 'virtual-block' : 'virtual-unblock', key, {}, async () => {
      if (card.status === 'CANCELLED') throw new ApiError('CARD_INVALID_STATE', 'Cartão virtual cancelado não pode ser bloqueado/desbloqueado.', { statusCode: 409 });
      const expected: VirtualCardStatus = blocked ? 'ACTIVE' : 'BLOCKED';
      if (card.status !== expected) throw new ApiError('CARD_INVALID_STATE', 'Transição de estado inválida.', { statusCode: 409 });
      const updated = await repo.update(cardId, context.accountId, { status: blocked ? 'BLOCKED' : 'ACTIVE' });
      return { cardId, status: updated!.status, changedAt: this.now().toISOString(), simulated: true, environment: 'SANDBOX', requestId };
    });
  }

  async cancelVirtualCard(context: AuthContext, cardId: string, key: string, requestId: string) {
    const repo = this.requireVirtualCards();
    const card = await this.requireVirtualCardRecord(context, cardId);
    return this.onceAsync(context, 'virtual-cancel', key, {}, async () => {
      if (card.status === 'CANCELLED') throw new ApiError('CARD_ALREADY_CANCELLED', 'Cartão virtual já está cancelado.', { statusCode: 409 });
      const updated = await repo.update(cardId, context.accountId, { status: 'CANCELLED' });
      return { cardId, status: updated!.status, cancelledAt: this.now().toISOString(), simulated: true, environment: 'SANDBOX', requestId };
    });
  }

  // "Recriar" mantém o mesmo id/limite/apelido/cor (mais simples pra UI —
  // não precisa trocar de card na tela), mas gera PAN/CVV/final/validade
  // novos, zera o usado e limpa/reseeda as transações — o cartão antigo
  // fica de fato "invalidado" (nenhum dado antigo continua acessível).
  // Não permitido em cartão cancelado (pra isso, cria-se um novo).
  async recreateVirtualCard(context: AuthContext, cardId: string, key: string, requestId: string) {
    const repo = this.requireVirtualCards();
    const card = await this.requireVirtualCardRecord(context, cardId);
    return this.onceAsync(context, 'virtual-recreate', key, {}, async () => {
      if (card.status === 'CANCELLED') throw new ApiError('CARD_INVALID_STATE', 'Cartão virtual cancelado não pode ser recriado.', { statusCode: 409 });
      const now = this.now();
      const { pan, cvv, lastFour } = this.generateCardCredentials();
      await repo.deleteTransactions(cardId);
      const updated = await repo.update(cardId, context.accountId, {
        lastFour, panEncrypted: this.encrypt(pan), cvvEncrypted: this.encrypt(cvv),
        expiryMonth: now.getMonth() + 1, expiryYear: now.getFullYear() + 4, usedMinor: 0, status: 'ACTIVE',
      });
      await repo.createTransactions(this.seedTransactions(cardId, now));
      return { ...this.virtualCardApiShape(updated!), simulated: true, environment: 'SANDBOX', requestId };
    });
  }

  // Revelar PAN completo/CVV exige um challenge OTP verificado (mesmo
  // padrão de createActivationChallenge/activate) — nunca fica disponível
  // sem essa etapa, mesmo pra quem já está autenticado.
  async createRevealChallenge(context: AuthContext, cardId: string) {
    await this.requireVirtualCardRecord(context, cardId);
    return this.challenges!.create(context, { purpose: 'CARD_VIRTUAL_REVEAL', operationId: cardId, type: 'OTP' });
  }

  async revealVirtualCardData(context: AuthContext, cardId: string, raw: unknown, requestId: string) {
    const card = await this.requireVirtualCardRecord(context, cardId);
    if (card.status === 'CANCELLED') throw new ApiError('CARD_INVALID_STATE', 'Cartão virtual cancelado não permite revelar dados.', { statusCode: 409 });
    const challengeId = (raw as { challengeId?: string } | undefined)?.challengeId;
    if (!this.challenges?.isVerified(context, challengeId ?? '', cardId)) throw new ApiError('AUTH_CHALLENGE_INVALID', 'Challenge de revelação inválido.', { statusCode: 401 });
    return {
      cardId, number: this.decrypt(card.panEncrypted), cvv: this.decrypt(card.cvvEncrypted),
      expiryMonth: card.expiryMonth, expiryYear: card.expiryYear, holderName: card.holderName,
      revealedAt: this.now().toISOString(), simulated: true, environment: 'SANDBOX', requestId,
    };
  }

  async listVirtualCardTransactions(context: AuthContext, cardId: string) {
    const repo = this.requireVirtualCards();
    await this.requireVirtualCardRecord(context, cardId);
    const rows = await repo.listTransactions(cardId);
    return rows.map((row) => ({ id: row.id, cardId: row.cardId, occurredAt: row.occurredAt.toISOString(), merchantName: row.merchantName, amountMinor: row.amountMinor, currency: 'BRL' as const, status: row.status }));
  }
}
