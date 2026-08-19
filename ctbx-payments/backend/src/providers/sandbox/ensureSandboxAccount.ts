import type { AuthContext } from '../ports.js';
import type { CreateSandboxAccountTransactionInput, SandboxAccountRecord, SandboxAccountRepository } from '../../repositories/SandboxAccountRepository.js';

// Saldo inicial e as 7 movimentações fictícias que sempre existiram aqui —
// preservados byte-a-byte (mesmos ids/valores/textos) pra não mudar nada
// visualmente no app. Compartilhado entre SandboxAccountProvider (Etapa 2)
// e PIX/Transferência/Pagamento (Etapa 3) — todos precisam garantir que a
// conta já existe antes de ler/alterar saldo, e usam a MESMA semente.
const SEED_BALANCES = {
  availableMinor: 125_000, ledgerMinor: 130_000, digitalAccountMinor: 125_000, blockedMinor: 5_000,
  investmentsMinor: 200_000, cardAccountMinor: 25_000, creditMinor: 75_000, foreignCurrencyMinor: 0,
};

const shift = (now: Date, days: number, hour: number, minute = 0) => {
  const value = new Date(now);
  value.setDate(value.getDate() + days);
  value.setHours(hour, minute, 0, 0);
  return value;
};

export function seedTransactions(accountId: string, now: Date): CreateSandboxAccountTransactionInput[] {
  // Prefixo com accountId: "id" é chave primária GLOBAL da tabela (não só
  // única dentro de uma conta) — sem isso, semear uma segunda conta
  // colidiria com os mesmos ids fixos da primeira.
  const id = (suffix: string) => `sbx_txn_${accountId}_${suffix}`;
  return [
    { id: id('a7K2mP9q'), accountId, occurredAt: shift(now, 0, 14, 32), type: 'PIX_RECEIVED', direction: 'CREDIT', description: 'Pix recebido', counterparty: 'Cliente Sandbox A', amountMinor: 35_000, currency: 'BRL', status: 'COMPLETED', category: 'Pix', feeMinor: 0, receiptAvailable: true, institution: 'Banco Sandbox', document: '***.***.***-**', reason: null },
    { id: id('b4N8vR1s'), accountId, occurredAt: shift(now, -1, 9, 18), type: 'BILL_PAYMENT', direction: 'DEBIT', description: 'Pagamento de boleto', counterparty: 'Empresa Sandbox', amountMinor: 12_500, currency: 'BRL', status: 'COMPLETED', category: 'Pagamento', feeMinor: 0, receiptAvailable: true, institution: 'Banco Emissor Sandbox', document: '**.***.***/****-**', reason: null },
    { id: id('c6T3xL0w'), accountId, occurredAt: shift(now, -3, 17, 5), type: 'TRANSFER_RECEIVED', direction: 'CREDIT', description: 'Transferência recebida', counterparty: 'Cliente Sandbox B', amountMinor: 120_000, currency: 'BRL', status: 'COMPLETED', category: 'Transferência', feeMinor: 0, receiptAvailable: true, institution: 'CTBX Payments Sandbox', document: '***.***.***-**', reason: null },
    { id: id('d9Q5jH2e'), accountId, occurredAt: shift(now, -10, 12, 40), type: 'SERVICE_PAYMENT', direction: 'DEBIT', description: 'Recarga de transporte', counterparty: 'Cartão Sandbox', amountMinor: 5_000, currency: 'BRL', status: 'COMPLETED', category: 'Serviços', feeMinor: 0, receiptAvailable: true, institution: 'CTBX Payments Sandbox', document: '—', reason: null },
    { id: id('e1Y7kC4u'), accountId, occurredAt: shift(now, -20, 8, 20), type: 'SALARY_CREDIT', direction: 'CREDIT', description: 'Crédito de salário', counterparty: 'Empresa Sandbox', amountMinor: 320_000, currency: 'BRL', status: 'COMPLETED', category: 'Crédito', feeMinor: 0, receiptAvailable: false, institution: 'CTBX Payments Sandbox', document: '**.***.***/****-**', reason: null },
    { id: id('f8M2pS5z'), accountId, occurredAt: shift(now, 3, 8), type: 'SCHEDULED_PAYMENT', direction: 'DEBIT', description: 'Pagamento agendado', counterparty: 'Concessionária Sandbox', amountMinor: 22_000, currency: 'BRL', status: 'SCHEDULED', category: 'Pagamento', feeMinor: 0, receiptAvailable: false, institution: 'Banco Emissor Sandbox', document: '**.***.***/****-**', reason: null },
    { id: id('g3W9rD6n'), accountId, occurredAt: shift(now, -2, 13, 20), type: 'PIX_SENT', direction: 'DEBIT', description: 'Pix em análise', counterparty: 'Favorecido Sandbox', amountMinor: 30_000, currency: 'BRL', status: 'UNDER_REVIEW', category: 'Pix', feeMinor: 0, receiptAvailable: false, institution: 'Outra Instituição Sandbox', document: '***.***.***-**', reason: 'Movimentação em análise de segurança' },
  ];
}

// Cria a conta (+ extrato inicial) na primeira vez que essa accountId é
// vista — nas chamadas seguintes só lê o que já está persistido.
export async function ensureSandboxAccount(repository: SandboxAccountRepository, context: AuthContext, now: () => Date): Promise<SandboxAccountRecord> {
  const existing = await repository.findById(context.accountId);
  if (existing) return existing;
  const created = await repository.create({ id: context.accountId, userId: context.userId, currency: 'BRL', ...SEED_BALANCES });
  await repository.createTransactions(seedTransactions(context.accountId, now()));
  return created;
}
