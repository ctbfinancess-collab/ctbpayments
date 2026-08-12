// MOCK de leitura da Home. Mantido separado para que a UI consuma accountService.
export const MOCK_HOME_BALANCES = [
  { id: 'digital', description: 'Conta Digital', tag: 'R$', value: '2.480,75', blockedValue: '0,00' },
  { id: 'investment', description: 'Investimentos', tag: 'R$', value: '1.350,00' },
  { id: 'agreement', description: 'Saldo Convênio', tag: 'R$', value: '680,40' },
  { id: 'card', description: 'Conta Cartão', tag: 'R$', value: '920,10' },
];
export const MOCK_ACCOUNT_SUMMARY = { displayName: 'Cliente', accountType: 'PF' };
