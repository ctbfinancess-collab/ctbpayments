// MOCKS TEMPORARIOS: substituem autenticacao, saldo, DICT, favorecidos e chaves
// retornados pelas APIs originais. Nenhum dado abaixo pertence a uma conta real.
export const MOCK_PIX_BALANCE = '2.480,75';

export const MOCK_PIX_BENEFICIARY = {
  name: 'CLIENTE PIX DEMONSTRAÇÃO',
  bank: 'BANCO DE DEMONSTRAÇÃO',
  agency: '0001',
  account: '000000-0',
  document: '00000000000',
  accountType: 'Conta corrente',
};

export const MOCK_PIX_FAVORITES = [
  {
    id: 'favorite-1',
    name: 'Contato de demonstração',
    key: 'contato@example.com',
    bank: 'BANCO DE DEMONSTRAÇÃO',
    type: 'email',
  },
  {
    id: 'favorite-2',
    name: 'Empresa de demonstração',
    key: '00.000.000/0001-00',
    bank: 'INSTITUIÇÃO PIX MOCK',
    type: 'cnpj',
  },
];

export const MOCK_PIX_KEYS = [
  { id: 'key-1', type: 'E-mail', value: 'usuario@example.com', status: 'Ativo' },
  { id: 'key-2', type: 'Celular', value: '+55 (11) 90000-0000', status: 'Ativo' },
];

export const PIX_KEY_TYPES = [
  { id: 'EVP', label: 'Chave aleatória' },
  { id: 'documento', label: 'CPF/CNPJ' },
  { id: 'PHONE', label: 'Celular' },
  { id: 'EMAIL', label: 'E-mail' },
];

export function buildMockPixTransfer({ key, keyType, amount = '', message = '' }) {
  return {
    id: `PIX-MOCK-${Date.now()}`,
    key,
    keyType,
    amount,
    message,
    beneficiary: MOCK_PIX_BENEFICIARY,
    createdAt: new Date().toISOString(),
  };
}
