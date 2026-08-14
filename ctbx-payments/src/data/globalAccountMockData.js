// MOCKS TEMPORARIOS: contas globais multicurrency (USD/EUR/AED) do carrossel
// da Home. Número de conta, IBAN/SWIFT, cotações e movimentações são
// fictícios — a integração real (abertura de conta global, câmbio ao vivo,
// conversão, extrato) depende de um provedor de câmbio quando a API
// original existir.
export const MOCK_GLOBAL_ACCOUNTS = {
  USD: {
    currency: 'USD', tag: 'US$', label: 'Conta Global USD', currencyName: 'Dólares Americanos', flag: '🇺🇸',
    holder: 'CTB Payments Ltda', accountType: 'Global Account', country: 'Estados Unidos',
    accountNumber: '8312 3456 7890', routingNumber: '026073150', swift: 'CTBXUS33XXX',
    correspondentBank: 'JPMorgan Chase Bank, N.A.', bankAddress: '270 Park Avenue, New York, NY 10017, USA',
  },
  EUR: {
    currency: 'EUR', tag: '€', label: 'Conta Global EUR', currencyName: 'Euros', flag: '🇪🇺',
    holder: 'CTB Payments Ltda', accountType: 'Global Account', country: 'Alemanha',
    accountNumber: 'EU 3822 1400 2', iban: 'DE89 3704 0044 0532 0130 00', swift: 'CTBXDEFFXXX',
    correspondentBank: 'Deutsche Bank AG', bankAddress: 'Taunusanlage 12, 60325 Frankfurt am Main, Alemanha',
  },
  AED: {
    currency: 'AED', tag: 'AED', label: 'Conta Global AED', currencyName: 'Dirhams dos Emirados Árabes Unidos', flag: '🇦🇪',
    holder: 'CTB Payments Ltda', accountType: 'Global Account', country: 'Emirados Árabes Unidos',
    accountNumber: 'AE 7704 1200 9', iban: 'AE07 0331 2345 6789 0123 456', swift: 'CTBXAEADXXX',
    correspondentBank: 'Emirates NBD Bank', bankAddress: 'Baniyas Road, Deira, Dubai, EAU',
  },
};

// Cotação estrutural (compra/venda em relação ao BRL) — puramente
// demonstrativa, não reflete cotação real de mercado.
export const MOCK_EXCHANGE_RATES = {
  USD: { buy: 5.42, sell: 5.58, updatedAt: '13/08/2026 20:40' },
  EUR: { buy: 5.86, sell: 6.02, updatedAt: '13/08/2026 20:40' },
  AED: { buy: 1.475, sell: 1.520, updatedAt: '13/08/2026 20:40' },
};

export const MOCK_GLOBAL_MOVEMENTS = {
  USD: [
    { id: 'usd-1', description: 'Remessa recebida', direction: 'entrada', amount: '3.200,00', date: '20/08/2026', time: '11:20' },
    { id: 'usd-2', description: 'Remessa recebida', direction: 'entrada', amount: '2.620,00', date: '14/08/2026', time: '09:05' },
    { id: 'usd-3', description: 'Compra internacional', direction: 'saida', amount: '128,40', date: '07/08/2026', time: '16:47' },
    { id: 'usd-4', description: 'Assinatura de software', direction: 'saida', amount: '2.761,60', date: '03/08/2026', time: '08:12' },
  ],
  EUR: [
    { id: 'eur-1', description: 'Transferência SEPA recebida', direction: 'entrada', amount: '1.500,00', date: '18/08/2026', time: '10:32' },
    { id: 'eur-2', description: 'Pagamento de fornecedor', direction: 'entrada', amount: '900,00', date: '11/08/2026', time: '14:15' },
    { id: 'eur-3', description: 'Assinatura internacional', direction: 'saida', amount: '42,00', date: '09/08/2026', time: '07:50' },
    { id: 'eur-4', description: 'Compra internacional', direction: 'saida', amount: '358,00', date: '02/08/2026', time: '19:03' },
  ],
  AED: [
    { id: 'aed-1', description: 'Remessa recebida', direction: 'entrada', amount: '12.000,00', date: '15/08/2026', time: '12:00' },
    { id: 'aed-2', description: 'Remessa recebida', direction: 'entrada', amount: '3.240,00', date: '09/08/2026', time: '15:44' },
    { id: 'aed-3', description: 'Pagamento a fornecedor', direction: 'saida', amount: '3.400,00', date: '05/08/2026', time: '10:20' },
    { id: 'aed-4', description: 'Tarifa bancária', direction: 'saida', amount: '910,00', date: '01/08/2026', time: '08:00' },
  ],
};
