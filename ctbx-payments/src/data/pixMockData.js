// MOCKS TEMPORARIOS: substituem autenticacao, saldo, DICT, favorecidos e chaves
// retornados pelas APIs originais. Nenhum dado abaixo pertence a uma conta real.
export const MOCK_PIX_BALANCE = '2.480,75';

export const MOCK_PIX_BENEFICIARY = {
  name: 'CLIENTE PIX DEMONSTRAÇÃO',
  bank: 'BANCO CTBX',
  agency: '0001',
  account: '000000-0',
  document: '***.***.***-**',
  accountType: 'Conta corrente',
};

export const MOCK_PIX_FAVORITES = [
  {
    id: 'favorite-1',
    name: 'Contato',
    key: 'favorecido.demo@ctbx.app',
    bank: 'BANCO DE DEMONSTRAÇÃO',
    type: 'email',
  },
  {
    id: 'favorite-2',
    name: 'Empresa',
    key: '**.***.***/****-**',
    bank: 'INSTITUIÇÃO PIX MOCK',
    type: 'cnpj',
  },
];

export const MOCK_PIX_KEYS = [
  { id: 'key-1', type: 'E-mail', value: 'cliente.demo@ctbx.app', status: 'Ativo' },
  { id: 'key-2', type: 'Celular', value: '+55 (**) *****-****', status: 'Ativo' },
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

// Últimos destinatários de Pix — não exigem cadastro como favorito
// (seção "Recentes" da tela principal do Pix).
export const MOCK_PIX_RECENT = [
  { id: 'recent-1', name: 'Cliente Demonstração B', key: '+55 (11) 98888-0000', bank: 'CTBX Payments', type: 'phone', lastAmount: '120,00', lastAt: '11/08/2026' },
  { id: 'recent-2', name: 'Fornecedor Demonstração', key: 'fornecedor.demo@ctbx.app', bank: 'BANCO DE DEMONSTRAÇÃO', type: 'email', lastAmount: '480,50', lastAt: '09/08/2026' },
  { id: 'recent-3', name: 'Contato de demonstração', key: 'favorecido.demo@ctbx.app', bank: 'BANCO DE DEMONSTRAÇÃO', type: 'email', lastAmount: '75,00', lastAt: '05/08/2026' },
];

// Pix agendados para uma data futura — seção "Agendamentos" (Gerenciar Pix).
export const MOCK_PIX_SCHEDULED = [
  { id: 'sched-1', name: 'Cliente Demonstração B', key: '+55 (11) 98888-0000', amount: '350,00', scheduleDate: '18/08/2026', status: 'Agendado' },
  { id: 'sched-2', name: 'Empresa de demonstração', key: '**.***.***/****-**', amount: '1.200,00', scheduleDate: '25/08/2026', status: 'Agendado' },
];

// Limites diurno/noturno — seção "Limites PIX" (Gerenciar Pix). Faixa
// horária noturna segue a resolução do BC (20h–6h), aqui apenas ilustrativa.
export const MOCK_PIX_LIMITS = {
  day: { used: 850, total: 5000, window: '06h às 20h' },
  night: { used: 120, total: 1000, window: '20h às 06h' },
};

// Comprovantes recentes — seção "Comprovantes" (Gerenciar Pix). Cada item já
// tem o formato aceito por getReceipt/PixReceiptScreen.
export const MOCK_PIX_RECEIPTS = [
  { id: 'PIX-MOCK-1008', pixTransferId: 'PIX-MOCK-1008', key: 'cliente.a.demo@ctbx.app', amount: '350,00', direction: 'entrada', date: '12/08/2026', time: '14:32', beneficiary: { name: 'Cliente Demonstração A', bank: 'BANCO DE DEMONSTRAÇÃO', agency: '0003', account: '222222-0', document: '***.***.***-**', accountType: 'Conta corrente' } },
  { id: 'PIX-MOCK-1006', pixTransferId: 'PIX-MOCK-1006', key: '+55 (11) 98888-0000', amount: '120,00', direction: 'saida', date: '11/08/2026', time: '17:05', beneficiary: { name: 'Cliente Demonstração B', bank: 'CTBX Payments', agency: '0001', account: '000000-0', document: '***.***.***-**', accountType: 'Conta corrente' } },
  { id: 'PIX-MOCK-1002', pixTransferId: 'PIX-MOCK-1002', key: 'fornecedor.demo@ctbx.app', amount: '480,50', direction: 'saida', date: '09/08/2026', time: '09:41', beneficiary: { name: 'Fornecedor Demonstração', bank: 'BANCO DE DEMONSTRAÇÃO', agency: '0002', account: '111111-0', document: '**.***.***/****-**', accountType: 'Conta corrente' } },
];
