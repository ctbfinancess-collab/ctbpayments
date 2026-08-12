import type { Account, Device, Operation, User } from '../domain/models.js';

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
  getCurrent(context: AuthContext): Promise<unknown>;
  getBalances(context: AuthContext): Promise<unknown>;
  listStatement(context: AuthContext, input?: unknown): Promise<unknown>;
  listFutureTransactions(context: AuthContext): Promise<unknown>;
  listBlockedTransactions(context: AuthContext): Promise<unknown>;
  getTransaction(context: AuthContext, id: string): Promise<unknown>;
  getTransactionReceipt(context: AuthContext, id: string, requestId: string): Promise<unknown>;
}
export interface PixProvider {
  lookupKey(context: AuthContext, input: unknown, requestId: string): Promise<unknown>;
  lookupQr(context: AuthContext, input: unknown): Promise<unknown>;
  listKeys(context: AuthContext): Promise<unknown>;
  createReceiveQr(context: AuthContext, input: unknown): Promise<unknown>;
  validateTransfer(context: AuthContext, input: unknown): Promise<unknown>;
  createTransfer(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<unknown>;
  scheduleTransfer(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<unknown>;
  getTransfer(context: AuthContext, pixTransferId: string): Promise<unknown>;
  getTransferReceipt(context: AuthContext, pixTransferId: string, requestId: string): Promise<unknown>;
}
export interface TransferProvider {
  listBanks(context: AuthContext): Promise<unknown>;
  listFavorites(context: AuthContext): Promise<unknown>;
  lookupBeneficiary(context: AuthContext, input: unknown): Promise<unknown>;
  validate(context: AuthContext, input: unknown): Promise<unknown>;
}
export interface PaymentProvider {
  lookupBill(context: AuthContext, input: unknown): Promise<unknown>;
  validateBill(context: AuthContext, input: unknown): Promise<unknown>;
  payBill(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<unknown>;
  scheduleBill(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<unknown>;
  simulateInstallments(context: AuthContext, input: unknown): Promise<unknown>;
  payInstallments(context: AuthContext, input: unknown, idempotencyKey: string, requestId: string): Promise<unknown>;
  getPayment(context: AuthContext, paymentId: string): Promise<unknown>;
  getReceipt(context: AuthContext, paymentId: string, requestId: string): Promise<unknown>;
}
export interface CardProvider {
  list(context: AuthContext): Promise<unknown>;
  get(context: AuthContext, cardId: string): Promise<unknown>;
  listTransactions(context: AuthContext, cardId: string): Promise<unknown>;
  getTransaction(context: AuthContext, cardId: string, transactionId: string): Promise<unknown>;
  listReceipts(context: AuthContext, cardId: string): Promise<unknown>;
  getTransactionReceipt(context: AuthContext, cardId: string, transactionId: string, requestId: string): Promise<unknown>;
  getTransportCard(context: AuthContext): Promise<unknown>;
}
export interface InvestmentProvider { listProducts(): Promise<unknown>; simulate(input: unknown): Promise<unknown>; createOrder(input: unknown): Promise<Operation>; }
export interface BillingProvider { listPayers(): Promise<unknown>; createBill(input: unknown): Promise<Operation>; }
export interface ConsignedProvider { listProducts(): Promise<unknown>; simulate(input: unknown): Promise<unknown>; apply(input: unknown): Promise<Operation>; }
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
