// MOCK TEMPORARIO: substitui conta, bancos, favorecidos, tarifa e retorno das APIs originais.
export const MOCK_TRANSFER_BALANCE = '2.480,75';
export const MOCK_TRANSFER_FEE = '0,00';

export const MOCK_BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú' },
];

export const MOCK_TRANSFER_FAVORITES = [
  { id: 'fav-1', name: 'Marina Costa', document: '***.456.789-**', bank: 'Banco do Brasil', agency: '1234', account: '45678', digit: '9', accountType: 'Conta corrente', mode: 'external' },
  { id: 'fav-2', name: 'Carlos Almeida', document: '***.987.654-**', bank: 'CTBX Payments', agency: '0001', account: '0001234', digit: '5', accountType: 'Conta digital', mode: 'internal' },
];

export const TRANSFER_PURPOSES = [
  'Crédito em Conta',
  'Pagamento de Aluguel/Condomínio',
  'Pagamento de Duplicata/Títulos',
  'Pagamento de Salários',
  'Pagamento de Fornecedores/Honorários',
  'Outros',
];

export const ACCOUNT_TYPES = ['Conta corrente', 'Conta poupança'];

export function buildMockBeneficiary(mode, values = {}) {
  return {
    mode,
    name: values.name || (mode === 'internal' ? 'Cliente CTBX' : 'Favorecido demonstração'),
    document: values.document || '000.000.000-00',
    bank: values.bank || (mode === 'internal' ? 'CTBX Payments' : MOCK_BANKS[0].name),
    agency: values.agency || '0001',
    account: values.account || '0001234',
    digit: values.digit || '5',
    accountType: values.accountType || (mode === 'internal' ? 'Conta digital' : ACCOUNT_TYPES[0]),
    phone: values.phone || '',
  };
}

export const TRANSFER_ENDPOINTS_RECOVERED = [
  'conta/saldo', 'conta/busca-por-telefone', 'conta/busca-por-documento',
  'conta/busca-por-agencia-e-conta', 'transferencia/nova', 'tarifa/consulta',
  'favorecido/lista', 'favorecido/update', 'favorecido/delete',
  'token2f/novo', 'token2f/valida', 'comprovante/lista', 'conta/comprovante-pdf',
  'utilitarios/validacao-push-envio', 'utilitarios/validacao-push-confere',
];
