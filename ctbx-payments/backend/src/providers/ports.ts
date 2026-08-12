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

export interface AccountProvider { getCurrent(context: AuthContext): Promise<unknown>; getBalances(context: AuthContext): Promise<unknown>; listStatement(input: unknown): Promise<unknown>; }
export interface PixProvider { lookupKey(input: unknown): Promise<unknown>; lookupQr(input: unknown): Promise<unknown>; listKeys(context: unknown): Promise<unknown>; createKey(input: unknown): Promise<Operation>; deleteKey(id: string): Promise<Operation>; createReceiveQr(input: unknown): Promise<unknown>; validateTransfer(input: unknown): Promise<unknown>; createTransfer(input: unknown): Promise<Operation>; scheduleTransfer(input: unknown): Promise<Operation>; }
export interface TransferProvider { listBanks(): Promise<unknown>; listFavorites(context: unknown): Promise<unknown>; lookupBeneficiary(input: unknown): Promise<unknown>; validate(input: unknown): Promise<unknown>; create(input: unknown): Promise<Operation>; schedule(input: unknown): Promise<Operation>; }
export interface PaymentProvider { lookupBill(input: unknown): Promise<unknown>; validateBill(input: unknown): Promise<unknown>; payBill(input: unknown): Promise<Operation>; scheduleBill(input: unknown): Promise<Operation>; simulateInstallments(input: unknown): Promise<unknown>; payInstallments(input: unknown): Promise<Operation>; }
export interface CardProvider { list(context: unknown): Promise<unknown>; get(id: string): Promise<unknown>; createActivationChallenge(id: string): Promise<unknown>; activate(id: string, input: unknown): Promise<Operation>; block(id: string): Promise<Operation>; unblock(id: string, input: unknown): Promise<Operation>; changePassword(id: string, input: unknown): Promise<Operation>; listTransactions(id: string): Promise<unknown>; request(input: unknown): Promise<Operation>; recharge(id: string, input: unknown): Promise<Operation>; }
export interface InvestmentProvider { listProducts(): Promise<unknown>; simulate(input: unknown): Promise<unknown>; createOrder(input: unknown): Promise<Operation>; }
export interface BillingProvider { listPayers(): Promise<unknown>; createBill(input: unknown): Promise<Operation>; }
export interface ConsignedProvider { listProducts(): Promise<unknown>; simulate(input: unknown): Promise<unknown>; apply(input: unknown): Promise<Operation>; }
export interface ProfileProvider { getProfile(context: unknown): Promise<unknown>; updatePhoto(input: unknown): Promise<unknown>; listTerms(): Promise<unknown>; }
export interface ChallengeProvider { create(input: unknown): Promise<unknown>; verify(id: string, input: unknown): Promise<unknown>; }

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
