// Etapa 5.2, Item 2 da auditoria — contratos de domínio tipados para as
// portas (ports.ts) que hoje devolviam `Promise<unknown>`.
//
// Em vez de re-transcrever cada formato de resposta à mão (arriscado:
// qualquer campo esquecido, ou digitado errado, diverge silenciosamente do
// que o provider realmente devolve, e nenhum teste pegaria isso), cada tipo
// abaixo é DERIVADO da implementação real de sandbox — `Awaited<ReturnType<
// SandboxXProvider['metodo']>>`. Isso dá três coisas de uma vez: (1) o tipo
// nunca pode divergir do comportamento real, porque É o comportamento real;
// (2) qualquer mudança futura na forma da resposta do provider sandbox
// atualiza o contrato automaticamente, sem precisar tocar aqui; (3) uma
// futura implementação SaaS que tente `implements PixProvider` (etc.) é
// checada pelo compilador contra o formato exato que o sandbox já
// estabeleceu como contrato — exatamente o objetivo de "manter as
// interfaces estáveis para uma futura troca por SaaS".
//
// As classes concretas importadas abaixo são usadas deliberadamente SÓ
// como fonte de tipos (import type), nunca instanciadas aqui. Não há
// import circular real: todos os imports envolvidos (aqui e em ports.ts)
// são `import type`, apagados inteiramente na compilação.
import type { SandboxAccountProvider } from './sandbox/SandboxAccountProvider.js';
import type { SandboxBillingProvider } from './sandbox/SandboxBillingProvider.js';
import type { SandboxCardProvider } from './sandbox/SandboxCardProvider.js';
import type { SandboxConsignedProvider } from './sandbox/SandboxConsignedProvider.js';
import type { SandboxInvestmentProvider } from './sandbox/SandboxInvestmentProvider.js';
import type { SandboxPaymentProvider } from './sandbox/SandboxPaymentProvider.js';
import type { SandboxPixProvider } from './sandbox/SandboxPixProvider.js';
import type { SandboxTransferProvider } from './sandbox/SandboxTransferProvider.js';

// ---- Conta -----------------------------------------------------------
export type CurrentAccount = Awaited<ReturnType<SandboxAccountProvider['getCurrent']>>;
export type AccountBalances = Awaited<ReturnType<SandboxAccountProvider['getBalances']>>;
export type StatementEntry = Awaited<ReturnType<SandboxAccountProvider['listStatement']>>[number];
export type AccountTransactionReceipt = Awaited<ReturnType<SandboxAccountProvider['getTransactionReceipt']>>;

// ---- PIX ---------------------------------------------------------------
export type PixKeyLookup = Awaited<ReturnType<SandboxPixProvider['lookupKey']>>;
export type PixQrLookup = Awaited<ReturnType<SandboxPixProvider['lookupQr']>>;
export type PixKey = Awaited<ReturnType<SandboxPixProvider['listKeys']>>[number];
export type PixKeyRemoveResult = Awaited<ReturnType<SandboxPixProvider['removeKey']>>;
export type PixReceiveQr = Awaited<ReturnType<SandboxPixProvider['createReceiveQr']>>;
export type PixValidation = Awaited<ReturnType<SandboxPixProvider['validateTransfer']>>;
export type PixTransfer = Awaited<ReturnType<SandboxPixProvider['getTransfer']>>;
export type PixTransferReceipt = Awaited<ReturnType<SandboxPixProvider['getTransferReceipt']>>;

// ---- Transferência -------------------------------------------------------
export type TransferBank = Awaited<ReturnType<SandboxTransferProvider['listBanks']>>[number];
export type TransferFavorite = Awaited<ReturnType<SandboxTransferProvider['listFavorites']>>[number];
export type TransferBeneficiary = Awaited<ReturnType<SandboxTransferProvider['lookupBeneficiary']>>;
export type TransferValidation = Awaited<ReturnType<SandboxTransferProvider['validate']>>;
export type Transfer = Awaited<ReturnType<SandboxTransferProvider['getTransfer']>>;
export type TransferReceipt = Awaited<ReturnType<SandboxTransferProvider['getReceipt']>>;

// ---- Pagamento (boleto) --------------------------------------------------
export type Bill = Awaited<ReturnType<SandboxPaymentProvider['lookupBill']>>;
export type PaymentValidation = Awaited<ReturnType<SandboxPaymentProvider['validateBill']>>;
export type InstallmentSimulation = Awaited<ReturnType<SandboxPaymentProvider['simulateInstallments']>>;
export type Payment = Awaited<ReturnType<SandboxPaymentProvider['getPayment']>>;
export type PaymentReceipt = Awaited<ReturnType<SandboxPaymentProvider['getReceipt']>>;

// ---- Cartão (físico, transporte, virtual) --------------------------------
export type PhysicalCard = Awaited<ReturnType<SandboxCardProvider['get']>>;
export type CardTransaction = Awaited<ReturnType<SandboxCardProvider['listTransactions']>>[number];
export type CardReceipt = Awaited<ReturnType<SandboxCardProvider['getTransactionReceipt']>>;
export type TransportCard = Awaited<ReturnType<SandboxCardProvider['getTransportCard']>>;
export type CardActivationChallenge = Awaited<ReturnType<SandboxCardProvider['createActivationChallenge']>>;
export type CardActivationResult = Awaited<ReturnType<SandboxCardProvider['activate']>>;
export type CardBlockResult = Awaited<ReturnType<SandboxCardProvider['setBlocked']>>;
export type CardPasswordResult = Awaited<ReturnType<SandboxCardProvider['changePassword']>>;
export type CardRecharge = Awaited<ReturnType<SandboxCardProvider['recharge']>>;
export type CardRequestResult = Awaited<ReturnType<SandboxCardProvider['requestCard']>>;
export type VirtualCard = Awaited<ReturnType<SandboxCardProvider['getVirtualCard']>>;
export type VirtualCardLimitPool = Awaited<ReturnType<SandboxCardProvider['getVirtualCardLimitPool']>>;
export type VirtualCardCreateResult = Awaited<ReturnType<SandboxCardProvider['createVirtualCard']>>;
export type VirtualCardLimitResult = Awaited<ReturnType<SandboxCardProvider['setVirtualCardLimit']>>;
export type VirtualCardBlockResult = Awaited<ReturnType<SandboxCardProvider['setVirtualCardBlocked']>>;
export type VirtualCardCancelResult = Awaited<ReturnType<SandboxCardProvider['cancelVirtualCard']>>;
export type VirtualCardRecreateResult = Awaited<ReturnType<SandboxCardProvider['recreateVirtualCard']>>;
export type VirtualCardRevealChallenge = Awaited<ReturnType<SandboxCardProvider['createRevealChallenge']>>;
export type VirtualCardRevealedData = Awaited<ReturnType<SandboxCardProvider['revealVirtualCardData']>>;
export type VirtualCardTransaction = Awaited<ReturnType<SandboxCardProvider['listVirtualCardTransactions']>>[number];

// ---- Investimento ---------------------------------------------------------
export type InvestmentProduct = Awaited<ReturnType<SandboxInvestmentProvider['listProducts']>>[number];
export type InvestmentSimulation = Awaited<ReturnType<SandboxInvestmentProvider['simulate']>>;
export type InvestmentOrder = Awaited<ReturnType<SandboxInvestmentProvider['getOrder']>>;
export type InvestmentPosition = Awaited<ReturnType<SandboxInvestmentProvider['listPositions']>>[number];
export type InvestmentReceipt = Awaited<ReturnType<SandboxInvestmentProvider['getReceipt']>>;

// ---- Cobrança ---------------------------------------------------------
export type BillingPayer = Awaited<ReturnType<SandboxBillingProvider['listPayers']>>[number];
export type BillingPayerDeleteResult = Awaited<ReturnType<SandboxBillingProvider['deletePayer']>>;
export type BillingLimits = Awaited<ReturnType<SandboxBillingProvider['getLimits']>>;
export type BillingBill = Awaited<ReturnType<SandboxBillingProvider['listBills']>>[number];
export type BillingShareResult = Awaited<ReturnType<SandboxBillingProvider['shareBill']>>;
export type BillingReceipt = Awaited<ReturnType<SandboxBillingProvider['getReceipt']>>;

// ---- Consignado -----------------------------------------------------------
export type ConsignedProduct = Awaited<ReturnType<SandboxConsignedProvider['listProducts']>>[number];
export type ConsignedDocument = Awaited<ReturnType<SandboxConsignedProvider['getDocuments']>>[number];
export type ConsignedTerms = Awaited<ReturnType<SandboxConsignedProvider['getTerms']>>;
export type ConsignedApplication = Awaited<ReturnType<SandboxConsignedProvider['getApplication']>>;
export type ConsignedReceipt = Awaited<ReturnType<SandboxConsignedProvider['getReceipt']>>;
