import type { Account, Device, Operation, User } from '../domain/models.js';
import type {
  AccountBalances, AccountTransactionReceipt, Bill, BillingBill, BillingLimits, BillingPayer, BillingPayerDeleteResult, BillingReceipt, BillingShareResult,
  CardActivationChallenge, CardActivationResult, CardBlockResult, CardPasswordResult, CardReceipt, CardRecharge, CardRequestResult, CardTransaction,
  ConsignedApplication, ConsignedDocument, ConsignedProduct, ConsignedReceipt, ConsignedTerms, CurrentAccount,
  InstallmentSimulation, InvestmentOrder, InvestmentPosition, InvestmentProduct, InvestmentReceipt, InvestmentSimulation,
  Payment, PaymentReceipt, PaymentValidation, PhysicalCard, PixKey, PixKeyLookup, PixKeyRemoveResult, PixQrLookup, PixReceiveQr, PixTransfer, PixTransferReceipt, PixValidation,
  StatementEntry, Transfer, TransferBank, TransferBeneficiary, TransferFavorite, TransferReceipt, TransferValidation, TransportCard,
  VirtualCard, VirtualCardBlockResult, VirtualCardCancelResult, VirtualCardCreateResult, VirtualCardLimitPool, VirtualCardLimitResult, VirtualCardRecreateResult, VirtualCardRevealChallenge, VirtualCardRevealedData, VirtualCardTransaction,
} from './domainTypes.js';

export interface AuthContext { sessionId: string; userId: string; accountId: string; deviceId: string; expiresAt: string; user: User; account: Account }
export interface AuthResult extends AuthContext { accessToken: string; refreshToken: string; environment: 'sandbox' }
export interface AuthProvider { login(input: unknown): Promise<AuthResult>; refresh(refreshToken: string): Promise<AuthResult>; }
export interface SessionStore {
  create(input: { user: User; account: Account; deviceId: string }): Promise<AuthResult>;
  getByAccessToken(accessToken: string): Promise<AuthContext | undefined>;
  refresh(refreshToken: string): Promise<AuthResult>;
  revoke(sessionId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
export interface DeviceBindingProvider { register(input: unknown): Promise<Device>; verify(expectedDeviceId: string, presentedDeviceId: string): Promise<boolean>; }

export interface AccountProvider {
  getCurrent(context: AuthContext): Promise<CurrentAccount>;
  getBalances(context: AuthContext): Promise<AccountBalances>;
  listStatement(context: AuthContext, input?: unknown): Promise<StatementEntry[]>;
  listFutureTransactions(context: AuthContext): Promise<StatementEntry[]>;
  listBlockedTransactions(context: AuthContext): Promise<StatementEntry[]>;
  getTransaction(context: AuthContext, id: string): Promise<StatementEntry>;
  getTransactionReceipt(context: AuthContext, id: string, requestId: string): Promise<AccountTransactionReceipt>;
}
export interface PixProvider {
  lookupKey(context: AuthContext, input: unknown, requestId: string): Promise<PixKeyLookup>;
  lookupQr(context: AuthContext, input: unknown): Promise<PixQrLookup>;
  listKeys(context: AuthContext): Promise<PixKey[]>;
  createKey(context: AuthContext, input: unknown, key: string, requestId: string): Promise<PixKey>;
  removeKey(context: AuthContext, id: string, key: string, requestId: string): Promise<PixKeyRemoveResult>;
  createReceiveQr(context: AuthContext, input: unknown): Promise<PixReceiveQr>;
  validateTransfer(context: AuthContext, input: unknown): Promise<PixValidation>;
  createTransfer(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<PixTransfer>;
  scheduleTransfer(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<PixTransfer>;
  getTransfer(context: AuthContext, pixTransferId: string): Promise<PixTransfer>;
  getTransferReceipt(context: AuthContext, pixTransferId: string, requestId: string): Promise<PixTransferReceipt>;
}
export interface TransferProvider {
  listBanks(context: AuthContext): Promise<TransferBank[]>;
  listFavorites(context: AuthContext): Promise<TransferFavorite[]>;
  lookupBeneficiary(context: AuthContext, input: unknown): Promise<TransferBeneficiary>;
  validate(context: AuthContext, input: unknown): Promise<TransferValidation>;
  createTransfer(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<Transfer>;
  scheduleTransfer(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<Transfer>;
  getTransfer(context: AuthContext, transferId: string): Promise<Transfer>;
  getReceipt(context: AuthContext, transferId: string, requestId: string): Promise<TransferReceipt>;
}
export interface PaymentProvider {
  lookupBill(context: AuthContext, input: unknown): Promise<Bill>;
  validateBill(context: AuthContext, input: unknown): Promise<PaymentValidation>;
  payBill(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<Payment>;
  scheduleBill(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<Payment>;
  simulateInstallments(context: AuthContext, input: unknown): Promise<InstallmentSimulation>;
  payInstallments(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<Payment>;
  getPayment(context: AuthContext, paymentId: string): Promise<Payment>;
  getReceipt(context: AuthContext, paymentId: string, requestId: string): Promise<PaymentReceipt>;
}
export interface CardProvider {
  list(context: AuthContext): Promise<PhysicalCard[]>;
  get(context: AuthContext, cardId: string): Promise<PhysicalCard>;
  listTransactions(context: AuthContext, cardId: string): Promise<CardTransaction[]>;
  getTransaction(context: AuthContext, cardId: string, transactionId: string): Promise<CardTransaction>;
  listReceipts(context: AuthContext, cardId: string): Promise<CardReceipt[]>;
  getTransactionReceipt(context: AuthContext, cardId: string, transactionId: string, requestId: string): Promise<CardReceipt>;
  getTransportCard(context: AuthContext): Promise<TransportCard>;
  createActivationChallenge(context: AuthContext, cardId: string): Promise<CardActivationChallenge>;
  activate(context: AuthContext, cardId: string, input: unknown, key: string, requestId: string): Promise<CardActivationResult>;
  setBlocked(context: AuthContext, cardId: string, blocked: boolean, key: string, requestId: string): Promise<CardBlockResult>;
  changePassword(context: AuthContext, cardId: string, input: unknown, key: string, requestId: string): Promise<CardPasswordResult>;
  recharge(context: AuthContext, cardId: string, input: unknown, key: string, requestId: string): Promise<CardRecharge>;
  requestCard(context: AuthContext, input: unknown, key: string, requestId: string): Promise<CardRequestResult>;
  rechargeTransport(context: AuthContext, input: unknown, key: string, requestId: string): Promise<CardRecharge>;
  // Cartão virtual — família de operações própria (mesmo espírito de
  // getTransportCard/rechargeTransport já serem separados do cartão físico),
  // em vez de misturar no array de list()/get() acima. Evita qualquer risco
  // de quebrar o contrato hoje já consumido pelo app cliente.
  listVirtualCards(context: AuthContext): Promise<VirtualCard[]>;
  getVirtualCard(context: AuthContext, cardId: string): Promise<VirtualCard>;
  getVirtualCardLimitPool(context: AuthContext): Promise<VirtualCardLimitPool>;
  createVirtualCard(context: AuthContext, input: unknown, key: string, requestId: string): Promise<VirtualCardCreateResult>;
  setVirtualCardLimit(context: AuthContext, cardId: string, input: unknown, key: string, requestId: string): Promise<VirtualCardLimitResult>;
  setVirtualCardBlocked(context: AuthContext, cardId: string, blocked: boolean, key: string, requestId: string): Promise<VirtualCardBlockResult>;
  cancelVirtualCard(context: AuthContext, cardId: string, key: string, requestId: string): Promise<VirtualCardCancelResult>;
  recreateVirtualCard(context: AuthContext, cardId: string, key: string, requestId: string): Promise<VirtualCardRecreateResult>;
  createRevealChallenge(context: AuthContext, cardId: string): Promise<VirtualCardRevealChallenge>;
  revealVirtualCardData(context: AuthContext, cardId: string, input: unknown, requestId: string): Promise<VirtualCardRevealedData>;
  listVirtualCardTransactions(context: AuthContext, cardId: string): Promise<VirtualCardTransaction[]>;
}
export interface InvestmentProvider { listProducts(context: AuthContext): Promise<InvestmentProduct[]>; simulate(context: AuthContext, input: unknown): Promise<InvestmentSimulation>; createOrder(context: AuthContext, input: unknown, key: string, requestId: string): Promise<InvestmentOrder>; getOrder(context: AuthContext, id: string): Promise<InvestmentOrder>; listPositions(context: AuthContext): Promise<InvestmentPosition[]>; getReceipt(context: AuthContext, id: string, requestId: string): Promise<InvestmentReceipt>; }
export interface BillingProvider { listPayers(context: AuthContext): Promise<BillingPayer[]>; createPayer(context: AuthContext, input: unknown, key: string): Promise<BillingPayer>; updatePayer(context: AuthContext, id: string, input: unknown): Promise<BillingPayer>; deletePayer(context: AuthContext, id: string): Promise<BillingPayerDeleteResult>; getLimits(context: AuthContext): Promise<BillingLimits>; listBills(context: AuthContext): Promise<BillingBill[]>; createBill(context: AuthContext, input: unknown, key: string, requestId: string): Promise<BillingBill>; getBill(context: AuthContext, id: string): Promise<BillingBill>; shareBill(context: AuthContext, id: string): Promise<BillingShareResult>; getReceipt(context: AuthContext, id: string, requestId: string): Promise<BillingReceipt>; }
export interface ConsignedProvider { listProducts(context: AuthContext): Promise<ConsignedProduct[]>; getDocuments(context: AuthContext, id: string): Promise<ConsignedDocument[]>; getTerms(context: AuthContext, id: string): Promise<ConsignedTerms>; apply(context: AuthContext, input: unknown, key: string, requestId: string): Promise<ConsignedApplication>; listApplications(context: AuthContext): Promise<ConsignedApplication[]>; getApplication(context: AuthContext, id: string): Promise<ConsignedApplication>; getReceipt(context: AuthContext, id: string, requestId: string): Promise<ConsignedReceipt>; }
export interface ProfileProvider { getProfile(context: unknown): Promise<unknown>; updatePhoto(input: unknown): Promise<unknown>; listTerms(): Promise<unknown>; }
export interface ChallengeProvider {
  create(context: AuthContext, input: unknown): Promise<unknown>;
  verify(context: AuthContext, id: string, input: unknown): Promise<unknown>;
  isVerified(context: AuthContext, id: string, operationId: string): boolean;
}

export interface ProviderRegistry {
  auth?: AuthProvider;
  sessions?: SessionStore;
  deviceBinding?: DeviceBindingProvider;
  account?: AccountProvider;
  pix?: PixProvider;
  transfer?: TransferProvider;
  payment?: PaymentProvider;
  card?: CardProvider;
  investment?: InvestmentProvider;
  billing?: BillingProvider;
  consigned?: ConsignedProvider;
  profile?: ProfileProvider;
  challenge?: ChallengeProvider;
}
