// MOCK de leitura da Home. Mantido separado para que a UI consuma accountService.
// Carrossel multicurrency: cada conta tem sua própria moeda (`currency`) e
// prefixo de exibição (`tag`) — dados de demonstração por enquanto, mas a
// estrutura já fica pronta para conectar cada conta à sua própria tela
// (BRL→extrato da conta digital, USD/EUR/AED→conta global, Investimentos→
// investimentos) quando essas rotas existirem.
export const MOCK_HOME_BALANCES = [
  { id: 'digital', description: 'Conta Digital', tag: 'R$', currency: 'BRL', value: '28.750,00', blockedValue: '0,00' },
  { id: 'usd', description: 'Conta Global', tag: 'US$', currency: 'USD', value: '12.480,00' },
  { id: 'eur', description: 'Conta Global', tag: '€', currency: 'EUR', value: '8.650,00' },
  { id: 'aed', description: 'Conta Global', tag: 'AED', currency: 'AED', value: '46.200,00' },
  { id: 'investment', description: 'Investimentos', tag: 'R$', currency: 'BRL', value: '1.350,00' },
];
export const MOCK_ACCOUNT_SUMMARY = { displayName: 'Cliente', accountType: 'PF' };
