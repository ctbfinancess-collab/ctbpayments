/**
 * Porta documental para uma integração legada autorizada no futuro.
 *
 * Uma implementação só pode existir no servidor, sob aprovação formal. Este
 * skeleton não contém host, URL, header, credencial, token ou lógica de auth.
 */
export interface LegacyBankingAdapter {
  getAccountContext(input: unknown): Promise<unknown>;
  getBalances(input: unknown): Promise<unknown>;
  listStatement(input: unknown): Promise<unknown>;
  executeAuthorizedOperation(operation: string, input: unknown): Promise<unknown>;
  reconcileOperation(reference: string): Promise<unknown>;
}
