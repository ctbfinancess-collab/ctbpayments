import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthContext } from '../src/providers/ports.js';
import { InMemorySandboxAccountRepository } from '../src/providers/sandbox/InMemorySandboxAccountRepository.js';
import { InMemorySandboxLedgerRepository } from '../src/providers/sandbox/InMemorySandboxLedgerRepository.js';
import { InMemorySandboxPixKeyRepository } from '../src/providers/sandbox/InMemorySandboxPixKeyRepository.js';
import { InMemorySandboxValidationRepository } from '../src/providers/sandbox/InMemorySandboxValidationRepository.js';
import { ensureSandboxAccount } from '../src/providers/sandbox/ensureSandboxAccount.js';
import { SandboxChallengeProvider } from '../src/providers/sandbox/SandboxChallengeProvider.js';
import { SandboxPaymentProvider } from '../src/providers/sandbox/SandboxPaymentProvider.js';
import { SandboxPixProvider } from '../src/providers/sandbox/SandboxPixProvider.js';
import { SandboxTransferProvider } from '../src/providers/sandbox/SandboxTransferProvider.js';

// Etapa 5.2, Item 1 — antes desta etapa, a "validação" de PIX/Transferência/
// Pagamento (o rascunho gerado por /validate, consultado pelo submit) vivia
// só num Map() de instância. Um restart real do backend entre validar e
// confirmar derrubava a operação com XXX_VALIDATION_NOT_FOUND, mesmo a
// chave de idempotência (Etapa 5.1) já sendo persistida — nunca causava
// débito duplicado (a idempotência protegia isso), mas quebrava um fluxo
// legítimo sem motivo. Estes testes provam que isso não acontece mais:
// mesmo padrão de "restart simulado" já usado em sandboxCardProvider.test.ts
// e sandboxBillingProvider.test.ts — instancia um provider NOVO sobre os
// MESMOS repositórios (o que sobrevive de verdade a um restart real quando
// os repositórios são Postgres), perdendo só o que ainda é estado de
// instância (não sobra nada relevante hoje).

function context(accountId: string): AuthContext {
  return {
    sessionId: 'sbx_session_1', userId: 'sbx_user_1', accountId, deviceId: 'sbx_device_1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: { id: 'sbx_user_1', type: 'PF', displayName: 'Cliente Sandbox' },
    account: { id: accountId, type: 'PERSONAL', status: 'ACTIVE' },
  };
}

async function verifiedChallenge(challenges: SandboxChallengeProvider, ctx: AuthContext, operationId: string): Promise<string> {
  const created = (await challenges.create(ctx, { purpose: 'TEST', operationId, type: 'OTP' })) as { id: string };
  await challenges.verify(ctx, created.id, { proof: '123456' });
  return created.id;
}

test('PIX: validationId persists across a simulated backend restart — submit still succeeds using the pre-restart validationId', async () => {
  const ctx = context('sbx_account_pix_validation_restart');
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const pixKeys = new InMemorySandboxPixKeyRepository();
  const validations = new InMemorySandboxValidationRepository();
  const challenges = new SandboxChallengeProvider('test');
  const provider = new SandboxPixProvider('test', accounts, ledger, pixKeys, validations, challenges);

  const validation = (await provider.validateTransfer(ctx, { beneficiaryId: 'sbx_pix_beneficiary_001', amountMinor: 5_000, currency: 'BRL' })) as { validationId: string };

  // "Restart": provider novo sobre os MESMOS repositórios — a validação
  // persistida em `validations`, não mais um Map() da instância antiga.
  const providerAfterRestart = new SandboxPixProvider('test', accounts, ledger, pixKeys, validations, challenges);
  const challengeId = await verifiedChallenge(challenges, ctx, validation.validationId);
  const transfer = (await providerAfterRestart.createTransfer(ctx, { validationId: validation.validationId, challengeId }, 'idem-pix-validation-restart-01', 'r1')) as { status: string; amountMinor: number };
  assert.equal(transfer.status, 'COMPLETED');
  assert.equal(transfer.amountMinor, 5_000);

  // Uma validação desconhecida continua 404 normalmente (comportamento
  // preservado, só deixou de depender de memória).
  await assert.rejects(
    providerAfterRestart.createTransfer(ctx, { validationId: 'sbx_pix_validation_unknown', challengeId }, 'idem-pix-validation-restart-02', 'r2'),
    (error: unknown) => error instanceof Error && 'code' in error && (error as { code: string }).code === 'PIX_VALIDATION_NOT_FOUND',
  );
});

test('Transfer: validationId persists across a simulated backend restart — submit still succeeds using the pre-restart validationId', async () => {
  const ctx = context('sbx_account_transfer_validation_restart');
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const validations = new InMemorySandboxValidationRepository();
  const challenges = new SandboxChallengeProvider('test');
  const provider = new SandboxTransferProvider('test', accounts, ledger, validations, challenges);

  const validation = (await provider.validate(ctx, { beneficiaryId: 'sbx_beneficiary_internal', amountMinor: 7_500, currency: 'BRL' })) as { validationId: string };

  const providerAfterRestart = new SandboxTransferProvider('test', accounts, ledger, validations, challenges);
  const challengeId = await verifiedChallenge(challenges, ctx, validation.validationId);
  const transfer = (await providerAfterRestart.createTransfer(ctx, { validationId: validation.validationId, challengeId }, 'idem-transfer-validation-restart-01', 'r1')) as { status: string; amountMinor: number };
  assert.equal(transfer.status, 'COMPLETED');
  assert.equal(transfer.amountMinor, 7_500);
});

test('Payment: bill validationId persists across a simulated backend restart — payBill still succeeds using the pre-restart validationId', async () => {
  const ctx = context('sbx_account_payment_validation_restart');
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const validations = new InMemorySandboxValidationRepository();
  const challenges = new SandboxChallengeProvider('test');
  const provider = new SandboxPaymentProvider('test', accounts, ledger, validations, challenges);

  const validation = (await provider.validateBill(ctx, { billId: 'sbx_bill_001', amountMinor: 12_500, currency: 'BRL' })) as { validationId: string };

  const providerAfterRestart = new SandboxPaymentProvider('test', accounts, ledger, validations, challenges);
  const challengeId = await verifiedChallenge(challenges, ctx, validation.validationId);
  const payment = (await providerAfterRestart.payBill(ctx, { validationId: validation.validationId, challengeId }, 'idem-payment-validation-restart-01', 'r1')) as { status: string; amountMinor: number };
  assert.equal(payment.status, 'COMPLETED');
  assert.equal(payment.amountMinor, 12_500);
});

test('Payment: installment simulationId persists across a simulated backend restart — payInstallments still succeeds using the pre-restart simulationId', async () => {
  const ctx = context('sbx_account_installment_validation_restart');
  const accounts = new InMemorySandboxAccountRepository();
  const ledger = new InMemorySandboxLedgerRepository(accounts);
  const validations = new InMemorySandboxValidationRepository();
  const challenges = new SandboxChallengeProvider('test');
  const provider = new SandboxPaymentProvider('test', accounts, ledger, validations, challenges);
  // simulateInstallments() não checa saldo (não precisa) — diferente de
  // validateBill()/validate()/validateTransfer(), não cria a conta sozinha;
  // sem isso, o débito do pagamento não teria em qual conta aplicar.
  await ensureSandboxAccount(accounts, ctx, () => new Date());

  const simulation = (await provider.simulateInstallments(ctx, { billId: 'sbx_bill_001', amountMinor: 12_500 })) as { simulationId: string; options: Array<{ optionId: string; installments: number }> };
  const option = simulation.options[1]!;

  const providerAfterRestart = new SandboxPaymentProvider('test', accounts, ledger, validations, challenges);
  const challengeId = await verifiedChallenge(challenges, ctx, simulation.simulationId);
  const payment = (await providerAfterRestart.payInstallments(ctx, { simulationId: simulation.simulationId, optionId: option.optionId, challengeId }, 'idem-installment-validation-restart-01', 'r1')) as { status: string; installments: number };
  assert.equal(payment.status, 'COMPLETED');
  assert.equal(payment.installments, option.installments);
});
